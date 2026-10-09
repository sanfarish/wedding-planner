import { Router, type RequestHandler } from 'express'
import * as dashboard from '../controllers/dashboard.js'
import * as documents from '../controllers/documents.js'
import * as notes from '../controllers/notes.js'
import * as settings from '../controllers/settings.js'
import * as timeline from '../controllers/timeline.js'
import * as vendors from '../controllers/vendors.js'
import { db } from '../db/index.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { authRoutes } from './auth.js'
import { budgetCategoryRoutes, budgetRoutes, expenseRoutes } from './budget.js'
import { crudRoutes } from './crud.js'
import { guestRoutes } from './guests.js'
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
  router.get('/dashboard', dashboard.dashboard)
  router.get('/activity', dashboard.activity)

  router.use('/tasks', taskRoutes)
  router.use('/task-categories', taskCategoryRoutes)
  router.use('/budget', budgetRoutes)
  router.use('/expenses', expenseRoutes)
  router.use('/budget-categories', budgetCategoryRoutes)
  router.use('/guests', guestRoutes)
  router.use('/vendors', crudRoutes(vendors))
  router.use('/timeline', crudRoutes(timeline))
  router.use('/notes', crudRoutes(notes))
  router.use('/documents', crudRoutes(documents))

  return router
}
