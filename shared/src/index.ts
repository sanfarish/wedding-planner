// Type-only definitions shared between client and server.
// This file must never contain runtime code: import it with `import type`.

// ---------- API envelopes ----------

export interface ApiItem<T> {
  data: T
}

export interface ApiList<T, M = Record<string, never>> {
  data: T[]
  meta: { total: number } & M
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

// ---------- Users ----------

export interface User {
  id: number
  username: string
  displayName: string
}

// ---------- Wedding settings ----------

export type Currency = 'IDR' | 'USD' | 'EUR' | 'SGD' | 'MYR' | 'AUD'

export interface WeddingSettings {
  weddingName: string
  weddingDate: string | null
  weddingLocation: string | null
  groomName: string | null
  brideName: string | null
  currency: Currency
  totalBudget: number
  updatedAt: string
}

// ---------- Categories ----------

export interface Category {
  id: number
  name: string
}

// ---------- Tasks ----------

export type TaskStatus = 'todo' | 'in_progress' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: number
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  categoryId: number | null
  categoryName: string | null
  dueDate: string | null
  assignedTo: number | null
  assignedToName: string | null
  createdBy: number
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

// ---------- Budget ----------

export type ExpenseStatus = 'planned' | 'partial' | 'paid' | 'cancelled'

export interface Expense {
  id: number
  categoryId: number | null
  categoryName: string | null
  vendorId: number | null
  vendorName: string | null
  description: string
  estimatedAmount: number
  actualAmount: number
  status: ExpenseStatus
  paidBy: number | null
  paidByName: string | null
  dueDate: string | null
  notes: string | null
  createdBy: number
  createdAt: string
  updatedAt: string
}

export interface BudgetCategorySummary {
  categoryId: number | null
  categoryName: string
  estimated: number
  paid: number
  count: number
}

export interface BudgetSummary {
  totalBudget: number
  estimated: number
  paid: number
  remaining: number
  unallocated: number
  byCategory: BudgetCategorySummary[]
}

// ---------- Guests ----------

export type InvitationStatus = 'not_invited' | 'planned' | 'invited'
export type RsvpStatus = 'pending' | 'attending' | 'declined'

export interface Guest {
  id: number
  name: string
  phone: string | null
  email: string | null
  groupName: string | null
  relationship: string | null
  invitationStatus: InvitationStatus
  rsvpStatus: RsvpStatus
  numberOfGuests: number
  mealPreference: string | null
  notes: string | null
  createdBy: number
  createdAt: string
  updatedAt: string
}

/** Headcounts (sum of number_of_guests) plus number of entries. */
export interface GuestSummary {
  entries: number
  total: number
  invited: number
  attending: number
  pending: number
  declined: number
}

// ---------- Vendors ----------

export type VendorStatus =
  | 'considering'
  | 'shortlisted'
  | 'negotiating'
  | 'booked'
  | 'completed'
  | 'cancelled'

export interface Vendor {
  id: number
  name: string
  category: string | null
  contactName: string | null
  phone: string | null
  email: string | null
  website: string | null
  quotedAmount: number
  status: VendorStatus
  notes: string | null
  createdBy: number
  createdAt: string
  updatedAt: string
}

export interface VendorDetail extends Vendor {
  expenses: Expense[]
  expenseTotals: { estimated: number; paid: number }
}

// ---------- Timeline ----------

export interface TimelineEvent {
  id: number
  title: string
  description: string | null
  eventDate: string
  startTime: string | null
  endTime: string | null
  location: string | null
  category: string | null
  createdBy: number
  createdAt: string
  updatedAt: string
}

// ---------- Notes ----------

export interface Note {
  id: number
  title: string
  content: string | null
  createdBy: number
  createdByName: string | null
  createdAt: string
  updatedAt: string
}

// ---------- Documents ----------

export interface DocumentLink {
  id: number
  title: string
  description: string | null
  url: string | null
  category: string | null
  createdBy: number
  createdByName: string | null
  createdAt: string
  updatedAt: string
}

// ---------- Activity ----------

export type ActivityAction = 'create' | 'update' | 'delete' | 'complete' | 'reopen'

export type EntityType =
  | 'task'
  | 'task_category'
  | 'expense'
  | 'budget_category'
  | 'guest'
  | 'vendor'
  | 'timeline_event'
  | 'note'
  | 'document'
  | 'settings'
  | 'user'

export interface Activity {
  id: number
  userId: number
  userName: string
  action: ActivityAction
  entityType: EntityType
  entityId: number | null
  description: string
  createdAt: string
}

// ---------- Dashboard ----------

export type CountdownState = 'upcoming' | 'today' | 'past' | 'unset'

export interface Countdown {
  state: CountdownState
  /** Days until the wedding (negative when past). null when unset. */
  daysRemaining: number | null
  date: string | null
}

export interface Dashboard {
  wedding: WeddingSettings
  countdown: Countdown
  budget: BudgetSummary
  guests: GuestSummary
  tasks: {
    total: number
    remaining: number
    completed: number
    overdue: number
    upcoming: Task[]
  }
  recentActivity: Activity[]
}
