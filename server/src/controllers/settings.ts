import type { Request, Response } from 'express'
import { currentUser } from '../middleware/requireAuth.js'
import { getSettings, updateSettings } from '../services/settings.js'
import { listUsers } from '../services/users.js'
import { sendItem, sendList } from '../utils/respond.js'
import { settingsPatchSchema } from '../validation/settings.js'

export function getWedding(_req: Request, res: Response): void {
  sendItem(res, getSettings())
}

export function patchWedding(req: Request, res: Response): void {
  const patch = settingsPatchSchema.parse(req.body)
  sendItem(res, updateSettings(currentUser(req).id, patch))
}

export function users(_req: Request, res: Response): void {
  const rows = listUsers()
  sendList(res, rows, rows.length)
}
