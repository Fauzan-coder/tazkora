// app/api/teams/overview/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth'
import { prisma } from '@/app/lib/db'
import { Role, TaskStatus } from '@prisma/client'

// GET: Get teams overview with summary statistics
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userId = session.user.id!
    const userRole = session.user.role as Role

    // Build the where clause based on user role
    let whereClause = {}
    
    if (userRole !== 'HEAD') {
      whereClause = {
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
      }
    }

    // Get teams with detailed statistics
    const teams = await prisma.team.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true,
        leaderId: true,
        createdAt: true,
        updatedAt: true,
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
            status: true,
            description: true
          }
        },
        members: {
          select: {
            userId: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                role: true
              }
            }
          }
        },
        tasks: {
          select: {
            task: {
              select: {
                id: true,
                status: true,
                priority: true,
                dueDate: true,
                createdAt: true,
                updatedAt: true
              }
            }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    // Transform data with rich statistics
    const transformedTeams = teams.map(team => {
      const tasks = team.tasks.map(t => t.task)
      const totalTasks = tasks.length
      const completedTasks = tasks.filter(task => task.status === TaskStatus.FINISHED).length
      const pendingTasks = tasks.filter(task => task.status === TaskStatus.BACKLOG).length
      const inProgressTasks = tasks.filter(task => task.status === TaskStatus.ONGOING).length
      
      // Calculate overdue tasks
      const overdueTasks = tasks.filter(task => 
        task.dueDate && 
        new Date(task.dueDate) < new Date() && 
        task.status !== TaskStatus.FINISHED
      ).length

      // High priority tasks
      const highPriorityTasks = tasks.filter(task => task.priority === 'HIGH').length

      // Recent activity calculation
      const recentTaskActivity = tasks.filter(task => 
        new Date(task.updatedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length

      const recentActivity = recentTaskActivity > 0 
        ? `${recentTaskActivity} task${recentTaskActivity > 1 ? 's' : ''} updated this week`
        : team.updatedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ? `Team updated ${Math.floor((Date.now() - new Date(team.updatedAt).getTime()) / (1000 * 60 * 60 * 24))} days ago`
        : 'No recent activity'

      // Member roles distribution
      const memberRoles = team.members.reduce((acc, member) => {
        acc[member.user.role] = (acc[member.user.role] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return {
        id: team.id,
        name: team.name,
        description: team.description,
        leaderId: team.leaderId,
        leader: team.leader,
        projects: team.projects,
        memberCount: team.members.length,
        memberRoles,
        taskStats: {
          total: totalTasks,
          completed: completedTasks,
          pending: pendingTasks,
          inProgress: inProgressTasks,
          overdue: overdueTasks,
          highPriority: highPriorityTasks
        },
        completionPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        recentActivity,
        isUserLeader: team.leaderId === userId,
        isUserMember: team.members.some(member => member.userId === userId),
        createdAt: team.createdAt,
        updatedAt: team.updatedAt
      }
    })

    // Calculate user-level summary
    const summary = {
      totalTeams: transformedTeams.length,
      teamsAsLeader: transformedTeams.filter(team => team.isUserLeader).length,
      teamsAsMember: transformedTeams.filter(team => team.isUserMember && !team.isUserLeader).length,
      totalTasks: transformedTeams.reduce((sum, team) => sum + team.taskStats.total, 0),
      totalCompletedTasks: transformedTeams.reduce((sum, team) => sum + team.taskStats.completed, 0),
      totalOverdueTasks: transformedTeams.reduce((sum, team) => sum + team.taskStats.overdue, 0),
      averageCompletionRate: transformedTeams.length > 0 
        ? Math.round(transformedTeams.reduce((sum, team) => sum + team.completionPercentage, 0) / transformedTeams.length)
        : 0
    }

    return NextResponse.json({
      teams: transformedTeams,
      summary
    })
  } catch (error) {
    console.error('Error fetching teams overview:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}