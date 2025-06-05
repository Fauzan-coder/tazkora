import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/lib/auth'
import { prisma } from '@/app/lib/db'

// Request updates from team members
export async function POST(
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
    
    const { message, memberId } = await request.json()
    
    if (!message) {
      return NextResponse.json(
        { message: 'Update request message is required' },
        { status: 400 }
      )
    }
    
    // Get the team to check permissions
    const team = await prisma.team.findUnique({
      where: { id: params.id },
      include: {
        members: {
          include: {
            user: true
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
    
    // Check if user is HEAD or team lead
    const isHead = session.user?.role === 'HEAD'
    const isTeamLead = team.teamLeadId === session.user?.id
    
    if (!isHead && !isTeamLead) {
      return NextResponse.json(
        { message: 'Only team lead or HEAD can request updates' },
        { status: 403 }
      )
    }
    
    // If memberId is provided, only send notification to that member
    if (memberId) {
      // Verify member is part of the team
    const isMember: boolean = team.members.some((member: { userId: string }) => member.userId === memberId)
      
      if (!isMember) {
        return NextResponse.json(
          { message: 'User is not a member of this team' },
          { status: 400 }
        )
      }
      
      // Create notification for the specific member
      const notification = await prisma.notification.create({
        data: {
          message: `${session.user?.name} requested an update: ${message}`,
          type: 'TASK_UPDATE_REQUESTED',
          userId: memberId
        }
      })
      
      return NextResponse.json({
        message: 'Update requested from team member',
        notification
      }, { status: 201 })
    } else {
      // Send notification to all team members except the requester
    interface NotificationData {
      message: string;
      type: 'TASK_UPDATE_REQUESTED';
      userId: string;
    }

    const notifications: NotificationData[] = await Promise.all(
      team.members
        .filter((member: { userId: string }) => member.userId !== session.user?.id)
        .map((member: { userId: string }) => 
        prisma.notification.create({
          data: {
            message: `${session.user?.name} requested an update: ${message}`,
            type: 'TASK_UPDATE_REQUESTED',
            userId: member.userId
          }
        })
        )
    );
      
      return NextResponse.json({
        message: 'Update requested from all team members',
        notificationsCount: notifications.length
      }, { status: 201 })
    }
    
  } catch (error) {
    console.error('Error requesting updates:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get all update requests for a team
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
    
    // Get the team to check permissions
    const team = await prisma.team.findUnique({
      where: { id: params.id },
      include: {
        members: {
          include: {
            user: true
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
    
    // Check if user is part of the team
    const isMember: boolean = team.members.some((member: { userId: string }) => member.userId === session.user?.id)
    const isHead = session.user?.role === 'HEAD'
    
    if (!isMember && !isHead) {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }
    
    // Get all team member IDs
    const memberIds: string[] = team.members.map((member: { userId: string }) => member.userId)
    
    // Get all update request notifications for this team's members
    const notifications = await prisma.notification.findMany({
      where: {
        userId: { in: memberIds },
        type: 'TASK_UPDATE_REQUESTED'
      },
      orderBy: {
        createdAt: 'desc'
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
    
    return NextResponse.json(notifications)
    
  } catch (error) {
    console.error('Error fetching update requests:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}