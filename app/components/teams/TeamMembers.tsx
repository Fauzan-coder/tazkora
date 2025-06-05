'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Loader2, UserMinus, CheckCircle, AlertCircle } from 'lucide-react'
import { formatDistanceToNow as dateFnsFormatDistanceToNow } from 'date-fns'

// Inline DeleteConfirmation modal
function DeleteConfirmation({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="mb-4 text-gray-700">{message}</p>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

type User = {
  id: string
  name: string
  email: string
  role: string
}

type TeamMember = {
  id: string
  joinedAt: string
  user: User
}

type Team = {
  id: string
  teamLead: User
  members: TeamMember[]
}

interface TeamMembersProps {
  teamId: string
  onMemberUpdate?: () => void
}

export default function TeamMembers({ teamId, onMemberUpdate }: TeamMembersProps) {
  const { data: session } = useSession()
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null)

  const isHead = session?.user?.role === 'HEAD'
  const isTeamLead = team?.teamLead.id === session?.user?.id
  const canManageTeam = isHead || isTeamLead

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/teams/${teamId}/members`)
        
        if (!res.ok) {
          throw new Error('Failed to fetch team members')
        }
        
        const data = await res.json()
        setTeam(data)
      } catch (err) {
        console.error('Error fetching team members:', err)
        setError('Failed to load team members. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    if (teamId) {
      fetchTeamMembers()
    }
  }, [teamId])

  const handleRemoveMember = async () => {
    if (!deletingMemberId) return
    
    try {
      const res = await fetch(`/api/teams/${teamId}/members/${deletingMemberId}`, {
        method: 'DELETE',
      })
      
      if (!res.ok) {
        throw new Error('Failed to remove team member')
      }
      
      // Update the local state
      setTeam(prev => {
        if (!prev) return null
        return {
          ...prev,
          members: prev.members.filter(member => member.id !== deletingMemberId)
        }
      })
      
      // Call onMemberUpdate if provided
      if (onMemberUpdate) {
        onMemberUpdate()
      }
    } catch (err) {
      console.error('Error removing team member:', err)
      setError('Failed to remove team member. Please try again.')
    } finally {
      setDeletingMemberId(null)
    }
  }

  const handleMakeTeamLead = async (userId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamLeadId: userId }),
      })
      
      if (!res.ok) {
        throw new Error('Failed to update team lead')
      }
      
      const updatedTeam = await res.json()
      setTeam(updatedTeam)
      
      // Call onMemberUpdate if provided
      if (onMemberUpdate) {
        onMemberUpdate()
      }
    } catch (err) {
      console.error('Error updating team lead:', err)
      setError('Failed to update team lead. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-md flex items-center">
        <AlertCircle className="h-5 w-5 mr-2" />
        <span>{error}</span>
      </div>
    )
  }

  if (!team || team.members.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No team members found.</p>
      </div>
    )
  }

  function formatDistanceToNow(date: Date, options: { addSuffix: boolean }) {
    return dateFnsFormatDistanceToNow(date, options)
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
              {canManageTeam && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {team.members.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                      {member.user.name.charAt(0)}
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {member.user.name}
                        {member.user.id === team.teamLead.id && (
                          <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded">Lead</span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.user.role}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })}
                </td>
                {canManageTeam && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end space-x-2">
                      {/* Make team lead button (only visible for non-leads and if current user is HEAD) */}
                      {isHead && member.user.id !== team.teamLead.id && (
                        <button
                          onClick={() => handleMakeTeamLead(member.user.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Make team lead"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                      )}
                      
                      {/* Cannot remove team lead or yourself */}
                      {member.user.id !== team.teamLead.id && member.user.id !== session?.user?.id && (
                        <button
                          onClick={() => setDeletingMemberId(member.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Remove from team"
                        >
                          <UserMinus className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete member confirmation */}
      {deletingMemberId && (
        <DeleteConfirmation
          title="Remove Team Member"
          message="Are you sure you want to remove this member from the team?"
          confirmLabel="Remove Member"
          onConfirm={handleRemoveMember}
          onCancel={() => setDeletingMemberId(null)}
        />
      )}
    </>
  )
}