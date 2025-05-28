'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface AssignTasksModalProps {
  teamId: string;
  teamName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  assignee?: {
    name: string;
  };
}

interface AssignTasksResponse {
  message: string;
}

interface AssignTasksError {
  message: string;
}

export default function AssignTasksModal({ teamId, teamName, isOpen, onClose, onSuccess }: AssignTasksModalProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [availableTasks, setAvailableTasks] = useState<Task[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
    // eslint-disable-next-line
  }, [isOpen, teamId])

  // Fetch team's existing tasks and available tasks
  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError('')
      // Fetch team's existing tasks
      const teamTasksRes = await fetch(`/api/tasks?teamId=${teamId}`)
      if (!teamTasksRes.ok) {
        throw new Error('Failed to fetch team tasks')
      }
      const teamTasksData = await teamTasksRes.json()
      setTasks(teamTasksData)
      // Fetch available tasks (unassigned or from projects this team is part of)
      const availableTasksRes = await fetch(`/api/tasks/available?teamId=${teamId}`)
      if (!availableTasksRes.ok) {
        throw new Error('Failed to fetch available tasks')
      }
      const availableTasksData = await availableTasksRes.json()
      setAvailableTasks(availableTasksData)
      // Reset selected tasks
      setSelectedTasks([])
    } catch (error) {
      console.error('Error loading task data:', error)
      setError('Failed to load task data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTaskSelection = (taskId: string): void => {
    setSelectedTasks((prev: string[]) => {
      if (prev.includes(taskId)) {
        return prev.filter((id: string) => id !== taskId)
      } else {
        return [...prev, taskId]
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    if (selectedTasks.length === 0) {
      setError('Please select at least one task to assign')
      setIsSubmitting(false)
      return
    }
    try {
      const response = await fetch(`/api/teams/${teamId}/tasks/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ taskIds: selectedTasks })
      })
      if (!response.ok) {
        const errorData = await response.json() as AssignTasksError
        throw new Error(errorData.message || 'Failed to assign tasks')
      }
      // Call the success callback to refresh the team page
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while assigning tasks')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-auto overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-medium text-gray-900">Assign Tasks to {teamName}</h3>
            <button
              type="button"
              onClick={onClose}
              className="bg-white rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            >
              <span className="sr-only">Close</span>
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        <div className="overflow-auto max-h-[70vh]">
          <div className="px-6 py-4">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Current Team Tasks</h2>
                  {tasks.length > 0 ? (
                    <div className="bg-gray-50 p-4 rounded-md">
                      <ul className="divide-y divide-gray-200">
                        {tasks.map(task => (
                          <li key={task.id} className="py-3">
                            <div className="flex items-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                task.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                                task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {task.priority}
                              </span>
                              <span className="ml-3 font-medium">{task.title}</span>
                              {task.assignee && (
                                <span className="ml-auto text-sm text-gray-500">
                                  Assigned to: {task.assignee.name}
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-gray-500">No tasks currently assigned to this team.</p>
                  )}
                </div>
                <div className="mb-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Available Tasks to Assign</h2>
                  {availableTasks.length > 0 ? (
                    <div className="bg-gray-50 p-4 rounded-md">
                      <ul className="divide-y divide-gray-200">
                        {availableTasks.map(task => (
                          <li key={task.id} className="py-3">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id={`task-${task.id}`}
                                value={task.id}
                                checked={selectedTasks.includes(task.id)}
                                onChange={() => handleTaskSelection(task.id)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                              <label htmlFor={`task-${task.id}`} className="ml-3 flex flex-1 items-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  task.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                                  task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {task.priority}
                                </span>
                                <span className="ml-3 font-medium">{task.title}</span>
                                {task.assignee && (
                                  <span className="ml-auto text-sm text-gray-500">
                                    Assigned to: {task.assignee.name}
                                  </span>
                                )}
                              </label>
                            </div>
                            <p className="text-gray-500 text-sm mt-1 ml-7">{task.description}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-gray-500">No available tasks to assign.</p>
                  )}
                </div>
                <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => window.location.href = `/dashboard/teams/${teamId}/tasks/create`}
                    className="rounded-md border border-indigo-300 bg-white py-2 px-4 text-sm font-medium text-indigo-700 shadow-sm hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Create New Task
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || selectedTasks.length === 0 || isLoading}
                    className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400"
                  >
                    {isSubmitting ? 'Assigning...' : 'Assign Selected Tasks'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}