import type { Currency, WeddingSettings } from '@wedding/shared'
import { db } from '../db/index.js'
import { buildUpdate, isoTimestamp } from '../utils/sql.js'
import { logActivity } from './activity.js'

export interface SettingsPatch {
  weddingName?: string | undefined
  weddingDate?: string | null | undefined
  weddingLocation?: string | null | undefined
  groomName?: string | null | undefined
  brideName?: string | null | undefined
  currency?: Currency | undefined
  totalBudget?: number | undefined
}

const COLUMNS: { [K in keyof SettingsPatch]-?: string } = {
  weddingName: 'wedding_name',
  weddingDate: 'wedding_date',
  weddingLocation: 'wedding_location',
  groomName: 'groom_name',
  brideName: 'bride_name',
  currency: 'currency',
  totalBudget: 'total_budget',
}

export function getSettings(): WeddingSettings {
  return db()
    .prepare(
      `SELECT wedding_name AS weddingName, wedding_date AS weddingDate, wedding_location AS weddingLocation,
              groom_name AS groomName, bride_name AS brideName, currency, total_budget AS totalBudget,
              ${isoTimestamp('updated_at')} AS updatedAt
       FROM wedding_settings WHERE id = 1`,
    )
    .get() as WeddingSettings
}

export function updateSettings(userId: number, patch: SettingsPatch): WeddingSettings {
  const update = buildUpdate('wedding_settings', COLUMNS, patch, 1)
  if (!update) return getSettings()

  db().transaction(() => {
    db().prepare(update.sql).run(...update.params)
    logActivity(userId, 'update', 'settings', null, 'Updated wedding settings')
  })()

  return getSettings()
}
