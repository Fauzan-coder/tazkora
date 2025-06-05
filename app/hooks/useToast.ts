'use client'

import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export type Toast = {
  id: string
  title: string
  message: string
  type: ToastType
  duration?: number
}

type ToastStore = {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

// Create a Zustand store for toast notifications
interface ToastState {
    toasts: Toast[];
}

interface ToastActions {
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
}

const useToastStore = create<ToastStore>((set: (partial: Partial<ToastStore> | ((state: ToastStore) => Partial<ToastStore>)) => void) => ({
    toasts: [] as ToastState['toasts'],
    addToast: (toast: Omit<Toast, 'id'>) => 
        set((state: ToastState): Partial<ToastStore> => ({ 
            toasts: [...state.toasts, { ...toast, id: uuidv4() }] 
        })),
    removeToast: (id: string) => 
        set((state: ToastState): Partial<ToastStore> => ({ 
            toasts: state.toasts.filter((toast: Toast) => toast.id !== id) 
        })),
}));

// Custom hook to display toast notifications
export const useToast = () => {
  const { toasts, addToast, removeToast } = useToastStore()
  
  const showToast = ({ title, message, type, duration = 5000 }: Omit<Toast, 'id'>) => {
    const id = uuidv4()
    addToast({ title, message, type, duration })
    
    // Auto-remove toast after duration
    if (duration !== Infinity) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
    
    return id
  }
  
  return { toasts, showToast, removeToast }
}

export default useToast