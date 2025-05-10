// Signup page
import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/app/lib/auth'
import SignupForm from '@/app/components/auth/SignupForm'
export default async function SignupPage() {
  const session = await getServerSession(authOptions)
  
  if (session) {
    redirect('/')
  }
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Create an Account</h1>
        <SignupForm />
      </div>
    </div>
  )
}