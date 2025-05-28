// File: app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcrypt'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/app/lib/db'
import { authOptions } from '@/app/lib/auth'
import { Role } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role } = await request.json()

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // For role assignment, we need to check current user's role
    let userRole = 'EMPLOYEE'
    
    // If the request is coming from an authenticated user (for creating managers/employees)
    const session = await getServerSession(authOptions)
    if (session && role) {
      // Only HEAD can create managers
      if (role === 'MANAGER' && session.user?.role !== 'HEAD') {
        return NextResponse.json(
          { message: 'Unauthorized to create managers' },
          { status: 403 }
        )
      }
      
      // Only HEAD and MANAGER can create employees
      if (!session.user || (session.user.role !== 'HEAD' && session.user.role !== 'MANAGER')) {
        return NextResponse.json(
          { message: 'Unauthorized to create users' },
          { status: 403 }
        )
      }
      
      userRole = role
    } else if (role) {
      // If no session but role specified, check if this is the first user (HEAD)
      const userCount = await prisma.user.count()
      if (userCount === 0) {
        userRole = 'HEAD' // First user is always HEAD
      } else {
        // Otherwise, default to EMPLOYEE for signups
        userRole = 'EMPLOYEE'
      }
    }

    // Hash password
    const hashedPassword = await hash(password, 10)

    // Create the user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: userRole as any,
        // If manager or employee, set managerId
        ...(session?.user?.role === 'MANAGER' && userRole === 'EMPLOYEE'
          ? { managerId: session.user.id }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get all users (for HEAD and MANAGER)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    if (session.user?.role !== 'HEAD' && session.user?.role !== 'MANAGER') {
      return NextResponse.json(
        { message: 'Forbidden' },
        { status: 403 }
      )
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const includeTeams = searchParams.get('includeTeams') === 'true'
    
    let users
    
    // Build select object with optional team memberships
    const selectObject = {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      managerId: true,
      ...(includeTeams && {
        teamMemberships: {
          select: {
            id: true,
            joinedAt: true,
            team: {
              select: {
                id: true,
                name: true,
                description: true,
                leaderId: true,
                project: {
                  select: {
                    id: true,
                    name: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
        ledTeams: {
          select: {
            id: true,
            name: true,
            description: true,
            project: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
      }),
    }
    
    // HEAD can see all users
    if (session.user.role === 'HEAD') {
      users = await prisma.user.findMany({
        select: selectObject,
      })
    } 
    // MANAGER can see only their employees
    else {
      users = await prisma.user.findMany({
        where: {
          managerId: session.user.id,
        },
        select: selectObject,
      })
    }
    
    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}