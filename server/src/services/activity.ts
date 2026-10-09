import type { Activity, ActivityAction, EntityType } from '@wedding/shared'
import { db } from '../db/index.js'
import { isoTimestamp, paginate, type Pagination } from '../utils/sql.js'

/**
 * Records an activity entry. Call inside the same transaction as the mutation.
 * The description should not include the user's name; it is joined at read time.
 */
export function logActivity(
  userId: number,
  action: ActivityAction,
  entityType: EntityType,
  entityId: number | null,
  description: string,
): void {
  db()
    .prepare(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
    )
    .run(userId, action, entityType, entityId, description)
}

const SELECT = `
  SELECT a.id, a.user_id AS userId, u.display_name AS userName, a.action,
         a.entity_type AS entityType, a.entity_id AS entityId, a.description,
         ${isoTimestamp('a.created_at')} AS createdAt
  FROM activity_logs a
  JOIN users u ON u.id = a.user_id
`

export function listActivity(pagination: Pagination): { rows: Activity[]; total: number } {
  const { clause, params } = paginate(pagination)
  const rows = db()
    .prepare(`${SELECT} ORDER BY a.created_at DESC, a.id DESC${clause}`)
    .all(...params) as Activity[]
  const total = (db().prepare('SELECT COUNT(*) AS n FROM activity_logs').get() as { n: number }).n
  return { rows, total }
}

export function recentActivity(limit: number): Activity[] {
  return db().prepare(`${SELECT} ORDER BY a.created_at DESC, a.id DESC LIMIT ?`).all(limit) as Activity[]
}
