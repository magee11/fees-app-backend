const { Schema, model } = require('mongoose');
const { AUDIT_ACTION, AUDIT_RESOURCE_TYPE, ALL_ROLES } = require('../constants');

const auditLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    userRole: { type: String, enum: ALL_ROLES, required: true },
    action: { type: String, enum: Object.values(AUDIT_ACTION), required: true },
    resourceType: { type: String, enum: Object.values(AUDIT_RESOURCE_TYPE), required: true },
    resourceId: { type: Schema.Types.ObjectId, required: true },
    resourceLabel: { type: String, default: '' },
    changes: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = model('AuditLog', auditLogSchema);
