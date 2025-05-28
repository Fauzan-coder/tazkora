// File: src/app/api/teams/[id]/permissions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth'
import { prisma } from '@/app/lib/db'
import { Role } from '@prisma/client'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // params is now a Promise
) {
  try {
    const { id: teamId } = await params // Await params before destructuring
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userId = session.user.id
    const userRole = session.user.role as Role

    // Check if team exists
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

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const isLeader = team.leaderId === userId
    const isHead = userRole === 'HEAD'
    const isManager = userRole === 'MANAGER'
    const isMember = team.members.length > 0

    return NextResponse.json({
      isLeader,
      isHead,
      isManager,
      isMember,
      canManageTasks: isLeader || isHead || isManager
    })
    
  } catch (error) {
    console.error('Error checking team permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}