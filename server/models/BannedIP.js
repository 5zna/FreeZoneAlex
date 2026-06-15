import mongoose from 'mongoose';

const bannedIpSchema = new mongoose.Schema({
  ip: { type: String, required: true, unique: true },
  reason: { type: String, default: '' },
  bannedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('BannedIP', bannedIpSchema);
