"use client";
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import UserForm from './UserForm';
import { ChevronDown, ChevronUp, Users, UserPlus, Loader, User } from 'lucide-react';
import UserDetailsModal from '../ui/UserDetailsModal';

// Define Role type
type Role = 'HEAD' | 'MANAGER' | 'EMPLOYEE';

// Define User type
type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  image: string | null;
  createdAt: string;
  managerId: string | null;
  manager?: {
    id: string;
    name: string;
  } | null;
};

export default function UserList() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expandedManager, setExpandedManager] = useState<string | null>(null);
  const [managedEmployees, setManagedEmployees] = useState<{[managerId: string]: User[]}>({});
  const [selectedManagerId, setSelectedManagerId] = useState<{[employeeId: string]: string}>({});
  const [isUpdating, setIsUpdating] = useState<{[employeeId: string]: boolean}>({});
  
  // State for user details modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/users');
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      
      // Enhance user data with manager information
      const enhancedData = data.map((user: User) => {
        if (user.managerId) {
          const manager = data.find((m: User) => m.id === user.managerId);
          return {
            ...user,
            manager: manager ? { id: manager.id, name: manager.name } : null
          };
        }
        return user;
      });
      
      setUsers(enhancedData);
      
      // Initialize selected manager state
      const initialManagerSelections: {[employeeId: string]: string} = {};
      enhancedData.forEach((user: User) => {
        if (user.role === 'EMPLOYEE') {
          initialManagerSelections[user.id] = user.managerId || '';
        }
      });
      setSelectedManagerId(initialManagerSelections);
      
      // If the current user is HEAD, organize employees by manager
      if (session?.user?.role === 'HEAD') {
        const employeesByManager: {[managerId: string]: User[]} = {};
        
        // Find all managers
        const managers = enhancedData.filter((user: User) => user.role === 'MANAGER');
        
        // Group employees by their manager
        managers.forEach((manager: User) => {
          employeesByManager[manager.id] = enhancedData.filter(
            (user: User) => user.managerId === manager.id && user.role === 'EMPLOYEE'
          );
        });
        
        setManagedEmployees(employeesByManager);
      }
    } catch (err) {
      setError('Error loading users');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchUsers();
    }
  }, [session]);
  
  const handleUserCreated = () => {
    setIsFormOpen(false);
    fetchUsers();
  };
  
  const getRoleStyle = (role: Role) => {
    switch (role) {
      case 'HEAD':
        return 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-900 border border-purple-300';
      case 'MANAGER':
        return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-900 border border-blue-300';
      case 'EMPLOYEE':
        return 'bg-gradient-to-r from-green-100 to-green-200 text-green-900 border border-green-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case 'HEAD':
        return <User size={14} className="mr-1" />;
      case 'MANAGER':
        return <User size={14} className="mr-1" />;
      case 'EMPLOYEE':
        return <User size={14} className="mr-1" />;
      default:
        return null;
    }
  };

  const toggleManagerExpand = (managerId: string) => {
    if (expandedManager === managerId) {
      setExpandedManager(null);
    } else {
      setExpandedManager(managerId);
    }
  };
  
  const handleManagerChange = (employeeId: string, managerId: string) => {
    setSelectedManagerId(prev => ({
      ...prev,
      [employeeId]: managerId
    }));
  };
  
  const assignManager = async (employeeId: string) => {
    try {
      // Set updating state for this employee
      setIsUpdating(prev => ({
        ...prev,
        [employeeId]: true
      }));
      
      const response = await fetch(`/api/users/${employeeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          managerId: selectedManagerId[employeeId] || null
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Server response:', errorData);
        throw new Error(errorData.message || 'Failed to update manager');
      }
      
      // Refetch users to update the UI
      await fetchUsers();
    } catch (err) {
      console.error('Error assigning manager:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign manager');
    } finally {
      // Clear updating state
      setIsUpdating(prev => ({
        ...prev,
        [employeeId]: false
      }));
    }
  };
  
  // Handle user row click to open modal
  const handleUserRowClick = (user: User) => {
    // Only allow viewing details for employees (by HEAD and MANAGER)
    // or managers (by HEAD only)
    const currentUserRole = session?.user?.role;
    
    if (currentUserRole === 'HEAD' || 
        (currentUserRole === 'MANAGER' && user.role === 'EMPLOYEE' && user.managerId === session?.user?.id)) {
      setSelectedUser(user);
      setModalOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gradient-to-r from-blue-50 to-gray-100 rounded-xl shadow-md">
        <div className="flex items-center space-x-2">
          <Loader className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="text-blue-800 font-medium">Loading users...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl shadow-md">
        {error}
      </div>
    );
  }

  const isHead = session?.user?.role === 'HEAD';
  const isManager = session?.user?.role === 'MANAGER';
  const managers = users.filter(user => user.role === 'MANAGER');

  return (
    <div className="bg-gradient-to-br from-blue-50 to-gray-100 p-6 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <Users className="mr-2" />
          User Management
        </h2>
        
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white px-5 py-2 rounded-full shadow-md transition-all duration-200 flex items-center"
        >
          <UserPlus size={18} className="mr-1" />
          Add User
        </button>
      </div>
      
      {isFormOpen && (
        <div className="mb-8 bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <UserForm onUserCreated={handleUserCreated} onCancel={() => setIsFormOpen(false)} />
        </div>
      )}
      
      {users.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col items-center gap-2">
            <Users size={40} className="text-gray-400" />
            <p className="text-gray-500 font-medium">No users found</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
              <tr>
                <th className="py-3 px-4 text-left text-gray-700 font-semibold">Name</th>
                <th className="py-3 px-4 text-left text-gray-700 font-semibold">Email</th>
                <th className="py-3 px-4 text-left text-gray-700 font-semibold">Role</th>
                <th className="py-3 px-4 text-left text-gray-700 font-semibold">Manager</th>
                <th className="py-3 px-4 text-left text-gray-700 font-semibold">Joined</th>
                {(isHead || isManager) && <th className="py-3 px-4 text-left text-gray-700 font-semibold">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                // Create a unique key for each user's row group
                const userKey = `user-${user.id}`;
                
                // Determine if this user can be viewed (for cursor styling)
                const canViewDetails = 
                  (isHead) || 
                  (isManager && user.role === 'EMPLOYEE' && user.managerId === session?.user?.id);
                
                return (
                  <React.Fragment key={userKey}>
                    <tr 
                      className={`border-b border-gray-100 ${
                        canViewDetails 
                          ? "hover:bg-blue-50 cursor-pointer transition-colors duration-150" 
                          : ""
                      }`}
                      onClick={canViewDetails ? () => handleUserRowClick(user) : undefined}
                    >
                      <td className="py-3 px-4 text-gray-800">{user.name}</td>
                      <td className="py-3 px-4 text-gray-600">{user.email}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-3 py-1 rounded-full font-medium flex items-center w-fit ${getRoleStyle(user.role)}`}>
                          {getRoleIcon(user.role)}
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {user.manager ? user.manager.name : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      {(isHead || isManager) && (
                        <td className="py-3 px-4">
                          {isHead && user.role === 'MANAGER' && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent row click event
                                toggleManagerExpand(user.id);
                              }}
                              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-150 px-3 py-1 rounded-lg bg-blue-50 border border-blue-100"
                            >
                              {managedEmployees[user.id]?.length || 0} employees
                              {expandedManager === user.id ? (
                                <ChevronUp className="ml-1 w-4 h-4" />
                              ) : (
                                <ChevronDown className="ml-1 w-4 h-4" />
                              )}
                            </button>
                          )}
                          {isHead && user.role === 'EMPLOYEE' && managers.length > 0 && (
                            <div className="flex items-center space-x-2">
                              <select
                                value={selectedManagerId[user.id] || ''}
                                onChange={(e) => {
                                  e.stopPropagation(); // Prevent row click event
                                  handleManagerChange(user.id, e.target.value);
                                }}
                                onClick={(e) => e.stopPropagation()} // Prevent row click event
                                className="border border-gray-300 rounded-lg px-3 py-1 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all duration-150"
                                disabled={isUpdating[user.id]}
                              >
                                <option value="">No Manager</option>
                                {managers.map(manager => (
                                  <option key={manager.id} value={manager.id}>
                                    {manager.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent row click event
                                  assignManager(user.id);
                                }}
                                disabled={isUpdating[user.id] || selectedManagerId[user.id] === user.managerId}
                                className={`text-sm px-3 py-1 rounded-lg transition-all duration-150 flex items-center ${
                                  isUpdating[user.id] || selectedManagerId[user.id] === user.managerId
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-sm'
                                }`}
                              >
                                {isUpdating[user.id] ? (
                                  <>
                                    <Loader size={14} className="mr-1 animate-spin" />
                                    Updating...
                                  </>
                                ) : 'Assign'}
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                    {isHead && user.role === 'MANAGER' && expandedManager === user.id && (
                      <tr key={`${userKey}-expanded`}>
                        <td colSpan={6} className="py-2 px-4 border-b bg-gradient-to-r from-blue-50 to-gray-50">
                          <div className="pl-8 py-2">
                            <h4 className="font-medium mb-3 text-blue-800 flex items-center">
                              <Users size={16} className="mr-2" />
                              Employees managed by {user.name}:
                            </h4>
                            {managedEmployees[user.id]?.length > 0 ? (
                              <div className="space-y-2 ml-2">
                                {managedEmployees[user.id].map((employee) => (
                                  <div 
                                    key={employee.id} 
                                    className="flex justify-between text-gray-800 p-3 hover:bg-white rounded-lg cursor-pointer border border-transparent hover:border-gray-200 transition-all duration-150 shadow-sm"
                                    onClick={() => handleUserRowClick(employee)}
                                  >
                                    <span className="font-medium">{employee.name}</span>
                                    <span className="text-gray-600">{employee.email}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 ml-2 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                                No employees assigned to this manager
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {/* User Details Modal */}
      {selectedUser && (
        <UserDetailsModal
          userId={selectedUser.id}
          userName={selectedUser.name}
          userRole={selectedUser.role}
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}