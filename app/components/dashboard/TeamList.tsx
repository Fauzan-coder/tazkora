'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface Team {
  id: string;
  name: string;
  description?: string;
  leader?: { name: string; email: string };
  members?: any[];
  tasks?: any[];
}

export default function TeamList({ projectId }: { projectId: string }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTeams() {
      try {
        const response = await fetch(`/api/teams?projectId=${projectId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch teams')
        }
        
        const data = await response.json()
        setTeams(data)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        setLoading(false)
      }
    }
    
    fetchTeams()
  }, [projectId])

  const handleRowClick = (teamId: string) => {
    router.push(`/dashboard/head/teams/${teamId}`)
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent"></div>
        <p className="mt-2 text-gray-500">Loading teams...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-500">
        Error loading teams: {error}
      </div>
    )
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-12 px-6">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No teams yet</h3>
          <p className="text-gray-500 mb-6">Get started by creating your first team for this project.</p>
          {session?.user?.role === 'HEAD' && (
            <Link 
              href={`/dashboard/head/projects/${projectId}/teams/new`} 
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create your first team
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
      <div className="overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-gray-200">
            <tr>
              <th scope="col" className="px-8 py-4 text-left text-sm font-semibold text-gray-700">
                Team Information
              </th>
              <th scope="col" className="px-8 py-4 text-left text-sm font-semibold text-gray-700">
                Team Leader
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {teams.map((team, index) => (
              <tr 
                key={team.id} 
                className={`hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 cursor-pointer transition-all duration-200 group ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                }`}
                onClick={() => handleRowClick(team.id)}
              >
                <td className="px-8 py-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-lg">
                          {team.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors duration-200">
                        {team.name}
                      </h3>
                      {team.description && (
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2 leading-relaxed" title={team.description}>
                          {team.description}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-md">
                        <span className="text-white font-medium text-sm">
                          {team.leader?.name ? team.leader.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?'}
                        </span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {team.leader?.name || 'Not assigned'}
                      </p>
                      {team.leader?.email && (
                        <p className="text-xs text-gray-500 truncate" title={team.leader.email}>
                          {team.leader.email}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}