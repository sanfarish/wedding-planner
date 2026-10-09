import type { Request, Response } from 'express'
import { currentUser } from '../middleware/requireAuth.js'
import {
  createGuest,
  deleteGuest,
  getGuest,
  getGuestSummary,
  listGuestGroups,
  listGuests,
  updateGuest,
} from '../services/guests.js'
import { sendItem, sendList, sendNoContent } from '../utils/respond.js'
import { guestCreateSchema, guestQuerySchema, guestUpdateSchema } from '../validation/guests.js'
import { paramId } from './helpers.js'

export function list(req: Request, res: Response): void {
  const { rows, total } = listGuests(guestQuerySchema.parse(req.query))
  sendList(res, rows, total, { summary: getGuestSummary() })
}

export function groups(_req: Request, res: Response): void {
  const rows = listGuestGroups()
  sendList(res, rows, rows.length)
}

export function show(req: Request, res: Response): void {
  sendItem(res, getGuest(paramId(req)))
}

export function create(req: Request, res: Response): void {
  sendItem(res, createGuest(currentUser(req).id, guestCreateSchema.parse(req.body)), 201)
}

export function update(req: Request, res: Response): void {
  sendItem(res, updateGuest(currentUser(req).id, paramId(req), guestUpdateSchema.parse(req.body)))
}

export function remove(req: Request, res: Response): void {
  deleteGuest(currentUser(req).id, paramId(req))
  sendNoContent(res)
}
