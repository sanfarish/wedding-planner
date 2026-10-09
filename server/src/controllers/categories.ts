import type { Request, Response } from 'express'
import { currentUser } from '../middleware/requireAuth.js'
import type { categoryService } from '../services/categories.js'
import { sendItem, sendList, sendNoContent } from '../utils/respond.js'
import { categorySchema } from '../validation/common.js'
import { paramId } from './helpers.js'

/** Handlers shared by task and budget categories. */
export function categoryController(service: ReturnType<typeof categoryService>) {
  return {
    list(_req: Request, res: Response): void {
      const rows = service.list()
      sendList(res, rows, rows.length)
    },
    create(req: Request, res: Response): void {
      const { name } = categorySchema.parse(req.body)
      sendItem(res, service.create(currentUser(req).id, name), 201)
    },
    update(req: Request, res: Response): void {
      const { name } = categorySchema.parse(req.body)
      sendItem(res, service.rename(currentUser(req).id, paramId(req), name))
    },
    remove(req: Request, res: Response): void {
      service.remove(currentUser(req).id, paramId(req))
      sendNoContent(res)
    },
  }
}
