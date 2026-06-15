import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  category: { type: String, enum: ['activity', 'staff'], default: 'activity', index: true },
  type: { type: String, required: true, index: true },
  actionType: { type: String, default: '' },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  actorName: { type: String, default: 'System' },
  actorRole: { type: String, default: '' },
  targetType: { type: String, default: '' },
  targetId: { type: String, default: '' },
  targetName: { type: String, default: '' },
  message: { type: String, required: true },
  details: { type: String, default: '' },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
