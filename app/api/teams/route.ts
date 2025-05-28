// app/api/teams/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth'
import { prisma } from '@/app/lib/db'

// GET: Retrieve all teams (with optional filters for projectId)
// Accessible by: HEAD, MANAGERS
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user has appropriate role
    const role = session.user.role
    if (role !== 'HEAD' && role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 })
    }
    
    // Get projectId from query params if it exists
    const url = new URL(req.url)
    const projectId = url.searchParams.get('projectId')
    
    // Build query filter - using the many-to-many relationship
    const filter = projectId ? {
      projects: {
        some: {
          id: projectId
        }
      }
    } : {}
    
    // Fetch teams based on filter
    const teams = await prisma.team.findMany({
      where: filter,
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        leader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            members: true,
            tasks: true
          }
        }
      }
    })
    
    // Transform teams to include backward compatibility fields
    interface TeamFromDB {
      id: string;
      name: string;
      description?: string;
      projects: Array<{
        id: string;
        name: string;
        status: string;
      }>;
      leader: {
        id: string;
        name: string;
        email: string;
      };
      _count: {
        members: number;
        tasks: number;
      };
    }

    interface TransformedTeam extends TeamFromDB {
      project: {
        id: string;
        name: string;
        status: string;
      } | null;
      projectId: string | null;
    }

        const transformedTeams = teams.map((team: TeamFromDB): TransformedTeam => ({
          ...team,
          // For backward compatibility, include the first project as 'project'
          project: team.projects.length > 0 ? team.projects[0] : null,
          projectId: team.projects.length > 0 ? team.projects[0].id : null
        }))
    
    return NextResponse.json(transformedTeams)
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Create a new team
// Required fields: name, description (optional), projectIds (array), leaderId
// Authorization: Only HEAD can create teams
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user has HEAD role
    if (session.user.role !== 'HEAD') {
      return NextResponse.json({ error: 'Forbidden: Only HEAD can create teams' }, { status: 403 })
    }
    
    // Get request body - using projectIds array
    const { name, description, projectIds, leaderId } = await req.json()
    
    // Validate required fields
    if (!name || !projectIds || !Array.isArray(projectIds) || projectIds.length === 0 || !leaderId) {
      return NextResponse.json({ 
        error: 'Missing required fields. name, projectIds (non-empty array), and leaderId are required.' 
      }, { status: 400 })
    }
    
    // Verify all projects exist
    const projects = await prisma.project.findMany({
      where: { 
        id: { 
          in: projectIds 
        } 
      }
    })
    
    if (projects.length !== projectIds.length) {
      return NextResponse.json({ error: 'One or more projects not found' }, { status: 404 })
    }
    
    // Verify leader exists and is an employee or manager
    const leader = await prisma.user.findUnique({
      where: { id: leaderId }
    })
    
    if (!leader) {
      return NextResponse.json({ error: 'Leader not found' }, { status: 404 })
    }
    
    if (leader.role !== 'EMPLOYEE' && leader.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Leader must be an EMPLOYEE or MANAGER' }, { status: 400 })
    }
    
    // Create the team with project connections
    const team = await prisma.team.create({
      data: {
        name,
        description,
        leaderId,
        creatorId: session.user.id!,
        projects: {
          connect: projectIds.map(id => ({ id }))
        }
      },
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        projects: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
    
    // Also add the leader as a team member
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: leaderId
      }
    })
    
    // Transform for backward compatibility
    const transformedTeam = {
      ...team,
      project: team.projects.length > 0 ? team.projects[0] : null,
      projectId: team.projects.length > 0 ? team.projects[0].id : null
    }
    
    return NextResponse.json(transformedTeam, { status: 201 })
  } catch (error) {
    console.error('Error creating team:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}