import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['inquiry', 'suggestion', 'complaint', 'bug', 'feedback', 'organization'], default: 'inquiry' },
  title: { type: String, required: true },
  content: { type: String, default: '' },
  status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
  attachments: [{ name: { type: String }, data: { type: String }, type: { type: String } }]
}, { timestamps: true });

export default mongoose.model('Report', reportSchema);
