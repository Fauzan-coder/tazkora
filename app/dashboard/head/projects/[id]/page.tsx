'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import TeamList from '@/app/components/dashboard/TeamList'
import React from 'react'

interface Project {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  teams?: any[];
}

// For Next.js 15+, we need to properly handle params as a Promise
export default function ProjectDetails({ params }: { params: Promise<{ id: string }> }) {
  // Properly unwrap the params Promise using React.use()
  const unwrappedParams = React.use(params)
  const projectId = unwrappedParams.id
  
  const router = useRouter()
  const { data: session } = useSession()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
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
        setError(err instanceof Error ? err.message : 'An error occurred')
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
      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-3 border-black border-t-transparent mb-4"></div>
            <p className="text-lg text-black font-medium">Loading project details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="text-center py-16">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 inline-block">
              <p className="text-lg text-red-600 font-medium">Error loading project: {error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="text-center py-16">
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 inline-block">
              <p className="text-lg text-gray-600 font-medium">Project not found</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header Section */}
        <div className="mb-12">
          <Link
            href="/dashboard/head"
            className="inline-flex items-center px-4 py-2 text-black hover:text-gray-600 text-sm font-medium transition-colors duration-200 rounded-full hover:bg-gray-50"
          >
            ← Back to Dashboard
          </Link>
          
          <div className="mt-6 flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-black leading-tight">{project.name}</h1>
            </div>
            <Link
              href={`/dashboard/head/projects/${projectId}/newTeam`}
              className="inline-flex items-center px-6 py-3 text-sm font-semibold text-white bg-black hover:bg-gray-800 transition-colors duration-200 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Create Team
            </Link>
          </div>
        </div>

        {/* Project Details Card */}
        <div className="bg-white border border-gray-200 rounded-3xl shadow-sm mb-8 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-black">Project Information</h2>
            <p className="mt-2 text-gray-600">Details about the project and timeline</p>
          </div>
          
          <div className="px-8 py-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <dt className="text-sm font-semibold text-black min-w-32">Description</dt>
              <dd className="text-black leading-relaxed flex-1">{project.description}</dd>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <dt className="text-sm font-semibold text-black min-w-32">Start Date</dt>
              <dd className="text-black">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                  {new Date(project.startDate).toLocaleDateString()}
                </span>
              </dd>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <dt className="text-sm font-semibold text-black min-w-32">End Date</dt>
              <dd className="text-black">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                  project.endDate 
                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                    : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}>
                  {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Not set'}
                </span>
              </dd>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <dt className="text-sm font-semibold text-black min-w-32">Teams</dt>
              <dd className="text-black">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-50 text-purple-700 border border-purple-200">
                  {project.teams?.length || 0} {project.teams?.length === 1 ? 'Team' : 'Teams'}
                </span>
              </dd>
            </div>
          </div>
        </div>

        {/* Teams Section */}
        <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-black">Project Teams</h2>
            <p className="mt-2 text-gray-600">Teams working on this project</p>
          </div>
          
          <div className="p-8">
            <TeamList projectId={projectId} />
          </div>
        </div>
      </div>
    </div>
  )
}