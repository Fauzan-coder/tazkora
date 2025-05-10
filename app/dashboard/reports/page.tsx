"use client"
import React, { useState, useEffect } from 'react';
import { Search, Download, Calendar, Loader2, Users, User, ArrowLeft } from 'lucide-react';
import _ from 'lodash';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [managerSearchQuery, setManagerSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    managerId?: string;
    managerName?: string;
  }

  const [users, setUsers] = useState<User[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const currentUserRole = session?.user?.role || '';
  const currentUserId = session?.user?.id || '';

  // Fetch users based on current user's role
  useEffect(() => {
    if (status !== 'authenticated' || !currentUserRole || !currentUserId) return;

    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        // Extended API endpoint that returns users based on role and includes manager info
        const response = await fetch('/api/users');
        if (!response.ok) throw new Error('Failed to fetch users');
        
        const usersData = await response.json();
        
        // If current user is a MANAGER, filter to only show their team members
        if (currentUserRole === 'MANAGER') {
          setUsers(usersData.filter((user: User) => 
            user.role === 'EMPLOYEE' && user.managerId === currentUserId
          ));
        } else {
          // For HEAD role, show all users
          setUsers(usersData.filter((user: User) => 
            user.role === 'EMPLOYEE' || user.role === 'MANAGER'
          ));
          
          // Extract managers for the manager filter (for HEAD users only)
          setManagers(usersData.filter((user: User) => user.role === 'MANAGER'));
        }
        
        // Initialize filtered users
        if (currentUserRole === 'MANAGER') {
          setFilteredUsers(usersData.filter((user: User) => 
            user.role === 'EMPLOYEE' && user.managerId === currentUserId
          ));
        } else {
          setFilteredUsers(usersData.filter((user: User) => 
            user.role === 'EMPLOYEE' || user.role === 'MANAGER'
          ));
        }
      } catch (err) {
        setError('Failed to load users');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUsers();
  }, [status, currentUserRole, currentUserId]);

  // Filter users based on search query and/or selected manager with debounce
  useEffect(() => {
    const filterUsers = () => {
      let filtered = [...users];
      
      // Filter by user search query if present
      if (searchQuery.trim()) {
        filtered = filtered.filter(user => 
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          user.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      // Additional filter for HEAD role - filter by manager
      if (currentUserRole === 'HEAD' && selectedManagerId) {
        filtered = filtered.filter(user => 
          user.managerId === selectedManagerId || user.id === selectedManagerId
        );
      }
      
      // For HEAD role - filter by manager name search
      if (currentUserRole === 'HEAD' && managerSearchQuery.trim()) {
        const matchingManagerIds = managers
          .filter(manager => 
            manager.name.toLowerCase().includes(managerSearchQuery.toLowerCase()) ||
            manager.email.toLowerCase().includes(managerSearchQuery.toLowerCase())
          )
          .map(manager => manager.id);
          
        filtered = filtered.filter(user => 
          matchingManagerIds.includes(user.managerId || '') || 
          (user.role === 'MANAGER' && matchingManagerIds.includes(user.id))
        );
      }
      
      setFilteredUsers(filtered);
    };
    
    const debouncedFilter = _.debounce(filterUsers, 300);
    debouncedFilter();
    
    return () => {
      debouncedFilter.cancel();
    };
  }, [searchQuery, managerSearchQuery, selectedManagerId, users, managers, currentUserRole]);

  interface DownloadRequestBody {
    userId: string;
    startDate: string;
    endDate: string;
  }

  const handleDownload = async (userId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError('');
      setSelectedUserId(userId); // Track which user is being processed
      
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of the month
      
      const requestBody: DownloadRequestBody = {
        userId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      const response = await fetch(`/api/reports/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        // Handle error response - need to clone response before reading body
        const errorClone = response.clone();
        
        try {
          // Try to parse as JSON first
          const errorData = await errorClone.json();
          throw new Error(errorData.message || 'Failed to generate report');
        } catch (jsonError) {
          // If JSON parsing fails, try to get text content instead
          try {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to generate report');
          } catch (textError) {
            // If all fails, return a generic error
            throw new Error(`Server returned ${response.status}: Failed to generate report`);
          }
        }
      }
      
      // Get the content type to verify we're getting a CSV
      const contentType = response.headers.get('Content-Type');
      if (!contentType || !contentType.includes('text/csv')) {
        // Don't try to read the body here, as we'll need it later
        throw new Error(`Unexpected response type: ${contentType || 'unknown'}`);
      }
      
      // Now we can safely read the blob since we haven't consumed the body yet
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = '';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      if (!filename) {
        // Format filename: user-report-year-month.csv
        const userName = users.find((u) => u.id === userId)?.name.replace(/\s+/g, '-').toLowerCase() || 'user';
        filename = `${userName}-report-${selectedMonth}.csv`;
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error downloading report');
      console.error('Download error:', err);
    } finally {
      setIsLoading(false);
      setSelectedUserId(''); // Reset selected user
    }
  };

  // Go back to previous page
  const handleGoBack = () => {
    router.back();
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-4xl w-full">
          <div className="flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          </div>
        </div>
      </div>
    );
  }
  
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-4xl w-full">
          <div className="p-6 bg-red-50 border border-red-200 rounded-2xl">
            <h2 className="text-2xl font-bold mb-4 text-red-700">Access Denied</h2>
            <p className="text-red-600">You need to be logged in to access this page.</p>
            <button 
              onClick={() => router.push('/login')}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!currentUserRole || (currentUserRole !== 'HEAD' && currentUserRole !== 'MANAGER')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-4xl w-full">
          <div className="p-6 bg-red-50 border border-red-200 rounded-2xl">
            <h2 className="text-2xl font-bold mb-4 text-red-700">Permission Denied</h2>
            <p className="text-red-600">You don't have permission to access this page.</p>
            <button 
              onClick={() => router.push('/dashboard')}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleGoBack}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-700" />
              </button>
              <h1 className="text-3xl font-bold text-gray-900">User Reports</h1>
            </div>
            
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="month"
                className="pl-10 rounded-full border-gray-300 bg-gray-50 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm h-10 border"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                aria-label="Select month for report"
              />
            </div>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Users</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="text"
                  className="pl-12 block w-full rounded-full border-gray-300 bg-gray-50 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm h-12 border"
                  placeholder="Search by name or email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            {currentUserRole === 'HEAD' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search by Manager</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type="text"
                    className="pl-12 block w-full rounded-full border-gray-300 bg-gray-50 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm h-12 border"
                    placeholder="Filter by manager name"
                    value={managerSearchQuery}
                    onChange={(e) => setManagerSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
          
          {currentUserRole === 'HEAD' && (
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Manager</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedManagerId('')}
                  className={`px-4 py-2 rounded-full text-sm transition-colors ${
                    selectedManagerId === '' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Users
                </button>
                {managers.map((manager) => (
                  <button
                    key={manager.id}
                    onClick={() => setSelectedManagerId(manager.id)}
                    className={`px-4 py-2 rounded-full text-sm transition-colors flex items-center ${
                      selectedManagerId === manager.id 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <User className="mr-1 h-4 w-4" />
                    {manager.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    {currentUserRole === 'HEAD' && (
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Manager
                      </th>
                    )}
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading && !filteredUsers.length ? (
                    <tr>
                      <td colSpan={currentUserRole === 'HEAD' ? 5 : 4} className="px-6 py-8 whitespace-nowrap text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" />
                        <span className="mt-2 block text-sm text-gray-500">Loading users...</span>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={currentUserRole === 'HEAD' ? 5 : 4} className="px-6 py-8 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Users className="h-8 w-8 text-gray-400" />
                          <span className="mt-2 block text-sm text-gray-500">No users found</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-gray-500 font-medium">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.role === 'MANAGER' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        {currentUserRole === 'HEAD' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.role === 'EMPLOYEE' ? user.managerName || 'No Manager' : '-'}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDownload(user.id)}
                            disabled={isLoading && selectedUserId === user.id}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                          >
                            {isLoading && selectedUserId === user.id ? (
                              <>
                                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                Downloading...
                              </>
                            ) : (
                              <>
                                <Download className="-ml-1 mr-2 h-4 w-4" />
                                Download Report
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}