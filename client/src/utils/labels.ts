import type {
  Currency,
  ExpenseStatus,
  InvitationStatus,
  RsvpStatus,
  TaskPriority,
  TaskStatus,
  VendorStatus,
} from '@wedding/shared'

export interface StatusMeta {
  label: string
  color: string
  icon?: string
}

// Records keyed by the shared unions: adding a status to the shared types
// fails compilation until it gets a label here.

export const TASK_STATUS: Record<TaskStatus, StatusMeta> = {
  todo: { label: 'To do', color: 'grey', icon: 'mdi-circle-outline' },
  in_progress: { label: 'In progress', color: 'info', icon: 'mdi-progress-clock' },
  completed: { label: 'Completed', color: 'success', icon: 'mdi-check-circle' },
}

export const TASK_PRIORITY: Record<TaskPriority, StatusMeta> = {
  low: { label: 'Low', color: 'success', icon: 'mdi-chevron-down' },
  medium: { label: 'Medium', color: 'info', icon: 'mdi-equal' },
  high: { label: 'High', color: 'warning', icon: 'mdi-chevron-up' },
  urgent: { label: 'Urgent', color: 'error', icon: 'mdi-alert' },
}

export const EXPENSE_STATUS: Record<ExpenseStatus, StatusMeta> = {
  planned: { label: 'Planned', color: 'grey' },
  partial: { label: 'Partly paid', color: 'warning' },
  paid: { label: 'Paid', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'error' },
}

export const INVITATION_STATUS: Record<InvitationStatus, StatusMeta> = {
  not_invited: { label: 'Not invited', color: 'grey' },
  planned: { label: 'Planned', color: 'info' },
  invited: { label: 'Invited', color: 'primary' },
}

export const RSVP_STATUS: Record<RsvpStatus, StatusMeta> = {
  pending: { label: 'Pending', color: 'warning' },
  attending: { label: 'Attending', color: 'success' },
  declined: { label: 'Declined', color: 'error' },
}

export const VENDOR_STATUS: Record<VendorStatus, StatusMeta> = {
  considering: { label: 'Considering', color: 'grey' },
  shortlisted: { label: 'Shortlisted', color: 'info' },
  negotiating: { label: 'Negotiating', color: 'warning' },
  booked: { label: 'Booked', color: 'success' },
  completed: { label: 'Completed', color: 'secondary' },
  cancelled: { label: 'Cancelled', color: 'error' },
}

export const CURRENCIES: Record<Currency, string> = {
  IDR: 'Indonesian Rupiah (IDR)',
  USD: 'US Dollar (USD)',
  EUR: 'Euro (EUR)',
  SGD: 'Singapore Dollar (SGD)',
  MYR: 'Malaysian Ringgit (MYR)',
  AUD: 'Australian Dollar (AUD)',
}

/** Turns a label map into v-select items. */
export function selectItems<K extends string>(map: Record<K, StatusMeta | string>): { title: string; value: K }[] {
  return (Object.keys(map) as K[]).map((value) => {
    const meta = map[value]
    return { value, title: typeof meta === 'string' ? meta : meta.label }
  })
}
