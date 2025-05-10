// File: src/components/auth/SignupForm.tsx
// Signup form component
"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          // Default role is EMPLOYEE as per schema
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create account')
      }

      router.push('/auth/login?registered=true')
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message || 'Something went wrong. Please try again.')
      } else {
        setError('Something went wrong. Please try again.')
      }
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
  {error && (
    <div className="bg-red-50 text-red-500 p-3 rounded mb-4">
      {error}
    </div>
  )}
  <div className="mb-4">
    <label htmlFor="name" className="block mb-2 text-sm font-medium text-black">
      Full Name
    </label>
    <input
      id="name"
      type="text"
      value={name}
      onChange={(e) => setName(e.target.value)}
      className="w-full p-2 border rounded text-black"
      required
    />
  </div>
  <div className="mb-4">
    <label htmlFor="email" className="block mb-2 text-sm font-medium text-black">
      Email
    </label>
    <input
      id="email"
      type="email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      className="w-full p-2 border rounded text-black"
      required
    />
  </div>
  <div className="mb-6">
    <label htmlFor="password" className="block mb-2 text-sm font-medium text-black">
      Password
    </label>
    <input
      id="password"
      type="password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      className="w-full p-2 border rounded text-black"
      minLength={8}
      required
    />
  </div>
  <button
    type="submit"
    disabled={isLoading}
    className="w-full bg-blue-500 text-black p-2 rounded hover:bg-blue-600"
  >
    {isLoading ? 'Creating Account...' : 'Sign Up'}
  </button>
  <div className="mt-4 text-center text-sm">
    Already have an account?{' '}
    <Link href="/auth/login" className="text-blue-500 hover:underline">
      Sign in
    </Link>
  </div>
</form>

  )
}