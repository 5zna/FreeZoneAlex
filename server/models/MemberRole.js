import mongoose from 'mongoose';

const assignedRoleSchema = new mongoose.Schema({
  roleName: { type: String, required: true },
  roleIcon: { type: String, default: '' }
}, { _id: false });

const memberRoleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  roles: { type: [assignedRoleSchema], default: [] },
  /* legacy fields — migrated to roles[] on read/write */
  roleName: { type: String },
  roleIcon: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('MemberRole', memberRoleSchema);
