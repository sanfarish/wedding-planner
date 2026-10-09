import type { Countdown, Dashboard, Task } from '@wedding/shared'
import { db } from '../db/index.js'
import { daysBetween, todayLocal } from '../utils/dates.js'
import { recentActivity } from './activity.js'
import { getBudgetSummary } from './expenses.js'
import { getGuestSummary } from './guests.js'
import { getSettings } from './settings.js'
import { listTasks } from './tasks.js'

export function getCountdown(weddingDate: string | null, today: string): Countdown {
  if (!weddingDate) return { state: 'unset', daysRemaining: null, date: null }
  const daysRemaining = daysBetween(today, weddingDate)
  const state = daysRemaining > 0 ? 'upcoming' : daysRemaining === 0 ? 'today' : 'past'
  return { state, daysRemaining, date: weddingDate }
}

/** `today` (YYYY-MM-DD) can be injected for tests. */
export function getDashboard(today: string = todayLocal()): Dashboard {
  const wedding = getSettings()

  const counts = db()
    .prepare(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(status = 'completed'), 0) AS completed,
              COALESCE(SUM(status != 'completed' AND due_date IS NOT NULL AND due_date < ?), 0) AS overdue
       FROM tasks`,
    )
    .get(today) as { total: number; completed: number; overdue: number }

  // Open tasks, soonest due first. listTasks already orders open tasks first by due date.
  const upcoming: Task[] = listTasks({ limit: 50 })
    .rows.filter((t) => t.status !== 'completed')
    .slice(0, 8)

  return {
    wedding,
    countdown: getCountdown(wedding.weddingDate, today),
    budget: getBudgetSummary(),
    guests: getGuestSummary(),
    tasks: {
      total: counts.total,
      completed: counts.completed,
      remaining: counts.total - counts.completed,
      overdue: counts.overdue,
      upcoming,
    },
    recentActivity: recentActivity(10),
  }
}
