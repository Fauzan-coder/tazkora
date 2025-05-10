"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface Task {
  id: string
  title: string
}

interface IssueFormProps {
  onIssueCreated: () => void
  onCancel: () => void
}

export default function IssueForm({ onIssueCreated, onCancel }: IssueFormProps) {
  const { data: session } = useSession()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [taskId, setTaskId] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch('/api/tasks')
        
        if (!response.ok) {
          throw new Error('Failed to fetch tasks')
        }
        
        const data = await response.json()
        setTasks(data)
      } catch (err) {
        console.error('Error fetching tasks:', err)
      }
    }
    
    fetchTasks()
  }, [])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          taskId: taskId || undefined,
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to create issue')
      }
      
      onIssueCreated()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Something went wrong')
      } else {
        setError('Something went wrong')
      }
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div 
        className="bg-gradient-to-br from-blue-50 to-gray-50 border border-gray-200 rounded-xl p-6 shadow-lg"
        style={{ boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.1), 0 8px 10px -6px rgba(59, 130, 246, 0.1)" }}
      >
        <h3 className="text-xl font-semibold mb-6 text-gray-800 border-b border-gray-200 pb-3">
          Report New Issue
        </h3>
        
        {error && (
          <div className="mb-5 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}
        
        <div className="mb-5">
          <label htmlFor="title" className="block text-sm font-medium text-gray-800 mb-2">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 placeholder-gray-500"
            placeholder="Enter issue title"
            required
          />
        </div>
        
        <div className="mb-5">
          <label htmlFor="description" className="block text-sm font-medium text-gray-800 mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 placeholder-gray-500"
            rows={4}
            placeholder="Describe the issue in detail"
            required
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="task" className="block text-sm font-medium text-gray-800 mb-2">
            Related Task (Optional)
          </label>
          <div className="relative">
            <select
              id="task"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white pr-10 text-gray-900"
            >
              <option value="" className="text-gray-900">No related task</option>
              {tasks.map((task) => (
                <option 
                  key={task.id} 
                  value={task.id} 
                  className="text-gray-900 hover:bg-gray-100 py-2 rounded"
                >
                  {task.title}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 border border-gray-300 bg-white text-gray-800 font-medium rounded-full hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-full hover:from-blue-700 hover:to-blue-800 shadow-sm transition-all"
          >
            {isLoading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </div>
            ) : (
              'Report Issue'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}