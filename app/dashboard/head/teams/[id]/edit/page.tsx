'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import React from 'react' // Import React to use React.use()
import Header from '@/app/components/layout/Header'
import Sidebar from '@/app/components/layout/Sidebar'

export default function EditTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = React.use(params);
  const teamId = resolvedParams.id;
  
  const [isLoading, setIsLoading] = useState(true)
  interface Team {
    name: string;
    description?: string;
    leader?: { id: string };
  }

  const [team, setTeam] = useState<Team | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    leaderId: ''
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  interface TeamMember {
    user: {
      id: string;
      name: string;
      email: string;
    };
  }
  const [availableLeaders, setAvailableLeaders] = useState<TeamMember[]>([])
  const [userRole, setUserRole] = useState('')
  const [isTeamLeader, setIsTeamLeader] = useState(false)
  const [canChangeLeader, setCanChangeLeader] = useState(false)
  
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
        
        setUserRole(sessionData.user.role || '')
        
        // Check if user has permission to edit team
        try {
          const permRes = await fetch(`/api/teams/${teamId}/permissions`)
          
          if (permRes.ok) {
            const permData = await permRes.json()
            setIsTeamLeader(permData.isLeader || false)
            
            // Determine if user can edit the team
            const canEditTeam = permData.isLeader || sessionData.user.role === 'HEAD'
            
            if (!canEditTeam) {
              router.push('/dashboard/teams')
              return
            }
          } else {
            // If permissions check fails, fall back to role-based check
            console.warn('Permission check failed, falling back to role-based permissions')
            const canEditTeam = sessionData.user.role === 'HEAD'
            
            if (!canEditTeam) {
              router.push('/dashboard/teams')
              return
            }
          }
        } catch (error) {
          console.error('Error checking permissions:', error)
          // If permission check throws an error, still allow HEAD users to proceed
          if (sessionData.user.role !== 'HEAD') {
            router.push('/dashboard/teams')
            return
          }
        }
        
        // Only HEAD role can change team leader
        setCanChangeLeader(sessionData.user.role === 'HEAD')
        
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
        
        setFormData({
          name: teamData.name || '',
          description: teamData.description || '',
          leaderId: teamData.leader?.id || ''
        })
        
        // Fetch team members to select potential leaders
        const membersRes = await fetch(`/api/teams/${teamId}/members`)
        if (!membersRes.ok) {
          throw new Error('Failed to fetch team members')
        }
        
        const membersData = await membersRes.json()
        setAvailableLeaders(membersData)
        
        setIsLoading(false)
      } catch (error) {
        console.error('Error loading team data:', error)
        setError('Failed to load team data')
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [teamId, router])
  
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({
        ...prev,
        [name as keyof FormData]: value
    }));
};
  
interface FormData {
    name: string;
    description: string;
    leaderId: string;
}

interface ErrorResponse {
    message: string;
}

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    
    try {
        // Check if user is trying to change the leader but doesn't have permission
        if (!canChangeLeader && formData.leaderId !== team?.leader?.id) {
          throw new Error('You do not have permission to change the team leader')
        }
        
        const response = await fetch(`/api/teams/${teamId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        
        if (!response.ok) {
            const errorData: ErrorResponse = await response.json()
            throw new Error(errorData.message || 'Failed to update team')
        }
        
        router.push(`/dashboard/teams/${teamId}`)
    } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An error occurred while updating the team')
    } finally {
        setIsSubmitting(false)
    }
}
  
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
    return null // Router will handle redirect
  }
  
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={`Edit Team: ${team.name}`} />
        <main className="flex-1 overflow-auto p-8 bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Edit Team</h1>
              <p className="text-gray-600 mt-1">Update team details and leadership</p>
            </div>
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
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
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Team Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    value={formData.description}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="leaderId" className="block text-sm font-medium text-gray-700">
                    Team Leader
                  </label>
                  <select
                    id="leaderId"
                    name="leaderId"
                    value={formData.leaderId}
                    onChange={handleInputChange}
                    disabled={!canChangeLeader}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                  >
                    <option value="">Select a team leader</option>
                    {availableLeaders.map(member => (
                      <option key={member.user.id} value={member.user.id}>
                        {member.user.name} - {member.user.email}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-sm text-gray-500">
                    {canChangeLeader 
                      ? "Team leader must be a member of the team" 
                      : "Only users with HEAD role can change the team leader"}
                  </p>
                </div>
                
                <div className="flex justify-end space-x-3 pt-5">
                  <Link
                    href={`/dashboard/teams/${teamId}`}
                    className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}