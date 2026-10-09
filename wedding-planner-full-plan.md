# Private Wedding Planner — Full Implementation Plan

## 1. Project Overview

Build a private wedding-planning web application for exactly two users: the groom and his girlfriend.

The application should help both users collaboratively manage:

- Wedding tasks and checklist
- Wedding budget and expenses
- Guest list and RSVP status
- Vendors
- Wedding/planning timeline
- Notes
- Documents and useful links
- Activity history
- Wedding countdown
- Dashboard summaries

The application is intentionally small and private. Do **not** over-engineer it.

### Primary goals

1. Simple and pleasant to use.
2. Fast to develop and maintain.
3. Secure enough for private personal data.
4. Fully responsive, especially on phones.
5. Easy to deploy on a small Ubuntu VPS.
6. Use SQLite rather than a separate database server.
7. Only two authenticated users can access the application.

---

# 2. Required Technology Stack

## Frontend

- Vue 3
- TypeScript
- Vite
- Vue Router
- Pinia
- Vuetify
- Native `fetch` or Axios
- CSS where necessary

## Backend

- Node.js
- Express
- TypeScript
- SQLite
- `better-sqlite3`
- Zod for request validation
- Argon2 for password hashing
- Server-side sessions
- HTTP-only cookies

## Infrastructure

- Ubuntu VPS
- Nginx
- HTTPS with Let's Encrypt / Certbot
- PM2 for Node process management
- SQLite database file
- Cron/systemd timer for backups

Do not introduce unnecessary infrastructure.

Do NOT use:

- PostgreSQL
- MySQL
- MongoDB
- Redis
- GraphQL
- Microservices
- Kubernetes
- Separate authentication service
- JWT unless there is a compelling technical reason
- WebSockets unless a later feature genuinely requires them

---

# 3. Architecture

Use this architecture:

```text
                         Internet
                            |
                            v
                    +---------------+
                    |     Nginx     |
                    | HTTPS / TLS   |
                    +-------+-------+
                            |
                            | localhost
                            v
                    +---------------+
                    |    Express    |
                    |   REST API    |
                    +-------+-------+
                            |
             +--------------+--------------+
             |                             |
             v                             v
        +-----------+               +-------------+
        |  SQLite   |               | File Upload |
        | wedding.db|               |   Storage   |
        +-----------+               +-------------+

Browser
   |
   v
Vue SPA
   |
   | HTTP/JSON + session cookie
   v
Express API
```

The Vue application must never access SQLite directly.

SQLite must remain on the server.

Express should listen on `127.0.0.1`, not publicly on all interfaces.

---

# 4. Repository Structure

Use a monorepo:

