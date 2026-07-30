const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { AUDIT_ACTION, AUDIT_RESOURCE_TYPE } = require('../constants');
const { logAudit, buildChanges } = require('./auditLog.service');

async function listUsers(query) {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 20 });
  const [users, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(),
  ]);
  return { data: users, meta: buildMeta({ page, limit, total }) };
}

async function createUser(payload, actor) {
  const existing = await User.findOne({ email: payload.email });
  if (existing) {
    throw ApiError.conflict('A user with this email already exists', [
      { field: 'email', message: 'Email already registered' },
    ]);
  }
  const user = await User.create(payload);
  await logAudit({
    actor,
    action: AUDIT_ACTION.CREATE,
    resourceType: AUDIT_RESOURCE_TYPE.USER,
    resourceId: user._id,
    resourceLabel: user.email,
  });
  return user;
}

async function updateUser(id, payload, actor) {
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');
  const before = user.toObject();
  Object.assign(user, payload);
  await user.save();
  await logAudit({
    actor,
    action: AUDIT_ACTION.UPDATE,
    resourceType: AUDIT_RESOURCE_TYPE.USER,
    resourceId: user._id,
    resourceLabel: user.email,
    changes: buildChanges(before, payload),
  });
  return user;
}

async function deleteUser(id, actor) {
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');
  await User.deleteOne({ _id: id });
  await logAudit({
    actor,
    action: AUDIT_ACTION.DELETE,
    resourceType: AUDIT_RESOURCE_TYPE.USER,
    resourceId: user._id,
    resourceLabel: user.email,
  });
}

module.exports = { listUsers, createUser, updateUser, deleteUser };
