import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { z } from 'zod'

// Works for both src/config.ts (tsx) and dist/config.js (compiled).
export const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

dotenv.config({ path: path.resolve(SERVER_ROOT, '..', '.env'), quiet: true })

const DEV_SECRET = 'dev-only-insecure-session-secret-change-me-please'

/** "true"/"false"/"1"/"0" (any case) as a boolean; undefined when unset. */
const envBool = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => ['true', 'false', '1', '0'].includes(v), 'Use true or false')
  .transform((v) => v === 'true' || v === '1')
  .optional()

export type TrustProxy = boolean | number | string

/**
 * Express "trust proxy" setting. A number is a hop count (e.g. 1 = only Nginx),
 * true/false are booleans, anything else (e.g. "loopback") is passed through.
 */
export function parseTrustProxy(value: string | undefined): TrustProxy {
  if (value === undefined || value.trim() === '') return 'loopback'
  const v = value.trim()
  if (/^\d+$/.test(v)) return Number(v)
  if (v.toLowerCase() === 'true') return true
  if (v.toLowerCase() === 'false') return false
  return v
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    HOST: z.string().default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_PATH: z.string().default('./data/wedding.db'),
    UPLOAD_DIR: z.string().default('./uploads'),
    SESSION_SECRET: z.string().optional(),
    // Serve the built Vue app from Express (used by the container image).
    SERVE_CLIENT: envBool,
    CLIENT_DIST: z.string().default('../client/dist'),
    // Apply pending migrations at startup. Defaults to on except in production.
    MIGRATE_ON_START: envBool,
    TRUST_PROXY: z.string().optional(),
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
  serveClient: env.SERVE_CLIENT ?? false,
  clientDist: path.resolve(SERVER_ROOT, env.CLIENT_DIST),
  migrateOnStart: env.MIGRATE_ON_START ?? env.NODE_ENV !== 'production',
  trustProxy: parseTrustProxy(env.TRUST_PROXY),
} as const

export type AppConfig = typeof config
