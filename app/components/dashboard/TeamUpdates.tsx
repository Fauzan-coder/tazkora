// 'use client'

// import { useState, useEffect } from 'react'
// import { useSession } from 'next-auth/react'

// interface TeamTask {
//   id: string;
//   task: {
//     id: string;
//     title: string;
//   };
// }

// interface TeamUpdate {
//   id: string;
//   content: string;
//   createdAt: string;
//   teamMember: {
//     id: string;
//     user: {
//       id: string;
//       name: string;
//     };
//   };
//   teamTask?: {
//     id: string;
//     task: {
//       id: string;
//       title: string;
//     };
//   } | null;
// }

// export default function TeamUpdates({ 
//   teamId, 
//   isTeamMember, 
//   isTeamLeader 
// }: { 
//   teamId: string; 
//   isTeamMember: boolean;
//   isTeamLeader: boolean;
// }) {
//   const { data: session } = useSession()
//   const [updates, setUpdates] = useState<TeamUpdate[]>([])
//   const [teamTasks, setTeamTasks] = useState<TeamTask[]>([])
//   const [newUpdateContent, setNewUpdateContent] = useState('')
//   const [selectedTaskId, setSelectedTaskId] = useState<string | ''>('')
//   const [loading, setLoading] = useState(true)
//   const [submitting, setSubmitting] = useState(false)
//   const [error, setError] = useState<string | null>(null)
  
//   // Fetch team updates
//   useEffect(() => {
//     async function fetchTeamUpdates() {
//       try {
//         const response = await fetch(`/api/teams/updates?teamId=${teamId}`)
        
//         if (!response.ok) {
//           throw new Error('Failed to fetch team updates')
//         }
        
//         const data = await response.json()
//         setUpdates(data)
//         setLoading(false)
//       } catch (err) {
//         setError(err instanceof Error ? err.message : 'An error occurred')
//         setLoading(false)
//       }
//     }
    
//     // Fetch team tasks for the dropdown
//     async function fetchTeamTasks() {
//       try {
//         const response = await fetch(`/api/tasks?teamId=${teamId}`)
        
//         if (!response.ok) {
//           throw new Error('Failed to fetch team tasks')
//         }
        
//         const data = await response.json()
//         setTeamTasks(data.map((task: any) => ({
//           id: task.id,
//           task: {
//             id: task.id,
//             title: task.title
//           }
//         })))
//       } catch (err) {
//         console.error('Error fetching team tasks:', err)
//       }
//     }
    
//     fetchTeamUpdates()
//     fetchTeamTasks()
//   }, [teamId])
  
//   // Function to handle posting a new update
//   const handleSubmitUpdate = async (e: React.FormEvent) => {
//     e.preventDefault()
    
//     if (!newUpdateContent.trim()) {
//       setError('Update content cannot be empty')
//       return
//     }
    
//     setSubmitting(true)
//     setError(null)
    
//     try {
//       const response = await fetch('/api/teams/updates', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           content: newUpdateContent,
//           teamId: teamId,
//           teamTaskId: selectedTaskId || undefined
//         }),
//       })
      
//       if (!response.ok) {
//         throw new Error('Failed to post update')
//       }
      
//       // Add the new update to the list
//       const newUpdate = await response.json()
//       setUpdates([newUpdate, ...updates])
      
//       // Clear the form
//       setNewUpdateContent('')
//       setSelectedTaskId('')
//       setSubmitting(false)
//     } catch (err) {
//       setError(err instanceof Error ? err.message : 'Failed to post update')
//       setSubmitting(false)
//     }
//   }
  
//   // Function to format date
//   const formatDate = (dateString: string) => {
//     const date = new Date(dateString);
//     return date.toLocaleString('en-US', {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   };
  
//   // Check if the current user is the creator of an update
//   const isUpdateCreator = (update: TeamUpdate) => {
//     return update.teamMember.user.id === session?.user?.id
//   }
  
//   // Handle delete update
//   const handleDeleteUpdate = async (updateId: string) => {
//     if (!isTeamLeader && !isUpdateCreator) return;
    
//     try {
//       const response = await fetch(`/api/teams/updates/${updateId}`, {
//         method: 'DELETE',
//       })
      
//       if (!response.ok) {
//         throw new Error('Failed to delete update')
//       }
      
//       // Remove the update from the list
//       setUpdates(updates.filter(update => update.id !== updateId))
//     } catch (err) {
//       setError(err instanceof Error ? err.message : 'Failed to delete update')
//     }
//   }
  
//   if (loading) {
//     return (
//       <div className="text-center py-8">
//         <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent"></div>
//         <p className="mt-2 text-sm text-gray-500">Loading updates...</p>
//       </div>
//     )
//   }
  
//   return (
//     <div>
//       <h3 className="text-lg font-medium text-gray-900 mb-4">Team Updates</h3>
      
