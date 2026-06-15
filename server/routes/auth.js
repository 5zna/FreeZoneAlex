import { Router } from 'express';
import passport from 'passport';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import { containsProfanity } from '../utils/profanityFilter.js';

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4000/home';

router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback', (req, res, next) => {
  passport.authenticate('google', (err, user, info) => {
    if (err || !user) {
      if (info && info.isSuspended) return res.redirect(FRONTEND_URL + '?suspended=1&reason=' + encodeURIComponent(info.reason));
      if (info && info.reason) return res.redirect(FRONTEND_URL + '?banned=1&reason=' + encodeURIComponent(info.reason));
      return res.redirect(FRONTEND_URL);
    }
    req.logIn(user, (err) => {
      if (err) return res.redirect(FRONTEND_URL);
      var wasLinked = req.session.linkGoogle;
      delete req.session.linkGoogle;
      res.redirect(FRONTEND_URL + (wasLinked ? '?linked=google' : '?login=1'));
    });
  })(req, res, next);
});

router.get('/auth/facebook',
  passport.authenticate('facebook', { scope: ['public_profile'] })
);

router.get('/auth/facebook/callback', (req, res, next) => {
  passport.authenticate('facebook', (err, user, info) => {
    if (err || !user) {
      if (info && info.isSuspended) return res.redirect(FRONTEND_URL + '?suspended=1&reason=' + encodeURIComponent(info.reason));
      if (info && info.reason) return res.redirect(FRONTEND_URL + '?banned=1&reason=' + encodeURIComponent(info.reason));
      return res.redirect(FRONTEND_URL);
    }
    req.logIn(user, (err) => {
      if (err) return res.redirect(FRONTEND_URL);
      var wasLinked = req.session.linkFacebook;
      delete req.session.linkFacebook;
      res.redirect(FRONTEND_URL + (wasLinked ? '?linked=facebook' : '?login=1'));
    });
  })(req, res, next);
});

/* Link Google to existing account — initiates OAuth with link flag */
router.get('/auth/link/google', auth, (req, res) => {
  req.session.linkGoogle = true;
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res);
});

/* Unlink Google from existing account */
router.post('/auth/unlink/google', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.userId, { $unset: { googleId: '' } }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

/* Link Facebook to existing account — initiates OAuth with link flag */
router.get('/auth/link/facebook', auth, (req, res) => {
  req.session.linkFacebook = true;
  passport.authenticate('facebook', { scope: ['public_profile'] })(req, res);
});

/* Unlink Facebook from existing account */
router.post('/auth/unlink/facebook', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.userId, { $unset: { facebookId: '' } }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/auth/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect(FRONTEND_URL);
  });
});

router.get('/me', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  if (req.user.banned) {
    return res.json({ user: req.user, banned: true, banReason: req.user.banReason || '' });
  }
  if (req.user.timedOutUntil && new Date(req.user.timedOutUntil).getTime() > Date.now()) {
    return res.json({ user: req.user, suspended: true, timeoutReason: req.user.timeoutReason || '' });
  }
  res.json({ user: req.user });
});

router.put('/user/username', auth, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || !/^[a-z0-9_-]+$/i.test(username)) {
      return res.status(400).json({ message: 'Username must contain only letters, numbers, underscores and hyphens' });
    }
    if (username.length < 2 || username.length > 30) {
      return res.status(400).json({ message: 'Username must be between 2 and 30 characters' });
    }
    if (containsProfanity(username)) {
      return res.status(400).json({ message: 'Username contains inappropriate language' });
    }
    const existing = await User.findOne({ username: username.toLowerCase().trim() });
    if (existing && existing._id.toString() !== req.userId) {
      return res.status(409).json({ message: 'Username already taken' });
    }
    const user = await User.findByIdAndUpdate(
      req.userId,
      { username: username.toLowerCase().trim() },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
