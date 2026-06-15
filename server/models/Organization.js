import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 60
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  about: {
    type: String,
    trim: true,
    default: ''
  },
  avatar: {
    type: String,
    default: ''
  },
  username: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    sparse: true,
    minlength: 2,
    maxlength: 30,
    match: /^[a-z0-9_-]+$/
  },
  verified: {
    type: Boolean,
    default: false
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true, toJSON: { transform: function(doc, ret) { if (ret.avatar && ret.avatar.startsWith('data:')) ret.avatar = ''; return ret; } }, toObject: { transform: function(doc, ret) { if (ret.avatar && ret.avatar.startsWith('data:')) ret.avatar = ''; return ret; } } });

export default mongoose.model('Organization', organizationSchema);
