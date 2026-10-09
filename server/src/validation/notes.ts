import { z } from 'zod'
import { httpUrl, optionalText, paginationQuery, query, requiredText, searchQuery } from './common.js'

export const noteCreateSchema = z.object({
  title: requiredText(200),
  content: optionalText(50_000),
})

export const noteUpdateSchema = noteCreateSchema.partial()

export const noteQuerySchema = z.object({
  search: searchQuery,
  ...paginationQuery,
})

export const documentCreateSchema = z.object({
  title: requiredText(200),
  description: optionalText(2000),
  url: httpUrl,
  category: optionalText(100),
})

export const documentUpdateSchema = documentCreateSchema.partial()

export const documentQuerySchema = z.object({
  search: searchQuery,
  category: query(z.string().trim().max(100)),
  ...paginationQuery,
})

export type NoteCreate = z.infer<typeof noteCreateSchema>
export type NoteUpdate = z.infer<typeof noteUpdateSchema>
export type NoteQuery = z.infer<typeof noteQuerySchema>
export type DocumentCreate = z.infer<typeof documentCreateSchema>
export type DocumentUpdate = z.infer<typeof documentUpdateSchema>
export type DocumentQuery = z.infer<typeof documentQuerySchema>
