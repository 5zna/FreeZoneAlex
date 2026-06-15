import mongoose from 'mongoose';

var reportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['inquiry', 'suggestion', 'complaint', 'bug', 'feedback', 'organization'], required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  content: { type: String, default: '' },
  attachments: [{ name: { type: String }, data: { type: String }, type: { type: String } }],
  status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
}, { timestamps: true });

reportSchema.index({ userId: 1, createdAt: -1 });
reportSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Report', reportSchema);