```text
wedding-planner/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── composables/
│   │   ├── stores/
│   │   ├── services/
│   │   ├── router/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.vue
│   │   └── main.ts
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── db/
│   │   ├── validation/
│   │   ├── utils/
│   │   ├── types/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── data/
│   │   └── .gitkeep
│   ├── uploads/
│   │   └── .gitkeep
│   ├── package.json
│   └── tsconfig.json
│
├── shared/
│   └── types/
│
├── scripts/
│   ├── create-user.ts
│   └── backup-db.sh
│
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

Do not commit:

```text
.env
*.db
*.db-shm
*.db-wal
uploads/*
node_modules/
dist/
```

---

# 5. Application Pages

Create these routes:

```text
/login

/
/dashboard
/tasks
/budget
/guests
/vendors
/timeline
/notes
/documents
/activity
/settings
```

The root `/` should redirect to `/dashboard` when authenticated.

Unauthenticated users should be redirected to `/login`.

---

# 6. Main Layout

After login, use a common application layout:

```text
+-------------------------------------------------------+
| 💍 Our Wedding                         User Menu       |
+----------------+--------------------------------------+
| Dashboard      |                                      |
| Tasks          |                                      |
| Budget         |            Page Content              |
| Guests         |                                      |
| Vendors        |                                      |
| Timeline       |                                      |
| Notes          |                                      |
| Documents      |                                      |
| Activity       |                                      |
|                |                                      |
| Settings       |                                      |
+----------------+--------------------------------------+
```

On mobile, replace the permanent sidebar with a drawer/bottom navigation.

The UI should feel warm, elegant, clean, and personal without becoming visually complicated.

---

# 7. Authentication

There are exactly two users.

Do not implement public registration.

Users are created manually through a server-side script.

Example:

```text
npm run create-user
```

The script should ask for:

- username
- display name
- password

Passwords must be hashed using Argon2.

Never store plaintext passwords.

---

## 7.1 Users table

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## 7.2 Sessions

Use server-side sessions.

Recommended implementation:

- Express session middleware
- SQLite-backed session store if necessary
- HTTP-only cookie
- Secure cookie in production
- SameSite=Lax
- Reasonable session expiration

Do not store authentication tokens in localStorage.

Cookie configuration should be approximately:

```text
httpOnly: true
secure: true in production
sameSite: "lax"
```

---

## 7.3 Authentication API

```http
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### Login request

```json
{
  "username": "faris",
  "password": "..."
}
```

### Successful response

```json
{
  "user": {
    "id": 1,
    "username": "faris",
    "displayName": "Faris"
  }
}
```

### Invalid credentials

Return:

```text
401 Unauthorized
```

Use a generic error such as:

```text
Invalid username or password
```

Do not reveal whether the username exists.

---

# 8. Authentication Middleware

Create:

```text
requireAuth
```

All private API routes must use it.

Example:

```text
GET /api/tasks
       |
       v
requireAuth
       |
       +---- unauthenticated -> 401
       |
       +---- authenticated -> controller
```

Never trust user IDs supplied by the client when the current session already identifies the user.

Use the authenticated session user for `created_by`, activity logs, etc.

---

# 9. Database

Use SQLite.

Database location:

```text
server/data/wedding.db
```

Use `better-sqlite3`.

Enable:

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
```

Use prepared statements.

Use transactions for operations that modify multiple tables.

---

# 10. Database Schema

## 10.1 Users

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

# 11. Wedding Settings

There should be one wedding configuration.

```sql
CREATE TABLE wedding_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    wedding_name TEXT NOT NULL DEFAULT 'Our Wedding',
    wedding_date TEXT,
    wedding_location TEXT,
    groom_name TEXT,
    bride_name TEXT,
    currency TEXT NOT NULL DEFAULT 'IDR',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

The application should assume one row with `id = 1`.

Example:

```text
Wedding name: Our Wedding
Wedding date: 2027-01-10
Currency: IDR
```

---

# 12. Task Categories

```sql
CREATE TABLE task_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Seed initial categories:

```text
Venue
Catering
Decoration
Photography
Attire
Invitation
Legal
Transportation
Honeymoon
Finance
Other
```

---

# 13. Tasks

```sql
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo'
        CHECK (status IN ('todo', 'in_progress', 'completed')),
    priority TEXT NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category_id INTEGER,
    due_date TEXT,
    assigned_to INTEGER,
    created_by INTEGER NOT NULL,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (category_id) REFERENCES task_categories(id)
        ON DELETE SET NULL,

    FOREIGN KEY (assigned_to) REFERENCES users(id)
        ON DELETE SET NULL,

    FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE RESTRICT
);
```

Tasks must support:

- Create
- Read
- Update
- Delete
- Complete/reopen
- Assign to either user
- Priority
- Category
- Due date
- Description

---

# 14. Budget Categories

```sql
CREATE TABLE budget_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Seed:

```text
Venue
Catering
Decoration
Photography
Attire
Invitation
Transportation
Entertainment
Legal
Honeymoon
Other
```

---

# 15. Expenses

```sql
CREATE TABLE expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    vendor_id INTEGER,
    description TEXT NOT NULL,
    estimated_amount INTEGER NOT NULL DEFAULT 0,
    actual_amount INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'planned'
        CHECK (status IN ('planned', 'partial', 'paid', 'cancelled')),
    paid_by INTEGER,
    due_date TEXT,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (category_id) REFERENCES budget_categories(id)
        ON DELETE SET NULL,

    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
        ON DELETE SET NULL,

    FOREIGN KEY (paid_by) REFERENCES users(id)
        ON DELETE SET NULL,

    FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE RESTRICT
);
```

Important:

Store money as integer smallest currency units where appropriate.

For IDR, storing whole rupiah as an integer is fine:

```text
7500000
```

Do not store monetary values as floating-point numbers.

---

# 16. Guests

```sql
CREATE TABLE guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    group_name TEXT,
    relationship TEXT,
    invitation_status TEXT NOT NULL DEFAULT 'not_invited'
        CHECK (
            invitation_status IN (
                'not_invited',
                'planned',
                'invited'
            )
        ),
    rsvp_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (
            rsvp_status IN (
                'pending',
                'attending',
                'declined'
            )
        ),
    number_of_guests INTEGER NOT NULL DEFAULT 1,
    meal_preference TEXT,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE RESTRICT
);
```

Support:

- Search
- Filtering
- RSVP status
- Family/group
- Plus-one count
- Meal preference
- Notes

---

# 17. Vendors

```sql
CREATE TABLE vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    quoted_amount INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'considering'
        CHECK (
            status IN (
                'considering',
                'shortlisted',
                'negotiating',
                'booked',
                'completed',
                'cancelled'
            )
        ),
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE RESTRICT
);
```

---

# 18. Timeline Events

```sql
CREATE TABLE timeline_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    event_date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    location TEXT,
    category TEXT,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE RESTRICT
);
```

Support both:

1. Wedding-day events
2. Planning milestones

Examples:

```text
Book venue
Send invitations
Final guest count
Final vendor payment
Wedding ceremony
Reception
```

---

# 19. Notes

```sql
CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE RESTRICT
);
```

Keep the editor simple.

Do not build a Notion clone.

Plain text or basic Markdown is enough for v1.

---

# 20. Documents / Links

For the first version, support external links rather than complicated file management.

```sql
CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT,
    file_path TEXT,
    category TEXT,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE RESTRICT
);
```

Examples:

```text
Wedding venue contract
Photographer quotation
Catering quotation
Google Drive folder
Guest spreadsheet
Invitation design
```

File upload can be added later.

---

# 21. Activity Log

```sql
CREATE TABLE activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT
);
```

Examples:

```text
Faris added "Wedding photographer"
Girlfriend updated catering budget
Faris completed "Book venue"
Girlfriend added guest "Sarah"
```

Record activity for important create/update/delete/complete operations.

Do not log passwords or sensitive authentication data.

---

# 22. Database Indexes

Add indexes for frequently queried fields.

At minimum:

```sql
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);

CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_status ON expenses(status);

CREATE INDEX idx_guests_rsvp ON guests(rsvp_status);
CREATE INDEX idx_guests_group ON guests(group_name);

CREATE INDEX idx_timeline_date ON timeline_events(event_date);

CREATE INDEX idx_activity_created_at
ON activity_logs(created_at);
```

---

# 23. REST API

Use REST-style endpoints.

## Authentication

```http
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
```

## Wedding settings

```http
GET    /api/settings/wedding
PATCH  /api/settings/wedding
```

## Tasks

```http
GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/:id
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
```

Optional:

```http
PATCH /api/tasks/:id/complete
```

## Task categories

```http
GET    /api/task-categories
POST   /api/task-categories
PATCH  /api/task-categories/:id
DELETE /api/task-categories/:id
```

## Budget

```http
GET    /api/budget/summary
GET    /api/expenses
POST   /api/expenses
GET    /api/expenses/:id
PATCH  /api/expenses/:id
DELETE /api/expenses/:id
```

## Budget categories

```http
GET    /api/budget-categories
POST   /api/budget-categories
PATCH  /api/budget-categories/:id
DELETE /api/budget-categories/:id
```

## Guests

```http
GET    /api/guests
POST   /api/guests
GET    /api/guests/:id
PATCH  /api/guests/:id
DELETE /api/guests/:id
```

## Vendors

```http
GET    /api/vendors
POST   /api/vendors
GET    /api/vendors/:id
PATCH  /api/vendors/:id
DELETE /api/vendors/:id
```

## Timeline

```http
GET    /api/timeline
POST   /api/timeline
GET    /api/timeline/:id
PATCH  /api/timeline/:id
DELETE /api/timeline/:id
```

## Notes

```http
GET    /api/notes
POST   /api/notes
GET    /api/notes/:id
PATCH  /api/notes/:id
DELETE /api/notes/:id
```

## Documents

```http
GET    /api/documents
POST   /api/documents
GET    /api/documents/:id
PATCH  /api/documents/:id
DELETE /api/documents/:id
```

## Activity

```http
GET /api/activity
```

## Dashboard

```http
GET /api/dashboard
```

The dashboard endpoint can return aggregated data needed by the dashboard in one request.

---

# 24. API Response Format

Use a consistent format.

Successful single object:

```json
{
  "data": {
    "id": 1,
    "title": "Book venue"
  }
}
```

Successful collection:

```json
{
  "data": [],
  "meta": {
    "total": 0
  }
}
```

Error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": {}
  }
}
```

Use proper HTTP status codes.

---

# 25. Validation

Use Zod on the server.

Never trust frontend validation alone.

Validate:

- required strings
- dates
- times
- enum values
- numeric amounts
- IDs
- URLs
- guest counts
- usernames/passwords

Return `400 Bad Request` for invalid input.

---

# 26. Dashboard

The dashboard is the main page.

It should show:

## Wedding countdown

Example:

```text
Our Wedding

93 DAYS TO GO

10 January 2027
```

Calculate this dynamically from the wedding date.

Handle:

- days remaining
- wedding day
- past date

---

## Budget summary

Example:

```text
Budget

Rp 100,000,000 total
Rp 72,000,000 committed
Rp 48,000,000 paid

██████████████░░░░
```

Show:

- Total estimated budget
- Actual/committed amount
- Amount paid
- Remaining amount

---

## Guest summary

Example:

```text
Guests

150 invited
118 attending
21 pending
11 declined
```

---

## Upcoming tasks

Show the next 5-10 relevant tasks ordered by due date.

Highlight overdue tasks.

---

## Recent activity

Show the latest activity events.

Example:

```text
Faris completed "Book venue"
2 hours ago

Girlfriend updated catering budget
5 hours ago
```

---

# 27. Tasks Page

Features:

- List/table
- Add task
- Edit task
- Delete task
- Complete task
- Reopen task
- Assign user
- Priority
- Category
- Due date
- Search
- Status filter
- Category filter
- Assigned-user filter

Suggested UI:

```text
Tasks

[ + Add Task ]

Filters:
[All] [Mine] [Her Tasks] [Completed]

-------------------------------------
Task                 Due       Status
-------------------------------------
Book venue            Oct 12    ✓
Choose photographer   Oct 15    In progress
Send invitations      Nov 01    Todo
```

Overdue tasks should be visually obvious.

---

# 28. Budget Page

Show:

```text
Total Budget
Rp 100,000,000

Estimated
Rp 87,000,000

Paid
Rp 48,000,000

Remaining
Rp 39,000,000
```

Provide:

- Expense table
- Add expense
- Edit expense
- Delete expense
- Category
- Vendor
- Estimated amount
- Actual amount
- Payment status
- Who paid
- Due date
- Notes

Include a simple category breakdown.

Do not add a complicated chart library unless necessary.

---

# 29. Guests Page

Features:

- Add guest
- Edit guest
- Delete guest
- Search
- Filter by group
- Filter by RSVP
- Filter by invitation status

Display:

```text
Name
Group
Invitation
RSVP
Guests
Meal
```

Summary cards:

```text
Total
Invited
Attending
Pending
Declined
```

---

# 30. Vendors Page

Display:

```text
Vendor
Category
Quoted Price
Status
Contact
```

Statuses:

```text
Considering
Shortlisted
Negotiating
Booked
Completed
Cancelled
```

Allow clicking a vendor to view/edit details.

---

# 31. Timeline Page

Support two views if practical:

### Planning timeline

```text
October
│
├── Book venue
├── Choose photographer
└── Finalize invitation

November
│
├── Send invitations
└── Confirm catering

January
│
└── Wedding Day ❤️
```

### Wedding day schedule

```text
09:00  Makeup
11:00  Ceremony
12:00  Photos
13:00  Reception
17:00  End
```

A simple chronological list is acceptable for v1.

---

# 32. Notes Page

Show note cards/list.

Features:

- Create
- Edit
- Delete
- Search
- Simple editor

Examples:

```text
Questions for Venue

Wedding Ideas

Decoration Ideas

Honeymoon Ideas
```

---

# 33. Documents Page

Support:

- external URLs
- optional uploaded files later
- category
- description
- created date

For v1, prioritize external links.

---

# 34. Activity Page

Show a chronological activity feed.

Example:

```text
Today

10:32
Faris
Completed "Book venue"

09:15
Girlfriend
Updated catering budget

Yesterday

16:42
Faris
Added guest "Budi"
```

Pagination is optional initially.

---

# 35. Settings Page

Settings should contain:

## Wedding

- Wedding name
- Wedding date
- Location
- Bride name
- Groom name
- Currency

## Account

- Current username
- Display name
- Change password
- Logout

Do not allow public user registration.

---

# 36. Frontend State Management

Use Pinia where global state is useful.

Recommended stores:

```text
authStore
weddingStore
```

Do not put every CRUD entity into Pinia.

For tasks/guests/vendors/etc., fetch data at the page level unless there is a clear reason to globally cache it.

Keep state management simple.

---

# 37. Frontend Services

Create API service modules:

```text
services/
├── api.ts
├── auth.ts
├── dashboard.ts
├── tasks.ts
├── budget.ts
├── guests.ts
├── vendors.ts
├── timeline.ts
├── notes.ts
├── documents.ts
└── activity.ts
```

Example:

```ts
export async function getTasks() {
  const response = await api.get('/api/tasks')
  return response.data
}
```

Keep HTTP details out of components where practical.

---

# 38. Vue Components

Create reusable components such as:

```text
AppLayout
AppSidebar
AppHeader
LoadingState
EmptyState
ErrorState
ConfirmDialog
PageHeader
StatCard
DataTable
StatusChip
UserAvatar
TaskForm
ExpenseForm
GuestForm
VendorForm
TimelineEventForm
```

Avoid duplicating modal/form patterns across pages.

---

# 39. UX Requirements

The application should be:

- Mobile responsive
- Desktop friendly
- Fast
- Simple
- Accessible
- Easy to understand without documentation

Important states:

1. Loading
2. Empty
3. Error
4. Success
5. Confirmation before destructive actions

For delete actions, show a confirmation dialog.

Example:

```text
Delete "Book photographer"?

This cannot be undone.

[Cancel] [Delete]
```

---

# 40. Error Handling

Backend:

- Central Express error handler
- Never expose stack traces in production
- Log useful server-side errors
- Return safe messages to client

Frontend:

- Show friendly errors
- Don't silently fail
- Provide retry where appropriate

Example:

```text
Couldn't load your tasks.

[Try Again]
```

---

# 41. Security Requirements

Implement:

- HTTPS
- HTTP-only authentication cookie
- Secure cookies in production
- SameSite=Lax
- Argon2 password hashing
- Server-side authentication checks
- Zod validation
- Parameterized SQL queries
- Foreign key constraints
- Rate limiting on login
- No plaintext passwords
- No secrets in Git
- No database file in public directory
- No stack traces in production responses

Consider:

- Helmet
- CORS configuration
- Request body size limits

Because the frontend and API are served from the same domain, avoid unnecessary CORS complexity.

---

# 42. Login Rate Limiting

The login endpoint should be rate-limited.

Example policy:

```text
Maximum 5 failed attempts
per IP within a short time window
```

Use a lightweight in-memory rate limiter initially.

If the application later runs behind multiple instances, use another approach.

For the current single-process VPS deployment, keep it simple.

---

# 43. Nginx Deployment

Production architecture:

```text
https://wedding.example.com
          |
          v
        Nginx
       /     \
      /       \
 Vue static   /api/*
 files            |
                  v
              Express
              127.0.0.1:3000
```

Nginx should:

- terminate HTTPS
- serve Vue static files
- proxy `/api/` to Express
- optionally serve uploaded files through a controlled route

Do not expose port 3000 publicly.

---

# 44. Express Production Configuration

Example:

```text
HOST=127.0.0.1
PORT=3000
NODE_ENV=production
```

Start with PM2:

```bash
pm2 start server/dist/server.js --name wedding-planner
pm2 save
pm2 startup
```

The exact commands may differ depending on the final build setup.

---

# 45. Build Process

Development:

```bash
npm install
npm run dev
```

Production:

```bash
npm run build
```

Expected:

```text
client/dist/
server/dist/
```

Nginx serves:

```text
client/dist/
```

PM2 runs:

```text
server/dist/server.js
```

---

# 46. Environment Variables

Create:

```text
.env.example
```

Example:

```env
NODE_ENV=development

PORT=3000
HOST=127.0.0.1

DATABASE_PATH=./data/wedding.db

SESSION_SECRET=replace-this-with-a-long-random-secret

UPLOAD_DIR=./uploads
```

Do not commit the actual `.env`.

Generate a strong session secret.

---

# 47. Backup Strategy

The SQLite database is extremely important.

Create automated backups.

Recommended:

```text
Daily:
    SQLite backup
        |
        v
    /backups/wedding/
        |
        v
    Remote storage
```

Use SQLite's backup mechanism rather than blindly copying a live database if possible.

Keep multiple historical backups.

Example retention:

```text
Daily: 14 days
Weekly: 8 weeks
Monthly: 12 months
```

At minimum, maintain:

- current local backup
- remote backup

Do not rely exclusively on the VPS.

---

# 48. Git Workflow

Use Git.

Suggested commits:

```text
feat(auth): add session authentication
feat(tasks): add task management
feat(budget): add expense tracking
feat(guests): add guest management
feat(vendors): add vendor management
feat(timeline): add wedding timeline
feat(dashboard): add wedding dashboard
fix(auth): handle expired sessions
```

Keep `.env`, database files, uploads, and build output out of Git.

---

# 49. Testing

Do not aim for massive test coverage.

At minimum test:

## Authentication

- valid login
- invalid login
- logout
- protected routes
- expired/invalid session

## Tasks

- create
- update
- delete
- complete
- filtering

## Budget

- create expense
- update expense
- totals
- category relationship

## Guests

- create
- update
- RSVP status

## Dashboard

- correct aggregates
- countdown

Use unit/integration tests where practical.

---

# 50. Seed Data

Create a development seed script.

Example:

```text
2 users

Task categories
Budget categories

Sample tasks
Sample vendors
Sample expenses
Sample guests
Sample timeline events
```

Never put real wedding information into the repository.

---

# 51. Database Migrations

Do not manually alter production tables without a migration mechanism.

Create a simple migration system:

```text
server/src/db/migrations/
├── 001_initial.sql
├── 002_add_documents.sql
└── 003_add_activity_logs.sql
```

Maintain a migrations table:

```sql
CREATE TABLE migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

The application should run pending migrations on startup or via an explicit migration command.

For example:

```bash
npm run db:migrate
```

Prefer an explicit migration command in production.

---

# 52. Important Database Rules

Use foreign keys.

Use transactions where needed.

Use prepared statements.

Do not construct SQL with raw user-provided strings.

Bad:

```ts
db.prepare(`SELECT * FROM guests WHERE name = '${name}'`)
```

Good:

```ts
db.prepare('SELECT * FROM guests WHERE name = ?').all(name)
```

---

# 53. API Query Features

For collections, support simple query parameters.

Tasks:

```text
GET /api/tasks?status=todo
GET /api/tasks?assignedTo=1
GET /api/tasks?categoryId=2
GET /api/tasks?search=venue
```

Guests:

```text
GET /api/guests?search=ahmad
GET /api/guests?rsvp=attending
GET /api/guests?group=family
```

Vendors:

```text
GET /api/vendors?status=booked
GET /api/vendors?search=photo
```

Do not build a complicated query language.

---

# 54. Pagination

For a wedding application, most tables will remain relatively small.

Do not over-engineer pagination initially.

However, structure APIs so pagination can be added later.

For example:

```text
?page=1&limit=50
```

Use a reasonable maximum such as 100.

---

# 55. File Uploads

Do not make file uploads part of the initial MVP unless needed.

If implemented later:

- Restrict file types
- Restrict file size
- Generate safe filenames
- Never use the original filename as a filesystem path
- Store metadata in SQLite
- Store files outside the public frontend directory
- Require authentication to download
- Do not allow arbitrary executable files

---

# 56. Mobile Design

The application will likely be used from phones while planning the wedding.

Prioritize:

- Large touch targets
- Bottom navigation or drawer
- Simple forms
- Easy task completion
- Easy guest search
- Quick expense entry
- Responsive tables

For tables on mobile, consider converting rows into cards.

---

# 57. Visual Design

Use a tasteful wedding aesthetic, but avoid excessive decoration.

Suggested style:

- warm neutral background
- white cards
- subtle shadows
- rounded corners
- elegant typography
- restrained accent color
- clear status colors
- lots of whitespace

The interface should feel like a modern productivity application with a subtle wedding identity.

Do not make every component pink, floral, or overly decorative.

---

# 58. Dashboard Example

Conceptually:

```text
┌─────────────────────────────────────────────┐
│ 💍 Our Wedding                    Faris ▾   │
├─────────────────────────────────────────────┤
│                                             │
│              OUR WEDDING                    │
│                                             │
│                 93 DAYS                     │
│                 TO GO                       │
│                                             │
├───────────────┬───────────────┬─────────────┤
│ Budget        │ Guests        │ Tasks       │
│ Rp 72M        │ 118           │ 8 remaining │
│ / Rp 100M     │ attending     │ 3 overdue   │
├───────────────┴───────────────┴─────────────┤
│                                             │
│ Upcoming Tasks                              │
│                                             │
│ 🔴 Pay venue deposit             Tomorrow   │
│ 🟡 Finalize invitation           Oct 15     │
│ 🟢 Book photographer             Oct 20     │
│                                             │
├─────────────────────────────────────────────┤
│ Recent Activity                             │
│                                             │
│ Faris completed "Book venue"                │
│ Girlfriend updated catering budget         │
│                                             │
└─────────────────────────────────────────────┘
```

---

# 59. Implementation Order

Implement in this exact order.

## Phase 1 — Project foundation

Create:

- Monorepo
- Vue app
- Express app
- TypeScript
- SQLite
- Environment configuration
- Basic development scripts

Verify:

```text
Vue -> Express -> SQLite
```

works.

---

## Phase 2 — Database

Implement:

- migration system
- users
- wedding_settings
- task_categories
- tasks
- budget_categories
- vendors
- expenses
- guests
- timeline_events
- notes
- documents
- activity_logs

Run migrations successfully.

---

## Phase 3 — Authentication

Implement:

- Argon2
- user creation script
- login
- logout
- session
- `/me`
- authentication middleware
- frontend auth store
- route guard

Verify only authenticated users can access private pages/API.

---

## Phase 4 — Application shell

Implement:

- AppLayout
- sidebar
- mobile navigation
- header
- user menu
- login page
- loading/error states

---

## Phase 5 — Tasks

Build complete CRUD.

This establishes the reusable CRUD architecture for the rest of the application.

---

## Phase 6 — Budget

Build:

- categories
- expenses
- summary
- payment status
- vendor relationship
- dashboard totals

---

## Phase 7 — Guests

Build:

- guest CRUD
- search
- filters
- RSVP
- invitation status
- guest count

---

## Phase 8 — Vendors

Build:

- vendor CRUD
- status
- contact information
- quoted price
- notes
- relationship to expenses

---

## Phase 9 — Timeline

Build:

- planning milestones
- wedding day events
- chronological display

---

## Phase 10 — Notes/Documents

Build:

- notes
- external document links

Add file upload only if actually needed.

---

## Phase 11 — Dashboard

Integrate:

- countdown
- budget summary
- guest summary
- task summary
- upcoming tasks
- recent activity

---

## Phase 12 — Activity log

Add activity logging to all important mutations.

---

## Phase 13 — Security hardening

Implement:

- Helmet
- login rate limiting
- secure cookies
- validation
- safe errors
- production environment configuration
- proper Nginx configuration

---

## Phase 14 — Testing

Test all major functionality.

---

## Phase 15 — Deployment

Deploy to VPS:

```text
Nginx
  ↓
Vue
  ↓
Express
  ↓
SQLite
```

Configure:

- HTTPS
- PM2
- firewall
- backups
- restart on boot

---

# 60. MVP Definition

The first production release is complete when both users can:

### Authentication

- Login
- Logout
- Stay logged in
- Change password

### Dashboard

- See wedding countdown
- See budget
- See guests
- See upcoming tasks
- See recent activity

### Tasks

- Add
- Edit
- Delete
- Complete
- Assign
- Filter

### Budget

- Add expenses
- Edit expenses
- Track paid/unpaid
- Track who paid
- View totals

### Guests

- Add
- Edit
- Delete
- Search
- Track invitation
- Track RSVP

### Vendors

- Add
- Edit
- Delete
- Track status
- Track quoted price

### Timeline

- Add
- Edit
- Delete
- View chronologically

### Notes

- Add
- Edit
- Delete

### Documents

- Store useful external links

### Activity

- See important changes made by either person

---

# 61. Nice-to-Have Features for Later

Do not implement these before the MVP works.

Potential future features:

- Calendar view
- Drag-and-drop task ordering
- Recurring tasks
- Expense attachments
- File uploads
- Guest seating arrangement
- Table assignment
- Invitation tracking
- QR RSVP
- Wedding-day checklist
- Vendor payment schedules
- Automatic reminders
- Email notifications
- Telegram notifications
- WhatsApp integration
- PWA/mobile installation
- Offline support
- Advanced charts
- Search across all modules
- AI wedding assistant
- Export to CSV
- PDF reports
- Printable guest list
- Printable wedding-day schedule

---

# 62. Future AI Integration

If AI is eventually added, keep it separate from the core application.

Possible features:

```text
"How much have we spent on photography?"

"What tasks are overdue?"

"What should we finish this week?"

"Show me vendors that haven't been booked."

"How much budget remains?"
```

The AI should access application data through controlled backend tools.

Do not give an AI model unrestricted access to the SQLite database.

This is a future feature, not part of MVP.

---

# 63. Performance

This application is tiny compared with normal business applications.

Optimize for simplicity rather than extreme performance.

SQLite is sufficient for two users.

Use:

- indexed queries
- prepared statements
- reasonable API responses
- client-side loading states
- no unnecessary polling

Do not introduce Redis or a separate database.

---

# 64. VPS Resource Considerations

The application should work comfortably on a small VPS.

Avoid:

- large Node dependencies
- unnecessary background services
- heavy server-side rendering
- multiple Node processes
- large databases
- unnecessary Docker containers

The expected architecture is:

```text
Nginx
Node/Express
SQLite
PM2
```

This should have a small resource footprint.

---

# 65. Production Checklist

Before going live:

```text
[ ] HTTPS works
[ ] HTTP redirects to HTTPS
[ ] Express is not publicly exposed
[ ] Login works
[ ] Logout works
[ ] Only authenticated users can access API
[ ] Passwords are Argon2 hashed
[ ] Secure cookie enabled
[ ] .env is not committed
[ ] SQLite is outside public directory
[ ] SQL queries are parameterized
[ ] Zod validation works
[ ] Login rate limiting enabled
[ ] Production errors don't expose stack traces
[ ] PM2 configured
[ ] PM2 starts on reboot
[ ] Database backups configured
[ ] Remote backups configured
[ ] Nginx configured
[ ] Firewall configured
[ ] Database migrations tested
[ ] Mobile layout tested
[ ] Desktop layout tested
[ ] Delete confirmations work
[ ] Empty states work
[ ] Loading states work
[ ] Error states work
```

---

# 66. Developer Experience

Provide these scripts where appropriate:

```bash
npm run dev
npm run build
npm run start
npm run db:migrate
npm run db:seed
npm run create-user
npm run test
```

Root scripts may delegate to `client` and `server`.

Document setup in `README.md`.

---

# 67. README Requirements

The README should explain:

1. Project overview
2. Tech stack
3. Requirements
4. Installation
5. Environment variables
6. Database migration
7. Creating users
8. Running development server
9. Building production
10. Running production
11. Backup
12. Deployment
13. Nginx configuration
14. PM2 configuration

---

# 68. Important Development Rules

Follow these rules while implementing:

1. Prefer simple code over abstraction-heavy code.
2. Do not create unnecessary layers.
3. Keep controllers thin.
4. Put business logic in services.
5. Keep SQL/database access in the database/repository layer.
6. Validate all external input.
7. Use TypeScript throughout.
8. Avoid `any` unless genuinely unavoidable.
9. Use proper HTTP status codes.
10. Keep frontend API calls in service modules.
11. Do not put secrets in source code.
12. Do not expose SQLite publicly.
13. Do not use localStorage for authentication tokens.
14. Do not implement registration.
15. Do not add technologies that are not necessary.
16. Make the application responsive from the beginning.
17. Make destructive operations require confirmation.
18. Record important user actions in the activity log.
19. Use transactions for multi-step database operations.
20. Keep the application easy for one developer to maintain.

---

# 69. Claude AI Implementation Instructions

You are the implementation agent for this project.

Build the application according to this specification.

## Priority

Correctness and simplicity are more important than adding extra features.

Do not skip core requirements.

Do not replace the specified stack with another stack.

Do not introduce unnecessary infrastructure.

## Implementation strategy

Implement incrementally:

```text
Foundation
    ↓
Database
    ↓
Authentication
    ↓
Application shell
    ↓
Tasks
    ↓
Budget
    ↓
Guests
    ↓
Vendors
    ↓
Timeline
    ↓
Notes/Documents
    ↓
Dashboard
    ↓
Activity
    ↓
Security hardening
    ↓
Testing
    ↓
Deployment documentation
```

After each major phase:

1. Verify TypeScript compilation.
2. Verify the application starts.
3. Verify the relevant functionality.
4. Fix errors before moving on.

Do not leave the repository in a knowingly broken state.

---

# 70. Claude AI Acceptance Criteria

The implementation is considered successful when:

```text
1. `npm install` works.
2. Development servers start successfully.
3. Vue loads successfully.
4. Express API loads successfully.
5. SQLite database initializes successfully.
6. Database migrations work.
7. Two users can be created.
8. Users can log in.
9. Authentication persists through an HTTP-only cookie.
10. Unauthenticated users cannot access private pages.
11. Unauthenticated users cannot access private APIs.
12. Tasks CRUD works.
13. Budget CRUD and calculations work.
14. Guests CRUD works.
15. Vendors CRUD works.
16. Timeline CRUD works.
17. Notes CRUD works.
18. Documents CRUD works.
19. Dashboard displays real database data.
20. Activity logging works.
21. Mobile UI works.
22. Production build works.
23. Nginx deployment is documented.
24. PM2 deployment is documented.
25. SQLite backup procedure is documented.
```

---

# 71. Final Product Vision

The finished application should feel like a private shared workspace for two people planning their wedding.

The primary experience should be:

```text
Open website
      ↓
Login
      ↓
See wedding countdown
      ↓
See what needs attention
      ↓
Update tasks / budget / guests
      ↓
Everything is automatically saved
      ↓
Partner can see the changes
```

The application should remain intentionally small and maintainable.

The most important principle is:

> Build a reliable private wedding planner, not a generic enterprise project-management platform.

Start with the MVP, make it polished and reliable, and only add advanced features after the core workflow works well.
