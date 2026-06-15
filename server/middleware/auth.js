import User from '../models/User.js';

function getIp(req) {
  return (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || '').split(',')[0].trim();
}

export default function auth(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  if (req.user.banned) {
    req.logout(() => {});
    return res.status(403).json({ message: 'Your account has been banned', banned: true, banReason: req.user.banReason || '' });
  }
  if (req.user.timedOutUntil && new Date(req.user.timedOutUntil).getTime() > Date.now()) {
    return res.status(403).json({ message: 'Your account is temporarily suspended', suspended: true, timeoutReason: req.user.timeoutReason || '' });
  }
  req.userId = req.user.id || req.user._id;
  var ip = getIp(req);
  if (ip && ip !== '::1' && ip !== '127.0.0.1' && ip !== '::ffff:127.0.0.1' && req.user.lastIp !== ip) {
    User.findByIdAndUpdate(req.userId, { lastIp: ip }).catch(function(){});
  }
  next();
}
