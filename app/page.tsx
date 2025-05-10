// File: src/app/page.tsx
// Home page - redirects to login or dashboard based on auth state
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/lib/auth'
import { redirect } from 'next/navigation'

export default async function Home() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/login')
  }
  
  // Redirect based on user role
  switch (session?.user?.role) {
    case 'HEAD':
      redirect('/dashboard/head')
    case 'MANAGER':
      redirect('/dashboard/manager')
    case 'EMPLOYEE':
      redirect('/dashboard/employee')
    default:
      redirect('/auth/login')
  }
}
