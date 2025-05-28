// File: src/app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db'
import {getServerSession} from 'next-auth/next'
import { authOptions } from '@/app/lib/auth'

// Helper functions
// Replace the existing checkTeamMembership function
async function checkTeamMembership(userId: string, teamIds: string[]): Promise<boolean> {
  if (teamIds.length === 0) return false;
  
  // Also check if user is a team leader, not just a member
  const count = await prisma.team.count({
    where: {
      OR: [
        {
          id: { in: teamIds },
          members: {
            some: {
              userId: userId
            }
          }
        },
        {
          id: { in: teamIds },
          leaderId: userId
        }
      ]
    }
  });
  
  return count > 0;
}

async function checkTeamLeadership(userId: string, teamIds: string[]): Promise<boolean> {
  if (teamIds.length === 0) return false;
  
  const count = await prisma.team.count({
    where: {
      id: { in: teamIds },
      leaderId: userId
    }
  });
  
  return count > 0;
}

// Update task status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { status, priority, assigneeId } = await request.json()
    
    // Get the task first to check permissions
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            managerId: true, // Include managerId
          },
        },
        teamAssignments: {
          include: {
            team: true
          }
        }
      }
    })
    
    if (!task) {
      return NextResponse.json(
        { message: 'Task not found' },
        { status: 404 }
      )
    }
    
    // Check permissions based on role
    if (session.user && session.user.role === 'EMPLOYEE') {
      // Employees can update status of tasks assigned to them or tasks assigned to teams they're in
      const canUpdate = task.assigneeId === session.user.id || 
        await checkTeamMembership(session.user.id, task.teamAssignments.map(ta => ta.teamId));
      
      if (!canUpdate) {
        return NextResponse.json(
          { message: 'Access denied' },
          { status: 403 }
        )
      }
      
      // Employees can only update the status, not other fields
      if (priority || assigneeId) {
        return NextResponse.json(
          { message: 'Employees can only update task status' },
          { status: 403 }
        )
      }
    } else if (session.user && session.user.role === 'MANAGER') {
      // Managers can update tasks they created, tasks assigned to their employees,
      // or tasks assigned to teams they lead
      const isAssignedToEmployee = task.assignee && 
        task.assignee.managerId === session.user.id;
      
      const isTeamLeader = await checkTeamLeadership(session.user.id, task.teamAssignments.map(ta => ta.teamId));
      
      if (
        task.creatorId !== session.user.id && 
        task.assigneeId !== session.user.id && 
        !isAssignedToEmployee &&
        !isTeamLeader
      ) {
        return NextResponse.json(
          { message: 'Access denied' },
          { status: 403 }
        )
      }
      
      // If assigning to a new user, verify the manager can assign to them
      if (assigneeId && assigneeId !== task.assigneeId) {
        const assignee = await prisma.user.findUnique({
          where: { id: assigneeId },
        })
        
        if (!assignee || assignee.managerId !== session.user.id) {
          return NextResponse.json(
            { message: 'Cannot assign to this user' },
            { status: 403 }
          )
        }
      }
    }
    
    // Update the task
    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(session.user?.role !== 'EMPLOYEE' && priority && { priority }),
        ...(session.user?.role !== 'EMPLOYEE' && assigneeId && { assigneeId }),
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
            managerId: true, // Include managerId
          }
        },
        issues: true,
        teamAssignments: {
          include: {
            team: true,
            updates: {
              include: {
                teamMember: {
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
      }
    })
    
    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')
    
    // If userId is provided, fetch tasks for that user
    if (userId) {
      // Check permissions based on role for viewing user's tasks
      if (session.user?.role === 'EMPLOYEE') {
        // Employees can only view their own tasks
        if (userId !== session.user.id) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }
      } else if (session.user?.role === 'MANAGER') {
        // Managers can view their own tasks or tasks of employees they manage
        if (userId !== session.user.id) {
          // Check if this user is managed by the current manager
          const targetUser = await prisma.user.findUnique({
            where: { id: userId }
          })
          
          if (!targetUser || targetUser.managerId !== session.user.id) {
            return NextResponse.json(
              { message: 'Access denied' },
              { status: 403 }
            )
          }
        }
      }
      // Heads can view all tasks - no additional checks needed
      
      // Get active tasks for the user (ONGOING and BACKLOG, not FINISHED)
      const tasks = await prisma.task.findMany({
        where: {
          assigneeId: userId,
          status: {
            in: ['ONGOING', 'BACKLOG']
          }
        },
        include: {
          teamAssignments: {
            include: {
              team: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      
      return NextResponse.json(tasks)
    }
    
    // Original code for fetching a single task by ID
    const task = await prisma.task.findUnique({
      where: { id: params.id },
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
        issues: {
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              }
            }
          }
        },
        teamAssignments: {
          include: {
            team: {
              include: {
                leader: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true
                  }
                },
                members: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                      }
                    }
                  }
                }
              }
            },
            updates: {
              include: {
                teamMember: {
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
      }
    })
    
    if (!task) {
      return NextResponse.json(
        { message: 'Task not found' },
        { status: 404 }
      )
    }
    
    // Check permission to view the task
    if (session.user?.role === 'EMPLOYEE') {
      // Employees can view their assigned tasks or tasks assigned to teams they're in
      const isMember = await checkTeamMembership(session.user.id, task.teamAssignments.map(ta => ta.teamId));
      
      if (task.assigneeId !== session.user.id && !isMember) {
        return NextResponse.json(
          { message: 'Access denied' },
          { status: 403 }
        )
      }
    } else if (session.user?.role === 'MANAGER') {
      // Managers can view their created tasks, assigned tasks, tasks assigned to their employees,
      // or tasks assigned to teams they lead
      const isAssignedToEmployee = task.assignee && 
        task.assignee.managerId === session.user.id;
      
      const isTeamLeader = await checkTeamLeadership(session.user.id, task.teamAssignments.map(ta => ta.teamId));
      
      if (
        task.creatorId !== session.user.id && 
        task.assigneeId !== session.user.id && 
        !isAssignedToEmployee &&
        !isTeamLeader
      ) {
        return NextResponse.json(
          { message: 'Access denied' },
          { status: 403 }
        )
      }
    }
    const enhancedTask = {
  ...task,
  taskOrigin: task.teamAssignments.length > 0 ? 'TEAM' : 'HIERARCHY',
  teamContext: task.teamAssignments.length > 0 ? {
    teamId: task.teamAssignments[0].team.id,
    teamName: task.teamAssignments[0].team.name,
    isTeamLeader: task.teamAssignments[0].team.leaderId === session.user?.id
  } : null
};
    
    return NextResponse.json(enhancedTask)
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update a task including team assignments
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Only HEAD and MANAGER can update tasks
    if (session.user?.role === 'EMPLOYEE') {
      return NextResponse.json(
        { message: 'Employees cannot update tasks' },
        { status: 403 }
      )
    }
    
    const { title, description, priority, assigneeId, dueDate, teamId } = await request.json()
    
    // Get the task first to check permissions
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        assignee: {
          select: {
            id: true,
            managerId: true,
          },
        },
        teamAssignments: true
      }
    })
    
    if (!task) {
      return NextResponse.json(
        { message: 'Task not found' },
        { status: 404 }
      )
    }
    
    // Check permissions based on role
    if (session.user?.role === 'MANAGER') {
      // Managers can update tasks they created or tasks assigned to their employees
      const isAssignedToEmployee = task.assignee && 
        task.assignee.managerId === session.user.id;
      
      const isTeamLeader = await checkTeamLeadership(session.user.id, task.teamAssignments.map(ta => ta.teamId));
      
      if (
        task.creatorId !== session.user.id && 
        task.assigneeId !== session.user.id && 
        !isAssignedToEmployee &&
        !isTeamLeader
      ) {
        return NextResponse.json(
          { message: 'Access denied' },
          { status: 403 }
        )
      }
      
      // If assigning to a new user, verify the manager can assign to them
      if (assigneeId && assigneeId !== task.assigneeId) {
        const assignee = await prisma.user.findUnique({
          where: { id: assigneeId },
        })
        
        if (!assignee || assignee.managerId !== session.user.id) {
          return NextResponse.json(
            { message: 'Cannot assign to this user' },
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
      if (session.user?.role === 'MANAGER' && team.leaderId !== session.user.id) {
        return NextResponse.json(
          { message: 'Cannot assign tasks to teams you do not lead' },
          { status: 403 }
        )
      }
    }
    
    // Update the task
    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(priority && { priority }),
        ...(assigneeId !== undefined && { assigneeId }),
        ...(dueDate && { dueDate: new Date(dueDate) })
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
            managerId: true,
          }
        },
        issues: true,
        teamAssignments: true
      }
    })
    
    // Handle team assignment if teamId is provided
    // Replace the team assignment code in the PUT function
    if (teamId) {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
      });
      
      if (!team) {
        return NextResponse.json(
          { message: 'Team not found' },
          { status: 404 }
        );
      }
      
      // Verify permissions - HEAD can assign to any team, MANAGER only to teams they lead
      if (session.user?.role === 'MANAGER' && team.leaderId !== session.user.id) {
        return NextResponse.json(
          { message: 'Cannot assign tasks to teams you do not lead' },
          { status: 403 }
        );
      }
      
      // Get existing team assignment if any
      const existingTeamTask = await prisma.teamTask.findFirst({
        where: {
          taskId: params.id,
        }
      });
      
      if (existingTeamTask) {
        if (existingTeamTask.teamId !== teamId) {
          // Update the team assignment if it's a different team
          await prisma.teamTask.update({
            where: { id: existingTeamTask.id },
            data: { teamId: teamId }
          });
          
          // Update task type
          await prisma.task.update({
            where: { id: params.id },
            data: { taskType: 'TEAM' }
          });
        }
      } else {
        // Create a new team assignment
        await prisma.teamTask.create({
          data: {
            taskId: params.id,
            teamId: teamId
          }
        });
        
        // Update task type
        await prisma.task.update({
          where: { id: params.id },
          data: { taskType: 'TEAM' }
        });
      }
    }
    
    // Fetch the updated task with all related data
    const finalTask = await prisma.task.findUnique({
      where: { id: params.id },
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
                teamMember: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })
    
    return NextResponse.json(finalTask)
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete task
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get the task first to check permissions
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            managerId: true, // Include managerId
          },
        },
        teamAssignments: {
          include: {
            team: true
          }
        }
      }
    })
    
    if (!task) {
      return NextResponse.json(
        { message: 'Task not found' },
        { status: 404 }
      )
    }
    
    // Check permissions based on role
    if (session.user?.role === 'EMPLOYEE') {
      // Employees can only delete tasks assigned to them
      if (task.assigneeId !== session.user.id) {
        return NextResponse.json(
          { message: 'Access denied' },
          { status: 403 }
        )
      }
    } else if (session.user?.role === 'MANAGER') {
      // Managers can delete tasks they created, tasks assigned to their employees,
      // or tasks assigned to teams they lead
      const isAssignedToEmployee = task.assignee && 
        task.assignee.managerId === session.user.id;
      
      const isTeamLeader = await checkTeamLeadership(session.user.id, task.teamAssignments.map(ta => ta.teamId));
      
      if (
        task.creatorId !== session.user.id && 
        task.assigneeId !== session.user.id && 
        !isAssignedToEmployee &&
        !isTeamLeader
      ) {
        return NextResponse.json(
          { message: 'Access denied' },
          { status: 403 }
        )
      }
    }
    
    // Delete team task assignments first
    await prisma.teamTask.deleteMany({
      where: { taskId: params.id }
    });
    
    // Then delete the task
    await prisma.task.delete({
      where: { id: params.id },
    })

    return NextResponse.json(
      { message: 'Task deleted successfully' },
      { status: 200 }
    )
  } catch (error) {   
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Add after your existing helper functions
async function canAccessTask(
  userId: string, 
  userRole: string, 
  task: any
): Promise<boolean> {
  // HEAD can access all tasks
  if (userRole === 'HEAD') return true;
  
  // Creator can access their own tasks
  if (task.creatorId === userId) return true;
  
  // Assignee can access their assigned tasks
  if (task.assigneeId === userId) return true;
  
  // For managers, check if assignee is their employee
  if (userRole === 'MANAGER' && task.assignee?.managerId === userId) return true;
  
  // Check team membership
  const isTeamMember = await checkTeamMembership(
    userId, 
    task.teamAssignments.map((ta: any) => ta.teamId)
  );
  if (isTeamMember) return true;
  
  return false;
}