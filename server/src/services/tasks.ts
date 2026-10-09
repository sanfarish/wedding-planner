import type { Task, TaskStatus } from '@wedding/shared'
import { db } from '../db/index.js'
import { notFound } from '../utils/errors.js'
import { buildUpdate, isoTimestamp, likeAnywhere, paginate } from '../utils/sql.js'
import type { TaskCreate, TaskQuery, TaskUpdate } from '../validation/tasks.js'
import { logActivity } from './activity.js'
import { assertRef, nowSql } from './refs.js'

const SELECT = `
  SELECT t.id, t.title, t.description, t.status, t.priority,
         t.category_id AS categoryId, c.name AS categoryName,
         t.due_date AS dueDate, t.assigned_to AS assignedTo, u.display_name AS assignedToName,
         t.created_by AS createdBy,
         CASE WHEN t.completed_at IS NULL THEN NULL ELSE ${isoTimestamp('t.completed_at')} END AS completedAt,
         ${isoTimestamp('t.created_at')} AS createdAt, ${isoTimestamp('t.updated_at')} AS updatedAt
  FROM tasks t
  LEFT JOIN task_categories c ON c.id = t.category_id
  LEFT JOIN users u ON u.id = t.assigned_to
`

/** Open tasks first, then by due date (undated last), then by priority. */
export const TASK_ORDER = `
  ORDER BY t.status = 'completed', t.due_date IS NULL, t.due_date,
           CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
           t.id
`

const COLUMNS: { [K in keyof TaskUpdate]-?: string } = {
  title: 'title',
  description: 'description',
  status: 'status',
  priority: 'priority',
  categoryId: 'category_id',
  dueDate: 'due_date',
  assignedTo: 'assigned_to',
}

export function listTasks(filters: TaskQuery): { rows: Task[]; total: number } {
  const where: string[] = []
  const params: (string | number)[] = []

  if (filters.status) {
    where.push('t.status = ?')
    params.push(filters.status)
  }
  if (filters.assignedTo) {
    where.push('t.assigned_to = ?')
    params.push(filters.assignedTo)
  }
  if (filters.categoryId) {
    where.push('t.category_id = ?')
    params.push(filters.categoryId)
  }
  if (filters.search) {
    where.push("(t.title LIKE ? ESCAPE '\\' OR t.description LIKE ? ESCAPE '\\')")
    const pattern = likeAnywhere(filters.search)
    params.push(pattern, pattern)
  }

  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : ''
  const { clause, params: pageParams } = paginate(filters)

  const rows = db()
    .prepare(`${SELECT}${whereSql}${TASK_ORDER}${clause}`)
    .all(...params, ...pageParams) as Task[]
  const total = (db().prepare(`SELECT COUNT(*) AS n FROM tasks t${whereSql}`).get(...params) as { n: number }).n

  return { rows, total }
}

export function getTask(id: number): Task {
  const task = db().prepare(`${SELECT} WHERE t.id = ?`).get(id) as Task | undefined
  if (!task) throw notFound('Task')
  return task
}

export function createTask(userId: number, input: TaskCreate): Task {
  assertRef('task_categories', input.categoryId, 'categoryId')
  assertRef('users', input.assignedTo, 'assignedTo')

  const status = input.status ?? 'todo'

  const id = db().transaction(() => {
    const result = db()
      .prepare(
        `INSERT INTO tasks (title, description, status, priority, category_id, due_date, assigned_to, created_by, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.title,
        input.description ?? null,
        status,
        input.priority ?? 'medium',
        input.categoryId ?? null,
        input.dueDate ?? null,
        input.assignedTo ?? null,
        userId,
        status === 'completed' ? nowSql() : null,
      )
    const newId = Number(result.lastInsertRowid)
    logActivity(userId, 'create', 'task', newId, `Added task "${input.title}"`)
    return newId
  })()

  return getTask(id)
}

export function updateTask(userId: number, id: number, patch: TaskUpdate): Task {
  const existing = getTask(id)
  assertRef('task_categories', patch.categoryId, 'categoryId')
  assertRef('users', patch.assignedTo, 'assignedTo')

  const update = buildUpdate('tasks', COLUMNS, patch, id)
  if (!update) return existing

  const title = patch.title ?? existing.title
  const statusChange = patch.status !== undefined && patch.status !== existing.status ? patch.status : null

  db().transaction(() => {
    db().prepare(update.sql).run(...update.params)
    if (statusChange) setCompletedAt(id, statusChange)

    if (statusChange === 'completed') logActivity(userId, 'complete', 'task', id, `Completed task "${title}"`)
    else if (existing.status === 'completed' && statusChange) logActivity(userId, 'reopen', 'task', id, `Reopened task "${title}"`)
    else logActivity(userId, 'update', 'task', id, `Updated task "${title}"`)
  })()

  return getTask(id)
}

export function setTaskCompleted(userId: number, id: number, completed: boolean): Task {
  const existing = getTask(id)
  const isCompleted = existing.status === 'completed'
  if (completed === isCompleted) return existing

  const status: TaskStatus = completed ? 'completed' : 'todo'
  db().transaction(() => {
    db().prepare('UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id)
    setCompletedAt(id, status)
    logActivity(
      userId,
      completed ? 'complete' : 'reopen',
      'task',
      id,
      `${completed ? 'Completed' : 'Reopened'} task "${existing.title}"`,
    )
  })()

  return getTask(id)
}

export function deleteTask(userId: number, id: number): void {
  const existing = getTask(id)
  db().transaction(() => {
    db().prepare('DELETE FROM tasks WHERE id = ?').run(id)
    logActivity(userId, 'delete', 'task', id, `Deleted task "${existing.title}"`)
  })()
}

function setCompletedAt(id: number, status: TaskStatus): void {
  db()
    .prepare('UPDATE tasks SET completed_at = ? WHERE id = ?')
    .run(status === 'completed' ? nowSql() : null, id)
}
