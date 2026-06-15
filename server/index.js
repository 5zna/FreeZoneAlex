import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import User from './models/User.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import adminRoutes from './routes/admin.js';
import jobRoutes from './routes/jobs.js';
import organizationRoutes from './routes/organizations.js';
import notificationRoutes from './routes/notifications.js';
import memberRoleRoutes from './routes/memberRoles.js';
import customRoleRoutes from './routes/customRoles.js';
import settingsRoutes from './routes/settings.js';
import contributorRoutes from './routes/contributors.js';
import reportRoutes from './routes/reports.js';
import auditLogRoutes from './routes/auditLogs.js';
import { getSettings } from './routes/settings.js';
import { startReportCleanup } from './utils/cleanup.js';
import MemberRole from './models/MemberRole.js';
import { memberDocHasOwner, normalizeMemberRoles } from './utils/memberRoleUtils.js';
import blockIP from './middleware/blockIP.js';

const app = express();
const PORT = process.env.PORT || 4000;
const APP_URL = process.env.APP_URL || process.env.BASE_URL || 'http://localhost:4000';

var allowedOrigins = [
  APP_URL,
  process.env.FRONTEND_URL || 'http://127.0.0.1:3000',
  'http://localhost:3000',
  'http://127.0.0.1:4000',
  'http://localhost:4000'
];
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      allowedOrigins.push(origin);
      callback(null, true);
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

/* Skip blockIP DB query for static files */
app.use(function(req, res, next) {
  if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff2?)$/i)) return next();
  return blockIP(req, res, next);
});

const mongoConnectPromise = mongoose.connect(process.env.MONGO_URI);

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-me',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    clientPromise: mongoConnectPromise.then(() => mongoose.connection.getClient()),
    ttl: 14 * 24 * 60 * 60
  }),
  cookie: {
    maxAge: 14 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: APP_URL + '/api/auth/google/callback',
  passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    if (req.session && req.session.linkGoogle) {
      const user = await User.findById(req.session.passport.user);
      if (!user) return done(null, false, { message: 'Not authenticated' });
      const existing = await User.findOne({ googleId: profile.id });
      if (existing && existing._id.toString() !== user._id.toString()) {
        return done(null, false, { message: 'Google account already linked to another user' });
      }
      user.googleId = profile.id;
      if (!user.avatar) user.avatar = profile.photos?.[0]?.value || '';
      await user.save();
      delete req.session.linkGoogle;
      return done(null, user);
    }
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = await User.create({
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails?.[0]?.value || '',
        avatar: profile.photos?.[0]?.value || ''
      });
    }
    if (user.banned) return done(null, false, { message: 'Your account has been banned', reason: user.banReason || '', isBanned: true });
    if (user.timedOutUntil && new Date(user.timedOutUntil).getTime() > Date.now()) return done(null, false, { message: 'Your account is temporarily suspended', reason: user.timeoutReason || '', isSuspended: true });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: APP_URL + '/api/auth/facebook/callback',
  profileFields: ['id', 'displayName'],
  passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    if (req.session && req.session.linkFacebook) {
      const user = await User.findById(req.session.passport.user);
      if (!user) return done(null, false, { message: 'Not authenticated' });
      const existing = await User.findOne({ facebookId: profile.id });
      if (existing && existing._id.toString() !== user._id.toString()) {
        return done(null, false, { message: 'Facebook account already linked to another user' });
      }
      user.facebookId = profile.id;
      if (!user.avatar) user.avatar = profile.photos?.[0]?.value || '';
      await user.save();
      delete req.session.linkFacebook;
      return done(null, user);
    }
    let user = await User.findOne({ facebookId: profile.id });
    if (!user) {
      user = await User.create({
        facebookId: profile.id,
        name: profile.displayName || 'Facebook User',
        email: profile.emails?.[0]?.value || '',
        avatar: profile.photos?.[0]?.value || ''
      });
    }
    if (user.banned) return done(null, false, { message: 'Your account has been banned', reason: user.banReason || '', isBanned: true });
    if (user.timedOutUntil && new Date(user.timedOutUntil).getTime() > Date.now()) return done(null, false, { message: 'Your account is temporarily suspended', reason: user.timeoutReason || '', isSuspended: true });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

var userCache = new Map();
var USER_CACHE_TTL = 60000;

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    var cached = userCache.get(id);
    if (cached && Date.now() - cached.ts < USER_CACHE_TTL) return done(null, cached.user);
    var user = await User.findById(id);
    if (user) {
      userCache.set(id, { user, ts: Date.now() });
      if (userCache.size > 500) {
        var keys = userCache.keys();
        for (var i = 0; i < 100; i++) { var k = keys.next().value; if (k) userCache.delete(k); }
      }
    }
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

