// Login page
import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import LoginForm from '@/app/components/auth/LoginForm'
import { authOptions } from '@/app/lib/auth'
export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  
  if (session) {
    redirect('/')
  }
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Login to Task Manager</h1>
        <LoginForm />
      </div>
    </div>
  )
}