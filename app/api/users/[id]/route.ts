// File: app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcrypt'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/app/lib/db'
import { authOptions } from '@/app/lib/auth'

// PATCH handler for updating a user's manager
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only HEAD can reassign managers
    if (!session || session.user?.role !== 'HEAD') {
      return NextResponse.json(
        { message: 'Unauthorized to assign managers' },
        { status: 403 }
      );
    }
    
    const { managerId } = await request.json();
    const userId = params.id;
    
    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Validate user is an EMPLOYEE
    if (user.role !== 'EMPLOYEE') {
      return NextResponse.json(
        { message: 'Only employees can be assigned to managers' },
        { status: 400 }
      );
    }
    
    // If managerId is provided, validate manager exists and is a MANAGER
    if (managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
      });
      
      if (!manager) {
        return NextResponse.json(
          { message: 'Manager not found' },
          { status: 404 }
        );
      }
      
      if (manager.role !== 'MANAGER') {
        return NextResponse.json(
          { message: 'Can only assign to users with MANAGER role' },
          { status: 400 }
        );
      }
    }
    
    // Update user's manager
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { managerId: managerId || null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        managerId: true,
      },
    });
    
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating manager assignment:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}