# FeeFlow Backend — API Reference

Base URL: `http://localhost:5000/api/v1` (adjust host/port per your `.env`)

All endpoints except `/auth/register`, `/auth/login`, `/auth/refresh`, and `/health` require:

```
Authorization: Bearer <accessToken>
```

**Response envelope** (all endpoints):

```json
// success
{ "success": true, "message": "...", "data": {}, "meta": { "...pagination if a list" } }
// error
{ "success": false, "message": "...", "errors": [] }
```

Seeded accounts (after `npm run seed`):

| Role  | Email                | Password       |
|-------|-----------------------|----------------|
| admin | admin@feeflow.app      | Admin@12345    |
| staff | staff@feeflow.app      | Staff@12345    |

---

## Auth (`/auth`)

### Register
`POST /auth/register`
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Admin",
    "email": "newadmin@feeflow.app",
    "password": "Password123",
    "role": "staff"
  }'
```
`role` optional (`admin` | `staff`, default `staff`).

### Login
`POST /auth/login`
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@feeflow.app", "password": "Admin@12345"}'
```
Returns `data.accessToken` (15m) and `data.refreshToken` (7d).

### Refresh token
`POST /auth/refresh`
```bash
curl -X POST http://localhost:5000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<refreshToken>"}'
```

### Logout
`POST /auth/logout` — protected
```bash
curl -X POST http://localhost:5000/api/v1/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

### Get current user
`GET /auth/me` — protected
```bash
curl http://localhost:5000/api/v1/auth/me -H "Authorization: Bearer $TOKEN"
```

### Change password
`POST /auth/change-password` — protected
```bash
curl -X POST http://localhost:5000/api/v1/auth/change-password \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"currentPassword": "Admin@12345", "newPassword": "NewPassw0rd"}'
```

---

## Students (`/students`)

### List students
`GET /students` — protected
Query params: `search`, `standard`, `section`, `activityId`, `status` (`active|inactive|overdue`), `outstanding` (`true|false`), `page`, `limit`, `sortBy`, `sortOrder`
```bash
curl "http://localhost:5000/api/v1/students?search=Riya&status=active&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### Get student
`GET /students/:id` — protected
```bash
curl http://localhost:5000/api/v1/students/<studentId> -H "Authorization: Bearer $TOKEN"
```

### Create student
`POST /students` — admin/staff, `multipart/form-data` (photo upload optional)
```bash
curl -X POST http://localhost:5000/api/v1/students \
  -H "Authorization: Bearer $TOKEN" \
  -F "admissionNo=ADM2001" \
  -F "name=Aarav Mehta" \
  -F "standard=5th" \
  -F "section=A" \
  -F "gender=M" \
  -F "dob=2015-06-10" \
  -F "parentName=Rohit Mehta" \
  -F "phone=9876543210" \
  -F "email=aarav.parent@example.com" \
  -F "address=12 MG Road, Chennai" \
  -F "activities[]=<activityId1>" \
  -F "activities[]=<activityId2>" \
  -F "photo=@/path/to/photo.jpg"
```
JSON body shape (if not uploading a photo, `Content-Type: application/json` works too):
```json
{
  "admissionNo": "ADM2001",
  "name": "Aarav Mehta",
  "standard": "5th",
  "section": "A",
  "gender": "M",
  "dob": "2015-06-10",
  "parentName": "Rohit Mehta",
  "phone": "9876543210",
  "email": "aarav.parent@example.com",
  "address": "12 MG Road, Chennai",
  "activities": ["<activityId1>", "<activityId2>"]
}
```

### Update student
`PUT /students/:id` — admin/staff, same body shape (all fields optional)
```bash
curl -X PUT http://localhost:5000/api/v1/students/<studentId> \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"section": "B", "status": "inactive"}'
```

### Delete student
`DELETE /students/:id` — admin only
```bash
curl -X DELETE http://localhost:5000/api/v1/students/<studentId> -H "Authorization: Bearer $TOKEN"
```

### Payment history
`GET /students/:id/payment-history` — protected, query: `page`, `limit`, `activityId`
```bash
curl "http://localhost:5000/api/v1/students/<studentId>/payment-history?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### 12-month status
`GET /students/:id/monthly-status` — protected, query: `year` (default current year)
```bash
curl "http://localhost:5000/api/v1/students/<studentId>/monthly-status?year=2026" \
  -H "Authorization: Bearer $TOKEN"
```

### Download import template
`GET /students/import-template` — protected, query: `format` (`excel` default | `csv`)

Excel version includes a second sheet, **Valid Activity Names**, listing every activity currently in your database (exactly as it must be typed in the `Activities` column) — always up to date since it's generated live.
```bash
curl "http://localhost:5000/api/v1/students/import-template?format=excel" \
  -H "Authorization: Bearer $TOKEN" -o student-import-template.xlsx
