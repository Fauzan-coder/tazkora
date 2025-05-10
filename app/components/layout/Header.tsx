"use client"

import { signOut, useSession } from 'next-auth/react'
import { Session } from 'next-auth'
import { useState, useEffect } from 'react'

interface HeaderProps {
  title: string
}

export default function Header({ title }: HeaderProps) {
  const { data: session } = useSession()
  const [scrolled, setScrolled] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  
  // Add scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header 
      className={`sticky top-0 z-50 bg-gradient-to-r from-gray-50 to-white border-b transition-all duration-300 ${
        scrolled ? 'shadow-md' : 'shadow-sm'
      }`}
    >
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            {/* Logo/Icon */}
            <div className="flex-shrink-0 bg-gradient-to-r from-gray-700 to-blue-700 text-white p-2 rounded-lg mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            
            {/* Title with subtle animation */}
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700">
              {title}
            </h1>
            
            {/* Optional breadcrumb */}
            <div className="hidden md:flex ml-6 items-center text-sm text-gray-500">
              <span className="mx-2">Dashboard</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
              <span className="mx-2 font-medium text-gray-700">{title}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Notification bell */}
            <button className="p-1.5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            
            {/* User profile */}
            <div className="relative">
              <div 
                className="flex items-center cursor-pointer px-2 py-1 rounded-lg hover:bg-gray-100 transition-all"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <div className="hidden sm:block mr-3">
                  <div className="text-sm font-medium text-gray-800">{session?.user?.name || 'User'}</div>
                  <div className="text-xs text-gray-500">{session?.user?.email || ''}</div>
                </div>
                
                <div className="flex items-center">
                  {session?.user?.image ? (
                    <img 
                      src={session.user.image} 
                      alt="Profile" 
                      className="h-8 w-8 rounded-full border-2 border-blue-100"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium">
                      {(session?.user?.name || 'U').charAt(0)}
                    </div>
                  )}
                  
                  <div className="ml-1 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Dropdown menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-800">{session?.user?.name || 'User'}</p>
                    <p className="text-xs text-gray-500">{session?.user?.email || ''}</p>
                  </div>
                  
                  <div className="px-4 py-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {session?.user?.role || 'User'}
                    </span>
                  </div>
                  
                  <div className="border-t border-gray-100">
                    <a href="/profile" className="block px-4 py-1 text-sm text-gray-700 hover:bg-gray-50 rounded-full">
                      Your Profile
                    </a>
                    <button
                      onClick={() => signOut({ callbackUrl: '/auth/login' })}
                      className="block w-full text-left px-4 py-1 text-sm text-red-600 hover:bg-red-50 rounded-full"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}