//       {error && (
//         <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
//           <p className="text-red-600">{error}</p>
//         </div>
//       )}
//       {/* Post update form for team members */}
//       {isTeamMember && (
//         <div className="mb-6 bg-white p-4 shadow sm:rounded-lg">
//           <form onSubmit={handleSubmitUpdate}>
//             <div className="mb-4">
//               <label htmlFor="updateContent" className="block text-sm font-medium text-gray-700 mb-1">
//                 Post an Update
//               </label>
//               <textarea
//                 id="updateContent"
//                 rows={3}
//                 value={newUpdateContent}
//                 onChange={(e) => setNewUpdateContent(e.target.value)}
//                 placeholder="Share your progress or updates with the team..."
//                 className="shadow-sm block w-full focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border border-gray-300 rounded-md"
//               />
//             </div>
            
//             <div className="flex items-center justify-between">
//               <div>
//                 <label htmlFor="taskSelect" className="block text-sm font-medium text-gray-700 mr-2">
//                   Related Task (Optional):
//                 </label>
//                 <select
//                   id="taskSelect"
//                   value={selectedTaskId}
//                   onChange={(e) => setSelectedTaskId(e.target.value)}
//                   className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
//                 >
//                   <option value="">None</option>
//                   {teamTasks.map((task) => (
//                     <option key={task.id} value={task.id}>
//                       {task.task.title}
//                     </option>
//                   ))}
//                 </select>
//               </div>
              
//               <button
//                 type="submit"
//                 disabled={submitting}
//                 className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
//               >
//                 {submitting ? 'Posting...' : 'Post Update'}
//               </button>
//             </div>
//           </form>
//         </div>
//       )}
      
//       {/* Updates list */}
//       {updates.length === 0 ? (
//         <div className="text-center py-8 text-gray-500">
//           No updates have been posted for this team yet.
//         </div>
//       ) : (
//         <div className="space-y-4">
//           {updates.map((update) => (
//             <div key={update.id} className="bg-white p-4 shadow sm:rounded-lg">
//               <div className="flex justify-between">
//                 <div className="flex items-center">
//                   <div>
//                     <p className="text-sm font-medium text-gray-900">
//                       {update.teamMember.user.name}
//                     </p>
//                     <p className="text-xs text-gray-500">
//                       {formatDate(update.createdAt)}
//                     </p>
//                   </div>
//                 </div>
                
//                 {/* Delete button if user is team leader or update creator */}
//                 {(isTeamLeader || isUpdateCreator(update)) && (
//                   <button 
//                     onClick={() => handleDeleteUpdate(update.id)}
//                     className="text-gray-400 hover:text-red-500"
//                   >
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//                       <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
//                     </svg>
//                   </button>
//                 )}
//               </div>
              
//               {/* Update content */}
//               <div className="mt-2">
//                 <p className="text-sm text-gray-600 whitespace-pre-wrap">{update.content}</p>
//               </div>
              
//               {/* Related task if any */}
//               {update.teamTask && (
//                 <div className="mt-2">
//                   <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
//                     Task: {update.teamTask.task.title}
//                   </span>
//                 </div>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   )
// }
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface TeamTask {
  id: string;
  task: {
    id: string;
    title: string;
  };
}

interface TeamUpdate {
  id: string;
  content: string;
  createdAt: string;
  teamMember: {
    id: string;
    user: {
      id: string;
      name: string;
    };
  };
  teamTask?: {
    id: string;
    task: {
      id: string;
      title: string;
    };
  } | null;
}

