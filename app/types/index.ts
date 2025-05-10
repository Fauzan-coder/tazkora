// Define IssueStatus manually if not exported by @prisma/client
export type IssueStatus = 'OPEN' | 'CLOSED' | 'IN_PROGRESS' // Replace with actual statuses

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' // Replace with actual statuses if different

export type UserWithoutPassword = {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'USER' | 'MANAGER' // Replace with actual roles if different
  createdAt: Date
  updatedAt: Date
  managerId: string | null
}

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' // Define Priority type

export type TaskWithRelations = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  createdAt: Date
  updatedAt: Date
  dueDate: Date | null
  creator: UserWithoutPassword
  assignee: UserWithoutPassword | null
  issues: Issue[]
}

export type Issue = {
  id: string
  title: string
  description: string
  status: IssueStatus
  createdAt: Date
  updatedAt: Date
  creatorId: string
  taskId: string | null
}