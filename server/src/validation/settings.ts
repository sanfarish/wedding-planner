import { z } from 'zod'
import type { Currency } from '@wedding/shared'
import { enumValues, money, optionalDate, optionalText, requiredText } from './common.js'

export const CURRENCIES = enumValues<Currency>()(['IDR', 'USD', 'EUR', 'SGD', 'MYR', 'AUD'])

export const settingsPatchSchema = z.object({
  weddingName: requiredText(100).optional(),
  weddingDate: optionalDate,
  weddingLocation: optionalText(200),
  groomName: optionalText(100),
  brideName: optionalText(100),
  currency: z.enum(CURRENCIES).optional(),
  totalBudget: money.optional(),
})
