import { Router } from 'express';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import { uploadAvatar, uploadToCloudinary } from '../middleware/upload.js';
import { containsProfanity } from '../utils/profanityFilter.js';

const router = Router();

router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/profile', auth, async (req, res) => {
  try {
    const { displayName, about, username } = req.body;
    const update = {};
    if (displayName !== undefined) {
      const trimmed = displayName.trim();
      if (containsProfanity(trimmed)) return res.status(400).json({ message: 'Display name contains inappropriate language' });
      update.displayName = trimmed;
    }
    if (about !== undefined) {
      if (containsProfanity(about)) return res.status(400).json({ message: 'About section contains inappropriate language' });
      update.about = about;
    }
    if (username !== undefined) {
      const u = username.toLowerCase().trim();
      if (!/^[a-z0-9_-]+$/.test(u) || u.length < 2 || u.length > 30) return res.status(400).json({ message: 'Username must be 2-30 characters, letters, numbers, underscores and hyphens only' });
      const existing = await User.findOne({ username: u });
      if (existing && existing._id.toString() !== req.userId) return res.status(409).json({ message: 'Username already taken' });
      update.username = u;
    }
    const user = await User.findByIdAndUpdate(req.userId, update, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Username already taken' });
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/profile/avatar', auth, (req, res) => {
  uploadAvatar(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message || 'Upload failed' });
    if (!req.file) return res.status(400).json({ message: 'No file provided' });
    try {
      var url = await uploadToCloudinary(req.file.buffer, req.file.mimetype, 'avatars/users');
      var user = await User.findByIdAndUpdate(req.userId, { avatar: url }, { new: true });
      res.json({ user });
    } catch {
      res.status(500).json({ message: 'Server error' });
    }
  });
});

export default router;
