import { z } from 'zod'
import type { VendorStatus } from '@wedding/shared'
import {
  enumValues,
  httpUrl,
  money,
  optionalEmail,
  optionalText,
  paginationQuery,
  query,
  requiredText,
  searchQuery,
} from './common.js'

export const VENDOR_STATUSES = enumValues<VendorStatus>()([
  'considering',
  'shortlisted',
  'negotiating',
  'booked',
  'completed',
  'cancelled',
])

export const vendorCreateSchema = z.object({
  name: requiredText(150),
  category: optionalText(100),
  contactName: optionalText(150),
  phone: optionalText(50),
  email: optionalEmail,
  website: z
    .union([z.literal(''), httpUrl])
    .transform((s) => (s === '' ? null : s))
    .nullable()
    .optional(),
  quotedAmount: money.optional(),
  status: z.enum(VENDOR_STATUSES).optional(),
  notes: optionalText(5000),
})

export const vendorUpdateSchema = vendorCreateSchema.partial()

export const vendorQuerySchema = z.object({
  status: query(z.enum(VENDOR_STATUSES)),
  search: searchQuery,
  ...paginationQuery,
})

export type VendorCreate = z.infer<typeof vendorCreateSchema>
export type VendorUpdate = z.infer<typeof vendorUpdateSchema>
export type VendorQuery = z.infer<typeof vendorQuerySchema>
