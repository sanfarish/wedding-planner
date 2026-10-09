import { Router, type RequestHandler } from 'express'
import * as auth from '../controllers/auth.js'
import { requireAuth } from '../middleware/requireAuth.js'

export function authRoutes(loginRateLimit: RequestHandler): Router {
  const router = Router()
  router.post('/login', loginRateLimit, auth.login)
  router.post('/logout', auth.logout)
  router.get('/me', auth.me)
  router.patch('/me', requireAuth, auth.updateMe)
  router.patch('/password', requireAuth, auth.updatePassword)
  return router
}
