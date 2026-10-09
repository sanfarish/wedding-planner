import type { Note } from '@wedding/shared'
import { crud } from './crud'

export interface NoteInput {
  title: string
  content: string | null
}

export const notesService = crud<Note, NoteInput>('/api/notes')
