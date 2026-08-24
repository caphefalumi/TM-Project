export interface User {
  userId: string
  username: string
  email: string
  emailVerified?: boolean
  lastUsernameChangeAt?: string | null
  lastEmailChangeAt?: string | null
  emailVerificationExpires?: string | null
  createdAt?: string | null
}

export interface Team {
  teamId: string
  title: string
  description: string
  category: string
  createdAt?: string
  parentTeamId?: string
}

export interface Task {
  taskId: string
  title: string
  description?: string
  category?: string
  priority?: string
  weighted?: number
  startDate?: string
  dueDate?: string
  teamId?: string
  taskGroupId?: string
  design?: {
    numberOfFields: number
    fields: unknown[]
  }
  assignees?: unknown[]
}

export interface FetchJSONResult<T = unknown> {
  ok: boolean
  status: number
  statusText: string
  data: T | null
}
