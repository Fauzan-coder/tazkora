import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth'
import { prisma } from '@/app/lib/db'
import { Role } from '@prisma/client'

// GET: Get all members of a specific team
// Accessible by: HEAD, MANAGERS, and team members
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params // Await params before accessing properties
    const session = await getServerSession(authOptions)
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userId = session.user.id!
    const userRole = session.user.role as Role
    
    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId }
    })
    
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }
    
    // Check permissions: HEAD and MANAGERS can view any team members
    // Others can only view if they are a member of the team
    if (userRole !== 'HEAD' && userRole !== 'MANAGER') {
      const isMember = await prisma.teamMember.findUnique({
        where: {
          userId_teamId: { // Fixed: use correct constraint name
            teamId,
            userId
          }
        }
      })
      
      if (!isMember) {
        return NextResponse.json({ error: 'Forbidden: You are not a member of this team' }, { status: 403 })
      }
    }
    
    // Get all team members with their user details
    const members = await prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        _count: {
          select: {
            updates: true
          }
        }
      },
      orderBy: {
        joinedAt: 'asc'
      }
    })
    
    return NextResponse.json(members)
  } catch (error) {
    console.error('Error fetching team members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Add a member to a team
// Required field: userId
// Authorization: Only HEAD and team leader can add members
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params // Await params before accessing properties
    const session = await getServerSession(authOptions)
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const currentUserId = session.user.id!
    const userRole = session.user.role as Role
    
    // Get the team to check if the current user is the leader
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        leaderId: true,
        name: true
      }
    })
    
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }
    
    // Check permissions: Only HEAD or team leader can add members
    if (userRole !== 'HEAD' && team.leaderId !== currentUserId) {
      return NextResponse.json({ error: 'Forbidden: Only HEAD or team leader can add members' }, { status: 403 })
    }
    
    // Get the user ID from the request body
    const { userId } = await req.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }
    
    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Check if the user is already a member of the team
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: { // Fixed: use correct constraint name
          teamId,
          userId
        }
      }
    })
    
    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this team' }, { status: 400 })
    }
    
    // Add the user to the team
    const newMember = await prisma.teamMember.create({
      data: {
        teamId,
        userId
      },
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
    })
    
    return NextResponse.json(newMember, { status: 201 })
  } catch (error) {
    console.error('Error adding team member:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Remove a member from a team
// Query parameter: userId
// Authorization: Only HEAD and team leader can remove members
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params // Await params before accessing properties
    const session = await getServerSession(authOptions)
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const currentUserId = session.user.id!
    const userRole = session.user.role as Role
    
    // Get the team to check if the current user is the leader
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        leaderId: true
      }
    })
    
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }
    
    // Check permissions: Only HEAD or team leader can remove members
    const isTeamLeader = team.leaderId === currentUserId
    if (userRole !== 'HEAD' && !isTeamLeader) {
      return NextResponse.json({ error: 'Forbidden: Only HEAD or team leader can remove members' }, { status: 403 })
    }
    
    // Get the user ID from the URL query params
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'userId query parameter is required' }, { status: 400 })
    }
    
    // Can't remove the team leader
    if (team.leaderId === userId) {
      return NextResponse.json({ error: 'Cannot remove the team leader. Assign a new leader first.' }, { status: 400 })
    }
    
    // Check if the user is a member of the team
    const teamMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: { // Fixed: use correct constraint name
          teamId,
          userId
        }
      }
    })
    
    if (!teamMember) {
      return NextResponse.json({ error: 'User is not a member of this team' }, { status: 404 })
    }
    
    // Remove the user from the team
    await prisma.teamMember.delete({
      where: {
        id: teamMember.id
      }
    })
    
    return NextResponse.json({ message: 'Team member removed successfully' })
  } catch (error) {
    console.error('Error removing team member:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}