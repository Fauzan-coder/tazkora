'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDistance } from 'date-fns'
import UpdateRequestForm from '@/app/components/teams/UpdateRequestForm'
import UpdateResponseForm from '@/app/components/teams/UpdateResponseForm'
import UpdateResponsesList from '@/app/components/teams/UpdateResponsesList'

type User = {
  id: string
  name: string
  email: string
  role: string
}

type UpdateResponse = {
  id: string
  createdAt: string
  user: {
    id: string
    name: string
  }
}

type UpdateRequest = {
  id: string
  title: string
  description: string
  createdAt: string
  dueDate: string | null
  requestedBy: User
  responses: UpdateResponse[]
}

type Team = {
  id: string
  name: string
  description: string | null
  teamLeadId: string
}

type TeamUpdatesPageProps = {
  params: {
    id: string
  }
}

export default function TeamUpdatesPage({ params }: TeamUpdatesPageProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [team, setTeam] = useState<Team | null>(null)
  const [updateRequests, setUpdateRequests] = useState<UpdateRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null)
  const [isAuthorized, setIsAuthorized] = useState(false)
  
  useEffect(() => {
    if (!session) return
    
    const fetchTeamData = async () => {
      try {
        setLoading(true)
        
        // Fetch team data
        const teamResponse = await fetch(`/api/teams/${params.id}`)
        
        if (!teamResponse.ok) {
          if (teamResponse.status === 404) {
            router.push('/dashboard/teams')
            return
          }
          throw new Error('Failed to fetch team')
        }
        
        const teamData = await teamResponse.json()
        setTeam(teamData)
        
        // Check authorization
        const isHead = session.user?.role === 'HEAD'
        const isTeamLead = teamData.teamLeadId === session.user?.id
        setIsAuthorized(isHead || isTeamLead)
        
        // Fetch update requests
        const requestsResponse = await fetch(`/api/teams/updates/request?teamId=${params.id}`)
        
        if (!requestsResponse.ok) {
          throw new Error('Failed to fetch update requests')
        }
        
        const requestsData = await requestsResponse.json()
        setUpdateRequests(requestsData)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load team data. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchTeamData()
  }, [params.id, router, session])
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-500">Loading team update requests...</div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-md">
          {error}
        </div>
      </div>
    )
  }

    if (!team) {
        return (
        <div className="p-6">
            <div className="bg-yellow-50 text-yellow-600 p-4 rounded-md">
            Team not found. Please check the URL or go back to the <Link href="/dashboard/teams" className="text-blue-600">teams list</Link>.
            </div>
        </div>
        )
    }   


    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">{team.name} - Update Requests</h1>
            {isAuthorized && (
                <button 
                    onClick={() => setShowRequestForm(true)} 
                    className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    Request Update
                </button>
            )}
            {showRequestForm && (
                <UpdateRequestForm 
                    teamId={params.id} 
                    onClose={() => setShowRequestForm(false)} 
                    onRequestSuccess={() => {
                        setShowRequestForm(false)
                        router.push(router.pathname)
                    }} 
                />
            )}
            {updateRequests.length === 0 ? (
                <div className="text-gray-500">No update requests found.</div>
            ) : (
                updateRequests.map(request => (
                    <div key={request.id} className="mb-6 p-4 border rounded-md shadow-sm bg-white">
                        <h2 className="text-lg font-semibold">{request.title}</h2>
                        <p className="text-gray-600">{request.description}</p>
                        <p className="text-sm text-gray-500">Requested by: {request.requestedBy.name}</p>
                        <p className="text-sm text-gray-500">Due Date: {request.dueDate ? formatDistance(new Date(request.dueDate), new Date(), { addSuffix: true }) : 'No due date'}</p>
                        <UpdateResponsesList responses={request.responses} />
                        {isAuthorized && (
                            <button 
                                onClick={() => setSelectedRequest(request.id)} 
                                className="mt-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                            >
                                Respond to Update
                            </button>
                        )}
                        {selectedRequest === request.id && (
                            <UpdateResponseForm 
                                requestId={request.id} 
                                onClose={() => setSelectedRequest(null)} 
                                onResponseSuccess={() => {
                                    setSelectedRequest(null)
                                    router.reload()
                                }} 
                            />
                        )}
                    </div>
                ))
            )}
        </div>
    )
}