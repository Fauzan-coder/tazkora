// File: app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/app/lib/db'
import { authOptions } from '@/app/lib/auth'

// GET user by ID with optional team memberships
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = params.id;
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const includeTeams = searchParams.get('includeTeams') === 'true'
    
    // HEAD can view any user
    // MANAGER can view only their employees
    // User can view their own profile
    const canViewUser = 
      session.user?.role === 'HEAD' || 
      (session.user?.role === 'MANAGER' && session.user?.id && await isUserManager(session.user.id, userId)) ||
      session.user?.id === userId;
      
    if (!canViewUser) {
      return NextResponse.json(
        { message: 'Forbidden' },
        { status: 403 }
      );
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        managerId: true,
        createdAt: true,
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
                  tasks: {
                    select: {
                      id: true,
                      task: {
                        select: {
                          id: true,
                          title: true,
                          description: true,
                          status: true,
                          priority: true,
                          dueDate: true,
                          assignee: {
                            select: {
                              id: true,
                              name: true,
                              email: true,
                            }
                          }
                        }
                      }
                    }
                  }
                },
              },
              updates: {
                select: {
                  id: true,
                  content: true,
                  createdAt: true,
                  teamTask: {
                    select: {
                      id: true,
                      task: {
                        select: {
                          id: true,
                          title: true,
                        }
                      }
                    }
                  }
                },
                orderBy: {
                  createdAt: 'desc'
                },
                take: 10,
              }
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
              members: {
                select: {
                  id: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      role: true
                    }
                  },
                  updates: {
                    select: {
                      id: true,
                      content: true,
                      createdAt: true,
                      teamTask: {
                        select: {
                          id: true,
                          task: {
                            select: {
                              id: true,
                              title: true
                            }
                          }
                        }
                      }
                    },
                    orderBy: {
                      createdAt: 'desc'
                    },
                    take: 5
                  }
                }
              },
              tasks: {
                select: {
                  id: true,
                  task: {
                    select: {
                      id: true,
                      title: true,
                      description: true,
                      status: true,
                      priority: true,
                      dueDate: true,
                      assignee: {
                        select: {
                          id: true,
                          name: true,
                          email: true,
                        }
                      }
                    }
                  },
                  updates: {
                    select: {
                      id: true,
                      content: true,
                      createdAt: true,
                      teamMember: {
                        select: {
                          user: {
                            select: {
                              id: true,
                              name: true
                            }
                          }
                        }
                      }
                    },
                    orderBy: {
                      createdAt: 'desc'
                    },
                    take: 5
                  }
                }
              }
            },
          }
        }),
      },
    });
    
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

// Helper function to check if a user is managed by a manager
async function isUserManager(managerId: string, userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { managerId: true }
  });
  
  return user?.managerId === managerId;
}