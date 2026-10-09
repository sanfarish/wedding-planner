import type { DocumentLink } from '@wedding/shared'
import { db } from '../db/index.js'
import { notFound } from '../utils/errors.js'
import { buildUpdate, isoTimestamp, likeAnywhere, paginate } from '../utils/sql.js'
import type { DocumentCreate, DocumentQuery, DocumentUpdate } from '../validation/notes.js'
import { logActivity } from './activity.js'

const SELECT = `
  SELECT d.id, d.title, d.description, d.url, d.category,
         d.created_by AS createdBy, u.display_name AS createdByName,
         ${isoTimestamp('d.created_at')} AS createdAt, ${isoTimestamp('d.updated_at')} AS updatedAt
  FROM documents d
  LEFT JOIN users u ON u.id = d.created_by
`

const COLUMNS: { [K in keyof DocumentUpdate]-?: string } = {
  title: 'title',
  description: 'description',
  url: 'url',
  category: 'category',
}

export function listDocuments(filters: DocumentQuery): { rows: DocumentLink[]; total: number } {
  const where: string[] = []
  const params: string[] = []

  if (filters.search) {
    where.push("(d.title LIKE ? ESCAPE '\\' OR d.description LIKE ? ESCAPE '\\')")
    const pattern = likeAnywhere(filters.search)
    params.push(pattern, pattern)
  }
  if (filters.category) {
    where.push('d.category = ? COLLATE NOCASE')
    params.push(filters.category)
  }

  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : ''
  const { clause, params: pageParams } = paginate(filters)

  const rows = db()
    .prepare(`${SELECT}${whereSql} ORDER BY d.created_at DESC, d.id DESC${clause}`)
    .all(...params, ...pageParams) as DocumentLink[]
  const total = (db().prepare(`SELECT COUNT(*) AS n FROM documents d${whereSql}`).get(...params) as { n: number }).n

  return { rows, total }
}

export function getDocument(id: number): DocumentLink {
  const row = db().prepare(`${SELECT} WHERE d.id = ?`).get(id) as DocumentLink | undefined
  if (!row) throw notFound('Document')
  return row
}

export function createDocument(userId: number, input: DocumentCreate): DocumentLink {
  const id = db().transaction(() => {
    const result = db()
      .prepare('INSERT INTO documents (title, description, url, category, created_by) VALUES (?, ?, ?, ?, ?)')
      .run(input.title, input.description ?? null, input.url, input.category ?? null, userId)
    const newId = Number(result.lastInsertRowid)
    logActivity(userId, 'create', 'document', newId, `Added document "${input.title}"`)
    return newId
  })()
  return getDocument(id)
}

export function updateDocument(userId: number, id: number, patch: DocumentUpdate): DocumentLink {
  const existing = getDocument(id)
  const update = buildUpdate('documents', COLUMNS, patch, id)
  if (!update) return existing

  db().transaction(() => {
    db().prepare(update.sql).run(...update.params)
    logActivity(userId, 'update', 'document', id, `Updated document "${patch.title ?? existing.title}"`)
  })()
  return getDocument(id)
}

export function deleteDocument(userId: number, id: number): void {
  const existing = getDocument(id)
  db().transaction(() => {
    db().prepare('DELETE FROM documents WHERE id = ?').run(id)
    logActivity(userId, 'delete', 'document', id, `Deleted document "${existing.title}"`)
  })()
}
