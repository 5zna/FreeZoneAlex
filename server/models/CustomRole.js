import mongoose from 'mongoose';

const customRoleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  icon: { type: String, default: '' },
  permissions: { type: Object, default: {} }
}, { timestamps: true });

export default mongoose.model('CustomRole', customRoleSchema);
