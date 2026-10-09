import type { ApiList, Guest, GuestSummary, InvitationStatus, RsvpStatus } from '@wedding/shared'
import { api } from './api'
import { crud } from './crud'

export interface GuestInput {
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
}

export interface GuestQuery {
  [key: string]: string | number | null | undefined
  search?: string | null
  rsvp?: RsvpStatus | null
  invitation?: InvitationStatus | null
  group?: string | null
}

export const guestsService = {
  ...crud<Guest, GuestInput, GuestQuery, { summary: GuestSummary }>('/api/guests'),
  groups: () => api.get<ApiList<string>>('/api/guests/groups').then((r) => r.data),
}