```

### Bulk import students
`POST /students/import` — admin/staff, `multipart/form-data`, file field name `file` (CSV or `.xlsx`, max size per `MAX_FILE_SIZE_MB`)

Columns (case-insensitive header matching; several common aliases accepted, e.g. `Class` for `Standard`, `Mobile` for `Phone`): `Admission No` (optional — auto-generated if blank), `Name` (required), `Standard`, `Section` (required), `Gender`, `DOB`, `Parent Name`, `Phone`, `Email`, `Address`, `Activities` (comma-separated activity **names**, must match existing activities), `Joined Date`.

Processes best-effort: valid rows are created, invalid rows are skipped and reported individually — one bad row never blocks the rest of the file.
```bash
curl -X POST http://localhost:5000/api/v1/students/import \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@student-import-template.xlsx"
```
Response:
```json
{
  "success": true,
  "message": "Import complete: 18 created, 2 failed out of 20 row(s)",
  "data": {
    "totalRows": 20,
    "created": 18,
    "failed": 2,
    "errors": [
      { "row": 7, "message": "Unknown activity name(s): Basketball" },
      { "row": 15, "message": "phone: Phone must be a valid 10-digit Indian mobile number" }
    ]
  }
}
```

### Export students
`GET /students/export` — protected, query: same filters as list (`search`, `standard`, `section`, `activityId`, `status`) plus `format` (`excel` default | `csv`)
```bash
curl "http://localhost:5000/api/v1/students/export?format=excel&status=active" \
  -H "Authorization: Bearer $TOKEN" -o students-export.xlsx
```

---

## Activities (`/activities`)

### List
`GET /activities` — protected, query: `search`, `status` (`active|inactive|full`), `page`, `limit`
```bash
curl "http://localhost:5000/api/v1/activities?status=active" -H "Authorization: Bearer $TOKEN"
```

### Get one
`GET /activities/:id` — protected
```bash
curl http://localhost:5000/api/v1/activities/<activityId> -H "Authorization: Bearer $TOKEN"
```

### Create
`POST /activities` — admin only
```bash
curl -X POST http://localhost:5000/api/v1/activities \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "name": "Swimming",
    "coach": "Coach Rao",
    "monthlyFee": 800,
    "schedule": "Mon/Wed 5pm",
    "capacity": 20,
    "color": "#3B82F6",
    "icon": "activity",
    "description": "Beginner to intermediate swimming"
  }'
```

### Update
`PUT /activities/:id` — admin only (all fields optional)
```bash
curl -X PUT http://localhost:5000/api/v1/activities/<activityId> \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"monthlyFee": 900, "capacity": 25}'
```

### Delete
`DELETE /activities/:id` — admin only (blocked if active enrollments exist)
```bash
curl -X DELETE http://localhost:5000/api/v1/activities/<activityId> -H "Authorization: Bearer $TOKEN"
```

---

## Payments (`/payments`)

### Create payment
`POST /payments` — admin/staff. Prevents duplicate payment for an already-paid month; supports multi-month in one call.
```bash
curl -X POST http://localhost:5000/api/v1/payments \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "studentId": "<studentId>",
    "activityId": "<activityId>",
    "months": [8, 9],
    "year": 2026,
    "discount": 0,
    "lateFee": 0,
    "paymentMode": "Cash",
    "referenceNo": "",
    "remarks": "Paid in cash at front desk"
  }'
```
`paymentMode`: `Cash | UPI | Card | Bank`. Response includes the auto-generated `receiptNo` (e.g. `RCT-100001`).

### List payments
`GET /payments` — protected, query: `studentId`, `activityId`, `paymentMode`, `receiptNo`, `fromDate`, `toDate`, `page`, `limit`
```bash
curl "http://localhost:5000/api/v1/payments?studentId=<studentId>&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### Get one
`GET /payments/:id` — protected
```bash
curl http://localhost:5000/api/v1/payments/<paymentId> -H "Authorization: Bearer $TOKEN"
```

### Download receipt (PDF)
`GET /payments/:id/receipt` — protected
```bash
curl http://localhost:5000/api/v1/payments/<paymentId>/receipt \
  -H "Authorization: Bearer $TOKEN" -o receipt.pdf
```

### Delete payment (reversal)
`DELETE /payments/:id` — admin only, reverses the monthly status entries
```bash
curl -X DELETE http://localhost:5000/api/v1/payments/<paymentId> -H "Authorization: Bearer $TOKEN"
```

---

## Monthly Tracker (`/monthly-tracker`)

### List tracker rows
`GET /monthly-tracker` — protected, query: `search`, `activityId`, `status` (`paid|pending|partial|overdue`), `year`, `page`, `limit`
```bash
curl "http://localhost:5000/api/v1/monthly-tracker?status=pending&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### Get one student+activity timeline
`GET /monthly-tracker/:studentId/:activityId` — protected, query: `year`
```bash
curl "http://localhost:5000/api/v1/monthly-tracker/<studentId>/<activityId>?year=2026" \
  -H "Authorization: Bearer $TOKEN"
