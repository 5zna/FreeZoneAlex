import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: ['ban', 'unban', 'timeout', 'untimeout', 'role_change', 'org_add', 'org_remove', 'job_approved', 'job_rejected', 'job_pending', 'verified', 'unverified', 'report_reply'],
    required: true
  },
  message: { type: String, required: true },
  link: { type: String, default: '' },
  read: { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
