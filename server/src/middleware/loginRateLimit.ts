import { rateLimit } from 'express-rate-limit'

/** At most 5 failed login attempts per IP per 15 minutes. Successful logins don't count. */
export function createLoginRateLimit() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many login attempts. Please wait a few minutes and try again.',
        },
      })
    },
  })
}
