import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
  reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, default: '' },
  content: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('Reply', replySchema);
