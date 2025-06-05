  'use client'
  import { useState, useEffect, use } from 'react'
  import { useSession } from 'next-auth/react'
  import { useRouter } from 'next/navigation'
  import Header from '@/app/components/layout/Header'
  import Sidebar from '@/app/components/layout/Sidebar'
  import TeamTasks from '@/app/components/teams/TeamTasks'
  import UserTasks from '@/app/components/dashboard/UserTasks'
  import TeamTaskList from '@/app/components/dashboard/TeamTaskList'
  // Types
  interface SessionUser {
    id: string;
    role: 'HEAD' | 'MANAGER' | 'EMPLOYEE';
  }

  interface Session {
    user?: SessionUser;
  }

  interface TeamMember {
    userId: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }

  interface Team {
    id: string;
    name: string;
    creatorId: string;
    leaderId: string;
    members: TeamMember[];
    leader: {
      id: string;
      name: string;
      email: string;
      role: string;
    } | null;
  }

  export default function TeamTasksPage({ params }: { params: Promise<{ id: string }> }) {
    const { data: session, status } = useSession()
    const router = useRouter()
    const resolvedParams = use(params)
    const [team, setTeam] = useState<Team | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'my-tasks' | 'team-tasks'>('my-tasks')
    
    useEffect(() => {
      if (status === 'loading') return
      
      if (!session) {
        router.push('/auth/signin')
        return
      }
      
      fetchTeamData()
    }, [session, status, resolvedParams.id])

    const fetchTeamData = async () => {
      try {
        setError(null)
        const response = await fetch(`/api/teams/${resolvedParams.id}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('Team not found')
          } else {
            setError('Failed to fetch team data')
          }
          return
        }
        
        const teamData = await response.json()
        setTeam(teamData)
        
        // Check if user has access to this team
        const userHasAccess = session?.user?.role === 'HEAD' || 
          teamData.creatorId === session?.user?.id || 
          teamData.leaderId === session?.user?.id || 
          teamData.members.some((member: TeamMember) => member.userId === session?.user?.id)
        
        if (!userHasAccess) {
          setError('You do not have access to this team')
          return
        }
        
        // Set default tab based on user role
        if (session?.user?.role === 'HEAD') {
          setActiveTab('team-tasks')
        }
        
      } catch (error) {
        console.error('Error fetching team data:', error)
        setError('Failed to load team data')
      } finally {
        setLoading(false)
      }
    }

    if (status === 'loading' || loading) {
      return (
        <div className="flex h-screen bg-gray-100">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header title="Loading..." />
            <main className="flex-1 overflow-auto p-8 bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
              </div>
            </main>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex h-screen bg-gray-100">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header title="Error" />
            <main className="flex-1 overflow-auto p-8 bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">{error}</p>
                <button 
                  onClick={fetchTeamData}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors mr-4"
                >
                  Retry
                </button>
                <button 
                  onClick={() => router.push('/dashboard/teams')}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Back to Teams
                </button>
              </div>
            </main>
          </div>
        </div>
      )
    }

    if (!session || !team) {
      return null
    }

    // Determine if user can manage tasks
    const canManage = session.user?.role === 'HEAD' || 
      team.leaderId === session.user?.id ||
      (session.user?.role === 'MANAGER' && team.creatorId === session.user?.id)
    
    // Check if user should see "My Tasks" section (HEAD doesn't have personal tasks)
    const showMyTasks = session.user?.role !== 'HEAD'
    
    return (
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title={`${team.name}: Tasks`} />
          <main className="flex-1 overflow-auto p-8 bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Team Overview */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-black tracking-tight">
                {team.name} Tasks
              </h1>
              <p className="text-gray-600 mt-1">
                {session.user?.role === 'HEAD' 
                  ? 'Manage and oversee all team tasks'
                  : 'View your personal tasks and team tasks'
                }
              </p>
            </div>

            {/* Task Sections Toggle */}
            <div className="mb-6">
              <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg w-fit">
                {showMyTasks && (
                  <button 
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:bg-gray-50 ${
                      activeTab === 'my-tasks' ? 'bg-white text-black shadow-sm' : 'text-gray-600'
                    }`}
                    onClick={() => setActiveTab('my-tasks')}
                  >
                    My Tasks
                  </button>
                )}
                <button 
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:bg-gray-50 ${
                    activeTab === 'team-tasks' ? 'bg-white text-black shadow-sm' : 'text-gray-600'
                  }`}
                  onClick={() => setActiveTab('team-tasks')}
                >
                  Team Tasks
                </button>
              </div>
            </div>

            {/* My Tasks Section - Only for MANAGER and EMPLOYEE */}
            {showMyTasks && activeTab === 'my-tasks' && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-black">My Tasks</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Your personal tasks sorted by priority and due date
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Urgent</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>High</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Medium</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span>Low</span>
                    </div>
                  </div>
                </div>
                <UserTasks 
                  userId={session.user?.id || ''}
                  teamId={resolvedParams.id}
                  sortByPriority={true}
                  showDueDateWarning={true}
                />
              </div>
            )}

            {/* Team Tasks Section */}
            {activeTab === 'team-tasks' && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-black">Team Tasks</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {canManage 
                        ? 'Manage tasks assigned to the team'
                        : 'View tasks assigned to your team'
                      }
                    </p>
                  </div>
                  {canManage && team.leader && (
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">Team Leader:</span> {team.leader.name}
                      {team.leader.email && ` (${team.leader.email})`}
                    </div>
                  )}
                </div>
                <TeamTaskList 
                  teamId={resolvedParams.id}
                  isTeamLeader={team.leaderId === session.user?.id}
                  isHead={session.user?.role === 'HEAD'}
                />
              </div>
            )}

            {/* Team Info Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-black mb-4">Team Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Team Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Team Leader:</span>
                      <span className="text-black font-medium">{team.leader?.name || 'Not assigned'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Members:</span>
                      <span className="text-black font-medium">{team.members.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Your Role:</span>
                      <span className="text-black font-medium">
                        {session.user?.role === 'HEAD' && 'Organization Head'}
                        {team.leaderId === session.user?.id && 'Team Leader'}
                        {team.creatorId === session.user?.id && team.leaderId !== session.user?.id && 'Team Creator'}
                        {team.leaderId !== session.user?.id && team.creatorId !== session.user?.id && session.user?.role !== 'HEAD' && 'Team Member'}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Team Members</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {team.leader && (
                      <div className="flex items-center space-x-2 text-sm">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 text-xs font-medium">L</span>
                        </div>
                        <span className="text-black">{team.leader.name}</span>
                        <span className="text-xs text-gray-500">(Leader)</span>
                      </div>
                    )}
                    {team.members.map((member) => (
                      <div key={member.userId} className="flex items-center space-x-2 text-sm">
                        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 text-xs font-medium">
                            {member.user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-black">{member.user.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }