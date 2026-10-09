import type { Note } from '@wedding/shared'
import { db } from '../db/index.js'
import { notFound } from '../utils/errors.js'
import { buildUpdate, isoTimestamp, likeAnywhere, paginate } from '../utils/sql.js'
import type { NoteCreate, NoteQuery, NoteUpdate } from '../validation/notes.js'
import { logActivity } from './activity.js'

const SELECT = `
  SELECT n.id, n.title, n.content, n.created_by AS createdBy, u.display_name AS createdByName,
         ${isoTimestamp('n.created_at')} AS createdAt, ${isoTimestamp('n.updated_at')} AS updatedAt
  FROM notes n
  LEFT JOIN users u ON u.id = n.created_by
`

const COLUMNS: { [K in keyof NoteUpdate]-?: string } = {
  title: 'title',
  content: 'content',
}

export function listNotes(filters: NoteQuery): { rows: Note[]; total: number } {
  const where: string[] = []
  const params: string[] = []

  if (filters.search) {
    where.push("(n.title LIKE ? ESCAPE '\\' OR n.content LIKE ? ESCAPE '\\')")
    const pattern = likeAnywhere(filters.search)
    params.push(pattern, pattern)
  }

  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : ''
  const { clause, params: pageParams } = paginate(filters)

  const rows = db()
    .prepare(`${SELECT}${whereSql} ORDER BY n.updated_at DESC, n.id DESC${clause}`)
    .all(...params, ...pageParams) as Note[]
  const total = (db().prepare(`SELECT COUNT(*) AS n FROM notes n${whereSql}`).get(...params) as { n: number }).n

  return { rows, total }
}

export function getNote(id: number): Note {
  const row = db().prepare(`${SELECT} WHERE n.id = ?`).get(id) as Note | undefined
  if (!row) throw notFound('Note')
  return row
}

export function createNote(userId: number, input: NoteCreate): Note {
  const id = db().transaction(() => {
    const result = db()
      .prepare('INSERT INTO notes (title, content, created_by) VALUES (?, ?, ?)')
      .run(input.title, input.content ?? null, userId)
    const newId = Number(result.lastInsertRowid)
    logActivity(userId, 'create', 'note', newId, `Added note "${input.title}"`)
    return newId
  })()
  return getNote(id)
}

export function updateNote(userId: number, id: number, patch: NoteUpdate): Note {
  const existing = getNote(id)
  const update = buildUpdate('notes', COLUMNS, patch, id)
  if (!update) return existing

  db().transaction(() => {
    db().prepare(update.sql).run(...update.params)
    logActivity(userId, 'update', 'note', id, `Updated note "${patch.title ?? existing.title}"`)
  })()
  return getNote(id)
}

export function deleteNote(userId: number, id: number): void {
  const existing = getNote(id)
  db().transaction(() => {
    db().prepare('DELETE FROM notes WHERE id = ?').run(id)
    logActivity(userId, 'delete', 'note', id, `Deleted note "${existing.title}"`)
  })()
}
