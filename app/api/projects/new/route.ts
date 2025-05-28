// app/api/projects/new/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { prisma } from '@/app/lib/db';

// GET: Return an empty project template for the 'new' project form
// Accessible by: HEAD only (since only HEAD can create projects)
export async function GET(req: NextRequest) {
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
  } catch (error) {
    console.error("Error creating project template:", error);
    return NextResponse.json(
      { error: "Failed to create project template" },
      { status: 500 }
    );
  }
}