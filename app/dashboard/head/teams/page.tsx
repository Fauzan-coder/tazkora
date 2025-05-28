"use client"
import React from 'react'
import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/app/lib/auth'
import Header from '@/app/components/layout/Header'
import Sidebar from '@/app/components/layout/Sidebar'
import TeamList from '@/app/components/dashboard/TeamList'

export default async function TeamsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }
  
  // Everyone can view teams, but what they see will be filtered by permissions
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Teams Management" />
        <main className="flex-1 overflow-auto p-8 bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-black tracking-tight">
              Teams
            </h1>
            <Link href="/dashboard/projects" 
              className="inline-flex items-center justify-center px-4 py-2 bg-gray-200 border border-transparent rounded-md font-medium text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors">
              View Projects
            </Link>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            {/* This will show all teams the user has access to */}
            <TeamList projectId={params.id} />
          </div>
        </main>
      </div>
    </div>
  )
}