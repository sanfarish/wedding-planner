import type { Request, Response } from 'express'
import { currentUser } from '../middleware/requireAuth.js'
import { createDocument, deleteDocument, getDocument, listDocuments, updateDocument } from '../services/documents.js'
import { sendItem, sendList, sendNoContent } from '../utils/respond.js'
import { documentCreateSchema, documentQuerySchema, documentUpdateSchema } from '../validation/notes.js'
import { paramId } from './helpers.js'

export function list(req: Request, res: Response): void {
  const { rows, total } = listDocuments(documentQuerySchema.parse(req.query))
  sendList(res, rows, total)
}

export function show(req: Request, res: Response): void {
  sendItem(res, getDocument(paramId(req)))
}

export function create(req: Request, res: Response): void {
  sendItem(res, createDocument(currentUser(req).id, documentCreateSchema.parse(req.body)), 201)
}

export function update(req: Request, res: Response): void {
  sendItem(res, updateDocument(currentUser(req).id, paramId(req), documentUpdateSchema.parse(req.body)))
}

export function remove(req: Request, res: Response): void {
  deleteDocument(currentUser(req).id, paramId(req))
  sendNoContent(res)
}
