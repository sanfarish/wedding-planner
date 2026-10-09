import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { z } from 'zod'

// Works for both src/config.ts (tsx) and dist/config.js (compiled).
export const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

dotenv.config({ path: path.resolve(SERVER_ROOT, '..', '.env'), quiet: true })

const DEV_SECRET = 'dev-only-insecure-session-secret-change-me-please'

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    HOST: z.string().default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_PATH: z.string().default('./data/wedding.db'),
    UPLOAD_DIR: z.string().default('./uploads'),
    SESSION_SECRET: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      const secret = env.SESSION_SECRET ?? ''
      if (secret.length < 32 || secret.startsWith('replace-this')) {
        ctx.addIssue({
          code: 'custom',
          path: ['SESSION_SECRET'],
          message: 'SESSION_SECRET must be set to a random string of at least 32 characters in production',
        })
      }
    }
  })

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('Invalid environment configuration:')
  for (const issue of parsed.error.issues) console.error(`  ${issue.path.join('.')}: ${issue.message}`)
  process.exit(1)
}

const env = parsed.data

function resolveFromServer(p: string): string {
  return p === ':memory:' ? p : path.resolve(SERVER_ROOT, p)
}

export const config = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  host: env.HOST,
  port: env.PORT,
  databasePath: resolveFromServer(env.DATABASE_PATH),
  uploadDir: resolveFromServer(env.UPLOAD_DIR),
  sessionSecret: env.SESSION_SECRET && !env.SESSION_SECRET.startsWith('replace-this') ? env.SESSION_SECRET : DEV_SECRET,
} as const

export type AppConfig = typeof config
