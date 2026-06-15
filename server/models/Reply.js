import mongoose from 'mongoose';

var replySchema = new mongoose.Schema({
  reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true, maxlength: 2000 },
}, { timestamps: true });

replySchema.index({ reportId: 1, createdAt: 1 });

export default mongoose.model('Reply', replySchema);
