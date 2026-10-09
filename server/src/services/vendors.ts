import type { Vendor, VendorDetail } from '@wedding/shared'
import { db } from '../db/index.js'
import { notFound } from '../utils/errors.js'
import { buildUpdate, isoTimestamp, likeAnywhere, paginate } from '../utils/sql.js'
import type { VendorCreate, VendorQuery, VendorUpdate } from '../validation/vendors.js'
import { logActivity } from './activity.js'
import { listExpensesForVendor } from './expenses.js'

const SELECT = `
  SELECT id, name, category, contact_name AS contactName, phone, email, website,
         quoted_amount AS quotedAmount, status, notes, created_by AS createdBy,
         ${isoTimestamp('created_at')} AS createdAt, ${isoTimestamp('updated_at')} AS updatedAt
  FROM vendors
`

/** Active vendors first (booked at the top), cancelled last. */
const ORDER = `
  ORDER BY CASE status WHEN 'booked' THEN 0 WHEN 'negotiating' THEN 1 WHEN 'shortlisted' THEN 2
                       WHEN 'considering' THEN 3 WHEN 'completed' THEN 4 ELSE 5 END,
           name COLLATE NOCASE
`

const COLUMNS: { [K in keyof VendorUpdate]-?: string } = {
  name: 'name',
  category: 'category',
  contactName: 'contact_name',
  phone: 'phone',
  email: 'email',
  website: 'website',
  quotedAmount: 'quoted_amount',
  status: 'status',
  notes: 'notes',
}

export function listVendors(filters: VendorQuery): { rows: Vendor[]; total: number } {
  const where: string[] = []
  const params: (string | number)[] = []

  if (filters.status) {
    where.push('status = ?')
    params.push(filters.status)
  }
  if (filters.search) {
    where.push(
      "(name LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\' OR contact_name LIKE ? ESCAPE '\\')",
    )
    const pattern = likeAnywhere(filters.search)
    params.push(pattern, pattern, pattern)
  }

  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : ''
  const { clause, params: pageParams } = paginate(filters)

  const rows = db()
    .prepare(`${SELECT}${whereSql}${ORDER}${clause}`)
    .all(...params, ...pageParams) as Vendor[]
  const total = (db().prepare(`SELECT COUNT(*) AS n FROM vendors${whereSql}`).get(...params) as { n: number }).n

  return { rows, total }
}

export function getVendor(id: number): Vendor {
  const row = db().prepare(`${SELECT} WHERE id = ?`).get(id) as Vendor | undefined
  if (!row) throw notFound('Vendor')
  return row
}

export function getVendorDetail(id: number): VendorDetail {
  const vendor = getVendor(id)
  const expenses = listExpensesForVendor(id)
  const active = expenses.filter((e) => e.status !== 'cancelled')
  return {
    ...vendor,
    expenses,
    expenseTotals: {
      estimated: active.reduce((sum, e) => sum + e.estimatedAmount, 0),
      paid: active.reduce((sum, e) => sum + e.actualAmount, 0),
    },
  }
}

export function createVendor(userId: number, input: VendorCreate): Vendor {
  const id = db().transaction(() => {
    const result = db()
      .prepare(
        `INSERT INTO vendors (name, category, contact_name, phone, email, website, quoted_amount, status, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.name,
        input.category ?? null,
        input.contactName ?? null,
        input.phone ?? null,
        input.email ?? null,
        input.website ?? null,
        input.quotedAmount ?? 0,
        input.status ?? 'considering',
        input.notes ?? null,
        userId,
      )
    const newId = Number(result.lastInsertRowid)
    logActivity(userId, 'create', 'vendor', newId, `Added vendor "${input.name}"`)
    return newId
  })()

  return getVendor(id)
}

export function updateVendor(userId: number, id: number, patch: VendorUpdate): Vendor {
  const existing = getVendor(id)
  const update = buildUpdate('vendors', COLUMNS, patch, id)
  if (!update) return existing

  const name = patch.name ?? existing.name
  const description =
    patch.status && patch.status !== existing.status
      ? `Changed vendor "${name}" to ${patch.status}`
      : `Updated vendor "${name}"`

  db().transaction(() => {
    db().prepare(update.sql).run(...update.params)
    logActivity(userId, 'update', 'vendor', id, description)
  })()

  return getVendor(id)
}

/** Linked expenses keep their record; their vendor_id is cleared by the foreign key. */
export function deleteVendor(userId: number, id: number): void {
  const existing = getVendor(id)
  db().transaction(() => {
    db().prepare('DELETE FROM vendors WHERE id = ?').run(id)
    logActivity(userId, 'delete', 'vendor', id, `Deleted vendor "${existing.name}"`)
  })()
}
