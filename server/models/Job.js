import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title_en: { type: String, required: true, trim: true },
  title_ar: { type: String, trim: true },
  location_en: { type: String, default: '' },
  location_ar: { type: String, default: '' },
  hours: { type: String, default: '' },
  salary: { type: String, default: '' },
  details_en: { type: String, default: '' },
  details_ar: { type: String, default: '' },
  contact: { type: String, default: '' },
  fbLink: { type: String, default: '' },
  tags: [String],
  creatorType: { type: String, default: 'user' },
  orgName: { type: String, default: '' },
  orgId: { type: String, default: '' },
  orgAvatar: { type: String, default: '' },
  verified: { type: Boolean, default: false },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  postedAt: { type: Date, default: Date.now },
  bumpedAt: { type: Date, default: Date.now },
  hiring: { type: Boolean, default: true },
  source: { type: String, enum: ['company', 'member'], default: 'company' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' }
}, { timestamps: true });

jobSchema.index({ bumpedAt: -1 });
jobSchema.index({ postedAt: -1 });

export default mongoose.model('Job', jobSchema);
