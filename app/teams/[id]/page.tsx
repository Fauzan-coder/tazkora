// app/teams/[id]/page.tsx
import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/app/lib/auth'
import { prisma } from '@/app/lib/db'
import TeamHeader from '@/app/components/teams/TeamHeader'
import TeamMembers from '@/app/components/teams/TeamMembers'
import TeamTasks from '@/app/components/teams/TeamTasks'
import TeamStats from '@/app/components/teams/TeamStats'

export default async function TeamPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }
  
  const team = await prisma.team.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: {
          user: true,
        },
      },
      leader: true,
      creator: true,
      tasks: {
        include: {
          assignee: true,
          issues: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  })
  
  if (!team) {
    redirect('/teams')
  }
  
  // Check permissions
  const currentUser = await prisma.user.findUnique({
    where: { email: session.user?.email as string },
  })
  
  if (!currentUser) {
    redirect('/auth/signin')
  }
  
  const isMember = team.members.some(m => m.userId === currentUser.id)
  const isHigherRole = currentUser.role === 'HEAD' || 
                     (currentUser.role === 'MANAGER' && 
                      team.members.some(m => m.user.managerId === currentUser.id))
  
  if (!isMember && !isHigherRole) {
    redirect('/')
  }
  
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TeamHeader 
          team={team} 
          currentUser={currentUser} 
        />
        
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <TeamStats team={team} />
            <TeamTasks 
              team={team} 
              currentUser={currentUser} 
            />
          </div>
          
          <div className="space-y-6">
            <TeamMembers 
              team={team} 
              currentUser={currentUser} 
            />
          </div>
        </div>
      </div>
    </div>
  )
}