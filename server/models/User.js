import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  facebookId: {
    type: String,
    unique: true,
    sparse: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  avatar: String,
  displayName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  username: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 30,
    unique: true,
    sparse: true,
    match: /^[a-z0-9_-]+$/
  },
  about: {
    type: String,
    maxlength: 5000
  },
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin', 'developer', 'owner'],
    default: 'user'
  },
  verified: { type: Boolean, default: false },
  banned:         { type: Boolean, default: false },
  banReason:      { type: String, default: '' },
  timedOutUntil:  { type: Date, default: null },
  timeoutReason:  { type: String, default: '' },
  lastIp:         { type: String, default: '' }
}, { timestamps: true });

userSchema.virtual('profileName').get(function() {
  return this.displayName || this.name;
});

userSchema.set('toJSON', { virtuals: true, transform: function(doc, ret) { if (ret.avatar && ret.avatar.startsWith('data:')) ret.avatar = ''; return ret; } });
userSchema.set('toObject', { virtuals: true, transform: function(doc, ret) { if (ret.avatar && ret.avatar.startsWith('data:')) ret.avatar = ''; return ret; } });

export default mongoose.model('User', userSchema);
