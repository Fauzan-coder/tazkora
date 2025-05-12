import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/app/lib/auth'
import Header from '@/app/components/layout/Header'
import Sidebar from '@/app/components/layout/Sidebar'
import dynamic from 'next/dynamic'
import TaskList from '@/app/components/dashboard/TaskList'
import IssueList from '@/app/components/dashboard/IssueList'

export default async function EmployeeDashboard() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }
  
  if (!session.user || session.user.role !== 'EMPLOYEE') {
    redirect('/')
  }
  
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Employee Dashboard" />
        <main className="flex-1 overflow-auto p-8 bg-gradient-to-br from-gray-50 to-gray-100">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-black tracking-tight">
              Welcome back, {session.user.name}
            </h1>
            <p className="text-gray-600 mt-1">
              Here's what needs your attention today
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Tasks Due Today', value: '5', gradient: 'from-blue-400 to-blue-600' },
              { label: 'Pending Issues', value: '3', gradient: 'from-amber-400 to-amber-600' }, 
              { label: 'Completed Tasks', value: '12', gradient: 'from-emerald-400 to-emerald-600' },
              { label: 'Team Members', value: '8', gradient: 'from-violet-400 to-violet-600' }
            ].map((stat, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm p-6 transition-all hover:shadow-md overflow-hidden relative">
                <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${stat.gradient}`}></div>
                <p className="text-sm font-medium text-gray-700">{stat.label}</p>
                <p className="text-2xl font-bold text-black mt-2">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Tasks Section */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-black">My Tasks</h2>
            </div>
            {/* Using the TaskList component to fetch data */}
            <TaskList />
          </div>
          
          {/* Issues Section */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-black">Issues</h2>
              
            </div>
            {/* Using the IssueList component to fetch data */}
            <IssueList />
          </div>
        </main>
      </div>
    </div>
  )
}