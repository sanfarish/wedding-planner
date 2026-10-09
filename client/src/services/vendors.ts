import type { ApiItem, Vendor, VendorDetail, VendorStatus } from '@wedding/shared'
import { api } from './api'
import { crud } from './crud'

export interface VendorInput {
  name: string
  category: string | null
  contactName: string | null
  phone: string | null
  email: string | null
  website: string | null
  quotedAmount: number
  status: VendorStatus
  notes: string | null
}

export interface VendorQuery {
  [key: string]: string | number | null | undefined
  status?: VendorStatus | null
  search?: string | null
}

export const vendorsService = {
  ...crud<Vendor, VendorInput, VendorQuery>('/api/vendors'),
  detail: (id: number) => api.get<ApiItem<VendorDetail>>(`/api/vendors/${id}`).then((r) => r.data),
}
