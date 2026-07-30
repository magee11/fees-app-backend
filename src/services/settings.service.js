const { Settings } = require('../models');
const { AUDIT_ACTION, AUDIT_RESOURCE_TYPE } = require('../constants');
const { logAudit, buildChanges } = require('./auditLog.service');

async function getSettings() {
  return Settings.getSingleton();
}

async function updateSettings(payload, actor) {
  const current = await Settings.getSingleton();
  const before = current.toObject();

  const settings = await Settings.findByIdAndUpdate(
    current._id,
    { $set: payload },
    { new: true, runValidators: true }
  );

  await logAudit({
    actor,
    action: AUDIT_ACTION.UPDATE,
    resourceType: AUDIT_RESOURCE_TYPE.SETTINGS,
    resourceId: settings._id,
    resourceLabel: 'School Settings',
    changes: buildChanges(before, payload),
  });

  return settings;
}

module.exports = { getSettings, updateSettings };
