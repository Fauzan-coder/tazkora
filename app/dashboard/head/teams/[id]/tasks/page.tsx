'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Check, Plus, AlertCircle, ArrowLeft, Filter, X } from 'lucide-react'
import Link from 'next/link'
import Header from '@/app/components/layout/Header'
import Sidebar from '@/app/components/layout/Sidebar'

// Task type definitions
interface User {
  id: string
  name: string
  email: string
  role: string
}

interface Team {
  id: string
  name: string
}

interface Task {
  id: string
  title: string
  description: string
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  assigneeId: string | null
  assignee?: User
  teamId: string | null
  team?: Team
  createdAt: string
  updatedAt: string
  dueDate: string
}

// Filter types
interface Filters {
  status: string[]
  priority: string[]
  assignee: string[]
  overdue: boolean
  dueSoon: boolean
}

export default function TaskManagementPage() {
  const router = useRouter()
  const params = useParams()
  const teamId = typeof params.id === 'string' ? params.id : null
  
  // State variables
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [canManageTasks, setCanManageTasks] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [teamName, setTeamName] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [showFilters, setShowFilters] = useState(false)
  
  // Filter state
  const [filters, setFilters] = useState<Filters>({
    status: [],
    priority: [],
    assignee: [],
    overdue: false,
    dueSoon: false
  })
  
  // New task form state
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    assigneeId: '',
    dueDate: '',
  })
  
  // Filter options
  const statusOptions = [
    { value: 'TODO', label: 'To Do', color: 'bg-gray-100 text-gray-800' },
    { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
    { value: 'REVIEW', label: 'In Review', color: 'bg-purple-100 text-purple-800' },
    { value: 'COMPLETED', label: 'Completed', color: 'bg-green-100 text-green-800' }
  ]
  
  const priorityOptions = [
    { value: 'LOW', label: 'Low', color: 'bg-green-100 text-green-800' },
    { value: 'MEDIUM', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
    { value: 'HIGH', label: 'High', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'URGENT', label: 'Urgent', color: 'bg-red-100 text-red-800' }
  ]
  
  // Utility functions
  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString()
  }
  
  const isDueSoon = (dueDate: string) => {
    const due = new Date(dueDate)
    const today = new Date()
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 3 && diffDays >= 0
  }
  
  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }
  
  // Filter tasks based on current filters
  const applyFilters = (tasksToFilter: Task[]) => {
    let filtered = [...tasksToFilter]
    
    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(task => filters.status.includes(task.status))
    }
    
    // Priority filter
    if (filters.priority.length > 0) {
      filtered = filtered.filter(task => filters.priority.includes(task.priority))
    }
    
    // Assignee filter
    if (filters.assignee.length > 0) {
      filtered = filtered.filter(task => 
        task.assigneeId && filters.assignee.includes(task.assigneeId)
      )
    }
    
    // Overdue filter
    if (filters.overdue) {
      filtered = filtered.filter(task => isOverdue(task.dueDate))
    }
    
    // Due soon filter
    if (filters.dueSoon) {
      filtered = filtered.filter(task => isDueSoon(task.dueDate))
    }
    
    return filtered
  }
  
  // Update filtered tasks when tasks or filters change
  useEffect(() => {
    setFilteredTasks(applyFilters(tasks))
  }, [tasks, filters])
  
  // Handle filter changes
  const toggleFilter = (filterType: keyof Filters, value: string | boolean) => {
    setFilters(prev => {
      if (filterType === 'overdue' || filterType === 'dueSoon') {
        return { ...prev, [filterType]: !prev[filterType] }
      } else {
        const currentValues = prev[filterType] as string[]
        const newValues = currentValues.includes(value as string)
          ? currentValues.filter(v => v !== value)
          : [...currentValues, value as string]
        return { ...prev, [filterType]: newValues }
      }
    })
  }
  
  // Clear all filters
  const clearFilters = () => {
    setFilters({
      status: [],
      priority: [],
      assignee: [],
      overdue: false,
      dueSoon: false
    })
  }
  
  // Check if any filters are active
  const hasActiveFilters = () => {
    return filters.status.length > 0 || 
           filters.priority.length > 0 || 
           filters.assignee.length > 0 || 
           filters.overdue || 
           filters.dueSoon
  }
  
  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true)
        
        // Check permissions first
        const permResponse = await fetch(`/api/teams/${teamId}/permissions`)
        if (!permResponse.ok) {
          throw new Error('Failed to verify permissions')
        }
        const permData = await permResponse.json()
        
        // Determine if user can manage tasks (is team leader or HEAD)
        const userCanManage = permData.canManageTasks
        setCanManageTasks(userCanManage)
        
        if (!userCanManage) {
          router.push(`/dashboard/teams/${teamId}`)
          return
        }
        
        // Fetch team details
        const teamResponse = await fetch(`/api/teams/${teamId}`)
        if (!teamResponse.ok) {
          throw new Error('Failed to fetch team details')
        }
        const teamData = await teamResponse.json()
        setTeamName(teamData.name)
        
        // Fetch team members
        const membersResponse = await fetch(`/api/teams/${teamId}/members`)
        if (!membersResponse.ok) {
          throw new Error('Failed to fetch team members')
        }
        const membersData = await membersResponse.json()
        const users = membersData.map((member: any) => member.user)
        setTeamMembers(users)
        setAvailableUsers(users)
        
        // Fetch team tasks
        const tasksResponse = await fetch(`/api/tasks?teamId=${teamId}`)
        if (!tasksResponse.ok) {
          throw new Error('Failed to fetch team tasks')
        }
        const tasksData = await tasksResponse.json()
        setTasks(tasksData)
        
      } catch (err) {
        console.error('Error loading data:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }
    
    if (teamId) {
      fetchInitialData()
    }
  }, [teamId, router])
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setNewTask(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  // Handle creating a new task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newTask.title || !newTask.assigneeId || !newTask.dueDate) {
      setError('Please fill all required fields')
      return
    }
    
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
      
      // Reset form and show success message
      setNewTask({
        title: '',
        description: '',
        priority: 'MEDIUM',
        assigneeId: '',
        dueDate: '',
      })
      
      setSuccess('Task created successfully')
      setIsCreating(false)
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('')
      }, 3000)
      
    } catch (err) {
      console.error('Error creating task:', err)
      setError(err instanceof Error ? err.message : 'Failed to create task')
    }
  }
  
  // Handle changing task status
  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update task status')
      }
      
      const updatedTask = await response.json()
      
      // Update tasks list with the updated task
      setTasks(prev => prev.map(task => task.id === taskId ? updatedTask : task))
      
      setSuccess('Task status updated')
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('')
      }, 3000)
      
    } catch (err) {
      console.error('Error updating task status:', err)
      setError(err instanceof Error ? err.message : 'Failed to update task status')
    }
  }
  
  // Handle changing task assignee
  const handleAssigneeChange = async (taskId: string, newAssigneeId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assigneeId: newAssigneeId
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update task assignee')
      }
      
      const updatedTask = await response.json()
      
      // Update tasks list with the updated task
      setTasks(prev => prev.map(task => task.id === taskId ? updatedTask : task))
      
      setSuccess('Task assignee updated')
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('')
      }, 3000)
      
    } catch (err) {
      console.error('Error updating task assignee:', err)
      setError(err instanceof Error ? err.message : 'Failed to update task assignee')
    }
  }
  
  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }
  
  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="Loading..." />
          <main className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </main>
        </div>
      </div>
    )
  }
  
  // If no permission, will redirect (handled in useEffect)
  if (!canManageTasks) return null;
  
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={`Task Management: ${teamName}`} />
        <main className="flex-1 overflow-auto p-4 lg:p-8 bg-gradient-to-br from-gray-50 to-gray-100">
          {/* Error and Success Messages */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button 
                onClick={() => setError('')}
                className="ml-auto text-red-500 hover:text-red-700 flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded flex items-start">
              <Check className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          )}
          
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="flex items-center">
              <Link
                href={`/dashboard/head/ teams/${teamId}`}
                className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Task Management</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center px-3 py-2 border rounded-md font-medium transition-colors ${
                  hasActiveFilters() 
                    ? 'bg-indigo-100 border-indigo-300 text-indigo-700' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="h-4 w-4 mr-1" />
                Filters
                {hasActiveFilters() && (
                  <span className="ml-1 bg-indigo-200 text-indigo-800 text-xs rounded-full px-2 py-0.5">
                    {filters.status.length + filters.priority.length + filters.assignee.length + 
                     (filters.overdue ? 1 : 0) + (filters.dueSoon ? 1 : 0)}
                  </span>
                )}
              </button>
              <button
                onClick={() => setIsCreating(!isCreating)}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                {isCreating ? 'Cancel' : (
                  <>
                    <Plus className="h-5 w-5 mr-1" />
                    Create Task
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-800">Filters</h3>
                {hasActiveFilters() && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    Clear All
                  </button>
                )}
              </div>
              
              <div className="space-y-6">
                {/* Status Filters */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Status</h4>
                  <div className="flex flex-wrap gap-2">
                    {statusOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => toggleFilter('status', option.value)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          filters.status.includes(option.value)
                            ? option.color + ' border-2 border-current'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Priority Filters */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Priority</h4>
                  <div className="flex flex-wrap gap-2">
                    {priorityOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => toggleFilter('priority', option.value)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          filters.priority.includes(option.value)
                            ? option.color + ' border-2 border-current'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Assignee Filters */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Assignee</h4>
                  <div className="flex flex-wrap gap-2">
                    {teamMembers.map(member => (
                      <button
                        key={member.id}
                        onClick={() => toggleFilter('assignee', member.id)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          filters.assignee.includes(member.id)
                            ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {member.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Due Date Filters */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Due Date</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => toggleFilter('overdue', true)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        filters.overdue
                          ? 'bg-red-100 text-red-800 border-2 border-red-300'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Overdue
                    </button>
                    <button
                      onClick={() => toggleFilter('dueSoon', true)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        filters.dueSoon
                          ? 'bg-orange-100 text-orange-800 border-2 border-orange-300'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Due Soon (3 days)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Create Task Form */}
          {isCreating && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Create New Task</h2>
              <form onSubmit={handleCreateTask}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-2">
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
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="Enter task title"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={newTask.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="Describe the task details"
                    />
                  </div>
                  
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
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">Select Team Member</option>
                      {teamMembers.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.name} ({member.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      id="priority"
                      name="priority"
                      value={newTask.priority}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                  
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
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div className="col-span-2 flex justify-end mt-4">
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Create Task
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
          
          {/* Tasks List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-800">
                  Team Tasks ({filteredTasks.length})
                </h2>
                {hasActiveFilters() && (
                  <span className="text-sm text-gray-500">
                    Showing {filteredTasks.length} of {tasks.length} tasks
                  </span>
                )}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assignee
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 sm:px-6 py-8 text-center text-sm text-gray-500">
                        {hasActiveFilters() 
                          ? 'No tasks match the current filters.' 
                          : 'No tasks found for this team. Create your first task above.'
                        }
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map(task => (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-4">
                          <div className="max-w-xs">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {task.title}
                            </div>
                            {task.description && (
                              <div className="text-sm text-gray-500 truncate">
                                {truncateText(task.description, 60)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <select
                            value={task.assigneeId || ''}
                            onChange={(e) => handleAssigneeChange(task.id, e.target.value)}
                            className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 max-w-[120px]"
                          >
                            <option value="">Unassigned</option>
                            {teamMembers.map(member => (
                              <option key={member.id} value={member.id}>
                                {member.name.split(' ')[0]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                            className={`text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 max-w-[120px] ${
                              task.status === 'TODO' ? 'text-gray-700' :
                              task.status === 'IN_PROGRESS' ? 'text-blue-700' :
                              task.status === 'REVIEW' ? 'text-purple-700' :
                              'text-green-700'
                            }`}
                          >
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="REVIEW">In Review</option>
                            <option value="COMPLETED">Completed</option>
                          </select>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${task.priority === 'LOW' ? 'bg-green-100 text-green-800' :
                             task.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800' :
                             task.priority === 'HIGH' ? 'bg-yellow-100 text-yellow-800' :
                             'bg-red-100 text-red-800'}`}
                          >
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(task.dueDate)}
                          </div>
                          <div className="text-xs">
                            {isOverdue(task.dueDate) && (
                              <span className="text-red-600 font-medium">Overdue</span>
                            )}
                            {isDueSoon(task.dueDate) && !isOverdue(task.dueDate) && (
                              <span className="text-orange-600 font-medium">Due Soon</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                          <Link 
                            href={`/dashboard/tasks/${task.id}`}
                            className="text-indigo-600 hover:text-indigo-900 font-medium"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}