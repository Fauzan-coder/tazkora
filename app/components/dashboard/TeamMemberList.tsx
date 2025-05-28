'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Member {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface Leader {
  id: string;
  name: string;
  email: string;
}

export default function TeamMemberList({ 
  teamId, 
  members, 
  leader, 
  isTeamLeader, 
  isHead 
}: { 
  teamId: string; 
  members: Member[];
  leader: Leader;
  isTeamLeader: boolean;
  isHead: boolean;
}) {
  const router = useRouter()
  const [isRemovingMember, setIsRemovingMember] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRemoveMember = async (memberId: string) => {
    if (!isTeamLeader && !isHead) return
    
    setIsRemovingMember(true)
    setRemovingMemberId(memberId)
    setError(null)
    
    try {
      const response = await fetch(`/api/teams/${teamId}/members?userId=${memberId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to remove team member')
      }
      
      // Remove member from the list by refreshing the page
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member')
    } finally {
      setIsRemovingMember(false)
      setRemovingMemberId(null)
    }
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Team Members</h3>
        {(isTeamLeader || isHead) && (
          <button
            onClick={() => router.push(`/dashboard/teams/${teamId}/members/add`)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add Member
          </button>
        )}
      </div>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}
      
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {members.map((member) => {
            const isLeader = member.user.id === leader.id
            
            return (
              <li key={member.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900">{member.user.name}</p>
                      {isLeader && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          Team Leader
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{member.user.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{member.user.role}</p>
                  </div>
                  
                  {/* Show remove button for non-leader members if current user is team lead or HEAD */}
                  {(isTeamLeader || isHead) && !isLeader && (
                    <button
                      onClick={() => handleRemoveMember(member.user.id)}
                      disabled={isRemovingMember && removingMemberId === member.user.id}
                      className="text-red-600 hover:text-red-900 text-sm font-medium disabled:opacity-50"
                    >
                      {isRemovingMember && removingMemberId === member.user.id
                        ? 'Removing...'
                        : 'Remove'
                      }
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}