import type { Request, Response } from 'express'
import { z } from 'zod'
import { listActivity } from '../services/activity.js'
import { getDashboard } from '../services/dashboard.js'
import { sendItem, sendList } from '../utils/respond.js'
import { paginationQuery } from '../validation/common.js'

export function dashboard(_req: Request, res: Response): void {
  sendItem(res, getDashboard())
}

const activityQuerySchema = z.object(paginationQuery)

export function activity(req: Request, res: Response): void {
  const { page, limit } = activityQuerySchema.parse(req.query)
  const { rows, total } = listActivity({ page: page ?? 1, limit: limit ?? 50 })
  sendList(res, rows, total)
}
