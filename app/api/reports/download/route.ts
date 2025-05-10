// app/api/reports/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import { Role } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current user details
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email as string },
    });

    if (!currentUser) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Validate if user has permissions (HEAD or MANAGER only)
    if (currentUser.role !== Role.HEAD && currentUser.role !== Role.MANAGER) {
      return NextResponse.json(
        { message: 'Permission denied' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { userId, startDate, endDate } = body;

    if (!userId || !startDate || !endDate) {
      return NextResponse.json(
        { message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // If manager, ensure they're only accessing their direct reports
    if (currentUser.role === Role.MANAGER) {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!targetUser || targetUser.managerId !== currentUser.id) {
        return NextResponse.json(
          { message: 'Access denied: You can only view reports of your direct reports' },
          { status: 403 }
        );
      }
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'Target user not found' },
        { status: 404 }
      );
    }

    // Fetch tasks for the specified user and date range
    const tasks = await prisma.task.findMany({
      where: {
        assigneeId: userId,
        updatedAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        issues: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Fetch other issues (that may not be associated with tasks)
    const otherIssues = await prisma.issue.findMany({
      where: {
        creatorId: userId,
        taskId: null, // Only get issues not associated with tasks
        updatedAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Prepare CSV data
    let csvData = [];
    
    // CSV Header
    csvData.push([
      'Report Type',
      'Title',
      'Description',
      'Status',
      'Priority',
      'Created At',
      'Updated At',
      'Due Date',
    ]);

    // Add tasks data
    tasks.forEach(task => {
      csvData.push([
        'Task',
        task.title,
        task.description || '',
        task.status,
        task.priority,
        formatDate(task.createdAt),
        formatDate(task.updatedAt),
        task.dueDate ? formatDate(task.dueDate) : '',
      ]);

      // Add issues related to this task
      task.issues.forEach(issue => {
        csvData.push([
          'Issue (Task: ' + task.title + ')',
          issue.title,
          issue.description,
          issue.status,
          '',
          formatDate(issue.createdAt),
          formatDate(issue.updatedAt),
          '',
        ]);
      });
    });

    // Add standalone issues
    otherIssues.forEach(issue => {
      csvData.push([
        'Issue (Standalone)',
        issue.title,
        issue.description,
        issue.status,
        '',
        formatDate(issue.createdAt),
        formatDate(issue.updatedAt),
        '',
      ]);
    });

    // Generate CSV content
    const csv = unparse(csvData);

    // Get month name from date range
    const monthDate = new Date(startDate);
    const monthName = monthDate.toLocaleString('default', { month: 'long' });
    const year = monthDate.getFullYear();

    // Return CSV file
    const fileName = `${user.name.replace(/\s+/g, '-').toLowerCase()}-${monthName.toLowerCase()}-${year}-report.csv`;
    
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        // Add these headers to prevent caching issues
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { message: 'Error generating report', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Helper function to format dates consistently
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper function to unparse CSV (like Papa.unparse)
function unparse(data: any[][]): string {
  return data.map(row => 
    row.map(cell => 
      typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))
        ? `"${cell.replace(/"/g, '""')}"`
        : cell
    ).join(',')
  ).join('\n');
}