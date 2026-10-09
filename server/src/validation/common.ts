import { z } from 'zod'

/**
 * Declares the full list of values of a string union for z.enum().
 * Fails to compile if a member of the union is missing or an unknown value is added.
 * Usage: enumValues<TaskStatus>()(['todo', 'in_progress', 'completed'])
 */
export const enumValues =
  <T extends string>() =>
  <const A extends readonly [T, ...T[]]>(values: A & ([T] extends [A[number]] ? unknown : never)): A =>
    values

/** Positive integer id, e.g. from a route param. */
export const id = z.coerce.number().int().positive()

/** Required, trimmed, non-empty string. */
export const requiredText = (max = 200) => z.string().trim().min(1, 'Required').max(max)

/**
 * Optional, nullable text. An empty string is stored as NULL.
 * `undefined` means "leave unchanged" in PATCH requests.
 */
export const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => (s === '' ? null : s))
    .nullable()
    .optional()

/** Calendar date YYYY-MM-DD. */
export const date = z.iso.date('Use the format YYYY-MM-DD')
export const optionalDate = date.nullable().optional()

/** Time of day HH:mm (24h). */
export const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use the format HH:mm')
export const optionalTime = time.nullable().optional()

/** Money in whole currency units (e.g. rupiah). Never a float. */
export const money = z.number().int('Amounts must be whole numbers').min(0).max(1_000_000_000_000)

/** Foreign-key reference that may be cleared. */
export const optionalRef = id.nullable().optional()

export const httpUrl = z
  .url({ protocol: /^https?$/, message: 'Enter a valid http(s) URL' })
  .max(2000)

export const optionalEmail = z
  .union([z.literal(''), z.email('Enter a valid email address').max(200)])
  .transform((s) => (s === '' ? null : s))
  .nullable()
  .optional()

/** Empty query-string values are treated as absent. */
export const query = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional())

export const paginationQuery = {
  page: query(z.coerce.number().int().min(1)),
  limit: query(z.coerce.number().int().min(1).max(100)),
}

export const searchQuery = query(z.string().trim().max(100))

/** Body for creating or renaming a task/budget category. */
export const categorySchema = z.object({
  name: requiredText(50),
})
