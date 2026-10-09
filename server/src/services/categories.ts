import type { Category, EntityType } from '@wedding/shared'
import { db } from '../db/index.js'
import { notFound } from '../utils/errors.js'
import { logActivity } from './activity.js'

type CategoryTable = 'task_categories' | 'budget_categories'

/** CRUD for the two simple category tables (task and budget categories). */
export function categoryService(table: CategoryTable, entityType: EntityType, label: string) {
  function get(id: number): Category {
    const row = db().prepare(`SELECT id, name FROM ${table} WHERE id = ?`).get(id) as Category | undefined
    if (!row) throw notFound(label)
    return row
  }

  return {
    list(): Category[] {
      return db().prepare(`SELECT id, name FROM ${table} ORDER BY name COLLATE NOCASE`).all() as Category[]
    },

    create(userId: number, name: string): Category {
      const id = db().transaction(() => {
        const result = db().prepare(`INSERT INTO ${table} (name) VALUES (?)`).run(name)
        const newId = Number(result.lastInsertRowid)
        logActivity(userId, 'create', entityType, newId, `Added ${label.toLowerCase()} "${name}"`)
        return newId
      })()
      return get(id)
    },

    rename(userId: number, id: number, name: string): Category {
      const existing = get(id)
      db().transaction(() => {
        db().prepare(`UPDATE ${table} SET name = ? WHERE id = ?`).run(name, id)
        logActivity(userId, 'update', entityType, id, `Renamed ${label.toLowerCase()} "${existing.name}" to "${name}"`)
      })()
      return get(id)
    },

    remove(userId: number, id: number): void {
      const existing = get(id)
      db().transaction(() => {
        db().prepare(`DELETE FROM ${table} WHERE id = ?`).run(id)
        logActivity(userId, 'delete', entityType, id, `Deleted ${label.toLowerCase()} "${existing.name}"`)
      })()
    },
  }
}

export const taskCategories = categoryService('task_categories', 'task_category', 'Task category')
export const budgetCategories = categoryService('budget_categories', 'budget_category', 'Budget category')
