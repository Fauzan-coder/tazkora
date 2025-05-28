import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth'
import { Role } from '@prisma/client'

/**
 * GET - Get a specific update
 * Accessible by: Team members, HEAD, MANAGERS
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updateId = params.id

    // Fetch the update
    const update = await prisma.teamUpdate.findUnique({
      where: { id: updateId },
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
            team: true
          }
        },
        teamTask: {
          include: {
            task: true
          }
        }
      }
    })

    if (!update) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 })
    }

    // Check if user has permission to view this update
    const userRole = session.user.role
    const teamId = update.member.teamId

    // HEAD and MANAGERS can access all updates
    if (userRole === Role.HEAD || userRole === Role.MANAGER) {
      const transformedUpdate = {
        ...update,
        teamMember: update.member
      }
      return NextResponse.json(transformedUpdate)
    }

    // Check if user is part of the team
    const teamMembership = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: session.user.id,
          teamId
        }
      }
    })

    if (!teamMembership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const transformedUpdate = {
      ...update,
      teamMember: update.member
    }

    return NextResponse.json(transformedUpdate)
  } catch (error) {
    console.error('Error fetching team update:', error)
    return NextResponse.json({ error: 'Failed to fetch team update' }, { status: 500 })
  }
}

/**
 * PUT - Update an existing team update
 * Required fields: content
 * Authorization: Only the creator of the update can modify it
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updateId = params.id
    const { content } = await req.json()

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Fetch the update to check permissions
    const existingUpdate = await prisma.teamUpdate.findUnique({
      where: { id: updateId },
      include: {
        member: true
      }
    })

    if (!existingUpdate) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 })
    }

    // Verify the current user is the creator of the update
    if (existingUpdate.member.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only modify your own updates' },
        { status: 403 }
      )
    }

    // Update the content
    const updatedUpdate = await prisma.teamUpdate.update({
      where: { id: updateId },
      data: { content },
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
      }
    })

    const transformedUpdate = {
      ...updatedUpdate,
      teamMember: updatedUpdate.member
    }

    return NextResponse.json(transformedUpdate)
  } catch (error) {
    console.error('Error updating team update:', error)
    return NextResponse.json({ error: 'Failed to update team update' }, { status: 500 })
  }
}

/**
 * DELETE - Delete a team update
 * Authorization: Only HEAD, team leader, and the creator of the update can delete it
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updateId = params.id

    // Fetch the update to check permissions
    const existingUpdate = await prisma.teamUpdate.findUnique({
      where: { id: updateId },
      include: {
        member: {
          include: {
            team: true
          }
        }
      }
    })

    if (!existingUpdate) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 })
    }

    const userRole = session.user.role
    const teamId = existingUpdate.member.teamId
    const updateCreatorId = existingUpdate.member.userId
    const teamLeaderId = existingUpdate.member.team.leaderId

    // Check if user has permission to delete this update
    // 1. HEAD can delete any update
    // 2. Team leader can delete any update in their team
    // 3. Creator of the update can delete their own update
    if (
      userRole === Role.HEAD || 
      teamLeaderId === session.user.id || 
      updateCreatorId === session.user.id
    ) {
      await prisma.teamUpdate.delete({
        where: { id: updateId }
      })

      return NextResponse.json({ message: 'Update deleted successfully' })
    }

    return NextResponse.json(
      { error: 'You do not have permission to delete this update' },
      { status: 403 }
    )
  } catch (error) {
    console.error('Error deleting team update:', error)
    return NextResponse.json({ error: 'Failed to delete team update' }, { status: 500 })
  }
}