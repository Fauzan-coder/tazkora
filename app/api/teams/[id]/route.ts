// app/api/teams/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth'
import { prisma } from '@/app/lib/db'
import { Role } from '@prisma/client'

// Helper function to check user permissions
async function checkTeamPermissions(teamId: string, userId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      leaderId: true,
      members: {
        where: { userId },
        select: { userId: true }
      }
    }
  })

  if (!team) return null

  const isLeader = team.leaderId === userId
  const isMember = team.members.length > 0

  return { isLeader, isMember }
}

// GET: Retrieve a specific team with its members and tasks
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userId = session.user.id!
    const userRole = session.user.role as Role

    // Get team with all relationships - Fixed to use 'projects' instead of 'project'
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
            description: true
          }
        },
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
        },
        tasks: {
          include: {
            task: {
              include: {
                assignee: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // HEAD and MANAGER can view any team
    if (userRole !== 'HEAD' && userRole !== 'MANAGER') {
      const permissions = await checkTeamPermissions(teamId, userId)
      if (!permissions?.isMember) {
        return NextResponse.json(
          { error: 'Forbidden: You are not a member of this team' }, 
          { status: 403 }
        )
      }
    }

    // Transform the data to match the expected format in the frontend
    const transformedTeam = {
      ...team,
      // For backward compatibility, include the first project as 'project'
      project: team.projects.length > 0 ? team.projects[0] : null,
      projectId: team.projects.length > 0 ? team.projects[0].id : null
    }

    return NextResponse.json(transformedTeam)
  } catch (error) {
    console.error('Error fetching team:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// PUT: Update team details
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userId = session.user.id!
    const userRole = session.user.role as Role

    // Verify team exists and get current leader
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        leaderId: true,
        name: true
      }
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Only HEAD or team leader can update
    if (userRole !== 'HEAD' && team.leaderId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: Only HEAD or team leader can update team details' }, 
        { status: 403 }
      )
    }

    const requestData = await req.json()
    
    // Prepare update data
    const updateData: {
      name?: string
      description?: string | null
      leaderId?: string | null
      updatedAt: Date
    } = {
      updatedAt: new Date()
    }

    if (requestData.name !== undefined) {
      updateData.name = requestData.name
    }

    if (requestData.description !== undefined) {
      updateData.description = requestData.description
    }

    if (requestData.leaderId !== undefined) {
      // Changing team leader requires HEAD role
      if (userRole !== 'HEAD') {
        return NextResponse.json(
          { error: 'Only HEAD can change team leader' }, 
          { status: 403 }
        )
      }

      if (requestData.leaderId === null || requestData.leaderId === '') {
        updateData.leaderId = null
      } else {
        // Verify new leader exists and has appropriate role
        const newLeader = await prisma.user.findUnique({
          where: { id: requestData.leaderId },
          select: { id: true, role: true }
        })
        
        if (!newLeader) {
          return NextResponse.json(
            { error: 'Leader not found' }, 
            { status: 404 }
          )
        }
        
        if (!['EMPLOYEE', 'MANAGER'].includes(newLeader.role)) {
          return NextResponse.json(
            { error: 'Leader must be an EMPLOYEE or MANAGER' }, 
            { status: 400 }
          )
        }
        
        updateData.leaderId = requestData.leaderId
        
        // Ensure new leader is a team member - Fixed compound key order
        await prisma.teamMember.upsert({
          where: {
            userId_teamId: {
              userId: requestData.leaderId,
              teamId
            }
          },
          create: {
            teamId,
            userId: requestData.leaderId
          },
          update: {}
        })
      }
    }

    // Update team
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: updateData,
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        projects: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    })

    // Transform for backward compatibility
    const transformedTeam = {
      ...updatedTeam,
      project: updatedTeam.projects.length > 0 ? updatedTeam.projects[0] : null,
      projectId: updatedTeam.projects.length > 0 ? updatedTeam.projects[0].id : null
    }

    return NextResponse.json(transformedTeam)
  } catch (error) {
    console.error('Error updating team:', error)
    return NextResponse.json(
      { error: 'Failed to update team' }, 
      { status: 500 }
    )
  }
}

// DELETE: Delete a team
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (session.user.role !== 'HEAD') {
      return NextResponse.json(
        { error: 'Forbidden: Only HEAD can delete teams' }, 
        { status: 403 }
      )
    }
    
    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId }
    })
    
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }
    
    // Delete team (cascade deletes will handle related records)
    await prisma.team.delete({
      where: { id: teamId }
    })
    
    return NextResponse.json({ message: 'Team deleted successfully' })
  } catch (error) {
    console.error('Error deleting team:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}