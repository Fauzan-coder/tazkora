import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db'
import {getServerSession} from 'next-auth/next'
import { authOptions } from '@/app/lib/auth'

// Update task status
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
    
    const { status, priority, assigneeId } = await request.json()
    
    // Get the task first to check permissions
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            managerId: true, // Include managerId
          },
        },
      }
    })
    
    if (!task) {
      return NextResponse.json(
        { message: 'Task not found' },
        { status: 404 }
      )
    }
    
    // Check permissions based on role
    if (session.user && session.user.role === 'EMPLOYEE') {
      // Employees can only update status of tasks assigned to them
      if (task.assigneeId !== session.user.id) {
        return NextResponse.json(
          { message: 'Access denied' },
          { status: 403 }
        )
      }
      
      // Employees can only update the status, not other fields
      if (priority || assigneeId) {
        return NextResponse.json(
          { message: 'Employees can only update task status' },
          { status: 403 }
        )
      }
    } else if (session.user && session.user.role === 'MANAGER') {
      // Managers can update tasks they created or tasks assigned to their employees
      const isAssignedToEmployee = task.assignee && 
        task.assignee.managerId === session.user.id
      
      if (
        task.creatorId !== session.user.id && 
        task.assigneeId !== session.user.id && 
        !isAssignedToEmployee
      ) {
        return NextResponse.json(
          { message: 'Access denied' },
          { status: 403 }
        )
      }
      
      // If assigning to a new user, verify the manager can assign to them
      if (assigneeId && assigneeId !== task.assigneeId) {
        const assignee = await prisma.user.findUnique({
          where: { id: assigneeId },
        })
        
        if (!assignee || assignee.managerId !== session.user.id) {
          return NextResponse.json(
            { message: 'Cannot assign to this user' },
            { status: 403 }
          )
        }
      }
    }
    
    // Update the task
    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(session.user?.role !== 'EMPLOYEE' && priority && { priority }),
        ...(session.user?.role !== 'EMPLOYEE' && assigneeId && { assigneeId }),
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
            managerId: true, // Include managerId
          }
        },
        issues: true,
      }
    })
    
    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error('Error updating task:', error)
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
    
    // If userId is provided, fetch tasks for that user
    if (userId) {
      // Check permissions based on role for viewing user's tasks
      if (session.user?.role === 'EMPLOYEE') {
        // Employees can only view their own tasks
        if (userId !== session.user.id) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }
      } else if (session.user?.role === 'MANAGER') {
        // Managers can view their own tasks or tasks of employees they manage
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
      // Heads can view all tasks - no additional checks needed
      
      // Get active tasks for the user (ONGOING and BACKLOG, not FINISHED)
      const tasks = await prisma.task.findMany({
        where: {
          assigneeId: userId,
          status: {
            in: ['ONGOING', 'BACKLOG']
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      
      return NextResponse.json(tasks)
    }
    
    // Original code for fetching a single task by ID
    const task = await prisma.task.findUnique({
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
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        issues: {
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              }
            }
          }
        }
      }
    })
    
    if (!task) {
      return NextResponse.json(
        { message: 'Task not found' },
        { status: 404 }
      )
    }
    
    // Check permission to view the task
    if (session.user?.role === 'EMPLOYEE') {
      // Employees can only view their assigned tasks
      if (task.assigneeId !== session.user.id) {
        return NextResponse.json(
          { message: 'Access denied' },
          { status: 403 }
        )
      }
    } else if (session.user?.role === 'MANAGER') {
      // Managers can view their created tasks, assigned tasks, or tasks assigned to their employees
      const isAssignedToEmployee = task.assignee && 
        task.assignee.managerId === session.user.id
      
      if (
        task.creatorId !== session.user.id && 
        task.assigneeId !== session.user.id && 
        !isAssignedToEmployee
      ) {
        return NextResponse.json(
          { message: 'Access denied' },
          { status: 403 }
        )
      }
    }
    
    return NextResponse.json(task)
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete task
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
        
        // Get the task first to check permissions
        const task = await prisma.task.findUnique({
        where: { id: params.id },
        include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                managerId: true, // Include managerId
              },
            },
        }
        })
        
        if (!task) {
        return NextResponse.json(
            { message: 'Task not found' },
            { status: 404 }
        )
        }
        
        // Check permissions based on role
        if (session.user?.role === 'EMPLOYEE') {
        // Employees can only delete tasks assigned to them
        if (task.assigneeId !== session.user.id) {
            return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
            )
        }
        } else if (session.user?.role === 'MANAGER') {
        // Managers can delete tasks they created or tasks assigned to their employees
        const isAssignedToEmployee = task.assignee &&
            task.assignee.managerId === session.user.id

        if (
            task.creatorId !== session.user.id &&
            task.assigneeId !== session.user.id &&
            !isAssignedToEmployee
        ) {
            return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
            )
        }
        }
        
        // Delete the task
        await prisma.task.delete({
        where: { id: params.id },
        })

        return NextResponse.json(
        { message: 'Task deleted successfully' },
        { status: 200 }
        )
    } catch (error) {   
        console.error('Error deleting task:', error)
        return NextResponse.json(
        { message: 'Internal server error' },
        { status: 500 }
        )
    }
}