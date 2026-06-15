import mongoose from 'mongoose';

var siteSettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'global' },
  maintenance: { type: Boolean, default: false },
  maintenanceReason: { type: String, default: '' },
  alert: { type: String, default: '' },
  favicon: { type: String, default: '' },
  news: { type: [String], default: [] },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, toJSON: { transform: function(doc, ret) { if (ret.favicon && ret.favicon.startsWith('data:')) ret.favicon = ''; return ret; } }, toObject: { transform: function(doc, ret) { if (ret.favicon && ret.favicon.startsWith('data:')) ret.favicon = ''; return ret; } } });

export default mongoose.model('SiteSettings', siteSettingsSchema);
