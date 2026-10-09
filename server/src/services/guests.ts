import type { Guest, GuestSummary } from '@wedding/shared'
import { db } from '../db/index.js'
import { notFound } from '../utils/errors.js'
import { buildUpdate, isoTimestamp, likeAnywhere, paginate } from '../utils/sql.js'
import type { GuestCreate, GuestQuery, GuestUpdate } from '../validation/guests.js'
import { logActivity } from './activity.js'

const SELECT = `
  SELECT id, name, phone, email, group_name AS groupName, relationship,
         invitation_status AS invitationStatus, rsvp_status AS rsvpStatus,
         number_of_guests AS numberOfGuests, meal_preference AS mealPreference, notes,
         created_by AS createdBy,
         ${isoTimestamp('created_at')} AS createdAt, ${isoTimestamp('updated_at')} AS updatedAt
  FROM guests
`

const COLUMNS: { [K in keyof GuestUpdate]-?: string } = {
  name: 'name',
  phone: 'phone',
  email: 'email',
  groupName: 'group_name',
  relationship: 'relationship',
  invitationStatus: 'invitation_status',
  rsvpStatus: 'rsvp_status',
  numberOfGuests: 'number_of_guests',
  mealPreference: 'meal_preference',
  notes: 'notes',
}

export function listGuests(filters: GuestQuery): { rows: Guest[]; total: number } {
  const where: string[] = []
  const params: (string | number)[] = []

  if (filters.search) {
    where.push("(name LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\')")
    const pattern = likeAnywhere(filters.search)
    params.push(pattern, pattern, pattern)
  }
  if (filters.rsvp) {
    where.push('rsvp_status = ?')
    params.push(filters.rsvp)
  }
  if (filters.invitation) {
    where.push('invitation_status = ?')
    params.push(filters.invitation)
  }
  if (filters.group) {
    where.push('group_name = ? COLLATE NOCASE')
    params.push(filters.group)
  }

  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : ''
  const { clause, params: pageParams } = paginate(filters)

  const rows = db()
    .prepare(`${SELECT}${whereSql} ORDER BY name COLLATE NOCASE, id${clause}`)
    .all(...params, ...pageParams) as Guest[]
  const total = (db().prepare(`SELECT COUNT(*) AS n FROM guests${whereSql}`).get(...params) as { n: number }).n

  return { rows, total }
}

export function listGuestGroups(): string[] {
  return (
    db()
      .prepare(
        // One entry per group regardless of letter case ("Family" / "family").
        `SELECT MIN(group_name) AS name FROM guests
         WHERE group_name IS NOT NULL GROUP BY group_name COLLATE NOCASE ORDER BY name COLLATE NOCASE`,
      )
      .all() as { name: string }[]
  ).map((r) => r.name)
}

/** Headcounts across all guests (sum of number_of_guests). */
export function getGuestSummary(): GuestSummary {
  return db()
    .prepare(
      `SELECT COUNT(*) AS entries,
              COALESCE(SUM(number_of_guests), 0) AS total,
              COALESCE(SUM(CASE WHEN invitation_status = 'invited' THEN number_of_guests END), 0) AS invited,
              COALESCE(SUM(CASE WHEN rsvp_status = 'attending' THEN number_of_guests END), 0) AS attending,
              COALESCE(SUM(CASE WHEN rsvp_status = 'pending' THEN number_of_guests END), 0) AS pending,
              COALESCE(SUM(CASE WHEN rsvp_status = 'declined' THEN number_of_guests END), 0) AS declined
       FROM guests`,
    )
    .get() as GuestSummary
}

export function getGuest(id: number): Guest {
  const row = db().prepare(`${SELECT} WHERE id = ?`).get(id) as Guest | undefined
  if (!row) throw notFound('Guest')
  return row
}

export function createGuest(userId: number, input: GuestCreate): Guest {
  const id = db().transaction(() => {
    const result = db()
      .prepare(
        `INSERT INTO guests (name, phone, email, group_name, relationship, invitation_status, rsvp_status,
                             number_of_guests, meal_preference, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.name,
        input.phone ?? null,
        input.email ?? null,
        input.groupName ?? null,
        input.relationship ?? null,
        input.invitationStatus ?? 'not_invited',
        input.rsvpStatus ?? 'pending',
        input.numberOfGuests ?? 1,
        input.mealPreference ?? null,
        input.notes ?? null,
        userId,
      )
    const newId = Number(result.lastInsertRowid)
    logActivity(userId, 'create', 'guest', newId, `Added guest "${input.name}"`)
    return newId
  })()

  return getGuest(id)
}

export function updateGuest(userId: number, id: number, patch: GuestUpdate): Guest {
  const existing = getGuest(id)
  const update = buildUpdate('guests', COLUMNS, patch, id)
  if (!update) return existing

  const name = patch.name ?? existing.name
  const rsvpChanged = patch.rsvpStatus !== undefined && patch.rsvpStatus !== existing.rsvpStatus
  const description = rsvpChanged
    ? `Set RSVP for "${name}" to ${patch.rsvpStatus}`
    : `Updated guest "${name}"`

  db().transaction(() => {
    db().prepare(update.sql).run(...update.params)
    logActivity(userId, 'update', 'guest', id, description)
  })()

  return getGuest(id)
}

export function deleteGuest(userId: number, id: number): void {
  const existing = getGuest(id)
  db().transaction(() => {
    db().prepare('DELETE FROM guests WHERE id = ?').run(id)
    logActivity(userId, 'delete', 'guest', id, `Removed guest "${existing.name}"`)
  })()
}
