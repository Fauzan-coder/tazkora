import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/lib/auth'

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
    
    const { status } = await request.json()
    
    // Get the issue first to check permissions
    const issue = await prisma.issue.findUnique({
      where: { id: params.id },
    })
    
    if (!issue) {
      return NextResponse.json(
        { message: 'Issue not found' },
        { status: 404 }
      )
    }
    
    // Check permissions based on role
    if (session.user && session.user.role === 'EMPLOYEE') {
      // Employees can only update their own issues
      if (issue.creatorId !== session.user.id) {
        return NextResponse.json(
          { message: 'Access denied' },
          { status: 403 }
        )
      }
    } else if (session.user && session.user.role === 'MANAGER') {
      // Managers can update their own issues and their employees' issues
      const isEmployeeIssue = await prisma.user.findFirst({
        where: {
          id: issue.creatorId,
          managerId: session.user.id,
        },
      })
      
      if (issue.creatorId !== session.user.id && !isEmployeeIssue) {
        return NextResponse.json(
          { message: 'Access denied' },
          { status: 403 }
        )
      }
    }
    
    // Update the issue
    const updatedIssue = await prisma.issue.update({
      where: { id: params.id },
      data: { status },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        task: {
          select: {
            id: true,
            title: true,
          }
        }
      }
    })
    
    return NextResponse.json(updatedIssue)
  } catch (error) {
    console.error('Error updating issue:', error)
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
    
    // If userId is provided, fetch issues for that user
    if (userId) {
      // Check permissions based on role for viewing user's issues
      if (session.user?.role === 'EMPLOYEE') {
        // Employees can only view their own issues
        if (userId !== session.user.id) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }
      } else if (session.user?.role === 'MANAGER') {
        // Managers can view their own issues or issues created by employees they manage
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
      // Heads can view all issues - no additional checks needed
      
      // Get open issues for the user (OPEN and IN_PROGRESS, not RESOLVED or CLOSED)
      const issues = await prisma.issue.findMany({
        where: {
          creatorId: userId,
          status: {
            in: ['OPEN', 'IN_PROGRESS']
          }
        },
        include: {
          task: {
            select: {
              id: true,
              title: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      
      return NextResponse.json(issues)
    }
    
    // Original code for fetching a single issue by ID
    const issue = await prisma.issue.findUnique({
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
        task: {
          select: {
            id: true,
            title: true,
          }
        }
      }
    })
    
    if (!issue) {
      return NextResponse.json(
        { message: 'Issue not found' },
        { status: 404 }
      )
    }
    
    // Check permission to view the issue
    if (session.user && session.user.role === 'EMPLOYEE') {
      // Employees can only view their own issues
      if (issue.creatorId !== session.user.id) {
        return NextResponse.json(
          { message: 'Access denied' },
          { status: 403 }
        )
      }
    } else if (session.user && session.user.role === 'MANAGER') {
      // Managers can view their own issues and their employees' issues
      const isEmployeeIssue = await prisma.user.findFirst({
        where: {
          id: issue.creatorId,
          managerId: session.user.id,
        },
      })
      
      if (issue.creatorId !== session.user.id && !isEmployeeIssue) {
        return NextResponse.json(
          { message: 'Access denied' },
          { status: 403 }
        )
      }
    }
    
    return NextResponse.json(issue)
  } catch (error) {
    console.error('Error fetching issue:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
    
    // Get the issue first to check permissions
    const issue = await prisma.issue.findUnique({
      where: { id: params.id },
    })
    
    if (!issue) {
      return NextResponse.json(
        { message: 'Issue not found' },
        { status: 404 }
      )
    }
    
    // Only HEAD can delete issues
    if (!session.user || session.user.role !== 'HEAD') {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }
    
    // Delete the issue
    await prisma.issue.delete({
      where: { id: params.id },
    })
    
    return NextResponse.json(
      { message: 'Issue deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting issue:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}