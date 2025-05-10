"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import TaskForm from './TaskForm'
import { CheckCircle, Clock, Inbox, Plus, Loader } from 'lucide-react'

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type TaskStatus = 'ONGOING' | 'FINISHED' | 'BACKLOG'

type Task = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  createdAt: string
  dueDate: string | null
  creator: {
    id: string
    name: string
    email: string
    role: string
  }
  assignee: {
    id: string
    name: string
    email: string
    role: string
  } | null
}

export default function TaskList() {
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [filter, setFilter] = useState<TaskStatus | 'ALL'>('ALL')
  
  const fetchTasks = async () => {
    try {
      setIsLoading(true)
      const statusParam = filter !== 'ALL' ? `?status=${filter}` : ''
      const response = await fetch(`/api/tasks${statusParam}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }
      
      const data = await response.json()
      setTasks(data)
    } catch (err) {
      setError('Error loading tasks')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleUpdateTaskStatus = async (taskId: string, status: TaskStatus) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update task')
      }
      
      fetchTasks()
    } catch (err) {
      setError('Error updating task')
      console.error(err)
    }
  }

  useEffect(() => {
    if (session) {
      fetchTasks()
    }
  }, [session, filter])
  
  const handleTaskCreated = () => {
    setIsFormOpen(false)
    fetchTasks()
  }
  
  const canCreateTask = session?.user?.role === 'HEAD' || session?.user?.role === 'MANAGER'
  
  const getPriorityStyle = (priority: Priority) => {
    switch (priority) {
      case 'LOW':
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900 border border-gray-300'
      case 'MEDIUM':
        return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-900 border border-blue-300'
      case 'HIGH':
        return 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-900 border border-orange-300'
      case 'URGENT':
        return 'bg-gradient-to-r from-red-100 to-red-200 text-red-900 border border-red-300'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }
  
  const getStatusStyle = (status: TaskStatus) => {
    switch (status) {
      case 'ONGOING':
        return 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-900 border border-yellow-300'
      case 'FINISHED':
        return 'bg-gradient-to-r from-green-100 to-green-200 text-green-900 border border-green-300'
      case 'BACKLOG':
        return 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-900 border border-purple-300'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'ONGOING': return <Clock size={14} className="mr-1" />
      case 'FINISHED': return <CheckCircle size={14} className="mr-1" />
      case 'BACKLOG': return <Inbox size={14} className="mr-1" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gradient-to-r from-blue-50 to-gray-100 rounded-xl shadow-md">
        <div className="flex items-center space-x-2">
          <Loader className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="text-blue-800 font-medium">Loading tasks...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl shadow-md">
        {error}
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-gray-100 p-6 rounded-xl shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 flex items-center ${
              filter === 'ALL' 
                ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-md' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All Tasks
          </button>
          <button
            onClick={() => setFilter('ONGOING')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 flex items-center ${
              filter === 'ONGOING' 
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-md' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Clock size={16} className="mr-1" />
            Ongoing
          </button>
          <button
            onClick={() => setFilter('FINISHED')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 flex items-center ${
              filter === 'FINISHED' 
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <CheckCircle size={16} className="mr-1" />
            Finished
          </button>
          <button
            onClick={() => setFilter('BACKLOG')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 flex items-center ${
              filter === 'BACKLOG' 
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Inbox size={16} className="mr-1" />
            Backlog
          </button>
        </div>
        
        {canCreateTask && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white px-5 py-2 rounded-full shadow-md transition-all duration-200 flex items-center"
          >
            <Plus size={18} className="mr-1" />
            Create Task
          </button>
        )}
      </div>
      
      {isFormOpen && (
        <div className="mb-8 bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <TaskForm onTaskCreated={handleTaskCreated} onCancel={() => setIsFormOpen(false)} />
        </div>
      )}
      
      {tasks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col items-center gap-2">
            <Inbox size={40} className="text-gray-400" />
            <p className="text-gray-500 font-medium">No tasks found</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <h3 className="font-semibold text-lg text-gray-800">{task.title}</h3>
                <div className="flex gap-2">
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${getPriorityStyle(task.priority)}`}>
                    {task.priority}
                  </span>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium flex items-center ${getStatusStyle(task.status)}`}>
                    {getStatusIcon(task.status)}
                    {task.status}
                  </span>
                </div>
              </div>
              
              {task.description && (
                <p className="text-sm text-gray-600 mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {task.description}
                </p>
              )}
              
              <div className="mt-4 flex flex-col sm:flex-row sm:justify-between text-sm text-gray-500 gap-2">
                <div>
                  <p className="font-medium">Created by: <span className="text-gray-700">{task.creator.name}</span></p>
                  {task.assignee && (
                    <p className="font-medium">Assigned to: <span className="text-gray-700">{task.assignee.name}</span></p>
                  )}
                </div>
                
                {task.dueDate && (
                  <p className="font-medium bg-blue-50 text-blue-800 px-3 py-1 rounded-lg border border-blue-100 self-start">
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </p>
                )}
              </div>
              
              {/* Task Actions */}
              <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap justify-end gap-2">
                {task.status !== 'FINISHED' && (
                  <button
                    onClick={() => handleUpdateTaskStatus(task.id, 'FINISHED')}
                    className="text-sm bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-3 py-2 rounded-lg shadow-sm transition-all duration-200 flex items-center"
                  >
                    <CheckCircle size={16} className="mr-1" />
                    Mark Complete
                  </button>
                )}
                
                {task.status !== 'ONGOING' && (
                  <button
                    onClick={() => handleUpdateTaskStatus(task.id, 'ONGOING')}
                    className="text-sm bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white px-3 py-2 rounded-lg shadow-sm transition-all duration-200 flex items-center"
                  >
                    <Clock size={16} className="mr-1" />
                    Mark Ongoing
                  </button>
                )}
                
                {task.status !== 'BACKLOG' && (
                  <button
                    onClick={() => handleUpdateTaskStatus(task.id, 'BACKLOG')}
                    className="text-sm bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-3 py-2 rounded-lg shadow-sm transition-all duration-200 flex items-center"
                  >
                    <Inbox size={16} className="mr-1" />
                    Move to Backlog
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}