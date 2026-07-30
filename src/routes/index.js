const express = require('express');

const authRoutes = require('./auth.routes');
const studentRoutes = require('./student.routes');
const activityRoutes = require('./activity.routes');
const paymentRoutes = require('./payment.routes');
const monthlyTrackerRoutes = require('./monthlyTracker.routes');
const dashboardRoutes = require('./dashboard.routes');
const reportRoutes = require('./report.routes');
const settingsRoutes = require('./settings.routes');
const userRoutes = require('./user.routes');
const auditLogRoutes = require('./auditLog.routes');

const router = express.Router();

router.get('/health', (req, res) => res.json({ success: true, message: 'FeeFlow API is healthy' }));

router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/activities', activityRoutes);
router.use('/payments', paymentRoutes);
router.use('/monthly-tracker', monthlyTrackerRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingsRoutes);
router.use('/users', userRoutes);
router.use('/audit-logs', auditLogRoutes);

module.exports = router;
