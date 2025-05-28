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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href={`/dashboard/head/projects/${projectId}`}
        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
      >
        ← Back to Project
      </Link>
      
      <h1 className="mt-4 text-3xl font-bold text-gray-900">Create New Team</h1>
      <p className="mt-2 text-gray-600">Add a new team to your project and assign members.</p>
      
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div>
          <label htmlFor="teamName" className="block text-sm font-medium text-gray-700">
            Team Name *
          </label>
          <input
            type="text"
            id="teamName"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter team name"
            required
          />
        </div>
        
        <div>
          <label htmlFor="teamDescription" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="teamDescription"
            value={teamDescription}
            onChange={(e) => setTeamDescription(e.target.value)}
            rows={3}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Describe the team's purpose and goals"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Team Leader *
          </label>
          <div className="bg-white border border-gray-300 rounded-md shadow-sm">
            <div className="max-h-60 overflow-y-auto p-2">
              {availableUsers.length > 0 ? (
                availableUsers.map((user) => (
                  <div key={user.id} className="flex items-center py-2 px-3 hover:bg-gray-50">
                    <input
                      type="radio"
                      id={`leader-${user.id}`}
                      name="teamLeader"
                      value={user.id}
                      checked={selectedLeaderId === user.id}
                      onChange={() => handleLeaderChange(user.id)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <label htmlFor={`leader-${user.id}`} className="ml-3 block">
                      <span className="text-sm font-medium text-gray-900">{user.name}</span>
                      <span className="block text-sm text-gray-500">{user.email}</span>
                      <span className="block text-xs text-gray-400">{user.role}</span>
                    </label>
                  </div>
                ))
              ) : (
                <p className="py-2 px-3 text-gray-500 text-sm">Loading users...</p>
              )}
            </div>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Team Members *
          </label>
          <p className="text-sm text-gray-500 mb-2">
            Select team members (includes team leader)
          </p>
          <div className="bg-white border border-gray-300 rounded-md shadow-sm">
            <div className="max-h-60 overflow-y-auto p-2">
              {availableUsers.length > 0 ? (
                availableUsers.map((user) => (
                  <div key={user.id} className="flex items-center py-2 px-3 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      id={`member-${user.id}`}
                      checked={selectedMembers.includes(user.id)}
                      onChange={() => handleMemberToggle(user.id)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`member-${user.id}`} className="ml-3 block w-full">
                      <span className="text-sm font-medium text-gray-900">{user.name}</span>
                      <span className="block text-sm text-gray-500">{user.email}</span>
                      <span className="block text-xs text-gray-400">{user.role}</span>
                      {selectedLeaderId === user.id && (
                        <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                          Team Leader
                        </span>
                      )}
                    </label>
                  </div>
                ))
              ) : (
                <p className="py-2 px-3 text-gray-500 text-sm">Loading users...</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end pt-5">
          <Link
            href={`/dashboard/head/projects/${projectId}`}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Team'}
          </button>
        </div>
      </form>
    </div>
  )
}