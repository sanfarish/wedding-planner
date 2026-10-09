import { z } from 'zod'
import { requiredText } from './common.js'

export const USERNAME_PATTERN = /^[a-z0-9_.-]{3,30}$/i
export const MIN_PASSWORD_LENGTH = 10

export const password = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(200)

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Required').max(50),
  password: z.string().min(1, 'Required').max(200),
})

export const updateMeSchema = z.object({
  displayName: requiredText(50),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Required').max(200),
  newPassword: password,
})

export const newUserSchema = z.object({
  username: z.string().trim().regex(USERNAME_PATTERN, '3-30 characters: letters, numbers, . _ -'),
  displayName: requiredText(50),
  password,
})
