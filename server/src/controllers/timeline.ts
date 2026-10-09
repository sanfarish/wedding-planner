import type { Request, Response } from 'express'
import { currentUser } from '../middleware/requireAuth.js'
import {
  createTimelineEvent,
  deleteTimelineEvent,
  getTimelineEvent,
  listTimeline,
  updateTimelineEvent,
} from '../services/timeline.js'
import { sendItem, sendList, sendNoContent } from '../utils/respond.js'
import { timelineCreateSchema, timelineQuerySchema, timelineUpdateSchema } from '../validation/timeline.js'
import { paramId } from './helpers.js'

export function list(req: Request, res: Response): void {
  const { rows, total } = listTimeline(timelineQuerySchema.parse(req.query))
  sendList(res, rows, total)
}

export function show(req: Request, res: Response): void {
  sendItem(res, getTimelineEvent(paramId(req)))
}

export function create(req: Request, res: Response): void {
  sendItem(res, createTimelineEvent(currentUser(req).id, timelineCreateSchema.parse(req.body)), 201)
}

export function update(req: Request, res: Response): void {
  sendItem(res, updateTimelineEvent(currentUser(req).id, paramId(req), timelineUpdateSchema.parse(req.body)))
}

export function remove(req: Request, res: Response): void {
  deleteTimelineEvent(currentUser(req).id, paramId(req))
  sendNoContent(res)
}
