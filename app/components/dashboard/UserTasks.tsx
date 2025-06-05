'use client'
import { useState, useEffect } from 'react'
import { format, isToday, isTomorrow, isPast, differenceInDays } from 'date-fns'

interface Task {
  id: string
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'BACKLOG' | 'ONGOING' | 'FINISHED'
  dueDate: string | null
  createdAt: string
  taskOrigin: 'TEAM' | 'HIERARCHY'
  creator: {
    id: string
    name: string
    email: string
    role: string
  }
  teamAssignments?: Array<{
    team: {
      id: string
      name: string
    }
  }>
}

interface UserTasksProps {
  userId: string
  teamId?: string
  sortByPriority?: boolean
  showDueDateWarning?: boolean
}

export default function UserTasks({ 
  userId, 
  teamId, 
  sortByPriority = true, 
  showDueDateWarning = true 
}: UserTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchUserTasks()
  }, [userId, statusFilter])

  const fetchUserTasks = async () => {
    try {
      setLoading(true)
      const url = `/api/tasks/${userId}?userId=${userId}${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }
      
      const data = await response.json()
      
      if (sortByPriority) {
        const sortedTasks = sortTasksByPriorityAndDueDate(data)
        setTasks(sortedTasks)
      } else {
        setTasks(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const sortTasksByPriorityAndDueDate = (tasks: Task[]): Task[] => {
    const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
    
    return tasks.sort((a, b) => {
      // First, sort by priority
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      
      // If same priority, sort by due date (closest first)
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      }
      
      // Tasks with due dates come before tasks without
      if (a.dueDate && !b.dueDate) return -1
      if (!a.dueDate && b.dueDate) return 1
      
      // If no due dates, sort by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500'
      case 'HIGH': return 'bg-yellow-500'
      case 'MEDIUM': return 'bg-blue-500'
      case 'LOW': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  const getPriorityTextColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-700 bg-red-50'
      case 'HIGH': return 'text-yellow-700 bg-yellow-50'
      case 'MEDIUM': return 'text-blue-700 bg-blue-50'
      case 'LOW': return 'text-gray-700 bg-gray-50'
      default: return 'text-gray-700 bg-gray-50'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BACKLOG': return 'text-gray-600 bg-gray-100'
      case 'ONGOING': return 'text-blue-600 bg-blue-100'
      case 'FINISHED': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getDueDateInfo = (dueDate: string | null) => {
    if (!dueDate) return null
    
    const date = new Date(dueDate)
    const now = new Date()
    const daysDiff = differenceInDays(date, now)
    
    if (isPast(date) && !isToday(date)) {
      return {
        text: `Overdue by ${Math.abs(daysDiff)} day${Math.abs(daysDiff) !== 1 ? 's' : ''}`,
        color: 'text-red-600 bg-red-50 border-red-200',
        isOverdue: true
      }
    } else if (isToday(date)) {
      return {
        text: 'Due today',
        color: 'text-orange-600 bg-orange-50 border-orange-200',
        isUrgent: true
      }
    } else if (isTomorrow(date)) {
      return {
        text: 'Due tomorrow',
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        isUrgent: true
      }
    } else if (daysDiff <= 3) {
      return {
        text: `Due in ${daysDiff} day${daysDiff !== 1 ? 's' : ''}`,
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        isSoon: true
      }
    } else {
      return {
        text: format(date, 'MMM dd, yyyy'),
        color: 'text-gray-600 bg-gray-50 border-gray-200',
        isNormal: true
      }
    }
  }

  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
  try {
    setError(null);
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update task');
    }

    // Refresh tasks
    await fetchUserTasks();
    return true;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
    setError(errorMessage);
    console.error('Update task error:', err);
    return false;
  }
}

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchUserTasks}
          className="mt-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          >
            <option value="all">All Tasks</option>
            <option value="BACKLOG">Backlog</option>
            <option value="ONGOING">Ongoing</option>
            <option value="FINISHED">Finished</option>
          </select>
        </div>
        <div className="text-sm text-gray-500">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No tasks found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const dueDateInfo = getDueDateInfo(task.dueDate)
            const isHighPriority = task.priority === 'URGENT' || task.priority === 'HIGH'
            const needsAttention = dueDateInfo?.isOverdue || dueDateInfo?.isUrgent || (isHighPriority && task.status !== 'FINISHED')
            
            return (
              <div
                key={task.id}
                className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-md ${
                  needsAttention ? 'border-l-4 border-l-red-500 bg-red-50/30' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-black truncate">
                        {task.title}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityTextColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                        {task.taskOrigin === 'TEAM' && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium text-purple-700 bg-purple-50">
                            Team Task
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {task.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Created by {task.creator.name}</span>
                      {task.teamAssignments && task.teamAssignments.length > 0 && (
                        <span>Team: {task.teamAssignments[0].team.name}</span>
                      )}
                      <span>{format(new Date(task.createdAt), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2 ml-4">
                    {dueDateInfo && showDueDateWarning && (
                      <span className={`px-2 py-1 rounded-md text-xs font-medium border ${dueDateInfo.color}`}>
                        {dueDateInfo.text}
                      </span>
                    )}
                    
                    {task.status !== 'FINISHED' && (
                      <div className="flex space-x-1">
                        {task.status === 'BACKLOG' && (
                          <button
                            onClick={() => updateTaskStatus(task.id, 'ONGOING')}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                          >
                            Start
                          </button>
                        )}
                        {task.status === 'ONGOING' && (
                          <>
                            <button
                              onClick={() => updateTaskStatus(task.id, 'BACKLOG')}
                              className="px-3 py-1 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-700 transition-colors"
                            >
                              Pause
                            </button>
                            <button
                              onClick={() => updateTaskStatus(task.id, 'FINISHED')}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                            >
                              Complete
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    {task.status === 'FINISHED' && (
                      <button
                        onClick={() => updateTaskStatus(task.id, 'ONGOING')}
                        className="px-3 py-1 bg-yellow-600 text-white text-xs rounded-md hover:bg-yellow-700 transition-colors"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}