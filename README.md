# FeeFlow Backend

Production-ready REST API for **FeeFlow**, an Extra Curricular Activity Fee Management SaaS.
Built with Node.js, Express, MongoDB/Mongoose, following an MVC + service-layer architecture.

## Tech Stack

Node.js · Express · MongoDB/Mongoose · JWT · bcryptjs · Zod · Winston · Helmet · CORS ·
express-rate-limit · Multer · PDFKit (receipts) · ExcelJS (exports) · Swagger.

## Getting Started

```bash
cp .env.example .env      # then edit values as needed
npm install
npm run seed               # wipes and seeds the database (20 students, 7 activities, payments...)
npm run dev                 # starts the API with nodemon
```

The API listens on `http://localhost:5000` by default, namespaced under `/api/v1`.
Interactive API docs (Swagger UI) are served at `http://localhost:5000/api-docs`.

Seeded logins:
- **Admin**: `admin@feeflow.app` / `Admin@12345`
- **Staff**: `staff@feeflow.app` / `Staff@12345`

(Change `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env` before seeding to customize the admin account.)

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon (auto-restart) |
| `npm start` | Start in production mode |
| `npm run seed` | Clear and reseed the database with sample data |
| `npm run seed:destroy` | Clear all collections without reseeding |

## Project Structure

```
src/
├── config/        # env, db connection, logger, swagger
├── constants/      # roles, statuses, enums
├── controllers/    # thin HTTP layer, calls services
├── middleware/      # auth, role guard, validation, error handling, uploads, rate limiting
├── models/          # Mongoose schemas
├── routes/          # Express routers per resource
├── seed/             # seed scripts + sample data generators
├── services/         # business logic (the "M" behind the "C")
├── utils/            # ApiError, apiResponse, pagination, jwt, id generation, date helpers
├── docs/              # Swagger/OpenAPI path annotations
├── app.js
└── server.js
```

## Authentication

JWT access + refresh tokens. `POST /auth/login` returns both; send the access token as
`Authorization: Bearer <token>` on protected routes. `POST /auth/refresh` exchanges a valid
refresh token for a new pair (refresh tokens are hashed and stored per-user so they can be
revoked on logout/password change).

Roles: `admin` (full access, including delete operations and settings) and `staff`
(day-to-day operations: students, payments, monthly tracker).

## Core Business Rules

- **Receipt numbers** are generated atomically via a Mongo counter document
  (`RCT-100000`, `RCT-100001`, ...) — never reused, never duplicated, even under concurrent requests.
- **Duplicate payment prevention**: a payment cannot be recorded for a student/activity/month/year
  combination that is already fully paid.
- **Multi-month payments** are supported in one request; the paid amount is distributed across
  the selected months (remainder absorbed by the first month) and each month's status is
  recomputed independently.
- **Partial payments**: a month is `partial` once its paid amount crosses the configurable
  `partialPaymentPercentage` threshold (see Settings); below that it still reads as `pending`.
- **Outstanding balance** = sum of (amount − paidAmount) across all `pending`/`partial` months
  that are due (month ≤ current month).
- **Collection %** = students fully paid for the current month ÷ total tracked students.
- **Student status** (`active` / `overdue`) is recomputed after every payment or reversal based
  on whether any due month is still unpaid.

## API Surface

All responses follow a consistent envelope:

```json
{ "success": true, "message": "...", "data": {} }
{ "success": false, "message": "...", "errors": [] }
```

| Resource | Base path |
|---|---|
| Auth | `/api/v1/auth` |
| Dashboard | `/api/v1/dashboard` |
| Students | `/api/v1/students` |
| Activities | `/api/v1/activities` |
| Payments | `/api/v1/payments` |
| Monthly Tracker | `/api/v1/monthly-tracker` |
| Reports | `/api/v1/reports` (supports `?format=json\|pdf\|excel\|csv`) |
| Settings | `/api/v1/settings` |
| Users (admin) | `/api/v1/users` |

Full parameter/schema documentation lives in Swagger UI (`/api-docs`).

## Docker

```bash
docker compose up --build
```

Spins up MongoDB and the API together. Run `npm run seed` against the container's Mongo URI
(or exec into the `api` container) to load sample data.

## Security

Helmet, CORS allow-list, per-route rate limiting (tighter on `/auth/*`), bcrypt password hashing,
Mongo query sanitization, XSS input sanitization, and Zod validation on every mutating request.

## Frontend Integration

Designed to serve the `feeflow` React app in the sibling directory — resource field names
mirror `feeflow/src/types/index.ts` and `feeflow/src/data/school-data.ts` (the frontend's
static prototype data), so swapping the frontend's mock data layer for real `fetch` calls
against this API is a drop-in change. Set `CORS_ORIGIN` to the frontend's dev server URL
(default `http://localhost:5173`).
