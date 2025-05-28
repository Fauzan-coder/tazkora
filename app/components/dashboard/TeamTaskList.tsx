'use client'

import { useState, useEffect } from 'react'
import { X, Plus, AlertCircle, Check, Filter } from 'lucide-react'
import Link from 'next/link'

interface Task {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  dueDate: string;
  assignee: {
    id: string;
    name: string;
  } | null;
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

export default function TeamTaskList({ 
  teamId, 
  isTeamLeader, 
  isHead 
}: { 
  teamId: string; 
  isTeamLeader: boolean;
  isHead: boolean;
}) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter state
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL')
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalError, setModalError] = useState('')
  const [modalSuccess, setModalSuccess] = useState('')
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  
  // New task form state
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    assigneeId: '',
    dueDate: '',
  })
  
  useEffect(() => {
    async function fetchTeamTasks() {
      try {
        const response = await fetch(`/api/tasks?teamId=${teamId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch team tasks')
        }
        
        const data = await response.json()
        setTasks(data)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        setLoading(false)
      }
    }
    
    fetchTeamTasks()
  }, [teamId])
  
  // Filter tasks based on selected priority
  useEffect(() => {
    if (selectedPriority === 'ALL') {
      setFilteredTasks(tasks)
    } else {
      setFilteredTasks(tasks.filter(task => task.priority === selectedPriority))
    }
  }, [tasks, selectedPriority])
  
  // Fetch team members when modal opens
  useEffect(() => {
    async function fetchTeamMembers() {
      if (!isModalOpen) return
      
      try {
        const response = await fetch(`/api/teams/${teamId}/members`)
        if (!response.ok) {
          throw new Error('Failed to fetch team members')
        }
        const membersData = await response.json()
        const users = membersData.map((member: any) => member.user)
        setTeamMembers(users)
      } catch (err) {
        console.error('Error fetching team members:', err)
        setModalError('Failed to load team members')
      }
    }
    
    fetchTeamMembers()
  }, [isModalOpen, teamId])
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setNewTask(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  // Reset form
  const resetForm = () => {
    setNewTask({
      title: '',
      description: '',
      priority: 'MEDIUM',
      assigneeId: '',
      dueDate: '',
    })
    setModalError('')
    setModalSuccess('')
  }
  
  // Handle creating a new task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newTask.title || !newTask.assigneeId || !newTask.dueDate) {
      setModalError('Please fill all required fields')
      return
    }
    
    setIsSubmitting(true)
    setModalError('')
    
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newTask,
          teamId: teamId
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create task')
      }
      
      const newTaskData = await response.json()
      
      // Update tasks list with the new task
      setTasks(prev => [newTaskData, ...prev])
      
      setModalSuccess('Task created successfully')
      
      // Close modal after brief success message
      setTimeout(() => {
        resetForm()
        setIsModalOpen(false)
      }, 1500)
      
    } catch (err) {
      console.error('Error creating task:', err)
      setModalError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Handle modal close
  const handleCloseModal = () => {
    if (!isSubmitting) {
      resetForm()
      setIsModalOpen(false)
    }
  }
  
  // Helper function to get appropriate status badge color
  const getStatusBadgeClass = (status: string) => {
    switch (status.toUpperCase()) {
      case 'TODO':
        return 'bg-gray-100 text-gray-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'REVIEW':
        return 'bg-yellow-100 text-yellow-800';
      case 'DONE':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Helper function to get appropriate priority badge color
  const getPriorityBadgeClass = (priority: string) => {
    switch (priority.toUpperCase()) {
      case 'LOW':
        return 'bg-green-100 text-green-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      case 'URGENT':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to get priority button styles
  const getPriorityButtonClass = (priority: string, isSelected: boolean) => {
    const baseClass = 'px-3 py-1 text-xs font-medium rounded-full transition-colors'
    
    if (isSelected) {
      switch (priority) {
        case 'ALL':
          return `${baseClass} bg-indigo-600 text-white`
        case 'LOW':
          return `${baseClass} bg-green-600 text-white`
        case 'MEDIUM':
          return `${baseClass} bg-yellow-600 text-white`
        case 'HIGH':
          return `${baseClass} bg-red-600 text-white`
        case 'URGENT':
          return `${baseClass} bg-purple-600 text-white`
        default:
          return `${baseClass} bg-gray-600 text-white`
      }
    } else {
      switch (priority) {
        case 'ALL':
          return `${baseClass} bg-indigo-100 text-indigo-800 hover:bg-indigo-200`
        case 'LOW':
          return `${baseClass} bg-green-100 text-green-800 hover:bg-green-200`
        case 'MEDIUM':
          return `${baseClass} bg-yellow-100 text-yellow-800 hover:bg-yellow-200`
        case 'HIGH':
          return `${baseClass} bg-red-100 text-red-800 hover:bg-red-200`
        case 'URGENT':
          return `${baseClass} bg-purple-100 text-purple-800 hover:bg-purple-200`
        default:
          return `${baseClass} bg-gray-100 text-gray-800 hover:bg-gray-200`
      }
    }
  }
  
  // Format date to be more readable
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Truncate description helper
  const truncateDescription = (description: string, maxLength: number = 60) => {
    if (!description) return 'No description';
    return description.length > maxLength 
      ? description.substring(0, maxLength) + '...' 
      : description;
  };
  
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent"></div>
        <p className="mt-2 text-sm text-gray-500">Loading tasks...</p>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="text-center py-8 text-red-500 text-sm">
        Error loading tasks: {error}
      </div>
    )
  }
  
  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No tasks have been assigned to this team yet.</p>
        {(isTeamLeader || isHead) && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create Task
          </button>
        )}
        
        {/* Create Task Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl bg-white rounded-lg shadow-lg">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Create New Task</h2>
                <button
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {/* Error and Success Messages */}
              {modalError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-700">{modalError}</p>
                  </div>
                  <button 
                    onClick={() => setModalError('')}
                    className="ml-auto text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              
              {modalSuccess && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded flex items-start">
                  <Check className="h-5 w-5 text-green-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-green-700">{modalSuccess}</p>
                  </div>
                </div>
              )}
              
              {/* Form */}
              <form onSubmit={handleCreateTask}>
                <div className="space-y-6">
                  {/* Task Title */}
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                      Task Title *
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={newTask.title}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
                      placeholder="Enter task title"
                    />
                  </div>
                  
                  {/* Description */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={newTask.description}
                      onChange={handleInputChange}
                      rows={3}
                      disabled={isSubmitting}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
                      placeholder="Describe the task details"
                    />
                  </div>
                  
                  {/* Two column layout for remaining fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Assignee */}
                    <div>
                      <label htmlFor="assigneeId" className="block text-sm font-medium text-gray-700 mb-1">
                        Assign To *
                      </label>
                      <select
                        id="assigneeId"
                        name="assigneeId"
                        value={newTask.assigneeId}
                        onChange={handleInputChange}
                        required
                        disabled={isSubmitting}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        <option value="">Select Team Member</option>
                        {teamMembers.map(member => (
                          <option key={member.id} value={member.id}>
                            {member.name} ({member.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Priority */}
                    <div>
                      <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        id="priority"
                        name="priority"
                        value={newTask.priority}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Due Date */}
                  <div>
                    <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      id="dueDate"
                      name="dueDate"
                      value={newTask.dueDate}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
                    />
                  </div>
                </div>
                
                {/* Form Actions */}
                <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Task
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }
  
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-3 sm:space-y-0">
        <h3 className="text-lg font-medium text-gray-900">Team Tasks</h3>
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
          {/* Priority Filter Buttons */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <div className="flex flex-wrap gap-2">
              {['ALL', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((priority) => (
                <button
                  key={priority}
                  onClick={() => setSelectedPriority(priority)}
                  className={getPriorityButtonClass(priority, selectedPriority === priority)}
                >
                  {priority === 'ALL' ? 'All' : priority.charAt(0) + priority.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          
          {(isTeamLeader || isHead) && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex-shrink-0"
            >
              Create Task
            </button>
          )}
        </div>
      </div>
      
      {/* Tasks Count Display */}
      <div className="mb-3">
        <p className="text-sm text-gray-600">
          Showing {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
          {selectedPriority !== 'ALL' && (
            <span className="ml-1">
              with <span className="font-medium">{selectedPriority.toLowerCase()}</span> priority
            </span>
          )}
        </p>
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {/* Tasks List with limited height and scroll */}
        <div className="max-h-96 overflow-y-auto">
          <ul className="divide-y divide-gray-200">
            {filteredTasks.map((task) => (
              <li key={task.id}>
                <Link href={`/dashboard/tasks/${task.id}`} className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-2">
                          <p className="text-sm font-medium text-indigo-600 truncate">{task.title}</p>
                          <div className="flex-shrink-0">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(task.status)}`}>
                              {task.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex-shrink-0">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityBadgeClass(task.priority)}`}>
                              {task.priority}
                            </span>
                          </div>
                        </div>
                        <div className="mb-2">
                          <p className="text-sm text-gray-500">
                            {truncateDescription(task.description)}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-500">
                          <p>
                            {task.assignee ? `Assigned to: ${task.assignee.name}` : 'Unassigned'}
                          </p>
                          <p className="flex-shrink-0">
                            Due {formatDate(task.dueDate)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Scroll indicator for more tasks */}
        {filteredTasks.length > 4 && (
          <div className="bg-gray-50 px-4 py-2 text-center border-t">
            <p className="text-xs text-gray-500">
              Scroll to view more tasks
            </p>
          </div>
        )}
      </div>
      
      {/* Create Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl bg-white rounded-lg shadow-lg">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Create New Task</h2>
              <button
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Error and Success Messages */}
            {modalError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded flex items-start">
                <AlertCircle className="h-5 w-5 text-red-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm text-red-700">{modalError}</p>
                </div>
                <button 
                  onClick={() => setModalError('')}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            
            {modalSuccess && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded flex items-start">
                <Check className="h-5 w-5 text-green-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm text-green-700">{modalSuccess}</p>
                </div>
              </div>
            )}
            
            {/* Form */}
            <form onSubmit={handleCreateTask}>
              <div className="space-y-6">
                {/* Task Title */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={newTask.title}
                    onChange={handleInputChange}
                    required
                    disabled={isSubmitting}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
                    placeholder="Enter task title"
                  />
                </div>
                
                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={newTask.description}
                    onChange={handleInputChange}
                    rows={3}
                    disabled={isSubmitting}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
                    placeholder="Describe the task details"
                  />
                </div>
                
                {/* Two column layout for remaining fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Assignee */}
                  <div>
                    <label htmlFor="assigneeId" className="block text-sm font-medium text-gray-700 mb-1">
                      Assign To *
                    </label>
                    <select
                      id="assigneeId"
                      name="assigneeId"
                      value={newTask.assigneeId}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      <option value="">Select Team Member</option>
                      {teamMembers.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.name} ({member.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Priority */}
                  <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      id="priority"
                      name="priority"
                      value={newTask.priority}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>
                
                {/* Due Date */}
                <div>
                  <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    id="dueDate"
                    name="dueDate"
                    value={newTask.dueDate}
                    onChange={handleInputChange}
                    required
                    disabled={isSubmitting}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
                  />
                </div>
              </div>
              
              {/* Form Actions */}
              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Task
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}