import { z } from 'zod'
import { date, optionalText, optionalTime, paginationQuery, query, requiredText } from './common.js'

const fields = {
  title: requiredText(200),
  description: optionalText(5000),
  eventDate: date,
  startTime: optionalTime,
  endTime: optionalTime,
  location: optionalText(200),
  category: optionalText(100),
}

const endAfterStart = (e: { startTime?: string | null | undefined; endTime?: string | null | undefined }) =>
  !e.startTime || !e.endTime || e.endTime >= e.startTime

const END_MESSAGE = { message: 'End time must be after start time', path: ['endTime'] }

export const timelineCreateSchema = z.object(fields).refine(endAfterStart, END_MESSAGE)

export const timelineUpdateSchema = z.object(fields).partial().refine(endAfterStart, END_MESSAGE)

export const timelineQuerySchema = z.object({
  from: query(date),
  to: query(date),
  ...paginationQuery,
})

export type TimelineCreate = z.infer<typeof timelineCreateSchema>
export type TimelineUpdate = z.infer<typeof timelineUpdateSchema>
export type TimelineQuery = z.infer<typeof timelineQuerySchema>
