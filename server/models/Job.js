import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, default: '' },
  type: { type: String, enum: ['full-time', 'part-time', 'contract', 'freelance', 'internship'], default: 'full-time' },
  description: { type: String, default: '' },
  salary: { type: String, default: '' },
  contactEmail: { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  tags: { type: [String], default: [] },
  status: { type: String, enum: ['active', 'closed'], default: 'active' },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Job', jobSchema);
