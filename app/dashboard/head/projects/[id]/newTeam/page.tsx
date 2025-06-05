'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function NewTeam({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the params Promise
  const unwrappedParams = React.use(params)
  const projectId = unwrappedParams.id
  
  const router = useRouter()
  const { data: session } = useSession()
  
  const [teamName, setTeamName] = useState('')
  const [teamDescription, setTeamDescription] = useState('')
  const [selectedLeaderId, setSelectedLeaderId] = useState('')
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch available users for team selection
  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch('/api/users')
        if (!response.ok) {
          throw new Error('Failed to fetch users')
        }
        const data = await response.json()
        setAvailableUsers(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users')
      }
    }

    fetchUsers()
  }, [])

  // Authorization check
  useEffect(() => {
    if (!session || !session.user) {
      router.push('/auth/signin')
      return
    }

    if (session.user.role !== 'HEAD') {
      router.push('/')
      return
    }
  }, [session, router])

  // Handle team leader selection
  const handleLeaderChange = (userId: string) => {
    setSelectedLeaderId(userId)
    
    // Automatically include leader in team members if not already selected
    if (!selectedMembers.includes(userId)) {
      setSelectedMembers([...selectedMembers, userId])
    }
  }

  // Handle member selection toggle
  const handleMemberToggle = (userId: string) => {
    if (selectedMembers.includes(userId)) {
      // If removing the leader as a member, also unset them as leader
      if (userId === selectedLeaderId) {
        setSelectedLeaderId('')
      }
      
      setSelectedMembers(selectedMembers.filter(id => id !== userId))
    } else {
      setSelectedMembers([...selectedMembers, userId])
    }
  }

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    // Validation
    if (!teamName.trim()) {
      setError('Team name is required')
      setIsSubmitting(false)
      return
    }

    if (!selectedLeaderId) {
      setError('Team leader must be selected')
      setIsSubmitting(false)
      return
    }

    if (selectedMembers.length === 0) {
      setError('At least one team member must be selected')
      setIsSubmitting(false)
      return
    }

    try {
      // Step 1: Create the team - FIXED: Send projectIds as array
      const teamResponse = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: teamName,
          description: teamDescription,
          projectIds: [projectId], // Changed from projectId to projectIds array
          leaderId: selectedLeaderId
        }),
      })

      if (!teamResponse.ok) {
        const errorData = await teamResponse.json()
        throw new Error(errorData.error || 'Failed to create team')
      }

      const teamData = await teamResponse.json()
      const teamId = teamData.id

      // Step 2: Add members to the team (except the leader who is already added)
      const membersToAdd = selectedMembers.filter(id => id !== selectedLeaderId)
      
      if (membersToAdd.length > 0) {
        const promises = membersToAdd.map(userId => 
          fetch(`/api/teams/${teamId}/members`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId }),
          })
        )
        
        await Promise.all(promises)
      }

      // Redirect back to project details
      router.push(`/dashboard/head/projects/${projectId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while creating the team')
      setIsSubmitting(false)
    }
  }

  if (!session) {
    return null // Loading or redirect handled by useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            href={`/dashboard/head/projects/${projectId}`}
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-semibold transition-colors duration-200 group"
          >
            <svg className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Project
          </Link>
          <h1 className="mt-4 text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Create New Team
          </h1>
          <p className="mt-2 text-slate-600">Build your team and assign roles for this project</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50/80 backdrop-blur-sm border-2 border-red-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.262 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-red-800 font-semibold">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-sm shadow-2xl border border-white/20 rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 px-8 py-6 border-b border-indigo-100">
            <h2 className="text-xl font-semibold text-slate-800 flex items-center">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              Team Configuration
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            <div className="space-y-8">
              {/* Team Name */}
              <div className="group">
                <label htmlFor="teamName" className="block text-sm font-semibold text-slate-700 mb-2">
                  Team Name *
                </label>
                <input
                  type="text"
                  id="teamName"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-4 py-3 text-black bg-white border-2 border-slate-200 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-slate-300"
                  placeholder="Enter team name"
                  required
                />
              </div>

              {/* Team Description */}
              <div className="group">
                <label htmlFor="teamDescription" className="block text-sm font-semibold text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  id="teamDescription"
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 text-black bg-white border-2 border-slate-200 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-slate-300 resize-none"
                  placeholder="Describe the team's purpose and goals"
                />
              </div>

              {/* Team Leader Selection */}
              <div className="group">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Team Leader *
                </label>
                <div className="bg-white border-2 border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    {availableUsers.length > 0 ? (
                      availableUsers.map((user) => (
                        <div key={user.id} className="flex items-center py-4 px-4 hover:bg-slate-50/80 transition-colors duration-150 border-b border-slate-100 last:border-b-0">
                          <input
                            type="radio"
                            id={`leader-${user.id}`}
                            name="teamLeader"
                            value={user.id}
                            checked={selectedLeaderId === user.id}
                            onChange={() => handleLeaderChange(user.id)}
                            className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                          />
                          <label htmlFor={`leader-${user.id}`} className="ml-4 block flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm font-semibold text-slate-900">{user.name}</span>
                                <span className="block text-sm text-slate-600">{user.email}</span>
                                <span className="inline-flex items-center px-2 py-1 mt-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                  {user.role}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 flex items-center justify-center">
                                  <span className="text-white font-semibold text-sm">
                                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </label>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 px-4 text-center">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent"></div>
                        <p className="mt-2 text-slate-500 text-sm">Loading users...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Team Members Selection */}
              <div className="group">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Team Members *
                </label>
                <p className="text-sm text-slate-600 mb-3">
                  Select team members (team leader will be automatically included)
                </p>
                <div className="bg-white border-2 border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="max-h-80 overflow-y-auto">
                    {availableUsers.length > 0 ? (
                      availableUsers.map((user) => (
                        <div key={user.id} className="flex items-center py-4 px-4 hover:bg-slate-50/80 transition-colors duration-150 border-b border-slate-100 last:border-b-0">
                          <input
                            type="checkbox"
                            id={`member-${user.id}`}
                            checked={selectedMembers.includes(user.id)}
                            onChange={() => handleMemberToggle(user.id)}
                            className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                          />
                          <label htmlFor={`member-${user.id}`} className="ml-4 block flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm font-semibold text-slate-900">{user.name}</span>
                                <span className="block text-sm text-slate-600">{user.email}</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                    {user.role}
                                  </span>
                                  {selectedLeaderId === user.id && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800">
                                      👑 Team Leader
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 flex items-center justify-center">
                                  <span className="text-white font-semibold text-sm">
                                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </label>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 px-4 text-center">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent"></div>
                        <p className="mt-2 text-slate-500 text-sm">Loading users...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Selected Members Summary */}
              {selectedMembers.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Selected Team Members ({selectedMembers.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedMembers.map((memberId) => {
                      const user = availableUsers.find(u => u.id === memberId)
                      if (!user) return null
                      return (
                        <span key={memberId} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-slate-700 shadow-sm">
                          {user.name}
                          {selectedLeaderId === user.id && ' 👑'}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200">
                <Link
                  href={`/dashboard/head/projects/${projectId}`}
                  className="px-6 py-3 border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 transform hover:-translate-y-0.5 shadow-sm hover:shadow-md"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>Create Team</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}