"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
type Role = 'HEAD' | 'MANAGER' | 'EMPLOYEE'

interface Manager {
  id: string
  name: string
  role: Role
}

interface UserFormProps {
  onUserCreated: () => void
  onCancel: () => void
}

export default function UserForm({ onUserCreated, onCancel }: UserFormProps) {
  const { data: session } = useSession()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('EMPLOYEE')
  const [managerId, setManagerId] = useState('')
  const [managers, setManagers] = useState<Manager[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const response = await fetch('/api/users')
        
        if (!response.ok) {
          throw new Error('Failed to fetch managers')
        }
        
        const users = await response.json()
        // Only HEAD and MANAGER can be managers
        const availableManagers = users.filter(
          (user: Manager) => user.role === 'HEAD' || user.role === 'MANAGER'
        )
        setManagers(availableManagers)
      } catch (err) {
        console.error('Error fetching managers:', err)
      }
    }
    
    fetchManagers()
  }, [])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          managerId: role === 'EMPLOYEE' ? managerId : undefined,
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to create user')
      }
      
      onUserCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-4">
      <h3 className="font-medium mb-4">Add New User</h3>
      
      {error && (
        <div className="mb-4 p-2 bg-red-50 text-red-500 text-sm rounded">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
            minLength={8}
            required
          />
        </div>
        
        <div>
          <label htmlFor="role" className="block text-sm font-medium mb-1">
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="w-full p-2 border rounded"
          >
            {session?.user?.role === 'HEAD' && (
              <option value="MANAGER">Manager</option>
            )}
            <option value="EMPLOYEE">Employee</option>
          </select>
        </div>
        
        {role === 'EMPLOYEE' && managers.length > 0 && (
          <div>
            <label htmlFor="manager" className="block text-sm font-medium mb-1">
              Manager
            </label>
            <select
              id="manager"
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select Manager</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name} ({manager.role})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded text-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          {isLoading ? 'Creating...' : 'Create User'}
        </button>
      </div>
    </form>
  )
}