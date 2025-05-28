'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import TeamList from '@/app/components/dashboard/TeamList'
interface PageParams {
  params: {
    id: string
  }
}

export default function ProjectDetails({ params }: PageParams) {
  const projectId = params.id
  const router = useRouter()
  const { data: session } = useSession()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    async function fetchProject() {
      try {
        const response = await fetch(`/api/projects/${projectId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch project details')
        }
        
        const data = await response.json()
        setProject(data)
        setLoading(false)
      } catch (err) {
        setError(err.message)
        setLoading(false)
      }
    }
    
    if (projectId) {
      fetchProject()
    }
  }, [projectId])

  // Check if user is authenticated and is HEAD
  if (!session || !session.user) {
    router.push('/auth/signin')
    return null
  }

  if (session.user.role !== 'HEAD') {
    router.push('/')
    return null
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading project details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center py-12 text-red-500">
          Error loading project: {error}
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center py-12 text-gray-500">
          Project not found
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/head"
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">{project.name}</h1>
        </div>
        <div>
          <Link
            href={`/dashboard/head/projects/${projectId}/teams/new`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create Team
          </Link>
        </div>
      </div>

      {/* Project Details */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Project Information</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Details about the project and timeline.</p>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{project.description}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Start Date</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {new Date(project.startDate).toLocaleDateString()}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">End Date</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Not set'}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Number of Teams</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {project.teams?.length || 0}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Teams Section */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Project Teams</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Teams working on this project.</p>
          </div>
        </div>
        <div className="border-t border-gray-200">
          <TeamList projectId={projectId} />
        </div>
      </div>
    </div>
  )
}