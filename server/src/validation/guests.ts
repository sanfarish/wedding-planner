import { z } from 'zod'
import type { InvitationStatus, RsvpStatus } from '@wedding/shared'
import {
  enumValues,
  optionalEmail,
  optionalText,
  paginationQuery,
  query,
  requiredText,
  searchQuery,
} from './common.js'

export const INVITATION_STATUSES = enumValues<InvitationStatus>()(['not_invited', 'planned', 'invited'])
export const RSVP_STATUSES = enumValues<RsvpStatus>()(['pending', 'attending', 'declined'])

export const guestCreateSchema = z.object({
  name: requiredText(150),
  phone: optionalText(50),
  email: optionalEmail,
  groupName: optionalText(100),
  relationship: optionalText(100),
  invitationStatus: z.enum(INVITATION_STATUSES).optional(),
  rsvpStatus: z.enum(RSVP_STATUSES).optional(),
  numberOfGuests: z.number().int().min(1, 'At least 1').max(20, 'At most 20').optional(),
  mealPreference: optionalText(100),
  notes: optionalText(2000),
})

export const guestUpdateSchema = guestCreateSchema.partial()

export const guestQuerySchema = z.object({
  search: searchQuery,
  rsvp: query(z.enum(RSVP_STATUSES)),
  invitation: query(z.enum(INVITATION_STATUSES)),
  group: query(z.string().trim().max(100)),
  ...paginationQuery,
})

export type GuestCreate = z.infer<typeof guestCreateSchema>
export type GuestUpdate = z.infer<typeof guestUpdateSchema>
export type GuestQuery = z.infer<typeof guestQuerySchema>
