/**
 * Development seed data. All names and details are fictional.
 *   npm run db:seed
 * Refuses to run in production or on a database that already has planner data.
 */
import { config } from '../config.js'
import { openDatabase } from '../db/connection.js'
import { db as getDb, setDb } from '../db/index.js'
import { runMigrations } from '../db/migrate.js'
import { createUser } from '../services/auth.js'
import { createExpense } from '../services/expenses.js'
import { createGuest } from '../services/guests.js'
import { createNote } from '../services/notes.js'
import { createDocument } from '../services/documents.js'
import { updateSettings } from '../services/settings.js'
import { createTask } from '../services/tasks.js'
import { createTimelineEvent } from '../services/timeline.js'
import { listUsers } from '../services/users.js'
import { createVendor } from '../services/vendors.js'
import { todayLocal } from '../utils/dates.js'

if (config.isProduction) {
  console.error('Refusing to seed a production database.')
  process.exit(1)
}

const database = openDatabase(config.databasePath)
setDb(database)
runMigrations(database)

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return todayLocal(d)
}

function categoryId(table: 'task_categories' | 'budget_categories', name: string): number {
  const row = getDb().prepare(`SELECT id FROM ${table} WHERE name = ?`).get(name) as { id: number } | undefined
  if (!row) throw new Error(`Missing ${table} "${name}"`)
  return row.id
}

