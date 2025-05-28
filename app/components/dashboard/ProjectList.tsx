'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Project {
  id: string
  name: string;
  description: string
  startDate: string
  endDate?: string
  teams?: any[]
}

export default function ProjectList() {
  const { data: session } = useSession()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch('/api/projects')
        
        if (!response.ok) {
          throw new Error('Failed to fetch projects')
        }
        
        const data = await response.json()
        setProjects(data)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
        setLoading(false)
      }
    }
    
    fetchProjects()
  }, [])

  const handleRowClick = (projectId: string) => {
    router.push(`/dashboard/head/projects/${projectId}`)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-black border-t-transparent mb-4"></div>
        <p className="text-black font-medium">Loading projects...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 inline-block">
          <p className="text-red-600 font-medium">Error loading projects: {error}</p>
        </div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8">
          <p className="text-gray-600 font-medium mb-4">No projects found.</p>
          <Link 
            href="/dashboard/head/projects/new" 
            className="inline-flex items-center px-6 py-3 text-sm font-semibold text-white bg-black hover:bg-gray-800 transition-colors duration-200 rounded-full"
          >
            Create your first project
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-black uppercase tracking-wider">
                Project Name
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-black uppercase tracking-wider">
                Description
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-black uppercase tracking-wider">
                Start Date
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-black uppercase tracking-wider">
                End Date
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-black uppercase tracking-wider">
                Teams
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {projects.map((project) => (
              <tr 
                key={project.id} 
                onClick={() => handleRowClick(project.id)}
                className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-black">{project.name}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-700 line-clamp-2 max-w-xs">{project.description}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                    {new Date(project.startDate).toLocaleDateString()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                    project.endDate 
                      ? 'bg-blue-50 text-blue-700 border-blue-200' 
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}>
                    {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Not set'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                    {project.teams?.length || 0} {project.teams?.length === 1 ? 'Team' : 'Teams'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}