/**
 * @swagger
 * tags:
 *   - name: Auth
 *   - name: Students
 *   - name: Activities
 *   - name: Payments
 *   - name: Monthly Tracker
 *   - name: Dashboard
 *   - name: Reports
 *   - name: Settings
 *   - name: Users
 *   - name: Audit Logs
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in and receive access/refresh tokens
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiSuccess' }
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *               role: { type: string, enum: [admin, staff] }
 *     responses:
 *       201: { description: User registered }
 *
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Exchange a refresh token for a new access token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: Token refreshed }
 *
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the current authenticated user
 *     responses:
 *       200: { description: Current user }
 */

/**
 * @swagger
 * /students:
 *   get:
 *     tags: [Students]
 *     summary: List students with search, filters, sorting, and pagination
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: standard
 *         schema: { type: string }
 *       - in: query
 *         name: section
 *         schema: { type: string }
 *       - in: query
 *         name: activityId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, inactive, overdue] }
 *       - in: query
 *         name: outstanding
 *         schema: { type: string, enum: ['true', 'false'] }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Students fetched successfully }
 *   post:
 *     tags: [Students]
 *     summary: Create a student (multipart/form-data for optional photo upload)
 *     responses:
 *       201: { description: Student created }
 *
 * /students/{id}:
 *   get:
 *     tags: [Students]
 *     summary: Get a student by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Student fetched successfully }
 *   put:
 *     tags: [Students]
 *     summary: Update a student
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Student updated }
 *   delete:
 *     tags: [Students]
 *     summary: Delete a student (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Student deleted }
 *
 * /students/{id}/payment-history:
 *   get:
 *     tags: [Students]
 *     summary: Get a student's payment history
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Payment history fetched }
 *
 * /students/{id}/monthly-status:
 *   get:
 *     tags: [Students]
 *     summary: Get a student's 12-month status per enrolled activity
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Monthly status fetched }
 *
 * /students/import-template:
 *   get:
 *     tags: [Students]
 *     summary: Download a blank student import template (CSV or Excel)
 *     parameters:
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [excel, csv], default: excel }
 *     responses:
 *       200: { description: Template file stream }
 *
 * /students/import:
 *   post:
 *     tags: [Students]
 *     summary: Bulk-import students from a CSV/Excel file (admin/staff)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       200: { description: Import summary with per-row errors }
 *
 * /students/export:
 *   get:
 *     tags: [Students]
 *     summary: Export the student directory (CSV or Excel)
 *     parameters:
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [excel, csv], default: excel }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: standard
 *         schema: { type: string }
 *       - in: query
 *         name: section
 *         schema: { type: string }
 *       - in: query
 *         name: activityId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, inactive, overdue] }
 *     responses:
 *       200: { description: Export file stream }
 */

/**
 * @swagger
 * /activities:
 *   get:
 *     tags: [Activities]
 *     summary: List activities
 *     responses:
 *       200: { description: Activities fetched successfully }
 *   post:
 *     tags: [Activities]
 *     summary: Create an activity (admin only)
 *     responses:
 *       201: { description: Activity created }
 *
 * /activities/{id}:
 *   get:
 *     tags: [Activities]
 *     summary: Get an activity by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Activity fetched }
 *   put:
 *     tags: [Activities]
 *     summary: Update an activity (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Activity updated }
 *   delete:
 *     tags: [Activities]
 *     summary: Delete an activity (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Activity deleted }
 */

