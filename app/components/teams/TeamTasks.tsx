'use client'

import { useState, useEffect } from 'react'
import { Task, User, Priority, TaskStatus } from '@prisma/client'
import { FiFilter, FiPlus, FiEdit2, FiTrash2, FiCalendar, FiAlertCircle } from 'react-icons/fi'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface TaskWithRelations extends Task {
  assignee?: {
    id: string
    name: string
    email: string
    role: string
  } | null
  creator: {
    id: string
    name: string
    email: string
    role: string
  }
  issues: any[]
  team?: {
    teamLeadId: string
  } | null
}

interface TeamTasksProps {
    teamId: string;
    showCreateForm: boolean;
    canManage: boolean;
  }

interface TeamTasksProps {
  teamId: string
  userRole?: string
  userId?: string
}

const priorityColors = {
  LOW: 'bg-blue-100 text-blue-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
}

const statusColors = {
  ONGOING: 'bg-green-100 text-green-800',
  FINISHED: 'bg-gray-100 text-gray-800',
  BACKLOG: 'bg-purple-100 text-purple-800',
}

export default function TeamTasks({ teamId, userRole, userId }: TeamTasksProps) {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const router = useRouter()

  const canCreateTasks = userRole === 'HEAD' || userRole === 'MANAGER'
  const isTeamLead = tasks.some(task => 
    task.team?.teamLeadId === userId
  )

  useEffect(() => {
    const fetchTeamTasks = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/teams/${teamId}/tasks${statusFilter ? `?status=${statusFilter}` : ''}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch team tasks')
        }
        
        const data = await response.json()
        setTasks(data)
      } catch (err) {
        console.error('Error fetching team tasks:', err)
        setError('Failed to load tasks. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchTeamTasks()
  }, [teamId, statusFilter])

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return
    }
    
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete task')
      }
      
      // Refresh tasks list
      setTasks(tasks.filter(task => task.id !== taskId))
    } catch (err) {
      console.error('Error deleting task:', err)
      setError('Failed to delete task. Please try again.')
    }
  }

  const handleStatusFilter = (status: string | null) => {
    setStatusFilter(status)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-800">{error}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="text-lg font-medium">Team Tasks</h3>
        
        <div className="flex items-center space-x-2">
          <div className="relative">
            <button
              className="flex items-center text-sm px-3 py-1 border rounded-md hover:bg-gray-50"
            >
              <FiFilter className="mr-1" />
              Filter
            </button>
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 hidden">
              <div className="py-1">
                <button 
                  onClick={() => handleStatusFilter(null)} 
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  All
                </button>
                <button 
                  onClick={() => handleStatusFilter('ONGOING')} 
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  Ongoing
                </button>
                <button 
                  onClick={() => handleStatusFilter('BACKLOG')} 
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  Backlog
                </button>
                <button 
                  onClick={() => handleStatusFilter('FINISHED')} 
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  Finished
                </button>
              </div>
            </div>
          </div>
          
          {(canCreateTasks || isTeamLead) && (
            <Link 
              href={`/dashboard/teams/${teamId}/tasks/create`}
              className="flex items-center text-sm px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <FiPlus className="mr-1" />
              New Task
            </Link>
          )}
        </div>
      </div>
      
      {tasks.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-500">No tasks assigned to this team yet.</p>
          {(canCreateTasks || isTeamLead) && (
            <Link 
              href={`/dashboard/teams/${teamId}/tasks/create`}
              className="inline-block mt-2 text-blue-600 hover:underline"
            >
              Create the first task
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assignee
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issues
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/dashboard/tasks/${task.id}`} className="text-blue-600 hover:underline font-medium">
                      {task.title}
                    </Link>
                    {task.description && (
                      <p className="text-gray-500 text-sm truncate max-w-xs">{task.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {task.assignee ? (
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                          {task.assignee.name.charAt(0)}
                        </div>
                        <div className="ml-2">
                          <div className="text-sm font-medium text-gray-900">{task.assignee.name}</div>
                          <div className="text-sm text-gray-500">{task.assignee.email}</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {task.dueDate ? (
                      <div className="flex items-center text-sm">
                        <FiCalendar className="mr-1 text-gray-400" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">No due date</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${priorityColors[task.priority as Priority]}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${statusColors[task.status as TaskStatus]}`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {task.issues.length > 0 ? (
                      <div className="flex items-center text-sm">
                        <FiAlertCircle className="mr-1 text-orange-500" />
                        {task.issues.length}
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link 
                      href={`/dashboard/tasks/${task.id}/edit`}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      <FiEdit2 className="inline" />
                    </Link>
                    {(userRole === 'HEAD' || task.creatorId === userId || task.team?.teamLeadId === userId) && (
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <FiTrash2 className="inline" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}