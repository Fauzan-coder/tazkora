"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Calendar, CheckCircle, Clock, User, Crown, Settings } from 'lucide-react';

// Types
interface Team {
  id: string;
  name: string;
  description?: string;
  leaderId?: string;
  leader?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  _count?: {
    members: number;
    tasks: number;
  };
  memberCount?: number;
  taskCount?: number;
  completedTasks?: number;
  recentActivity?: string;
  projects?: Array<{
    id: string;
    name: string;
    status: string;
  }>;
}

interface TeamCardsProps {
  userId: string;
  userRole: 'HEAD' | 'MANAGER' | 'EMPLOYEE';
  onTeamClick?: (teamId: string) => void; // Made optional since we handle internally now
}

const TeamCards: React.FC<TeamCardsProps> = ({ userId, userRole, onTeamClick }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchUserTeams();
  }, [userId]);

  const fetchUserTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teams/user-teams');
      
      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }
      
      const data = await response.json();
      setTeams(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleTeamClick = (teamId: string) => {
    // Use the provided onTeamClick if available, otherwise use internal router
    if (onTeamClick) {
      onTeamClick(teamId);
    } else {
      router.push(`/dashboard/teams/${teamId}`);
    }
  };

  const getRoleIcon = (team: Team) => {
    if (userRole === 'HEAD') return <Crown className="w-4 h-4 text-yellow-500" />;
    if (team.leaderId === userId) return <Settings className="w-4 h-4 text-blue-500" />;
    return <User className="w-4 h-4 text-gray-500" />;
  };

  const getRoleText = (team: Team) => {
    if (userRole === 'HEAD') return 'Head';
    if (team.leaderId === userId) return 'Team Lead';
    return 'Member';
  };

  const getCompletionPercentage = (team: Team) => {
    const total = team.taskCount || team._count?.tasks || 0;
    const completed = team.completedTasks || 0;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-4"></div>
            <div className="h-3 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded mb-4"></div>
            <div className="flex space-x-4">
              <div className="h-8 bg-gray-200 rounded flex-1"></div>
              <div className="h-8 bg-gray-200 rounded flex-1"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600 mb-2">Error loading teams</p>
        <p className="text-red-500 text-sm">{error}</p>
        <button 
          onClick={fetchUserTeams}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Teams Found</h3>
        <p className="text-gray-600">You are not a member of any teams yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {teams.map((team) => {
        const completionPercentage = getCompletionPercentage(team);
        const memberCount = team.memberCount || team._count?.members || 0;
        const taskCount = team.taskCount || team._count?.tasks || 0;

        return (
          <div
            key={team.id}
            onClick={() => handleTeamClick(team.id)}
            className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer group"
          >
            {/* Header */}
            <div className="p-6 pb-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {team.name}
                  </h3>
                  {team.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {team.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-1 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                  {getRoleIcon(team)}
                  <span>{getRoleText(team)}</span>
                </div>
              </div>

              {/* Team Leader Info */}
              {team.leader && (
                <div className="flex items-center text-sm text-gray-600 mb-4">
                  <User className="w-4 h-4 mr-2" />
                  <span>Led by {team.leader.name}</span>
                </div>
              )}

              {/* Project Info */}
              {team.projects && team.projects.length > 0 && (
                <div className="flex items-center text-sm text-gray-600 mb-4">
                  <div className="flex flex-wrap gap-1">
                    {team.projects.slice(0, 2).map((project) => (
                      <span 
                        key={project.id}
                        className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs"
                      >
                        {project.name}
                      </span>
                    ))}
                    {team.projects.length > 2 && (
                      <span className="text-gray-500 text-xs">
                        +{team.projects.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="px-6 pb-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{memberCount}</p>
                    <p className="text-xs text-gray-500">Members</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{taskCount}</p>
                    <p className="text-xs text-gray-500">Tasks</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {taskCount > 0 && (
              <div className="px-6 pb-4">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{completionPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${completionPercentage}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {team.recentActivity && (
              <div className="px-6 pb-4">
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  <span>{team.recentActivity}</span>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 rounded-b-xl border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Team ID: {team.id.slice(0, 8)}...
                </span>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium group-hover:underline">
                  View Team →
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TeamCards;