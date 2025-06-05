'use client'

import { useEffect } from 'react'
import { useToast } from '@/app/components/providers/ToastProvider'

// Define ToastType if not already defined in ToastProvider
export type ToastType = {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration: number
}
import { 
  CheckCircleIcon, 
  ExclamationCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  XMarkIcon 
} from '@heroicons/react/24/outline'

// Individual toast notification
const ToastNotification = ({ 
  toast, 
  onClose 
}: { 
  toast: ToastType 
  onClose: () => void 
}) => {
  useEffect(() => {
    if (toast.duration !== Infinity) {
      const timer = setTimeout(() => {
        onClose()
      }, toast.duration)
      
      return () => clearTimeout(timer)
    }
  }, [toast, onClose])
  
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />
      case 'error':
        return <ExclamationCircleIcon className="h-6 w-6 text-red-500" />
      case 'warning':
        return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
      case 'info':
        return <InformationCircleIcon className="h-6 w-6 text-blue-500" />
      default:
        return <InformationCircleIcon className="h-6 w-6 text-blue-500" />
    }
  }
  
  const getBgColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50'
      case 'error':
        return 'bg-red-50'
      case 'warning':
        return 'bg-yellow-50'
      case 'info':
        return 'bg-blue-50'
      default:
        return 'bg-white'
    }
  }
  
  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-green-400'
      case 'error':
        return 'border-red-400'
      case 'warning':
        return 'border-yellow-400'
      case 'info':
        return 'border-blue-400'
      default:
        return 'border-gray-200'
    }
  }
  
  return (
    <div
      className={`pointer-events-auto w-full max-w-sm rounded-lg border ${getBorderColor()} ${getBgColor()} shadow-lg ring-1 ring-black ring-opacity-5`}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium text-gray-900">{toast.title}</p>
            <p className="mt-1 text-sm text-gray-500">{toast.message}</p>
          </div>
          <div className="ml-4 flex flex-shrink-0">
            <button
              type="button"
              className="inline-flex rounded-md bg-transparent text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Toast container component
export default function Toast() {
  const { toasts, removeToast } = useToast()
  
  if (toasts.length === 0) return null
  
  return (
    <div className="fixed bottom-0 right-0 z-50 p-4 sm:p-6 flex flex-col gap-4 items-end">
      {toasts.map((toast: ToastType) => (
        <ToastNotification
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}