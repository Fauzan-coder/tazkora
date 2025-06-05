// File: src/app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/lib/auth'
import { Session } from 'next-auth'
import { prisma } from '@/app/lib/db'
declare module 'next-auth' {
  interface Session {
    user?: {
      name?: string | null
      email?: string | null
      image?: string | null
      role?: string
      id?: string
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { title, description, priority, assigneeId, dueDate, teamId } = await request.json()
    
    // Only HEAD and MANAGER can create tasks
    if (session.user?.role === 'EMPLOYEE') {
      return NextResponse.json(
        { message: 'Employees cannot create tasks' },
        { status: 403 }
      )
    }
    
    // If assignee is specified, verify the current user can assign to them
    if (assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: assigneeId },
      })
      
      if (!assignee) {
        return NextResponse.json(
          { message: 'Assignee not found' },
          { status: 404 }
        )
      }
      
      // HEAD can assign to anyone
      if (session.user?.role === 'HEAD') {
        // No restrictions
      } 
      // MANAGER assignment logic
      else if (session.user?.role === 'MANAGER') {
        let canAssign = false;
        
        // If it's a team task, check team membership instead of direct management
        if (teamId) {
          // Verify the team exists and the manager leads it
          const team = await prisma.team.findUnique({
            where: { id: teamId },
            include: {
              members: {
                where: {
                  userId: assigneeId
                }
              }
            }
          })
          
          if (!team) {
            return NextResponse.json(
              { message: 'Team not found' },
              { status: 404 }
            )
          }
          
          // Check if the manager leads this team
          if (team.leaderId !== session.user.id) {
            return NextResponse.json(
              { message: 'Cannot assign tasks to teams you do not lead' },
              { status: 403 }
            )
          }
          
          // Check if the assignee is a member of this team
          if (team.members.length > 0) {
            canAssign = true;
          } else {
            return NextResponse.json(
              { message: 'Cannot assign task to user who is not a member of this team' },
              { status: 403 }
            )
          }
        } else {
          // For non-team tasks, use direct management hierarchy
          if (assignee.managerId === session.user.id) {
            canAssign = true;
          }
        }
        
        if (!canAssign) {
          return NextResponse.json(
            { message: teamId ? 
              'Cannot assign task to user who is not a member of this team' : 
              'Cannot assign tasks to users you do not manage' 
            },
            { status: 403 }
          )
        }
      }
    }
    
    // If teamId is specified, verify the team exists and the user has permission to assign tasks to it
    if (teamId) {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
      })
      
      if (!team) {
        return NextResponse.json(
          { message: 'Team not found' },
          { status: 404 }
        )
      }
      
      // Verify permissions - HEAD can assign to any team, MANAGER only to teams they lead
      if (session.user?.role === 'MANAGER') {
        // Check if the user is the team leader
        if (team.leaderId !== session.user.id) {
          return NextResponse.json(
            { message: 'Cannot assign tasks to teams you do not lead' },
            { status: 403 }
          )
        }
      }
    }
    
    // Create the task
    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || 'MEDIUM',
        status: 'ONGOING',
        workStatus: 'NOT_STARTED',
        creatorId: session.user?.id ?? '',
        assigneeId,
        dueDate: dueDate ? new Date(dueDate) : null,
        taskType: teamId ? 'TEAM' : 'INDIVIDUAL',
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        }
      }
    })
    
    // If teamId is provided, create a team task association
    if (teamId) {
      await prisma.teamTask.create({
        data: {
          taskId: task.id,
          teamId: teamId,
        }
      })
    }
    
    return NextResponse.json({
      ...task,
      teamId: teamId || null
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get tasks based on user role
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const teamId = url.searchParams.get('teamId');
    const taskType = url.searchParams.get('taskType');
    
    let tasks
    
    // Filter conditions
    const statusFilter = status ? { status } : {}
    const taskTypeFilter = taskType ? { taskType } : {};
    
    // If teamId is provided, get tasks for that team
    if (teamId) {
      // First check if the team exists and the user has access to it
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          members: {
            where: {
              userId: session.user?.id
            }
          }
        }
      })
      
      if (!team) {
        return NextResponse.json(
          { message: 'Team not found' },
          { status: 404 }
        )
      }
      
      // Check if user has access to this team (is head, creator, leader or member)
      const isCreator = team.creatorId === session.user?.id
      const isLeader = team.leaderId === session.user?.id
      const isMember = team.members.length > 0
      const isHead = session.user?.role === 'HEAD'
      
      if (!isCreator && !isLeader && !isMember && !isHead) {
        return NextResponse.json(
          { message: 'Access denied' },
          { status: 403 }
        )
      }
      
      // Get team tasks - team members can see all tasks assigned to the team
      const teamTasks = await prisma.teamTask.findMany({
        where: {
          teamId: teamId,
          task: statusFilter
        },
        include: {
          task: {
            include: {
              creator: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                }
              },
              assignee: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                }
              },
              issues: true,
            }
          },
          updates: {
            include: {
              member: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      role: true,
                    }
                  }
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        },
        orderBy: {
          assignedAt: 'desc'
        }
      })
      
      // Format the response to keep the same structure as before
      const formattedTasks = teamTasks.map(teamTask => {
        if (!teamTask.task) return null;
        
        return {
          ...teamTask.task,
          teamTaskId: teamTask.id,
          teamId: teamTask.teamId,
          updates: teamTask.updates,
          taskOrigin: 'TEAM',
          teamInfo: {
            teamId: teamId,
            teamName: team.name,
            isTeamLeader: team.leaderId === session.user?.id,
            canUpdateTask: teamTask.task.assigneeId === session.user?.id // Only assignee can update
          }
        };
      }).filter(Boolean);
      
      return NextResponse.json(formattedTasks)
    }
    
    // Regular task fetching logic (without teamId)
    // HEAD can see all tasks
    if (session.user?.role === 'HEAD') {
      tasks = await prisma.task.findMany({
        where: statusFilter,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          },
          issues: true,
          teamAssignments: {
            include: {
              team: true,
              updates: {
                include: {
                  member: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          name: true
                        }
                      }
                    }
                  }
                },
                orderBy: {
                  createdAt: 'desc'
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc',
        }
      })
    } 
    // MANAGER can see tasks they created and tasks assigned to them or their employees
    else if (session.user?.role === 'MANAGER') {
      const managedEmployees = await prisma.user.findMany({
        where: {
          managerId: session.user.id,
        },
        select: {
          id: true,
        }
      })
      
      const employeeIds: string[] = managedEmployees.map((employee: { id: string }) => employee.id)
      
      // Also get teams led by this manager
      const managedTeams = await prisma.team.findMany({
        where: {
          leaderId: session.user.id
        },
        select: {
          id: true
        }
      })
      
      const teamIds: string[] = managedTeams.map((team: { id: string }) => team.id)
      
      tasks = await prisma.task.findMany({
        where: {
          ...statusFilter,
          ...taskTypeFilter,
          OR: [
            { creatorId: session.user.id },
            { assigneeId: session.user.id },
            { assigneeId: { in: employeeIds } },
            {
              teamAssignments: {
                some: {
                  teamId: { in: teamIds }
                }
              }
            }
          ]
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          },
          issues: true,
          teamAssignments: {
            include: {
              team: true,
              updates: {
                include: {
                  member: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          name: true
                        }
                      }
                    }
                  }
                },
                orderBy: {
                  createdAt: 'desc'
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc',
        }
      })
    } 
    // EMPLOYEE can see tasks assigned to them and ALL tasks for teams they are members of
    else {
      // Get teams the employee is a member of
      const memberTeams = await prisma.teamMember.findMany({
        where: {
          userId: session.user?.id ?? ''
        },
        select: {
          teamId: true
        }
      })
      
      const teamIds: string[] = memberTeams.map((member: { teamId: string }) => member.teamId)
      
      tasks = await prisma.task.findMany({
        where: {
          ...statusFilter,
          ...taskTypeFilter,
          OR: [
            { assigneeId: session.user?.id ?? '' },
            {
              // Include ALL team tasks, not just those assigned to the user
              teamAssignments: {
                some: {
                  teamId: { in: teamIds }
                }
              }
            }
          ]
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          },
          issues: true,
          teamAssignments: {
            include: {
              team: true,
              updates: {
                include: {
                  member: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          name: true
                        }
                      }
                    }
                  }
                },
                orderBy: {
                  createdAt: 'desc'
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc',
        }
      })
    }
    
    const enhancedTasks = tasks.map(task => ({
      ...task,
      taskOrigin: task.teamAssignments.length > 0 ? 'TEAM' : 'HIERARCHY',
      teamInfo: task.teamAssignments.length > 0 ? {
        teamId: task.teamAssignments[0].team.id,
        teamName: task.teamAssignments[0].team.name,
        isTeamLeader: task.teamAssignments[0].team.leaderId === session.user?.id,
        canUpdateTask: task.assigneeId === session.user?.id // Only assignee can update work status
      } : null,
      // Add work status visibility for team context
      workStatusVisible: task.teamAssignments.length > 0 || task.assigneeId === session.user?.id,
      canUpdateWorkStatus: task.assigneeId === session.user?.id
    }));

    return NextResponse.json(enhancedTasks)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}