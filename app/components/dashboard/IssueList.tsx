"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import IssueForm from './IssueForm'
import { AlertCircle, Clock, CheckCircle, XCircle, Plus, Loader, FileText } from 'lucide-react'

type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'

type Issue = {
  id: string
  title: string
  description: string
  status: IssueStatus
  createdAt: string
  taskId: string | null
  creator: {
    id: string
    name: string
    email: string
    role: string
  }
  task?: {
    id: string
    title: string
  } | null
}

export default function IssueList() {
  const { data: session } = useSession()
  const [issues, setIssues] = useState<Issue[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [filter, setFilter] = useState<IssueStatus | 'ALL'>('ALL')
  
  const fetchIssues = async () => {
    try {
      setIsLoading(true)
      const statusParam = filter !== 'ALL' ? `?status=${filter}` : ''
      const response = await fetch(`/api/issues${statusParam}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch issues')
      }
      
      const data = await response.json()
      setIssues(data)
    } catch (err) {
      setError('Error loading issues')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleUpdateIssueStatus = async (issueId: string, status: IssueStatus) => {
    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update issue')
      }
      
      fetchIssues()
    } catch (err) {
      setError('Error updating issue')
      console.error(err)
    }
  }

  useEffect(() => {
    if (session) {
      fetchIssues()
    }
  }, [session, filter])
  
  const handleIssueCreated = () => {
    setIsFormOpen(false)
    fetchIssues()
  }
  
  const getStatusStyle = (status: IssueStatus) => {
    switch (status) {
      case 'OPEN':
        return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-900 border border-blue-300'
      case 'IN_PROGRESS':
        return 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-900 border border-yellow-300'
      case 'RESOLVED':
        return 'bg-gradient-to-r from-green-100 to-green-200 text-green-900 border border-green-300'
      case 'CLOSED':
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900 border border-gray-300'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: IssueStatus) => {
    switch (status) {
      case 'OPEN': return <AlertCircle size={14} className="mr-1" />
      case 'IN_PROGRESS': return <Clock size={14} className="mr-1" />
      case 'RESOLVED': return <CheckCircle size={14} className="mr-1" />
      case 'CLOSED': return <XCircle size={14} className="mr-1" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gradient-to-r from-blue-50 to-gray-100 rounded-xl shadow-md">
        <div className="flex items-center space-x-2">
          <Loader className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="text-blue-800 font-medium">Loading issues...</span>
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
            All Issues
          </button>
          <button
            onClick={() => setFilter('OPEN')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 flex items-center ${
              filter === 'OPEN' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <AlertCircle size={16} className="mr-1" />
            Open
          </button>
          <button
            onClick={() => setFilter('IN_PROGRESS')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 flex items-center ${
              filter === 'IN_PROGRESS' 
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-md' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Clock size={16} className="mr-1" />
            In Progress
          </button>
          <button
            onClick={() => setFilter('RESOLVED')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 flex items-center ${
              filter === 'RESOLVED' 
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <CheckCircle size={16} className="mr-1" />
            Resolved
          </button>
          <button
            onClick={() => setFilter('CLOSED')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 flex items-center ${
              filter === 'CLOSED' 
                ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-md' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <XCircle size={16} className="mr-1" />
            Closed
          </button>
        </div>
        
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white px-5 py-2 rounded-full shadow-md transition-all duration-200 flex items-center"
        >
          <Plus size={18} className="mr-1" />
          Report Issue
        </button>
      </div>
      
      {isFormOpen && (
        <div className="mb-8 bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <IssueForm onIssueCreated={handleIssueCreated} onCancel={() => setIsFormOpen(false)} />
        </div>
      )}
      
      {issues.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col items-center gap-2">
            <FileText size={40} className="text-gray-400" />
            <p className="text-gray-500 font-medium">No issues found</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {issues.map((issue) => (
            <div key={issue.id} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <h3 className="font-semibold text-lg text-gray-800">{issue.title}</h3>
                <span className={`text-xs px-3 py-1 rounded-full font-medium flex items-center ${getStatusStyle(issue.status)}`}>
                  {getStatusIcon(issue.status)}
                  {issue.status.replace('_', ' ')}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                {issue.description}
              </p>
              
              <div className="mt-4 flex flex-col sm:flex-row sm:justify-between text-sm text-gray-500 gap-2">
                <div>
                  <p className="font-medium">Reported by: <span className="text-gray-700">{issue.creator.name}</span></p>
                  {issue.task && (
                    <p className="font-medium">Related to task: <span className="text-blue-600">{issue.task.title}</span></p>
                  )}
                </div>
                
                <p className="font-medium bg-blue-50 text-blue-800 px-3 py-1 rounded-lg border border-blue-100 self-start">
                  Reported on: {new Date(issue.createdAt).toLocaleDateString()}
                </p>
              </div>
              
              {/* Issue Actions */}
              <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap justify-end gap-2">
                {issue.status !== 'CLOSED' && (
                  <button
                    onClick={() => handleUpdateIssueStatus(issue.id, 'CLOSED')}
                    className="text-sm bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-3 py-2 rounded-lg shadow-sm transition-all duration-200 flex items-center"
                  >
                    <XCircle size={16} className="mr-1" />
                    Close Issue
                  </button>
                )}
                
                {issue.status !== 'RESOLVED' && issue.status !== 'CLOSED' && (
                  <button 
                    onClick={() => handleUpdateIssueStatus(issue.id, 'RESOLVED')}
                    className="text-sm bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-3 py-2 rounded-lg shadow-sm transition-all duration-200 flex items-center"
                  >
                    <CheckCircle size={16} className="mr-1" />
                    Resolve Issue
                  </button> 
                )}
                
                {issue.status !== 'IN_PROGRESS' && issue.status !== 'RESOLVED' && issue.status !== 'CLOSED' && (
                  <button
                    onClick={() => handleUpdateIssueStatus(issue.id, 'IN_PROGRESS')}
                    className="text-sm bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white px-3 py-2 rounded-lg shadow-sm transition-all duration-200 flex items-center"
                  >
                    <Clock size={16} className="mr-1" />
                    Mark In Progress
                  </button>
                )}
                
                {issue.status !== 'OPEN' && issue.status !== 'CLOSED' && (
                  <button
                    onClick={() => handleUpdateIssueStatus(issue.id, 'OPEN')}
                    className="text-sm bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-2 rounded-lg shadow-sm transition-all duration-200 flex items-center"
                  >
                    <AlertCircle size={16} className="mr-1" />
                    Reopen Issue
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