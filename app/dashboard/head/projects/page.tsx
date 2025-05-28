import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/app/lib/auth'
import Header from '@/app/components/layout/Header'
import Sidebar from '@/app/components/layout/Sidebar'
import ProjectList from '@/app/components/dashboard/ProjectList'

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }
  
  // Allow HEAD and MANAGERS to access this page
  if (!session.user || (session.user.role !== 'HEAD' && session.user.role !== 'MANAGER')) {
    redirect('/')
  }
  
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Projects Management" />
        <main className="flex-1 overflow-auto p-8 bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-black tracking-tight">
              Projects
            </h1>
            {session.user.role === 'HEAD' && (
              <Link href="/dashboard/projects/new" 
                className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
                Create New Project
              </Link>
            )}
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <ProjectList />
          </div>
        </main>
      </div>
    </div>
  )
}