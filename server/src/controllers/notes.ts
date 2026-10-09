import type { Request, Response } from 'express'
import { currentUser } from '../middleware/requireAuth.js'
import { createNote, deleteNote, getNote, listNotes, updateNote } from '../services/notes.js'
import { sendItem, sendList, sendNoContent } from '../utils/respond.js'
import { noteCreateSchema, noteQuerySchema, noteUpdateSchema } from '../validation/notes.js'
import { paramId } from './helpers.js'

export function list(req: Request, res: Response): void {
  const { rows, total } = listNotes(noteQuerySchema.parse(req.query))
  sendList(res, rows, total)
}

export function show(req: Request, res: Response): void {
  sendItem(res, getNote(paramId(req)))
}

export function create(req: Request, res: Response): void {
  sendItem(res, createNote(currentUser(req).id, noteCreateSchema.parse(req.body)), 201)
}

export function update(req: Request, res: Response): void {
  sendItem(res, updateNote(currentUser(req).id, paramId(req), noteUpdateSchema.parse(req.body)))
}

export function remove(req: Request, res: Response): void {
  deleteNote(currentUser(req).id, paramId(req))
  sendNoContent(res)
}
