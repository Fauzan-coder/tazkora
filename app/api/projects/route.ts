// app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import { z } from "zod";

// Schema for creating a new project
export interface ProjectInput {
    name: string;
    description?: string;
    startDate: Date;
    endDate?: Date | null;
    status?: "PLANNING" | "ACTIVE" | "COMPLETED" | "ON_HOLD";
}

export const projectSchema = z.object({
    name: z.string().min(1, "Project name is required"),
    description: z.string().optional(),
    startDate: z.string().transform((str) => new Date(str)),
    // Fixed endDate handling to properly handle empty strings
    endDate: z.string().optional().transform((str) => (str && str.trim() !== "" ? new Date(str) : null)),
    status: z.enum(["PLANNING", "ACTIVE", "COMPLETED", "ON_HOLD"]).default("PLANNING"),
});

// GET: Retrieve all projects (filterable by status)
// Accessible by: HEAD, MANAGERS
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check authorization (only HEAD and MANAGER can view all projects)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });
    
    if (!user || (user.role !== "HEAD" && user.role !== "MANAGER")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    // Get query parameters
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    
    // Build the where clause
    const where = status 
      ? { status: status as "PLANNING" | "ACTIVE" | "COMPLETED" | "ON_HOLD" } 
      : {};
    
    // Fetch projects
    const projects = await prisma.project.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        teams: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    
    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST: Create a new project
// Authorization: Only HEAD can create projects
export async function POST(req: NextRequest) {
  try {
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
    
    // Parse and validate the request body
    const body = await req.json();
    console.log("Request body:", body); // Add debugging
    
    const validationResult = projectSchema.safeParse(body);
    if (!validationResult.success) {
      console.error("Validation failed:", validationResult.error.format());
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { name, description, startDate, endDate, status } = validationResult.data;
    console.log("Validated data:", { name, description, startDate, endDate, status }); // Add debugging
    
    // Create the project
    const newProject = await prisma.project.create({
      data: {
        name,
        description,
        startDate,
        endDate, // This will be null if empty string was provided
        status: status || "PLANNING",
        creatorId: session.user.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Failed to create project: ${error.message}` },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}