# PK-Portal

Client & Admin portal for Peak Processing Ltd — managing user seats, billing, and access requests.

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (via `pg`)
- **Auth:** JWT (8h expiry, unified login)
- **Deployment:** Docker + Kubernetes (Traefik ingress)

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+

### Local Development

```bash
# 1. Clone and install
git clone https://github.com/UnicornWranglr/pk-portal.git
cd pk-portal

cd server && npm install
cd ../client && npm install

# 2. Set up database
cd ../server
cp .env.example .env
# Edit .env with your PostgreSQL connection string

# 3. Run migrations and seed
npm run migrate
npm run seed

# 4. Start dev servers (two terminals)
npm run dev          # Express on :3001
cd ../client && npm run dev   # Vite on :5173 (proxies /api to :3001)
```

### Docker Compose

```bash
docker-compose up --build
# App: http://localhost:3001
```

### Seed Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@peakprocessing.com | admin123 | Admin |
| jane@acme-energy.com | client123 | Client (Acme Energy) |
| tom@geosurvey.co.uk | client123 | Client (GeoSurvey Ltd) |

## Features

### Client Portal
- View assigned users (seat type, project, office license status)
- Submit requests to add, remove, or change user seat types
- Office license toggle, project assignment, start/end dates
- In-app notifications when requests are actioned/rejected

### Admin Portal
- Manage clients (full CRUD) and their users (inline editing)
- Request queue — action or reject with admin notes
- Billing engine — fair-use calculation with daily/monthly rate capping
- Billing config editor (all rates stored in DB, not hardcoded)
- Generate billing periods with line-item breakdown and CSV export
- Full audit trail / activity log with filters and pagination
- Project management per client

### Auth & Security
- Unified login (email determines admin vs client routing)
- JWT with 8h expiry, client-side expiry validation
- Client data isolation enforced at middleware level
- All mutations logged to audit trail with IP tracking

## Project Structure

```
pk-portal/
├── client/                  # React + Vite frontend
│   └── src/
│       ├── components/      # Layouts, NotificationBell
│       ├── context/         # AuthContext
│       ├── pages/admin/     # Admin portal pages
│       └── pages/portal/    # Client portal pages
├── server/
│   ├── db/migrations/       # SQL migration files
│   ├── middleware/           # JWT auth, client scope
│   ├── routes/              # Express route handlers
│   └── services/            # Billing engine, audit logger
├── k8s/                     # Kubernetes manifests
├── Dockerfile               # Multi-stage build
└── docker-compose.yml       # Local dev stack
```

## Changelog

### v1.3.0 — Patch Run 2: Kingdom Refactor
- Kingdom is now an add-on flag (`kingdom_license`) rather than a user type
- User types simplified to standard and GPU only
- Kingdom usage tracking: per-day calendar view on admin user detail
- Manual toggle of usage days with audit logging
- Kingdom log file import (CSV/Excel) with preview, user matching, and unmatched flagging
- Billing engine refactored: kingdom charges calculated from actual usage days
- Paused user status: excluded from all billing calculations
- Request form: Kingdom License toggle with helper text (separate from seat type)
- Admin requests show kingdom license flag in details

### v1.2.0 — Patch Run 1
- Unified login page (no separate admin/client login)
- Token expiry validation on page load
- Office license field on user requests
- Project assignment (per-client project lists, toggleable on requests)
- Start date for add requests
- "Approved" renamed to "Actioned" throughout
- Client notes visible on admin request queue
- Admin notes field on action/reject
- In-app notification system (bell icon, polling, mark read)
- Admin client detail: full CRUD, inline user editing, projects tab
- Removed admin direct-add user (requests-only flow)
- Comprehensive README

### v1.1.0 — Audit Trail
- Full audit trail logging all mutations across both portals
- Activity Log admin page with filters and pagination

### v1.0.0 — Initial Release
- Admin portal (clients, users, request queue, billing config)
- Client portal (view users, submit requests)
- Billing engine with fair-use calculation
- JWT auth (admin + client scopes)
- Docker + K8s deployment manifests
