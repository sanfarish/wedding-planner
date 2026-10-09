import type { DocumentLink } from '@wedding/shared'
import { crud } from './crud'

export interface DocumentInput {
  title: string
  description: string | null
  url: string
  category: string | null
}

export const documentsService = crud<DocumentLink, DocumentInput>('/api/documents')
