// app/api/teams/user-teams/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth'
import { prisma } from '@/app/lib/db'
import { Role, TaskStatus } from '@prisma/client'

// GET: Get all teams for the current user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userId = session.user.id!
    const userRole = session.user.role as Role

    let teams

    if (userRole === 'HEAD') {
      // HEAD can see all teams
      teams = await prisma.team.findMany({
        include: {
          leader: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          projects: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          _count: {
            select: {
              members: true,
              tasks: true
            }
          },
          tasks: {
            select: {
              task: {
                select: {
                  status: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    } else {
      // MANAGER and EMPLOYEE see only teams they're members of or leading
      teams = await prisma.team.findMany({
        where: {
          OR: [
            { leaderId: userId },
            {
              members: {
                some: {
                  userId: userId
                }
              }
            }
          ]
        },
        include: {
          leader: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          projects: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          _count: {
            select: {
              members: true,
              tasks: true
            }
          },
          tasks: {
            select: {
              task: {
                select: {
                  status: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    }

    // Transform the data to include additional computed fields
    const transformedTeams = teams.map(team => {
      const completedTasks = team.tasks.filter(
        teamTask => teamTask.task.status === TaskStatus.FINISHED
      ).length
      
      const totalTasks = team._count.tasks
      
      // Calculate recent activity (you might want to enhance this based on your schema)
      const recentActivity = team.updatedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ? `Updated ${Math.floor((Date.now() - new Date(team.updatedAt).getTime()) / (1000 * 60 * 60 * 24))} days ago`
        : 'No recent activity'

      return {
        id: team.id,
        name: team.name,
        description: team.description,
        leaderId: team.leaderId,
        leader: team.leader,
        projects: team.projects,
        memberCount: team._count.members,
        taskCount: totalTasks,
        completedTasks,
        recentActivity,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt
      }
    })

    return NextResponse.json(transformedTeams)
  } catch (error) {
    console.error('Error fetching user teams:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}