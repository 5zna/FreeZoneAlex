import BannedIP from '../models/BannedIP.js';

export default async function blockIP(req, res, next) {
  try {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || '';
    ip = ip.split(',')[0].trim();
    if (ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') return next();
    var banned = await BannedIP.findOne({ ip });
    if (banned) {
      return res.status(403).json({ message: 'Your IP has been blocked', banned: true, reason: banned.reason });
    }
    next();
  } catch (err) {
    next();
  }
}
