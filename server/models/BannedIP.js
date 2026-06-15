import mongoose from 'mongoose';

const bannedIpSchema = new mongoose.Schema({
  ip: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reason: { type: String, default: '' },
  bannedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('BannedIP', bannedIpSchema);
