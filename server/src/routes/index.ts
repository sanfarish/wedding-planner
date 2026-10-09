import { Router, type RequestHandler } from 'express'
import * as settings from '../controllers/settings.js'
import { db } from '../db/index.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { authRoutes } from './auth.js'
import { taskCategoryRoutes, taskRoutes } from './tasks.js'

export function apiRoutes(loginRateLimit: RequestHandler): Router {
  const router = Router()

  // Public
  router.get('/health', (_req, res) => {
    db().prepare('SELECT 1').get()
    res.json({ data: { status: 'ok' } })
  })
  router.use('/auth', authRoutes(loginRateLimit))

  // Everything below requires a logged-in user
  router.use(requireAuth)

  router.get('/users', settings.users)
  router.get('/settings/wedding', settings.getWedding)
  router.patch('/settings/wedding', settings.patchWedding)

  router.use('/tasks', taskRoutes)
  router.use('/task-categories', taskCategoryRoutes)

  return router
}