app.use('/uploads', express.static(join(__dirname, 'uploads')));

/* Maintenance mode check (runs before static so it blocks page requests too) */
app.use(async (req, res, next) => {
  if (req.path.startsWith('/uploads/') || req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff2?)$/i)) return next();
  try {
    var s = await getSettings();
    if (s && s.maintenance) {
      var skipPaths = ['/api/auth/', '/api/settings', '/api/health'];
      for (var i = 0; i < skipPaths.length; i++) {
        if (req.path.indexOf(skipPaths[i]) === 0) return next();
      }
      if (req.isAuthenticated() && req.user && req.user.role === 'developer') return next();
      if (req.path.indexOf('/api/') === 0) {
        return res.status(503).json({ maintenance: true, message: s.maintenanceReason || 'Site is under maintenance' });
      }
      res.status(503);
      return res.send('<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Maintenance</title><style>body{margin:0;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#0f0f1a;color:#e4e4e7;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center}.maint-icon{font-size:4rem;margin-bottom:16px}h1{font-size:2rem;margin:0 0 8px;font-weight:700}p{color:#a1a1aa;max-width:480px;line-height:1.6}</style></head><body><div class="maint-icon">&#9888;</div><h1>Under Maintenance</h1><p>' + (s.maintenanceReason ? escapeHtml(s.maintenanceReason) : 'We are currently performing scheduled maintenance. Please check back shortly.') + '</p></body></html>');
      function escapeHtml(t) { return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
    }
  } catch {}
  next();
});

/* Clean URL routes — no .html extension needed */
var pages = join(__dirname, '..', 'pages');
app.get('/', (req, res) => res.sendFile(join(pages, 'home.html')));
app.get('/home', (req, res) => res.sendFile(join(pages, 'home.html')));
app.get('/jobs', (req, res) => res.sendFile(join(pages, 'jobs.html')));
app.get('/member-jobs', (req, res) => res.sendFile(join(pages, 'member-jobs.html')));
app.get('/dashboard', (req, res) => res.sendFile(join(pages, 'dashboard.html')));
app.get('/builder', (req, res) => res.sendFile(join(pages, 'builder.html')));
app.get('/inquiries', (req, res) => res.sendFile(join(pages, 'inquiries.html')));
app.get('/support', (req, res) => res.sendFile(join(pages, 'support.html')));
app.get('/about', (req, res) => res.sendFile(join(pages, 'about.html')));
app.get('/contributors', (req, res) => res.sendFile(join(pages, 'contributors.html')));
app.get('/social', (req, res) => res.sendFile(join(pages, 'social.html')));

/* Serve legacy root-level static files */
app.get('/verified.svg', (req, res) => { res.sendFile(join(__dirname, '..', 'assets', 'icons', 'verified.svg')); });
app.get('/index.html', (req, res) => { res.sendFile(join(__dirname, '..', 'index.html')); });

/* Serve page HTML files at root and project static assets */
app.use(express.static(pages, { maxAge: '1h' }));
app.use('/css', express.static(join(__dirname, '..', 'css'), { maxAge: '1h' }));
app.use('/js', express.static(join(__dirname, '..', 'js'), { maxAge: '1h' }));
app.use('/assets', express.static(join(__dirname, '..', 'assets'), { maxAge: '1h' }));

app.use('/api', authRoutes);
app.use('/api', profileRoutes);
app.use('/api', adminRoutes);
app.use('/api', jobRoutes);
app.use('/api', organizationRoutes);
app.use('/api', notificationRoutes);
app.use('/api', memberRoleRoutes);
app.use('/api', customRoleRoutes);
app.use('/api', settingsRoutes);
app.use('/api', contributorRoutes);
app.use('/api', reportRoutes);
app.use('/api', auditLogRoutes);

app.get('/api/auth/check-dashboard', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(403).json({ authorized: false, message: 'Dashboard access denied' });
  var role = req.user.role;
  var authorized = role === 'admin' || role === 'developer' || role === 'moderator';
  if (!authorized) {
    try {
      var mr = await MemberRole.findOne({ userId: req.user._id.toString() }).lean();
      authorized = normalizeMemberRoles(mr).length > 0;
    } catch {}
  }
  if (authorized) return res.json({ authorized: true });
  return res.status(403).json({ authorized: false, message: 'Dashboard access denied' });
});

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok' });
});

/* 404 catch-all */
app.use((req, res) => {
  if (req.path.indexOf('/api/') === 0) return res.status(404).json({ message: 'Not found' });
  res.status(404).sendFile(join(__dirname, '..', 'pages', '404.html'));
});

mongoConnectPromise
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      startReportCleanup();
    });
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