```

### Pay months (from tracker drawer)
`PATCH /monthly-tracker/pay` — admin/staff. Same payload as `POST /payments` (it delegates to the same service).
```bash
curl -X PATCH http://localhost:5000/api/v1/monthly-tracker/pay \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "studentId": "<studentId>",
    "activityId": "<activityId>",
    "months": [10],
    "year": 2026,
    "paymentMode": "UPI"
  }'
```

---

## Dashboard (`/dashboard`)

`GET /dashboard` — protected. Single aggregated response: totals, monthly revenue, outstanding balance, collection %, recent payments/registrations, revenue chart, activity revenue, pending students.
```bash
curl http://localhost:5000/api/v1/dashboard -H "Authorization: Bearer $TOKEN"
```

---

## Reports (`/reports`)

Every report supports `?format=json|pdf|excel|csv` (default `json`). `pdf`/`excel` stream a file download; `csv` streams text.

| Report | Path | Extra query params |
|---|---|---|
| Revenue | `GET /reports/revenue` | `fromDate`, `toDate`, `activityId` |
| Pending | `GET /reports/pending` | `activityId` |
| Activity | `GET /reports/activity` | — |
| Monthly collection | `GET /reports/monthly-collection` | `year`, `month` |
| Yearly collection | `GET /reports/yearly-collection` | `year` |
| Student ledger | `GET /reports/student-ledger/:studentId` | `year` |

```bash
# JSON
curl "http://localhost:5000/api/v1/reports/revenue?fromDate=2026-01-01&toDate=2026-07-30" \
  -H "Authorization: Bearer $TOKEN"

# Excel download
curl "http://localhost:5000/api/v1/reports/monthly-collection?year=2026&format=excel" \
  -H "Authorization: Bearer $TOKEN" -o monthly-collection.xlsx

# PDF student ledger
curl "http://localhost:5000/api/v1/reports/student-ledger/<studentId>?format=pdf" \
  -H "Authorization: Bearer $TOKEN" -o ledger.pdf
```

---

## Settings (`/settings`)

### Get settings
`GET /settings` — protected
```bash
curl http://localhost:5000/api/v1/settings -H "Authorization: Bearer $TOKEN"
```

### Update settings
`PUT /settings` — admin only (all fields optional)
```bash
curl -X PUT http://localhost:5000/api/v1/settings \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "schoolName": "Sunrise Public School",
    "schoolAddress": "1 Park Street, Chennai",
    "academicYear": "2026-2027",
    "receiptPrefix": "RCT",
    "partialPaymentPercentage": 50,
    "currency": "INR"
  }'
```

### Upload logo
`POST /settings/logo` — admin only, `multipart/form-data`
```bash
curl -X POST http://localhost:5000/api/v1/settings/logo \
  -H "Authorization: Bearer $TOKEN" \
  -F "logo=@/path/to/logo.png"
```

---

## Users (`/users`) — admin only

### List
`GET /users`
```bash
curl "http://localhost:5000/api/v1/users?page=1&limit=20" -H "Authorization: Bearer $TOKEN"
```

### Create
`POST /users`
```bash
curl -X POST http://localhost:5000/api/v1/users \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name": "Front Desk Staff", "email": "frontdesk@feeflow.app", "password": "Password123", "role": "staff"}'
```

### Update
`PUT /users/:id`
```bash
curl -X PUT http://localhost:5000/api/v1/users/<userId> \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"isActive": false}'
```

### Delete
`DELETE /users/:id`
```bash
curl -X DELETE http://localhost:5000/api/v1/users/<userId> -H "Authorization: Bearer $TOKEN"
```

---

## Audit Logs (`/audit-logs`) — admin only, read-only

Tracks who created/updated/deleted a Student, Activity, Payment, Settings, or User record.

`GET /audit-logs` — query: `resourceType` (`student|activity|payment|settings|user`), `action` (`create|update|delete`), `userId`, `fromDate`, `toDate`, `page`, `limit`
```bash
curl "http://localhost:5000/api/v1/audit-logs?resourceType=payment&action=delete" \
  -H "Authorization: Bearer $TOKEN"
```
Example entry:
```json
{
  "action": "update",
  "resourceType": "activity",
  "resourceId": "6a6b721eb4eb91ae28127206",
  "resourceLabel": "Swimming",
  "userName": "Admin User",
  "userRole": "admin",
  "changes": { "monthlyFee": { "from": 800, "to": 900 } },
  "createdAt": "2026-07-30T15:47:43.183Z"
}
```

---

## Interactive docs

Full request/response schemas are also available via Swagger UI once the server is running:

```
http://localhost:5000/api-docs
```
