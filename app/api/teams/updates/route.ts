import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth'
import { Role } from '@prisma/client'

/**
 * GET - Get all updates with filtering options (teamId, taskId, userId)
 * Accessible by: Users who are part of the team
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const searchParams = req.nextUrl.searchParams
    const teamId = searchParams.get('teamId')
    const taskId = searchParams.get('taskId')
    const userId = searchParams.get('userId')

    // Build query filter
    const filter: any = {}

    if (teamId) {
      // Verify the user is part of the team or has appropriate role
      const teamMembership = await prisma.teamMember.findUnique({
        where: {
          userId_teamId: {
            userId: session.user.id,
            teamId
          }
        }
      })

      // Check if user is a team member, HEAD, or MANAGER
      if (!teamMembership && session.user.role !== Role.HEAD && session.user.role !== Role.MANAGER) {
        return NextResponse.json({ error: 'You do not have access to this team updates' }, { status: 403 })
      }

      // Filter by team members from this specific team
      const teamMembers = await prisma.teamMember.findMany({
        where: { teamId },
        select: { id: true }
      })

      interface TeamMember {
        id: string;
      }

            filter.memberId = {
              in: teamMembers.map((member: TeamMember) => member.id)
            }
    }

    if (taskId) {
      // Find team tasks with this taskId
      const teamTasks = await prisma.teamTask.findMany({
        where: { taskId },
        select: { id: true, taskId: true, teamId: true }
      })

      if (teamTasks.length > 0) {
        // Create an OR condition for matching taskId and teamId combinations
        interface TeamTask {
          taskId: string;
          teamId: string;
        }

        filter.OR = teamTasks.map((task: TeamTask): TeamTask => ({
          taskId: task.taskId,
          teamId: task.teamId
        }))
      } else {
        // No team tasks found, return empty result
        return NextResponse.json([])
      }
    }

    if (userId) {
      // Find team memberships for this user
      const userTeamMemberships = await prisma.teamMember.findMany({
        where: { userId },
        select: { id: true }
      })

      interface TeamMembership {
        id: string;
      }

      filter.memberId = {
        in: userTeamMemberships.map((membership: TeamMembership) => membership.id)
      }
    }

    // If no filters and not HEAD/MANAGER, get updates for teams the user is part of
    if (!teamId && !taskId && !userId && session.user.role !== Role.HEAD && session.user.role !== Role.MANAGER) {
      const userTeamMemberships = await prisma.teamMember.findMany({
        where: { userId: session.user.id },
        select: { id: true, teamId: true }
      })

      // If user is not part of any team, return empty array
      if (userTeamMemberships.length === 0) {
        return NextResponse.json([])
      }

      // Get all team members from the teams the user is part of
      interface UserTeamMembership {
        teamId: string;
      }
      
      const teamIds: string[] = userTeamMemberships.map((membership: UserTeamMembership) => membership.teamId)
      const allTeamMembers = await prisma.teamMember.findMany({
        where: { teamId: { in: teamIds } },
        select: { id: true }
      })

      interface TeamMember {
        id: string;
      }

      filter.memberId = {
        in: allTeamMembers.map((member: TeamMember) => member.id)
      }
    }

    // Fetch updates based on the filter
    const updates = await prisma.teamUpdate.findMany({
      where: filter,
      include: {
        member: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            team: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        teamTask: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
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

    // Transform the response to match expected format
    interface TeamUpdateMember {
      id: string;
      user: {
      id: string;
      name: string | null;
      email: string;
      };
      team: {
      id: string;
      name: string;
      };
    }

    interface TeamUpdateTask {
      task: {
      id: string;
      title: string;
      status: string;
      };
    }

    interface TeamUpdate {
      id: string;
      content: string;
      createdAt: Date;
      memberId: string;
      taskId: string | null;
      teamId: string | null;
      member: TeamUpdateMember;
      teamTask: TeamUpdateTask | null;
    }

    interface TransformedTeamUpdate extends Omit<TeamUpdate, 'member'> {
      teamMember: TeamUpdateMember;
    }

    const transformedUpdates: TransformedTeamUpdate[] = updates.map((update: TeamUpdate): TransformedTeamUpdate => ({
      ...update,
      teamMember: update.member, // Map member to teamMember for frontend compatibility
    }))

    return NextResponse.json(transformedUpdates)
  } catch (error) {
    console.error('Error fetching team updates:', error)
    return NextResponse.json({ error: 'Failed to fetch team updates' }, { status: 500 })
  }
}

/**
 * POST - Create a new update
 * Required fields: content, teamId, teamTaskId (optional)
 * Authorization: Any team member can post updates about their team's tasks
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { content, teamId, teamTaskId } = body

    if (!content || !teamId) {
      return NextResponse.json(
        { error: 'Missing required fields: content, teamId' },
        { status: 400 }
      )
    }

    // Find the user's team membership for this team
    const teamMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: session.user.id,
          teamId: teamId
        }
      },
      include: {
        team: true
      }
    })

    if (!teamMember) {
      return NextResponse.json(
        { error: 'You must be a member of this team to post updates' },
        { status: 403 }
      )
    }

    // If teamTaskId is provided, verify it exists and belongs to the same team
    let validatedTaskId = null
    let validatedTeamId = null
    
    if (teamTaskId) {
      const teamTask = await prisma.teamTask.findFirst({
        where: {
          id: teamTaskId,
          teamId: teamId
        }
      })

      if (!teamTask) {
        return NextResponse.json(
          { error: 'Invalid team task or task not associated with this team' },
          { status: 400 }
        )
      }
      
      validatedTaskId = teamTask.taskId
      validatedTeamId = teamTask.teamId
    }

    // Create the team update
    const update = await prisma.teamUpdate.create({
      data: {
        content,
        memberId: teamMember.id,
        taskId: validatedTaskId,
        teamId: validatedTeamId || teamId  // Ensure teamId is always set
      },
      include: {
        member: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            team: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        teamTask: validatedTaskId ? {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                status: true
              }
            }
          }
        } : undefined
      }
    })

    // Transform response to match expected format
    const transformedUpdate = {
      ...update,
      teamMember: update.member
    }

    return NextResponse.json(transformedUpdate, { status: 201 })
  } catch (error) {
    console.error('Error creating team update:', error)
    return NextResponse.json({ error: 'Failed to create team update' }, { status: 500 })
  }
}