import mongoose from 'mongoose';

var siteSettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'global' },
  maintenance: { type: Boolean, default: false },
  maintenanceReason: { type: String, default: '' },
  alert: { type: String, default: '' },
  favicon: { type: String, default: '' },
  news: { type: [String], default: [] },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('SiteSettings', siteSettingsSchema);
