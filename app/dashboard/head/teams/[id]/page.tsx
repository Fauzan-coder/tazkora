'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X } from 'lucide-react'
import Header from '@/app/components/layout/Header'
import Sidebar from '@/app/components/layout/Sidebar'
import TeamMemberList from '@/app/components/dashboard/TeamMemberList'
import TeamTaskList from '@/app/components/dashboard/TeamTaskList'
import TeamUpdates from '@/app/components/dashboard/TeamUpdates'
import { use } from 'react';

// Inline AddMemberButton component
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

function AddMemberButton({ teamId }: { teamId: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  
  const openModal = () => {
    setIsModalOpen(true)
    fetchAvailableUsers()
  }
  
  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedUserId('')
    setError('')
  }
  
  // Fetch users that are not already team members
  const fetchAvailableUsers = async () => {
    setIsLoading(true)
    try {
      // First get all users
      const usersResponse = await fetch('/api/users')
      if (!usersResponse.ok) {
        throw new Error('Failed to fetch users')
      }
      const allUsers = await usersResponse.json()
      
      // Then get existing team members
      const membersResponse = await fetch(`/api/teams/${teamId}/members`)
      if (!membersResponse.ok) {
        throw new Error('Failed to fetch team members')
      }
      const teamMembers = await membersResponse.json()
      
      // Filter out users who are already team members
      interface TeamMember {
        user: {
          id: string;
        };
      }
      
      const memberIds: string[] = teamMembers.map((member: TeamMember) => member.user.id);
      
      interface FilteredUser {
        id: string;
        name: string;
        email: string;
        role: string;
      }
      
      const filteredUsers: FilteredUser[] = allUsers.filter((user: FilteredUser) => !memberIds.includes(user.id));
      
      setAvailableUsers(filteredUsers)
    } catch (err) {
      setError('Failed to load available users')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserId) {
      setError('Please select a user to add')
      return
    }
    
    setIsSubmitting(true)
    setError('')
    
    try {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: selectedUserId }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to add team member')
      }
      
      // Success - close modal and refresh
      closeModal()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
      >
        Add Member
      </button>
      
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-auto overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Add Team Member</h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-white rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4">
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {isLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="userId" className="block text-sm font-medium text-gray-700">
                      Select User
                    </label>
                    <select
                      id="userId"
                      name="userId"
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Select a user</option>
                      {availableUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name} - {user.email} ({user.role})
                        </option>
                      ))}
                    </select>
                    
                    {availableUsers.length === 0 && !isLoading && (
                      <p className="mt-2 text-sm text-gray-500">
                        No available users to add to this team.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isLoading || availableUsers.length === 0}
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400"
                >
                  {isSubmitting ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// Editable Field Component
// Enhanced EditableField Component with expandable description
function EditableField({
  value,
  onSave,
  fieldName,
  canEdit,
  type = 'text',
  placeholder = '',
  textArea = false,
  options = [],
}: {
  value: string;
  onSave: (fieldName: string, newValue: string) => Promise<void>;
  fieldName: string;
  canEdit: boolean;
  type?: string;
  placeholder?: string;
  textArea?: boolean;
  options?: { id: string; name: string; email?: string; }[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleEditToggle = () => {
    if (!canEdit) return;
    setIsEditing(true);
    setEditValue(value);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value);
    setError('');
  };

  const handleSubmit = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSave(fieldName, editValue);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update field');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to determine if text should be truncated
  const shouldTruncate = (text: string) => {
    return text.length > 200 || text.split('\n').length > 3;
  };

  // Helper function to truncate text
  const getTruncatedText = (text: string) => {
    const lines = text.split('\n');
    if (lines.length > 3) {
      return lines.slice(0, 3).join('\n');
    }
    return text.length > 200 ? text.substring(0, 200) + '...' : text;
  };

  if (isEditing) {
    return (
      <div className="relative">
        {error && (
          <div className="absolute -top-10 left-0 w-full bg-red-50 border-l-4 border-red-500 p-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="flex items-start gap-2">
          {textArea ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={placeholder}
              rows={6}
              disabled={isSubmitting}
            />
          ) : type === 'select' ? (
            <select
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isSubmitting}
            >
              <option value="">Select an option</option>
              {options.map(option => (
                <option key={option.id} value={option.id}>
                  {option.name}{option.email ? ` - ${option.email}` : ''}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={placeholder}
              disabled={isSubmitting}
            />
          )}
          <div className="flex flex-col gap-1">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="p-2 text-white bg-green-500 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancel}
              disabled={isSubmitting}
              className="p-2 text-white bg-gray-500 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Special handling for description field with expandable functionality
  if (fieldName === 'description' && textArea) {
    const hasLongContent = shouldTruncate(value);
    const displayText = hasLongContent && !isExpanded ? getTruncatedText(value) : value;

    return (
      <div className="group">
        <div className="flex items-start gap-2">
          <div className="flex-grow">
            {value ? (
              <div className="space-y-2">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {displayText}
                </div>
                {hasLongContent && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium focus:outline-none focus:underline"
                  >
                    {isExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            ) : (
              <span className="text-gray-400 italic">{placeholder}</span>
            )}
          </div>
          {canEdit && (
            <button
              onClick={handleEditToggle}
              className="p-1 text-gray-400 hover:text-indigo-600 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
              title="Edit description"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Display value with pencil icon for other fields
  return (
    <div className="group flex items-center gap-2">
      <div className="flex-grow">
        {fieldName === 'leaderId' && type === 'select' ? (
          <span>
            {options.find(option => option.id === value)?.name || 'Unassigned'}
          </span>
        ) : value ? (
          <span>{value}</span>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
      </div>
      {canEdit && (
        <button
          onClick={handleEditToggle}
          className="p-1 text-gray-400 hover:text-indigo-600 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Define the TeamDetailsPage component
interface PageParams {
  id: string;
}

export default function TeamDetailsPage({ params }: { params: Promise<PageParams> }) {
  const { id: teamId } = use(params);
  
  interface Session {
    user?: {
      id: string;
      role: string;
    };
  }
  
  const [session, setSession] = useState<Session | null>(null)
  interface Team {
    id: string;
    name: string;
    description: string;
    projectId: string;
    project?: {
      name: string;
    };
    leader?: {
      name: string;
      id: string;
      email: string;
    };
    members?: any[];
    tasks?: any[];
  }
  
  const [team, setTeam] = useState<Team | null>(null)
  const [isLeader, setIsLeader] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const router = useRouter()
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check if user is logged in
        const sessionRes = await fetch('/api/auth/session')
        if (!sessionRes.ok) {
          router.push('/auth/signin')
          return
        }
        
        const sessionData = await sessionRes.json()
        if (!sessionData || !sessionData.user) {
          router.push('/auth/signin')
          return
        }
        
        setSession(sessionData)
        
        // Fetch team data
        const teamRes = await fetch(`/api/teams/${teamId}`)
        
        if (!teamRes.ok) {
          if (teamRes.status === 404) {
            router.push('/dashboard/teams?error=team-not-found')
            return
          }
          throw new Error('Failed to fetch team data')
        }
        
        const teamData = await teamRes.json()
        setTeam(teamData)
        
        // Check if user is team leader
        const leaderRes = await fetch(`/api/teams/${teamId}/permissions`)
        if (leaderRes.ok) {
          const permData = await leaderRes.json()
          setIsLeader(permData.isLeader)
        }
        
        setIsLoading(false)
      } catch (error) {
        console.error('Error loading team data:', error)
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [teamId, router])

  // Function to handle field updates
  const handleFieldUpdate = async (fieldName: string, newValue: string) => {
    if (!team) return;
    setError('');
    setIsSubmitting(true);
    
    try {
      // Check if user is trying to change the leader but doesn't have permission
      if (fieldName === 'leaderId' && session?.user?.role !== 'HEAD' && newValue !== team.leader?.id) {
        throw new Error('You do not have permission to change the team leader');
      }
      
      // Create update payload
      const updateData: any = {};
      updateData[fieldName] = newValue;
      
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update team');
      }
      
      // Update local state
      if (fieldName === 'name') {
        setTeam(prev => prev ? { ...prev, name: newValue } : null);
      } else if (fieldName === 'description') {
        setTeam(prev => prev ? { ...prev, description: newValue } : null);
      } else if (fieldName === 'leaderId') {
        // This requires refetching to get updated leader information
        const teamRes = await fetch(`/api/teams/${teamId}`);
        if (!teamRes.ok) {
          throw new Error('Failed to refresh team data');
        }
        const teamData = await teamRes.json();
        setTeam(teamData);
      }
      
      setSuccessMessage('Successfully updated team information');
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating the team');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="Loading..." />
          <main className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </main>
        </div>
      </div>
    )
  }
  
  if (!team) {
    return null // Router will handle the redirect
  }

  const canEdit = isLeader || (session?.user?.role === 'HEAD');
  
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={`Team: ${team.name}`} />
        <main className="flex-1 overflow-auto p-8 bg-gradient-to-br from-gray-50 to-gray-100">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {successMessage && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">{successMessage}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Team Details Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-black tracking-tight relative group">
                <EditableField
                  value={team.name}
                  fieldName="name"
                  onSave={handleFieldUpdate}
                  canEdit={canEdit}
                  placeholder="Team Name"
                />
              </h1>
              <div className="flex space-x-4">
                <Link href="/dashboard/teams" 
                  className="inline-flex items-center justify-center px-4 py-2 bg-gray-200 border border-transparent rounded-md font-medium text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors">
                  Back to Teams
                </Link>
              </div>
            </div>
            <div className="text-gray-600 mt-2 relative group">
              <EditableField
                value={team.description}
                fieldName="description"
                onSave={handleFieldUpdate}
                canEdit={canEdit}
                textArea={true}
                placeholder="Add a description for this team"
              />
            </div>
            <div className="grid grid-cols-2 gap-6 mt-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Project</p>
                <Link href={`/dashboard/projects/${team.projectId}`} className="text-base text-blue-600 hover:underline">
                  {team.project?.name || 'Unknown Project'}
                </Link>
              </div>
              <div className="relative group">
                <p className="text-sm font-medium text-gray-500">Team Lead</p>
                <EditableField
                  value={team.leader?.id || ''}
                  fieldName="leaderId"
                  onSave={handleFieldUpdate}
                  canEdit={canEdit && session?.user?.role === 'HEAD'}
                  type="select"
                  placeholder="Unassigned"
                  options={team.members?.map(member => ({
                    id: member.user.id,
                    name: member.user.name,
                    email: member.user.email
                  })) || []}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Members</p>
                <p className="text-base text-black">{team.members?.length || 0}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Tasks</p>
                <p className="text-base text-black">{team.tasks?.length || 0}</p>
              </div>
            </div>
          </div>

          {/* Member Management */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Team Members Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-black">Team Members</h2>
                {canEdit && (
                  <AddMemberButton teamId={teamId} />
                )}
              </div>
              <TeamMemberList 
                teamId={teamId}
                members={team.members || []}
                leader={team.leader || { name: '', id: '', email: '' }}
                isTeamLeader={isLeader}
                isHead={session?.user?.role === 'HEAD'}
              />
            </div>

            {/* Team Tasks Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-black">Team Tasks</h2>
                {canEdit && (
              <>
                {canEdit && (
                <Link 
                  href={`/dashboard/head/teams/${teamId}/tasks`}
                  className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
                  Task Management
                </Link>
              )}
              </>
                )}
              </div>
              <TeamTaskList 
                teamId={teamId}
                isTeamLeader={isLeader}
                isHead={session?.user?.role === 'HEAD'}
              />
            </div>
          </div>

          {/* Team Updates */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-black">Team Updates</h2>
            </div>
            <TeamUpdates 
              teamId={teamId} 
              isTeamLeader={isLeader}
              isTeamMember={team?.members?.some(member => member.userId === session?.user?.id) || false}
            />
          </div>
        </main>
      </div>
    </div>
  )
}