async function main(): Promise<void> {
  const existing = getDb().prepare('SELECT (SELECT COUNT(*) FROM tasks) + (SELECT COUNT(*) FROM guests) AS n').get() as {
    n: number
  }
  if (existing.n > 0) {
    console.log('Database already contains planner data; nothing seeded.')
    return
  }

  let users = listUsers()
  if (users.length < 2) {
    console.log('Creating demo users "demo-groom" and "demo-bride" (password: planner-demo-1)')
    if (users.length === 0) await createUser('demo-groom', 'Demo Groom', 'planner-demo-1')
    await createUser('demo-bride', 'Demo Bride', 'planner-demo-1')
    users = listUsers()
  }
  const [a, b] = users as [(typeof users)[0], (typeof users)[0]]

  const weddingDate = addDays(93)

  getDb().transaction(() => {
    updateSettings(a.id, {
      weddingName: 'Our Wedding',
      weddingDate,
      weddingLocation: 'Garden Hall, Bandung',
      groomName: 'Groom',
      brideName: 'Bride',
      currency: 'IDR',
      totalBudget: 100_000_000,
    })

    const t = (name: string) => categoryId('task_categories', name)
    createTask(a.id, { title: 'Pay venue deposit', priority: 'urgent', dueDate: addDays(1), categoryId: t('Venue'), assignedTo: a.id })
    createTask(b.id, { title: 'Finalize invitation design', priority: 'high', dueDate: addDays(6), categoryId: t('Invitation'), assignedTo: b.id })
    createTask(a.id, { title: 'Book photographer', priority: 'medium', dueDate: addDays(11), categoryId: t('Photography'), assignedTo: a.id, status: 'in_progress' })
    createTask(b.id, { title: 'Choose wedding dress', priority: 'high', dueDate: addDays(20), categoryId: t('Attire'), assignedTo: b.id })
    createTask(a.id, { title: 'Register marriage documents', priority: 'high', dueDate: addDays(-3), categoryId: t('Legal'), assignedTo: a.id })
    createTask(b.id, { title: 'Taste catering menu', priority: 'medium', dueDate: addDays(14), categoryId: t('Catering') })
    createTask(a.id, { title: 'Research honeymoon destinations', priority: 'low', categoryId: t('Honeymoon') })
    createTask(a.id, { title: 'Book venue', priority: 'urgent', dueDate: addDays(-20), categoryId: t('Venue'), assignedTo: a.id, status: 'completed' })

    const venue = createVendor(a.id, { name: 'Garden Hall', category: 'Venue', contactName: 'Mr. Venue', phone: '+62 811 0000 0001', quotedAmount: 35_000_000, status: 'booked' })
    const catering = createVendor(b.id, { name: 'Rasa Catering', category: 'Catering', contactName: 'Ibu Chef', phone: '+62 811 0000 0002', quotedAmount: 30_000_000, status: 'negotiating' })
    const photo = createVendor(a.id, { name: 'Lens & Light Studio', category: 'Photography', website: 'https://example.com', quotedAmount: 12_000_000, status: 'shortlisted' })
    createVendor(b.id, { name: 'Bloom Decor', category: 'Decoration', quotedAmount: 15_000_000, status: 'considering' })

    const bc = (name: string) => categoryId('budget_categories', name)
    createExpense(a.id, { description: 'Venue rental', categoryId: bc('Venue'), vendorId: venue.id, estimatedAmount: 35_000_000, actualAmount: 17_500_000, status: 'partial', paidBy: a.id, dueDate: addDays(1) })
    createExpense(b.id, { description: 'Catering for 300 pax', categoryId: bc('Catering'), vendorId: catering.id, estimatedAmount: 30_000_000, status: 'planned', dueDate: addDays(30) })
    createExpense(a.id, { description: 'Photo & video package', categoryId: bc('Photography'), vendorId: photo.id, estimatedAmount: 12_000_000, status: 'planned' })
    createExpense(b.id, { description: 'Wedding dress', categoryId: bc('Attire'), estimatedAmount: 8_000_000, actualAmount: 8_000_000, status: 'paid', paidBy: b.id })
    createExpense(a.id, { description: 'Printed invitations', categoryId: bc('Invitation'), estimatedAmount: 2_000_000, status: 'planned' })

    const guests: [string, string, number, 'attending' | 'pending' | 'declined', 'invited' | 'planned'][] = [
      ['Budi Santoso', 'Family', 2, 'attending', 'invited'],
      ['Siti Rahma', 'Family', 4, 'attending', 'invited'],
      ['Andi Wijaya', 'Friends', 1, 'pending', 'invited'],
      ['Dewi Lestari', 'Friends', 2, 'declined', 'invited'],
      ['Rina Putri', 'Work', 1, 'pending', 'planned'],
      ['Agus Pratama', 'Work', 2, 'pending', 'planned'],
    ]
    for (const [name, groupName, numberOfGuests, rsvpStatus, invitationStatus] of guests) {
      createGuest(b.id, { name, groupName, numberOfGuests, rsvpStatus, invitationStatus })
    }

    createTimelineEvent(a.id, { title: 'Send invitations', eventDate: addDays(30), category: 'Milestone' })
    createTimelineEvent(a.id, { title: 'Final guest count', eventDate: addDays(70), category: 'Milestone' })
    createTimelineEvent(b.id, { title: 'Final vendor payments', eventDate: addDays(85), category: 'Milestone' })
    createTimelineEvent(b.id, { title: 'Makeup', eventDate: weddingDate, startTime: '07:00', endTime: '09:30', category: 'Wedding day' })
    createTimelineEvent(b.id, { title: 'Ceremony', eventDate: weddingDate, startTime: '10:00', endTime: '11:00', location: 'Garden Hall', category: 'Wedding day' })
    createTimelineEvent(b.id, { title: 'Photos', eventDate: weddingDate, startTime: '11:00', endTime: '12:00', category: 'Wedding day' })
    createTimelineEvent(b.id, { title: 'Reception', eventDate: weddingDate, startTime: '12:00', endTime: '16:00', location: 'Garden Hall', category: 'Wedding day' })

    createNote(a.id, { title: 'Questions for venue', content: 'Parking capacity?\nOvertime fee?\nCan we bring our own decorator?' })
    createNote(b.id, { title: 'Decoration ideas', content: 'Soft neutral palette, eucalyptus, warm lighting.' })

    createDocument(a.id, { title: 'Shared planning folder', url: 'https://drive.google.com/', category: 'Folder' })
    createDocument(b.id, { title: 'Venue contract (draft)', url: 'https://example.com/contract', category: 'Contract' })
  })()

  console.log('Seeded sample data.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => database.close())
