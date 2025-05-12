"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { 
  LayoutDashboard, 
  ClipboardList, 
  AlertTriangle, 
  Users, 
  FileText 
} from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  
  const role = session?.user?.role || ''
  
  const isActive = (path: string) => pathname === path || pathname.includes(path)
  
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
  
  const NavLink = ({ 
    href, 
    icon: Icon, 
    label 
  }: { 
    href: string, 
    icon: React.ElementType, 
    label: string 
  }) => (
    <li>
      <Link
        href={href}
        className={`
          px-4 py-2.5 flex items-center space-x-3 
          transition-all duration-300 ease-in-out
          ${isActive(href) 
            ? 'bg-gray-200 text-black rounded-full' 
            : 'text-gray-600 hover:bg-gray-100 hover:rounded-full'}
          group
        `}
      >
        <Icon 
          className={`
            w-5 h-5 
            ${isActive(href) ? 'text-black' : 'text-gray-500 group-hover:text-black'}
          `} 
        />
        <span className="text-sm font-medium">{label}</span>
      </Link>
    </li>
  )
  
  return (
    <div className="w-72 bg-white border-r border-gray-200 h-screen overflow-y-auto shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-black tracking-tight">
          Tazkora
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          {session?.user?.name || 'Welcome'}
        </p>
      </div>
      
      <nav className="p-4">
        <ul className="space-y-1">
          <NavLink 
            href={basePath} 
            icon={LayoutDashboard} 
            label="Dashboard" 
          />
          
          <NavLink 
            href={`${basePath}/tasks`} 
            icon={ClipboardList} 
            label="Tasks" 
          />
          
          <NavLink 
            href={`${basePath}/issues`} 
            icon={AlertTriangle} 
            label="Issues" 
          />
          
          {(role === 'HEAD' || role === 'MANAGER') && (
            <>
              <NavLink 
                href={`/dashboard/reports`} 
                icon={FileText} 
                label="Reports" 
              />
              
              <NavLink 
                href={`${basePath}/users`} 
                icon={Users} 
                label="Users" 
              />
            </>
          )}
        </ul>
      </nav>
    </div>
  )
}