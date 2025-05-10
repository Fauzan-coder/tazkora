"use client";
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

// Define types based on your Prisma schema
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type TaskStatus = 'ONGOING' | 'FINISHED' | 'BACKLOG';
type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  createdAt: string;
  dueDate: string | null;
};

type Issue = {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  createdAt: string;
  taskId: string | null;
  task?: {
    title: string;
  };
};

type User = {
  id: string;
  name: string;
  email: string;
  role: 'HEAD' | 'MANAGER' | 'EMPLOYEE';
};

interface UserDetailsModalProps {
  userId: string;
  userName: string;
  userRole: 'HEAD' | 'MANAGER' | 'EMPLOYEE';
  isOpen: boolean;
  onClose: () => void;
}

export default function UserDetailsModal({
  userId,
  userName,
  userRole,
  isOpen,
  onClose
}: UserDetailsModalProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'issues'>('tasks');
  
  useEffect(() => {
    if (isOpen && userId) {
      fetchUserData();
    }
  }, [userId, isOpen]);
  
  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch active tasks for the user using the userId parameter
      const tasksResponse = await fetch(`/api/tasks/${userId}?userId=${userId}`);
      
      if (!tasksResponse.ok) {
        throw new Error('Failed to fetch tasks');
      }
      
      const tasksData = await tasksResponse.json();
      setTasks(tasksData);
      
      // Fetch open issues for the user using the userId parameter
      const issuesResponse = await fetch(`/api/issues/${userId}?userId=${userId}`);
      
      if (!issuesResponse.ok) {
        throw new Error('Failed to fetch issues');
      }
      
      const issuesData = await issuesResponse.json();
      setIssues(issuesData);
      
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to get priority badge style
  const getPriorityStyle = (priority: Priority) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Function to get issue status badge style
  const getIssueStatusStyle = (status: IssueStatus) => {
    switch (status) {
      case 'OPEN':
        return 'bg-red-100 text-red-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'RESOLVED':
        return 'bg-green-100 text-green-800';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center border-b p-4">
          <h2 className="text-xl font-semibold">
            {userName}'s Dashboard
            <span className="ml-2 text-sm font-normal text-gray-500">({userRole})</span>
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'tasks' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('tasks')}
          >
            Active Tasks
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'issues' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('issues')}
          >
            Open Issues
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[70vh]">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-500 py-4">{error}</div>
          ) : (
            <>
              {activeTab === 'tasks' && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Ongoing Tasks</h3>
                  {tasks.length === 0 ? (
                    <p className="text-gray-500 italic">No active tasks found</p>
                  ) : (
                    <div className="space-y-4">
                      {tasks.map(task => (
                        <div key={task.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-lg">{task.title}</h4>
                            <span className={`text-xs px-2 py-1 rounded ${getPriorityStyle(task.priority)}`}>
                              {task.priority}
                            </span>
                          </div>
                          {task.description && (
                            <p className="text-gray-600 mb-3">{task.description}</p>
                          )}
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">
                              Created: {new Date(task.createdAt).toLocaleDateString()}
                            </span>
                            {task.dueDate && (
                              <span className={`${
                                new Date(task.dueDate) < new Date() ? 'text-red-500' : 'text-gray-500'
                              }`}>
                                Due: {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'issues' && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Open Issues</h3>
                  {issues.length === 0 ? (
                    <p className="text-gray-500 italic">No open issues found</p>
                  ) : (
                    <div className="space-y-4">
                      {issues.map(issue => (
                        <div key={issue.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-lg">{issue.title}</h4>
                            <span className={`text-xs px-2 py-1 rounded ${getIssueStatusStyle(issue.status)}`}>
                              {issue.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-gray-600 mb-3">{issue.description}</p>
                          {issue.task && (
                            <div className="bg-gray-100 p-2 rounded mb-3">
                              <span className="text-sm text-gray-500">Related to task: </span>
                              <span className="text-sm font-medium">{issue.task.title}</span>
                            </div>
                          )}
                          <div className="text-sm text-gray-500">
                            Reported: {new Date(issue.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="border-t p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}