/**
 * @swagger
 * /payments:
 *   get:
 *     tags: [Payments]
 *     summary: List payments with filters and pagination
 *     responses:
 *       200: { description: Payments fetched successfully }
 *   post:
 *     tags: [Payments]
 *     summary: Record a payment for one or more months
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, activityId, months, year, paymentMode]
 *             properties:
 *               studentId: { type: string }
 *               activityId: { type: string }
 *               months:
 *                 type: array
 *                 items: { type: integer, minimum: 1, maximum: 12 }
 *               year: { type: integer }
 *               discount: { type: number }
 *               lateFee: { type: number }
 *               paymentMode: { type: string, enum: [Cash, UPI, Card, Bank] }
 *               referenceNo: { type: string }
 *               remarks: { type: string }
 *     responses:
 *       201: { description: Payment recorded successfully }
 *       409: { description: Duplicate payment for an already-paid month }
 *
 * /payments/{id}:
 *   get:
 *     tags: [Payments]
 *     summary: Get a payment by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Payment fetched }
 *   delete:
 *     tags: [Payments]
 *     summary: Delete/reverse a payment (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Payment deleted }
 *
 * /payments/{id}/receipt:
 *   get:
 *     tags: [Payments]
 *     summary: Download the PDF receipt for a payment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: PDF receipt stream
 *         content:
 *           application/pdf: {}
 */

/**
 * @swagger
 * /monthly-tracker:
 *   get:
 *     tags: [Monthly Tracker]
 *     summary: List the 12-month payment grid per student/activity enrollment
 *     responses:
 *       200: { description: Monthly tracker fetched }
 *
 * /monthly-tracker/{studentId}/{activityId}:
 *   get:
 *     tags: [Monthly Tracker]
 *     summary: Get the complete year timeline for a student+activity pairing
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: activityId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Tracker detail fetched }
 *
 * /monthly-tracker/pay:
 *   patch:
 *     tags: [Monthly Tracker]
 *     summary: Pay one or more months directly from the tracker drawer
 *     responses:
 *       201: { description: Payment recorded successfully }
 */

/**
 * @swagger
 * /dashboard:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get all dashboard metrics in a single optimized response
 *     responses:
 *       200: { description: Dashboard fetched successfully }
 */

/**
 * @swagger
 * /reports/revenue:
 *   get:
 *     tags: [Reports]
 *     summary: Revenue report (supports format=json|pdf|excel|csv)
 *     parameters:
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [json, pdf, excel, csv] }
 *     responses:
 *       200: { description: Report generated }
 *
 * /reports/pending:
 *   get:
 *     tags: [Reports]
 *     summary: Pending dues report
 *     responses:
 *       200: { description: Report generated }
 *
 * /reports/activity:
 *   get:
 *     tags: [Reports]
 *     summary: Per-activity enrollment and revenue report
 *     responses:
 *       200: { description: Report generated }
 *
 * /reports/student-ledger/{studentId}:
 *   get:
 *     tags: [Reports]
 *     summary: Full ledger (payments + monthly status) for one student
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Ledger generated }
 *
 * /reports/monthly-collection:
 *   get:
 *     tags: [Reports]
 *     summary: Day-by-day collection totals for a given month/year
 *     responses:
 *       200: { description: Report generated }
 *
 * /reports/yearly-collection:
 *   get:
 *     tags: [Reports]
 *     summary: Month-by-month collection totals for a given year
 *     responses:
 *       200: { description: Report generated }
 */

/**
 * @swagger
 * /settings:
 *   get:
 *     tags: [Settings]
 *     summary: Get school settings
 *     responses:
 *       200: { description: Settings fetched }
 *   put:
 *     tags: [Settings]
 *     summary: Update school settings (admin only)
 *     responses:
 *       200: { description: Settings updated }
 */

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List users (admin only)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Users fetched successfully }
 *   post:
 *     tags: [Users]
 *     summary: Create a user (admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *               role: { type: string, enum: [admin, staff] }
 *               avatar: { type: string }
 *     responses:
 *       201: { description: User created }
 *
 * /users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update a user (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User updated }
 *   delete:
 *     tags: [Users]
 *     summary: Delete a user (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User deleted }
 */

/**
 * @swagger
 * /audit-logs:
 *   get:
 *     tags: [Audit Logs]
 *     summary: List audit log entries (admin only)
 *     parameters:
 *       - in: query
 *         name: resourceType
 *         schema: { type: string, enum: [student, activity, payment, settings, user] }
 *       - in: query
 *         name: action
 *         schema: { type: string, enum: [create, update, delete] }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: fromDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: toDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Audit logs fetched successfully }
 *       403: { description: Forbidden — admin only }
 */
