import type { TimelineEvent } from '@wedding/shared'
import { db } from '../db/index.js'
import { badRequest, notFound } from '../utils/errors.js'
import { buildUpdate, isoTimestamp, paginate } from '../utils/sql.js'
import type { TimelineCreate, TimelineQuery, TimelineUpdate } from '../validation/timeline.js'
import { logActivity } from './activity.js'

const SELECT = `
  SELECT id, title, description, event_date AS eventDate, start_time AS startTime, end_time AS endTime,
         location, category, created_by AS createdBy,
         ${isoTimestamp('created_at')} AS createdAt, ${isoTimestamp('updated_at')} AS updatedAt
  FROM timeline_events
`

// Untimed events sort before timed ones on the same day.
const ORDER = ' ORDER BY event_date, start_time IS NOT NULL, start_time, id'

const COLUMNS: { [K in keyof TimelineUpdate]-?: string } = {
  title: 'title',
  description: 'description',
  eventDate: 'event_date',
  startTime: 'start_time',
  endTime: 'end_time',
  location: 'location',
  category: 'category',
}

export function listTimeline(filters: TimelineQuery): { rows: TimelineEvent[]; total: number } {
  const where: string[] = []
  const params: string[] = []

  if (filters.from) {
    where.push('event_date >= ?')
    params.push(filters.from)
  }
  if (filters.to) {
    where.push('event_date <= ?')
    params.push(filters.to)
  }

  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : ''
  const { clause, params: pageParams } = paginate(filters)

  const rows = db()
    .prepare(`${SELECT}${whereSql}${ORDER}${clause}`)
    .all(...params, ...pageParams) as TimelineEvent[]
  const total = (
    db().prepare(`SELECT COUNT(*) AS n FROM timeline_events${whereSql}`).get(...params) as { n: number }
  ).n

  return { rows, total }
}

export function getTimelineEvent(id: number): TimelineEvent {
  const row = db().prepare(`${SELECT} WHERE id = ?`).get(id) as TimelineEvent | undefined
  if (!row) throw notFound('Event')
  return row
}

export function createTimelineEvent(userId: number, input: TimelineCreate): TimelineEvent {
  const id = db().transaction(() => {
    const result = db()
      .prepare(
        `INSERT INTO timeline_events (title, description, event_date, start_time, end_time, location, category, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.title,
        input.description ?? null,
        input.eventDate,
        input.startTime ?? null,
        input.endTime ?? null,
        input.location ?? null,
        input.category ?? null,
        userId,
      )
    const newId = Number(result.lastInsertRowid)
    logActivity(userId, 'create', 'timeline_event', newId, `Added timeline event "${input.title}"`)
    return newId
  })()

  return getTimelineEvent(id)
}

export function updateTimelineEvent(userId: number, id: number, patch: TimelineUpdate): TimelineEvent {
  const existing = getTimelineEvent(id)

  // The schema checks start/end when both are sent; also check against stored values.
  const start = patch.startTime !== undefined ? patch.startTime : existing.startTime
  const end = patch.endTime !== undefined ? patch.endTime : existing.endTime
  if (start && end && end < start) {
    throw badRequest('End time must be after start time', { fieldErrors: { endTime: ['Must be after start time'] } })
  }

  const update = buildUpdate('timeline_events', COLUMNS, patch, id)
  if (!update) return existing

  db().transaction(() => {
    db().prepare(update.sql).run(...update.params)
    logActivity(userId, 'update', 'timeline_event', id, `Updated timeline event "${patch.title ?? existing.title}"`)
  })()

  return getTimelineEvent(id)
}

export function deleteTimelineEvent(userId: number, id: number): void {
  const existing = getTimelineEvent(id)
  db().transaction(() => {
    db().prepare('DELETE FROM timeline_events WHERE id = ?').run(id)
    logActivity(userId, 'delete', 'timeline_event', id, `Deleted timeline event "${existing.title}"`)
  })()
}
