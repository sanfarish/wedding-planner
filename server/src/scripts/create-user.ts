/**
 * Creates one of the two planner accounts.
 *   npm run create-user
 * Prompts for username, display name and password (entered twice).
 * Also works with piped input, one answer per line.
 */
import readline from 'node:readline'
import { Writable } from 'node:stream'
import { config } from '../config.js'
import { openDatabase } from '../db/connection.js'
import { setDb } from '../db/index.js'
import { runMigrations } from '../db/migrate.js'
import { createUser } from '../services/auth.js'
import { countUsers, MAX_USERS } from '../services/users.js'
import { newUserSchema } from '../validation/auth.js'

const interactive = Boolean(process.stdin.isTTY)
let muted = false

const output = new Writable({
  write(chunk, encoding, callback) {
    if (!muted) process.stdout.write(chunk, encoding)
    callback()
  },
})

const rl = readline.createInterface({ input: process.stdin, output, terminal: interactive })
const lines = rl[Symbol.asyncIterator]()

async function ask(question: string, hidden = false): Promise<string> {
  process.stdout.write(question)
  muted = hidden && interactive
  const { value, done } = await lines.next()
  muted = false
  if (hidden || !interactive) process.stdout.write('\n')
  if (done) throw new Error('Input ended unexpectedly')
  return String(value).trim()
}

async function main(): Promise<void> {
  const db = openDatabase(config.databasePath)
  setDb(db)
  runMigrations(db)

  try {
    const existing = countUsers()
    if (existing >= MAX_USERS) {
      console.error(`This planner already has ${MAX_USERS} users. No more accounts can be created.`)
      process.exitCode = 1
      return
    }

    console.log(`Creating user ${existing + 1} of ${MAX_USERS}\n`)
    const username = await ask('Username: ')
    const displayName = await ask('Display name: ')
    const password = await ask('Password (min 10 characters): ', true)
    const confirm = await ask('Confirm password: ', true)

    if (password !== confirm) {
      console.error('Passwords do not match.')
      process.exitCode = 1
      return
    }

    const parsed = newUserSchema.safeParse({ username, displayName, password })
    if (!parsed.success) {
      for (const issue of parsed.error.issues) console.error(`  ${issue.path.join('.')}: ${issue.message}`)
      process.exitCode = 1
      return
    }

    const user = await createUser(parsed.data.username, parsed.data.displayName, parsed.data.password)
    console.log(`\nCreated user "${user.username}" (${user.displayName}).`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(message.includes('UNIQUE') ? 'That username is already taken.' : message)
    process.exitCode = 1
  } finally {
    rl.close()
    db.close()
  }
}

void main()
