// app/api/projects/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { prisma } from '@/app/lib/db';
import { z } from "zod";

// Schema for updating a project
const projectUpdateSchema = z.object({
  name: z.string().min(1, "Project name is required").optional(),
  description: z.string().optional(),
  startDate: z.string().transform((str) => new Date(str)).optional(),
  endDate: z.string().transform((str) => new Date(str)).optional().nullable(),
  status: z.enum(["PLANNING", "ACTIVE", "COMPLETED", "ON_HOLD"]).optional(),
});

// GET: Retrieve a specific project by ID with its teams
// Accessible by: HEAD, MANAGERS, and EMPLOYEES who are team members
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Properly extract the id from params
    const { id: projectId } = await params;
    
    // Special case for 'new' project
    if (projectId === 'new') {
      // Check authentication
      const session = await getServerSession(authOptions);
      
      if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      
      // Check authorization (only HEAD can create projects)
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
      });
      
      if (!user || user.role !== "HEAD") {
        return NextResponse.json({ error: "Forbidden: Only HEAD can create projects" }, { status: 403 });
      }
      
      // Return an empty project template
      const emptyProject = {
        id: "new",
        name: "",
        description: "",
        startDate: new Date().toISOString().split('T')[0], // Today's date as default
        endDate: null,
        status: "PLANNING",
        teams: [],
        creator: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email
        }
      };
      
      return NextResponse.json(emptyProject);
    }
    
    // Rest of your existing GET logic for actual projects...
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check if the project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        teams: {
          include: {
            leader: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  },
                },
              },
            },
            tasks: {
              include: {
                task: true,
              },
            },
          },
        },
      },
    });
    
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    
    // Get user role and check authorization
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true,
        role: true 
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // HEAD and MANAGERS can access all projects
    if (user.role === "HEAD" || user.role === "MANAGER") {
      return NextResponse.json(project);
    }
    
    // EMPLOYEES can only access projects where they're team members
    if (user.role === "EMPLOYEE") {
      // Check if the user is a member of any team in this project
      const isTeamMember = await prisma.teamMember.findFirst({
        where: {
          userId: user.id,
          team: {
            projectId: projectId,
          },
        },
      });
      
      if (isTeamMember) {
        return NextResponse.json(project);
      } else {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}
// PUT: Update a project's details
// Authorization: Only HEAD can update projects
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check authorization (only HEAD can update projects)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });
    
    if (!user || user.role !== "HEAD") {
      return NextResponse.json({ error: "Forbidden: Only HEAD can update projects" }, { status: 403 });
    }
    
    // Check if the project exists
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
    });
    
    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    
    // Parse and validate request body
    const body = await req.json();
    
    const validationResult = projectUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const updateData = validationResult.data;
    
    // Update the project
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        teams: true,
      },
    });
    
    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a project (and all associated teams)
// Authorization: Only HEAD can delete projects
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check authorization (only HEAD can delete projects)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });
    
    if (!user || user.role !== "HEAD") {
      return NextResponse.json({ error: "Forbidden: Only HEAD can delete projects" }, { status: 403 });
    }
    
    // Check if the project exists
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
    });
    
    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    
    // Delete the project (cascading deletion of teams is handled by Prisma)
    await prisma.project.delete({
      where: { id: projectId },
    });
    
    return NextResponse.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}