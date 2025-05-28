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
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading project form...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard/head"
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Create New Project</h1>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="p-6">
            <div className="text-center py-4 text-red-500 font-medium">
              Error: {error}
            </div>
            <div className="mt-4 flex justify-center">
              <button 
                onClick={() => setError(null)}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/dashboard/head"
          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Create New Project</h1>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Project Name *
              </label>
              <input
                type="text"
                name="name"
                id="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                name="description"
                id="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              />
            </div>
            
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                  Start Date *
                </label>
                <input
                  type="date"
                  name="startDate"
                  id="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                  End Date (optional)
                </label>
                <input
                  type="date"
                  name="endDate"
                  id="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                name="status"
                id="status"
                value={formData.status}
                onChange={handleChange}
                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              >
                <option value="PLANNING">Planning</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="ON_HOLD">On Hold</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Link
                href="/dashboard/head"
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Create Project
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}