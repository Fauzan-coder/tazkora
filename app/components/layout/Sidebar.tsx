"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  
  const role = session?.user?.role || ''
  
  const isActive = (path: string) => pathname === path
  
  const getBasePath = () => {
    switch (role) {
      case 'HEAD':
        return '/dashboard/head'
      case 'MANAGER':
        return '/dashboard/manager'
      case 'EMPLOYEE':
        return '/dashboard/employee'
      default:
        return '/'
    }
  }
  
  const basePath = getBasePath()
  
  return (
    <div className="w-64 bg-gray-100 border-r">
      <div className="p-6">
        <h2 className="text-lg font-bold">Task Manager</h2>
      </div>
      
      <nav className="mt-6">
        <ul>
          <li>
            <Link
              href={basePath}
              className={`px-6 py-3 flex items-center ${
                isActive(basePath) ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              Dashboard
            </Link>
          </li>
          
          {/* Task Management */}
          <li>
            <Link
              href={`${basePath}/tasks`}
              className={`px-6 py-3 flex items-center ${
                pathname.includes('/tasks') ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tasks
            </Link>
          </li>
          
          {/* Issue Management */}
          <li>
            <Link
              href={`${basePath}/issues`}
              className={`px-6 py-3 flex items-center ${
                pathname.includes('/issues') ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              Issues
            </Link>
          </li>
          
          {/* Only for HEAD and MANAGER */}
          {(role === 'HEAD' || role === 'MANAGER') && (
            <li>
              <Link
                href={`${basePath}/users`}
                className={`px-6 py-3 flex items-center ${
                  pathname.includes('/users') ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                Users
              </Link>
            </li>
          )}
        </ul>
      </nav>
    </div>
  )
}