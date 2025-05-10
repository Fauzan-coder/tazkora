"use client"
import React, { useState, useEffect } from 'react';
import { Search, Download, Calendar, Loader2 } from 'lucide-react';
import _ from 'lodash';
import { useSession } from 'next-auth/react';

export default function ReportDownloader() {
  const { data: session, status } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  interface User {
    id: string;
    name: string;
    email: string;
    role: string;
  }

  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
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
        // Use the existing users API endpoint
        // Your current API already handles filtering based on the user's role
        const response = await fetch('/api/users');
        if (!response.ok) throw new Error('Failed to fetch users');
        
        const usersData = await response.json();
        setUsers(usersData);
        setFilteredUsers(usersData);
      } catch (err) {
        setError('Failed to load users');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUsers();
  }, [status, currentUserRole, currentUserId]);

  // Filter users based on search query with debounce
  useEffect(() => {
    const filterUsers = () => {
      if (!searchQuery.trim()) {
        setFilteredUsers(users);
        return;
      }
      
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      setFilteredUsers(filtered);
    };
    
    const debouncedFilter = _.debounce(filterUsers, 300);
    debouncedFilter();
    
    return () => {
      debouncedFilter.cancel();
    };
  }, [searchQuery, users]);

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

  if (status === 'loading') {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }
  
  if (status === 'unauthenticated') {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">You need to be logged in to access this page.</p>
      </div>
    );
  }
  
  if (!currentUserRole || (currentUserRole !== 'HEAD' && currentUserRole !== 'MANAGER')) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Download User Reports</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Select Month</label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="month"
            className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-10 border px-3"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
      </div>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Search Users</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-10 border px-3"
            placeholder="Search by name or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div className="overflow-hidden border border-gray-200 rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading && !filteredUsers.length ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  <span className="mt-2 block text-sm text-gray-500">Loading users...</span>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.role}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDownload(user.id)}
                      disabled={isLoading}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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
  );
}