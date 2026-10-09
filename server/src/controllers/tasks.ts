import type { Request, Response } from 'express'
import { currentUser } from '../middleware/requireAuth.js'
import { createTask, deleteTask, getTask, listTasks, setTaskCompleted, updateTask } from '../services/tasks.js'
import { sendItem, sendList, sendNoContent } from '../utils/respond.js'
import { taskCompleteSchema, taskCreateSchema, taskQuerySchema, taskUpdateSchema } from '../validation/tasks.js'
import { paramId } from './helpers.js'

export function list(req: Request, res: Response): void {
  const { rows, total } = listTasks(taskQuerySchema.parse(req.query))
  sendList(res, rows, total)
}

export function show(req: Request, res: Response): void {
  sendItem(res, getTask(paramId(req)))
}

export function create(req: Request, res: Response): void {
  sendItem(res, createTask(currentUser(req).id, taskCreateSchema.parse(req.body)), 201)
}

export function update(req: Request, res: Response): void {
  sendItem(res, updateTask(currentUser(req).id, paramId(req), taskUpdateSchema.parse(req.body)))
}

export function complete(req: Request, res: Response): void {
  const { completed } = taskCompleteSchema.parse(req.body)
  sendItem(res, setTaskCompleted(currentUser(req).id, paramId(req), completed))
}

export function remove(req: Request, res: Response): void {
  deleteTask(currentUser(req).id, paramId(req))
  sendNoContent(res)
}
