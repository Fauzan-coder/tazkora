'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface ProjectResponse {
    id: string;
    // Add other project properties if needed
}

interface FormData {
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    status: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
}

export default function NewProjectPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0], // Today's date as default
    endDate: '',
    status: 'PLANNING'
  })
  
  useEffect(() => {
    // Check if user is authenticated and is HEAD
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (session && session.user && session.user.role !== 'HEAD') {
      router.push('/')
      return
    }

    // Load empty project template
    async function fetchProjectTemplate() {
      try {
        const response = await fetch('/api/projects/new')
        
        if (!response.ok) {
          throw new Error('Failed to fetch project template')
        }
        
        const data = await response.json()
        setProject(data)
        setFormData({
          name: data.name || '',
          description: data.description || '',
          startDate: data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          endDate: data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : '',
          status: data.status || 'PLANNING'
        })
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
        setLoading(false)
      }
    }
    
    if (status === 'authenticated') {
      fetchProjectTemplate()
    }
  }, [status, session, router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError(null)
    
    try {
        // Check if form is valid
        if (!formData.name.trim()) {
            setError('Project name is required')
            return
        }

        // Validate date format
        if (!isValidDateString(formData.startDate)) {
            setError('Invalid start date format')
            return
        }

        if (formData.endDate && !isValidDateString(formData.endDate)) {
            setError('Invalid end date format')
            return
        }

        // Create project data object
        const projectData = {
            ...formData,
            // Only include endDate if it's not empty
            ...(formData.endDate ? { endDate: formData.endDate } : { endDate: '' })
        }

        console.log('Submitting project data:', projectData)
            
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(projectData),
        })

        // Handle response
        const result = await response.json()
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to create project')
        }

        // Navigate to the new project page
        router.push(`/dashboard/head/projects/${result.id}`)
    } catch (err) {
        console.error('Error creating project:', err)
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    setFormData({
        ...formData,
        [name as keyof FormData]: value
    });
  };

  // Helper function to validate date strings
  const isValidDateString = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center py-24">
            <div className="relative inline-block">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 shadow-lg"></div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 opacity-20 animate-pulse"></div>
            </div>
            <p className="mt-6 text-lg text-slate-600 font-medium">Loading project form...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-8">
            <Link
              href="/dashboard/head"
              className="inline-flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-semibold transition-colors duration-200 group"
            >
              <svg className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
            <h1 className="mt-4 text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Create New Project
            </h1>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm shadow-2xl border border-red-100 rounded-2xl overflow-hidden">
            <div className="p-8">
              <div className="text-center py-8">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                  <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.262 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h3>
                <p className="text-red-600 font-medium">{error}</p>
              </div>
              <div className="flex justify-center">
                <button 
                  onClick={() => setError(null)}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            href="/dashboard/head"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-semibold transition-colors duration-200 group"
          >
            <svg className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="mt-4 text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Create New Project
          </h1>
          <p className="mt-2 text-slate-600">Fill in the details below to create your new project</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm shadow-2xl border border-white/20 rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 px-8 py-6 border-b border-indigo-100">
            <h2 className="text-xl font-semibold text-slate-800 flex items-center">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              Project Information
            </h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-8">
            <div className="space-y-8">
              <div className="group">
                <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 text-black bg-white border-2 border-slate-200 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-slate-300"
                  placeholder="Enter your project name"
                />
              </div>
              
              <div className="group">
                <label htmlFor="description" className="block text-sm font-semibold text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  id="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-4 py-3 text-black bg-white border-2 border-slate-200 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-slate-300 resize-none"
                  placeholder="Describe your project goals and objectives"
                />
              </div>
              
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                <div className="group">
                  <label htmlFor="startDate" className="block text-sm font-semibold text-slate-700 mb-2">
                    Start Date *
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      name="startDate"
                      id="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 text-black bg-white border-2 border-slate-200 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-slate-300"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="group">
                  <label htmlFor="endDate" className="block text-sm font-semibold text-slate-700 mb-2">
                    End Date <span className="text-slate-500 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      name="endDate"
                      id="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                      className="w-full px-4 py-3 text-black bg-white border-2 border-slate-200 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-slate-300"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="group">
                <label htmlFor="status" className="block text-sm font-semibold text-slate-700 mb-2">
                  Project Status
                </label>
                <div className="relative">
                  <select
                    name="status"
                    id="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-black bg-white border-2 border-slate-200 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-slate-300 appearance-none cursor-pointer"
                  >
                    <option value="PLANNING" className="text-black">📋 Planning</option>
                    <option value="ACTIVE" className="text-black">🚀 Active</option>
                    <option value="COMPLETED" className="text-black">✅ Completed</option>
                    <option value="ON_HOLD" className="text-black">⏸️ On Hold</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200">
                <Link
                  href="/dashboard/head"
                  className="px-6 py-3 border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 transform hover:-translate-y-0.5 shadow-sm hover:shadow-md"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Create Project</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}