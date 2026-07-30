const { Activity, StudentActivity } = require('../models');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildMeta, escapeRegex } = require('../utils/pagination');
const { AUDIT_ACTION, AUDIT_RESOURCE_TYPE } = require('../constants');
const { logAudit, buildChanges } = require('./auditLog.service');

async function listActivities(query) {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 20 });

  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: regex }, { coach: regex }];
  }

  const [activities, total] = await Promise.all([
    Activity.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Activity.countDocuments(filter),
  ]);

  return { data: activities, meta: buildMeta({ page, limit, total }) };
}

async function getActivityById(id) {
  const activity = await Activity.findById(id);
  if (!activity) throw ApiError.notFound('Activity not found');
  return activity;
}

async function createActivity(payload, actor) {
  const existing = await Activity.findOne({ name: payload.name });
  if (existing) {
    throw ApiError.conflict('An activity with this name already exists', [
      { field: 'name', message: 'Activity name must be unique' },
    ]);
  }
  const activity = await Activity.create(payload);
  await logAudit({
    actor,
    action: AUDIT_ACTION.CREATE,
    resourceType: AUDIT_RESOURCE_TYPE.ACTIVITY,
    resourceId: activity._id,
    resourceLabel: activity.name,
  });
  return activity;
}

async function updateActivity(id, payload, actor) {
  const activity = await Activity.findById(id);
  if (!activity) throw ApiError.notFound('Activity not found');

  if (payload.capacity !== undefined && payload.capacity < activity.enrolled) {
    throw ApiError.badRequest(
      `Capacity cannot be less than currently enrolled students (${activity.enrolled})`
    );
  }

  const before = activity.toObject();
  Object.assign(activity, payload);
  await activity.save();
  await logAudit({
    actor,
    action: AUDIT_ACTION.UPDATE,
    resourceType: AUDIT_RESOURCE_TYPE.ACTIVITY,
    resourceId: activity._id,
    resourceLabel: activity.name,
    changes: buildChanges(before, payload),
  });
  return activity;
}

async function deleteActivity(id, actor) {
  const activity = await Activity.findById(id);
  if (!activity) throw ApiError.notFound('Activity not found');

  const activeEnrollments = await StudentActivity.countDocuments({ activityId: id, active: true });
  if (activeEnrollments > 0) {
    throw ApiError.badRequest(
      `Cannot delete activity with ${activeEnrollments} active student enrollment(s). Remove students first.`
    );
  }

  await Activity.deleteOne({ _id: id });
  await logAudit({
    actor,
    action: AUDIT_ACTION.DELETE,
    resourceType: AUDIT_RESOURCE_TYPE.ACTIVITY,
    resourceId: activity._id,
    resourceLabel: activity.name,
  });
}

module.exports = {
  listActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
};
