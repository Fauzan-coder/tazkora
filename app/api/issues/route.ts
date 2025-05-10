import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { title, description, taskId } = await request.json()
    
    if (!title || !description) {
      return NextResponse.json(
        { message: 'Title and description are required' },
        { status: 400 }
      )
    }
    
    // If taskId is provided, verify the task exists
    if (taskId) {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
      })
      
      if (!task) {
        return NextResponse.json(
          { message: 'Task not found' },
          { status: 404 }
        )
      }
    }
    
    if (!session.user) {
      return NextResponse.json(
        { message: 'User information is missing in session' },
        { status: 400 }
      )
    }
    
    const issue = await prisma.issue.create({
      data: {
        title,
        description,
        creatorId: session.user.id,
        taskId: taskId || undefined,
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
        task: {
          select: {
            id: true,
            title: true,
          }
        }
      }
    })
    
    return NextResponse.json(issue, { status: 201 })
  } catch (error) {
    console.error('Error creating issue:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } } = { params: { id: '' } }
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
    const status = url.searchParams.get('status')
    const userId = url.searchParams.get('userId')
    
    // If a specific issue ID is provided and route params exist
    if (params && params.id && !userId) {
      // Fetch a specific issue by ID
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
      
      // Check permissions to view this issue
      if (session.user?.role === 'EMPLOYEE') {
        if (issue.creatorId !== session.user.id) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }
      } else if (session.user?.role === 'MANAGER') {
        const issueCreator = await prisma.user.findUnique({
          where: { id: issue.creatorId }
        })
        
        if (
          issue.creatorId !== session.user.id &&
          (!issueCreator || issueCreator.managerId !== session.user.id)
        ) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }
      }
      
      return NextResponse.json(issue)
    }
    
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
        // Managers can view their own issues or issues of employees they manage
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
    
    // Filter conditions for listing all issues
    const statusFilter = status ? { status } : {}
    
    let issues
    
    // HEAD can see all issues
    if (session.user?.role === 'HEAD') {
      issues = await prisma.issue.findMany({
        where: statusFilter,
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
        },
        orderBy: {
          createdAt: 'desc',
        }
      })
    } 
    // MANAGER can see issues they created and issues from their employees
    else if (session.user?.role === 'MANAGER') {
      const managedEmployees = await prisma.user.findMany({
        where: {
          managerId: session.user?.id,
        },
        select: {
          id: true,
        }
      })
      
      const employeeIds: string[] = managedEmployees.map((employee: { id: string }) => employee.id)
      
      issues = await prisma.issue.findMany({
        where: {
          ...statusFilter,
          OR: [
            { creatorId: session.user.id },
            { creatorId: { in: employeeIds } },
          ]
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
          task: {
            select: {
              id: true,
              title: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc',
        }
      })
    } 
    // EMPLOYEE can see only their issues
    else if (session.user) {
      issues = await prisma.issue.findMany({
        where: {
          ...statusFilter,
          creatorId: session.user.id,
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
          task: {
            select: {
              id: true,
              title: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc',
        }
      })
    } else {
      return NextResponse.json(
        { message: 'User information is missing in session' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(issues)
  } catch (error) {
    console.error('Error fetching issues:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
