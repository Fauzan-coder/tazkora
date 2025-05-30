import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/app/lib/auth'
import Header from '@/app/components/layout/Header'
import Sidebar from '@/app/components/layout/Sidebar'
import TaskList from '@/app/components/dashboard/TaskList'
import UserList from '@/app/components/dashboard/UserList'
import IssueList from '@/app/components/dashboard/IssueList'
import ProjectList from '@/app/components/dashboard/ProjectList'

export default async function HeadDashboard() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }
  
  if (!session.user || session.user.role !== 'HEAD') {
    redirect('/')
  }
  
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Head Dashboard" />
        <main className="flex-1 overflow-auto p-8 bg-gradient-to-br from-gray-50 to-gray-100">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-black tracking-tight">
              Welcome back, {session.user.name}
            </h1>
            <p className="text-gray-600 mt-1">
              Organization overview and executive management
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Total Employees', value: '48', gradient: 'from-blue-400 to-blue-600' },
              { label: 'Active Projects', value: '16', gradient: 'from-amber-400 to-amber-600' }, 
              { label: 'Critical Issues', value: '3', gradient: 'from-emerald-400 to-emerald-600' },
              { label: 'Monthly Reports', value: '8', gradient: 'from-violet-400 to-violet-600' }
            ].map((stat, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm p-6 transition-all hover:shadow-md overflow-hidden relative">
                <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${stat.gradient}`}></div>
                <p className="text-sm font-medium text-gray-700">{stat.label}</p>
                <p className="text-2xl font-bold text-black mt-2">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Project Management Section */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-black">Project Management</h2>
              <Link href="/dashboard/head/projects/new" 
                className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
                Create New Project
              </Link>
            </div>
            <ProjectList />
          </div>

          {/* User Management Section */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-black">User Management</h2>
            </div>
            <UserList />
          </div>
          
          {/* Task Management Section */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-black">Task Management</h2>
            </div>
            <TaskList />
          </div>

          {/* Issues Section */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-black">Issues</h2>
            </div>
            <IssueList />
          </div>
        </main>
      </div>
    </div>
  )
}