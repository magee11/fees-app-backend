const { AuditLog } = require('../models');
const logger = require('../config/logger');
const { parsePagination, buildMeta } = require('../utils/pagination');

function buildChanges(before, payload) {
  const changes = {};
  Object.keys(payload).forEach((key) => {
    const prev = before[key];
    const next = payload[key];
    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      changes[key] = { from: prev, to: next };
    }
  });
  return changes;
}

async function logAudit({ actor, action, resourceType, resourceId, resourceLabel = '', changes = {} }) {
  try {
    await AuditLog.create({
      userId: actor._id,
      userName: actor.name,
      userRole: actor.role,
      action,
      resourceType,
      resourceId,
      resourceLabel,
      changes,
    });
  } catch (error) {
    logger.error(`Failed to write audit log: ${error.message}`);
  }
}

async function listAuditLogs(query) {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 20 });

  const filter = {};
  if (query.resourceType) filter.resourceType = query.resourceType;
  if (query.action) filter.action = query.action;
  if (query.userId) filter.userId = query.userId;
  if (query.fromDate || query.toDate) {
    filter.createdAt = {};
    if (query.fromDate) filter.createdAt.$gte = new Date(query.fromDate);
    if (query.toDate) filter.createdAt.$lte = new Date(query.toDate);
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return { data: logs, meta: buildMeta({ page, limit, total }) };
}

module.exports = { logAudit, buildChanges, listAuditLogs };
