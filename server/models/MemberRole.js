import mongoose from 'mongoose';

const assignedRoleSchema = new mongoose.Schema({
  roleName: { type: String, default: '' },
  roleIcon: { type: String, default: '' }
}, { _id: false });

const memberRoleSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  roles: { type: [assignedRoleSchema], default: [] }
}, { timestamps: true });

export default mongoose.model('MemberRole', memberRoleSchema);
