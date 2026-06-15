import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  category: { type: String, default: '' },
  type: { type: String, default: '' },
  actionType: { type: String, default: '' },
  actorId: { type: String, default: '' },
  actorName: { type: String, default: '' },
  actorRole: { type: String, default: '' },
  message: { type: String, default: '' },
  details: { type: String, default: '' },
  targetType: { type: String, default: '' },
  targetId: { type: String, default: '' },
  targetName: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('AuditLog', auditLogSchema);