export default function TeamUpdates({ 
  teamId, 
  isTeamMember, 
  isTeamLeader,
  showModalButton = false,
  modalButtonText = "Add Update",
  onModalOpen
}: { 
  teamId: string; 
  isTeamMember: boolean;
  isTeamLeader: boolean;
  showModalButton?: boolean;
  modalButtonText?: string;
  onModalOpen?: () => void;
}) {
  const { data: session } = useSession()
  const [updates, setUpdates] = useState<TeamUpdate[]>([])
  const [teamTasks, setTeamTasks] = useState<TeamTask[]>([])
  const [newUpdateContent, setNewUpdateContent] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState<string | ''>('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  
  // Fetch team updates
  useEffect(() => {
    async function fetchTeamUpdates() {
      try {
        const response = await fetch(`/api/teams/updates?teamId=${teamId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch team updates')
        }
        
        const data = await response.json()
        setUpdates(data)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        setLoading(false)
      }
    }
    
    // Fetch team tasks for the dropdown
    async function fetchTeamTasks() {
      try {
        const response = await fetch(`/api/tasks?teamId=${teamId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch team tasks')
        }
        
        const data = await response.json()
        setTeamTasks(data.map((task: any) => ({
          id: task.id,
          task: {
            id: task.id,
            title: task.title
          }
        })))
      } catch (err) {
        console.error('Error fetching team tasks:', err)
      }
    }
    
    fetchTeamUpdates()
    fetchTeamTasks()
  }, [teamId])
  
  // Function to handle opening modal
  const handleOpenModal = () => {
    setShowModal(true)
    if (onModalOpen) {
      onModalOpen()
    }
  }
  
  // Function to handle closing modal
  const handleCloseModal = () => {
    setShowModal(false)
    setNewUpdateContent('')
    setSelectedTaskId('')
    setError(null)
  }
  
  // Function to handle posting a new update
  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newUpdateContent.trim()) {
      setError('Update content cannot be empty')
      return
    }
    
    setSubmitting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/teams/updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newUpdateContent,
          teamId: teamId,
          teamTaskId: selectedTaskId || undefined
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to post update')
      }
      
      // Add the new update to the list
      const newUpdate = await response.json()
      setUpdates([newUpdate, ...updates])
      
      // Clear the form and close modal
      setNewUpdateContent('')
      setSelectedTaskId('')
      setSubmitting(false)
      
      if (showModalButton) {
        setShowModal(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post update')
      setSubmitting(false)
    }
  }
  
  // Function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Check if the current user is the creator of an update
  const isUpdateCreator = (update: TeamUpdate) => {
    return update.teamMember.user.id === session?.user?.id
  }
  
  // Handle delete update
  const handleDeleteUpdate = async (updateId: string) => {
    if (!isTeamLeader && !isUpdateCreator) return;
    
    try {
      const response = await fetch(`/api/teams/updates/${updateId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete update')
      }
      
      // Remove the update from the list
      setUpdates(updates.filter(update => update.id !== updateId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete update')
    }
  }
  
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent"></div>
        <p className="mt-2 text-sm text-gray-500">Loading updates...</p>
      </div>
    )
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Team Updates</h3>
        
        {/* Modal button for external use */}
        {showModalButton && isTeamMember && (
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {modalButtonText}
          </button>
        )}
      </div>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Modal for posting updates */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={handleCloseModal}
            ></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Post Team Update</h3>
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmitUpdate}>
                  <div className="mb-4">
                    <label htmlFor="modalUpdateContent" className="block text-sm font-medium text-gray-700 mb-1">
                      Update Content
                    </label>
                    <textarea
                      id="modalUpdateContent"
                      rows={4}
                      value={newUpdateContent}
                      onChange={(e) => setNewUpdateContent(e.target.value)}
                      placeholder="Share your progress or updates with the team..."
                      className="shadow-sm block w-full focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="modalTaskSelect" className="block text-sm font-medium text-gray-700 mb-1">
                      Related Task (Optional)
                    </label>
                    <select
                      id="modalTaskSelect"
                      value={selectedTaskId}
                      onChange={(e) => setSelectedTaskId(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      <option value="">None</option>
                      {teamTasks.map((task) => (
                        <option key={task.id} value={task.id}>
                          {task.task.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {submitting ? 'Posting...' : 'Post Update'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Inline post update form for team members (when not using modal) */}
      {isTeamMember && !showModalButton && (
        <div className="mb-6 bg-white p-4 shadow sm:rounded-lg">
          <form onSubmit={handleSubmitUpdate}>
            <div className="mb-4">
              <label htmlFor="updateContent" className="block text-sm font-medium text-gray-700 mb-1">
                Post an Update
              </label>
              <textarea
                id="updateContent"
                rows={3}
                value={newUpdateContent}
                onChange={(e) => setNewUpdateContent(e.target.value)}
                placeholder="Share your progress or updates with the team..."
                className="shadow-sm block w-full focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border border-gray-300 rounded-md"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="taskSelect" className="block text-sm font-medium text-gray-700 mr-2">
                  Related Task (Optional):
                </label>
                <select
                  id="taskSelect"
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="">None</option>
                  {teamTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.task.title}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {submitting ? 'Posting...' : 'Post Update'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Updates list */}
      {updates.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No updates have been posted for this team yet.
        </div>
      ) : (
        <div className="space-y-4">
          {updates.map((update) => (
            <div key={update.id} className="bg-white p-4 shadow sm:rounded-lg">
              <div className="flex justify-between">
                <div className="flex items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {update.teamMember.user.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(update.createdAt)}
                    </p>
                  </div>
                </div>
                
                {/* Delete button if user is team leader or update creator */}
                {(isTeamLeader || isUpdateCreator(update)) && (
                  <button 
                    onClick={() => handleDeleteUpdate(update.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Update content */}
              <div className="mt-2">
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{update.content}</p>
              </div>
              
              {/* Related task if any */}
              {update.teamTask && (
                <div className="mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Task: {update.teamTask.task.title}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}