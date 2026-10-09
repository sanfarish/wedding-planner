import type { User } from '@wedding/shared'

declare module 'express-session' {
  interface SessionData {
    userId: number
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}

export {}
