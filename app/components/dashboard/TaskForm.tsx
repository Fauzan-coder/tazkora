"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

interface User {
    name?: string | null
    email?: string | null
    image?: string | null
    role?: string
    id?: string
}

interface TaskFormProps {
  onTaskCreated: () => void
  onCancel: () => void
}

export default function TaskForm({ onTaskCreated, onCancel }: TaskFormProps) {
  const { data: session } = useSession()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('MEDIUM')
  const [assigneeId, setAssigneeId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assignees, setAssignees] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchAssignees = async () => {
      try {
        const response = await fetch('/api/users')
        
        if (!response.ok) {
          throw new Error('Failed to fetch users')
        }
        
        const users = await response.json()
        setAssignees(users)
      } catch (err) {
        console.error('Error fetching assignees:', err)
      }
    }
    
    fetchAssignees()
  }, [])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          priority,
          assigneeId: assigneeId || undefined,
          dueDate: dueDate || undefined,
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to create task')
      }
      
      onTaskCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }
  
  // Priority color mapping
  const getPriorityColor = (priority: Priority) => {
    switch(priority) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-blue-100 text-blue-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'URGENT': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div 
        className="bg-gradient-to-br from-blue-50 to-gray-50 border border-gray-200 rounded-xl p-6 shadow-lg"
        style={{ boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.1), 0 8px 10px -6px rgba(59, 130, 246, 0.1)" }}
      >
        <h3 className="text-xl font-semibold mb-6 text-gray-800 border-b border-gray-200 pb-3">
          Create New Task
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
            placeholder="Enter task title"
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
            placeholder="Describe the task in detail"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-800 mb-2">
              Priority
            </label>
            <div className="relative">
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white text-gray-900 pr-10"
              >
                <option value="LOW" className="text-gray-900 py-2">Low</option>
                <option value="MEDIUM" className="text-gray-900 py-2">Medium</option>
                <option value="HIGH" className="text-gray-900 py-2">High</option>
                <option value="URGENT" className="text-gray-900 py-2">Urgent</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
            <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium inline-block ${getPriorityColor(priority)}`}>
              {priority.charAt(0) + priority.slice(1).toLowerCase()}
            </div>
          </div>
          
          <div>
            <label htmlFor="assignee" className="block text-sm font-medium text-gray-800 mb-2">
              Assignee
            </label>
            <div className="relative">
              <select
                id="assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white text-gray-900 pr-10"
              >
                <option value="" className="text-gray-900 py-2">Not Assigned</option>
                {assignees.map((user) => (
                  <option key={user.id} value={user.id} className="text-gray-900 py-2">
                    {user.name} ({user.role})
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
          
          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-800 mb-2">
              Due Date
            </label>
            <input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900"
            />
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
                Creating...
              </div>
            ) : (
              'Create Task'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}