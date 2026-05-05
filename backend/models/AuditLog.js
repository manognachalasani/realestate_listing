const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'activate_user', 'deactivate_user', 'change_role', 'delete_user',
        'override_property_status', 'delete_property',
        'verify_agent', 'unverify_agent',
        'delete_enquiry',
      ],
    },
    targetType: {
      type: String,
      required: true,
      enum: ['User', 'Property', 'Enquiry'],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    details: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
  },
  { timestamps: true }
);

AuditLogSchema.index({ adminId: 1, createdAt: -1 });
AuditLogSchema.index({ targetType: 1, targetId: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
