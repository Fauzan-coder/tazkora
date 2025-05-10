// File: src/app/api/tasks/route.ts
// API endpoints for task management
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/lib/auth'
import { Session } from 'next-auth'
import { prisma } from '@/app/lib/db'
declare module 'next-auth' {
  interface Session {
    user?: {
      name?: string | null
      email?: string | null
      image?: string | null
      role?: string
      id?: string
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { title, description, priority, assigneeId, dueDate } = await request.json()
    
    // Only HEAD and MANAGER can create tasks
    if (session.user?.role === 'EMPLOYEE') {
      return NextResponse.json(
        { message: 'Employees cannot create tasks' },
        { status: 403 }
      )
    }
    
    // If assignee is specified, verify the current user can assign to them
    if (assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: assigneeId },
      })
      
      if (!assignee) {
        return NextResponse.json(
          { message: 'Assignee not found' },
          { status: 404 }
        )
      }
      
      // HEAD can assign to anyone
      if (session.user?.role === 'HEAD') {
        // No restrictions
      } 
      // MANAGER can only assign to their employees
      else if (session.user?.role === 'MANAGER') {
        if (assignee.managerId !== session.user.id) {
          return NextResponse.json(
            { message: 'Cannot assign tasks to users you do not manage' },
            { status: 403 }
          )
        }
      }
    }
    
    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || 'MEDIUM',
        creatorId: session.user?.id ?? '',
        assigneeId,
        dueDate: dueDate ? new Date(dueDate) : null,
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
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        }
      }
    })
    
    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get tasks based on user role
export async function GET(request: NextRequest) {
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
    
    let tasks
    
    // Filter conditions
    const statusFilter = status ? { status } : {}
    
    // HEAD can see all tasks
    if (session.user?.role === 'HEAD') {
      tasks = await prisma.task.findMany({
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
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          },
          issues: true,
        },
        orderBy: {
          createdAt: 'desc',
        }
      })
    } 
    // MANAGER can see tasks they created and tasks assigned to them or their employees
    else if (session.user?.role === 'MANAGER') {
      const managedEmployees = await prisma.user.findMany({
        where: {
          managerId: session.user.id,
        },
        select: {
          id: true,
        }
      })
      
    const employeeIds: string[] = managedEmployees.map((employee: { id: string }) => employee.id)
      
      tasks = await prisma.task.findMany({
        where: {
          ...statusFilter,
          OR: [
            { creatorId: session.user.id },
            { assigneeId: session.user.id },
            { assigneeId: { in: employeeIds } },
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
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          },
          issues: true,
        },
        orderBy: {
          createdAt: 'desc',
        }
      })
    } 
    // EMPLOYEE can see tasks assigned to them
    else {
      tasks = await prisma.task.findMany({
        where: {
          ...statusFilter,
          assigneeId: session.user?.id ?? '',
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
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          },
          issues: true,
        },
        orderBy: {
          createdAt: 'desc',
        }
      })
    }
    
    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
