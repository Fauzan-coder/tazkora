import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/app/lib/auth'
import Header from '@/app/components/layout/Header'
import Sidebar from '@/app/components/layout/Sidebar'
import TaskList from '@/app/components/dashboard/TaskList'
import UserList from '@/app/components/dashboard/UserList'
import IssueList from '@/app/components/dashboard/IssueList'

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
        
        {/* Footer */}
        <footer className="bg-white py-4 px-8 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">© 2025 Your Company</p>
            <div className="flex space-x-4">
              <a href="#" className="text-sm text-black hover:text-gray-600 transition-colors">Help</a>
              <a href="#" className="text-sm text-black hover:text-gray-600 transition-colors">Settings</a>
              <a href="#" className="text-sm text-black hover:text-gray-600 transition-colors">Support</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}