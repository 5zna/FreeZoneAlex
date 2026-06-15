import { Router } from 'express';
import Job from '../models/Job.js';
import auth from '../middleware/auth.js';
import { createNotification } from './notifications.js';
import { containsProfanity } from '../utils/profanityFilter.js';
import MemberRole from '../models/MemberRole.js';
import { memberDocHasOwner } from '../utils/memberRoleUtils.js';
import { createAuditLog, actorSnapshot } from '../utils/auditLog.js';

function isAdmin(req) {
  return req.user && (req.user.role === 'admin' || req.user.role === 'developer');
}
function isStaffByRole(req) {
  return req.user && (req.user.role === 'admin' || req.user.role === 'developer' || req.user.role === 'moderator');
}
async function isStaff(req) {
  if (!req.user) return false;
  if (req.user.role === 'admin' || req.user.role === 'developer' || req.user.role === 'moderator') return true;
  try {
    const mr = await MemberRole.findOne({ userId: req.user._id }).lean();
    if (memberDocHasOwner(mr)) return true;
  } catch {}
  return false;
}

function optionalAuth(req, res, next) {
  if (req.isAuthenticated()) {
    req.userId = req.user.id || req.user._id;
  }
  next();
}

const router = Router();

router.get('/jobs', optionalAuth, async (req, res) => {
  try {
    const { source } = req.query;
    let filter = {};
    if (source === 'company') {
      filter = { source: 'company', status: 'approved' };
    } else if (source === 'member') {
      const userId = req.userId ? req.userId.toString() : null;
      const userIsAdmin = await isStaff(req);
      if (userIsAdmin) {
        filter = { source: 'member' };
      } else if (userId) {
        filter = { source: 'member', $or: [{ status: 'approved' }, { postedBy: userId }] };
      } else {
        filter = { source: 'member', status: 'approved' };
      }
    }
    const jobs = await Job.find(filter).sort({ bumpedAt: -1 }).lean();
    res.json({ jobs });
  } catch (err) {
    console.error('[GET /jobs] Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/jobs', auth, async (req, res) => {
  try {
    const { title_en, title_ar, location_en, hours, salary, details_en, contact, fbLink, tags, orgName, orgId, orgAvatar, creatorType, verified, source } = req.body;
    if (!title_en || !location_en || !hours || !salary || !contact || !tags || tags.length === 0) {
      return res.status(400).json({ message: 'All fields are required, including at least one tag' });
    }
    if (containsProfanity(title_en) || (title_ar && containsProfanity(title_ar)) || tags.some(t => containsProfanity(t))) {
      return res.status(400).json({ message: 'Job title or tags contain inappropriate language' });
    }
    const isMemberSource = source === 'member';
    const job = await Job.create({
      title_en,
      title_ar: title_ar || title_en,
      location_en: location_en || '',
      location_ar: req.body.location_ar || location_en || '',
      hours: hours || '',
      salary: salary || '',
      details_en: details_en || '',
      details_ar: req.body.details_ar || details_en || '',
      contact,
      fbLink: fbLink || '',
      tags: tags || [],
      creatorType: creatorType || 'user',
      orgName: orgName || '',
      orgId: orgId || '',
      orgAvatar: orgAvatar || '',
      verified: !!verified,
      postedBy: req.userId,
      source: isMemberSource ? 'member' : 'company',
      status: isMemberSource ? 'pending' : 'approved'
    });
    await createAuditLog({ category: 'activity', type: 'job_create', actionType: 'content', actorId: req.userId, actorName: actorSnapshot(req.user).actorName, actorRole: req.user.role, message: 'Created job', targetType: 'job', targetId: String(job._id), targetName: job.title_en || job.title_ar || '', details: source || 'company' });
    if (isMemberSource) {
      try {
        const User = (await import('../models/User.js')).default;
        const admins = await User.find({ role: { $in: ['admin', 'developer'] } }).select('_id').lean();
        const title = title_en || 'A job';
        for (const admin of admins) {
          await createNotification({ userId: admin._id, type: 'job_pending', message: `${title} is pending approval`, link: '/member-jobs' });
        }
      } catch {}
    }
    res.status(201).json({ job });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/jobs/:id', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    const ownsJob = job.postedBy && job.postedBy.toString() === req.userId.toString();
    if (!ownsJob && !isAdmin(req)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const { title_en, title_ar, location_en, hours, salary, details_en, contact, fbLink, tags, orgName, orgAvatar } = req.body;
    if (!title_en || !location_en || !hours || !salary || !contact || !tags || tags.length === 0) {
      return res.status(400).json({ message: 'All fields are required, including at least one tag' });
    }
    if (containsProfanity(title_en) || (title_ar && containsProfanity(title_ar)) || tags.some(t => containsProfanity(t))) {
      return res.status(400).json({ message: 'Job title or tags contain inappropriate language' });
    }
    job.title_en = title_en;
    job.title_ar = req.body.title_ar || title_en;
    job.location_en = location_en || '';
    job.location_ar = req.body.location_ar || location_en || '';
    job.hours = hours || '';
    job.salary = salary || '';
    job.details_en = details_en || '';
    job.details_ar = req.body.details_ar || details_en || '';
    job.contact = contact;
    job.fbLink = fbLink || '';
    job.tags = tags || [];
    if (orgName) job.orgName = orgName;
    if (orgAvatar !== undefined) job.orgAvatar = orgAvatar;
    job.markModified('tags');
    if (job.source === 'member' && job.status === 'approved') {
      job.status = 'pending';
      job.bumpedAt = new Date();
      try {
        const User = (await import('../models/User.js')).default;
        const admins = await User.find({ role: { $in: ['admin', 'developer'] } }).select('_id').lean();
        const title = job.title_en || job.title_ar || 'A job';
        for (const admin of admins) {
          await createNotification({ userId: admin._id, type: 'job_pending', message: `${title} was edited and needs re-approval`, link: '/member-jobs' });
        }
      } catch {}
    }
    await job.save();
    await createAuditLog({ category: 'activity', type: 'job_update', actionType: 'content', actorId: req.userId, actorName: actorSnapshot(req.user).actorName, actorRole: req.user.role, message: 'Updated job', targetType: 'job', targetId: String(job._id), targetName: job.title_en || job.title_ar || '' });
    res.json({ job });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/jobs/:id/hiring', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.postedBy && job.postedBy.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    job.hiring = !job.hiring;
    await job.save();
    await createAuditLog({ category: 'activity', type: 'job_hiring_toggle', actionType: 'content', actorId: req.userId, actorName: actorSnapshot(req.user).actorName, actorRole: req.user.role, message: 'Toggled hiring status', targetType: 'job', targetId: String(job._id), targetName: job.title_en || job.title_ar || '' });
    res.json({ job });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/jobs/:id/bump', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    const ownsJob = job.postedBy && job.postedBy.toString() === req.userId.toString();
    if (!ownsJob && !isAdmin(req)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const COOLDOWN_MS = 60 * 60 * 1000;
    if (job.bumpedAt) {
      const elapsed = Date.now() - new Date(job.bumpedAt).getTime();
      if (elapsed < COOLDOWN_MS) {
        const remainingMin = Math.ceil((COOLDOWN_MS - elapsed) / 60000);
        return res.status(429).json({ message: `Please wait ${remainingMin} minute(s) before bumping again` });
      }
    }
    job.bumpedAt = new Date();
    await job.save();
    await createAuditLog({ category: 'activity', type: 'job_bump', actionType: 'content', actorId: req.userId, actorName: actorSnapshot(req.user).actorName, actorRole: req.user.role, message: 'Bumped job', targetType: 'job', targetId: String(job._id), targetName: job.title_en || job.title_ar || '' });
    res.json({ job });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/jobs/pending-count', auth, async (req, res) => {
  try {
    if (!(await isStaff(req))) return res.json({ count: 0 });
    const count = await Job.countDocuments({ source: 'member', status: 'pending' });
    await createAuditLog({ category: 'activity', type: 'job_pending_count', actionType: 'content', actorId: req.userId, actorName: actorSnapshot(req.user).actorName, actorRole: req.user.role, message: 'Viewed pending job count' });
    res.json({ count });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

router.post('/jobs/:id/approve', auth, async (req, res) => {
  try {
    if (req.user) {
      console.log('[APPROVE] Request by User ID:', req.user._id, 'Name:', req.user.name, 'Role:', req.user.role);
    } else {
      console.log('[APPROVE] Request by unauthenticated user?');
    }
    if (!(await isStaff(req))) return res.status(403).json({ message: 'Not authorized' });
    const job = await Job.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.postedBy) {
      const title = job.title_ar || job.title_en || 'Job';
      await createNotification({ userId: job.postedBy, type: 'job_approved', message: `Your job "${title}" has been approved`, link: '/member-jobs' });
    }
    await createAuditLog({ category: 'staff', type: 'job_approve', actionType: 'approve', actorId: req.userId, actorName: actorSnapshot(req.user).actorName, actorRole: req.user.role, message: 'Approved job', targetType: 'job', targetId: String(job._id), targetName: job.title_en || job.title_ar || '' });
    res.json({ job });
  } catch (err) {
    console.error('[APPROVE] Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/jobs/:id/reject', auth, async (req, res) => {
  try {
    if (req.user) {
      console.log('[REJECT] Request by User ID:', req.user._id, 'Name:', req.user.name, 'Role:', req.user.role);
    } else {
      console.log('[REJECT] Request by unauthenticated user?');
    }
    if (!(await isStaff(req))) return res.status(403).json({ message: 'Not authorized' });
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    const reason = req.body?.reason || '(no reason)';
    console.log(`[REJECT] Job ${req.params.id} "${job.title_ar || job.title_en}" rejected by ${req.userId}. Reason: ${reason}`);
    if (job.postedBy) {
      const title = job.title_ar || job.title_en || 'Job';
      await createNotification({ userId: job.postedBy, type: 'job_rejected', message: `Your job "${title}" has been rejected. Reason: ${reason}`, link: '/member-jobs' });
    }
    await createAuditLog({ category: 'staff', type: 'job_reject', actionType: 'reject', actorId: req.userId, actorName: actorSnapshot(req.user).actorName, actorRole: req.user.role, message: 'Rejected job', targetType: 'job', targetId: String(job._id), targetName: job.title_en || job.title_ar || '', details: reason });
    res.json({ message: 'Deleted', reason });
  } catch (err) {
    console.error('[REJECT] Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/jobs/:id', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    const ownsJob = job.postedBy && job.postedBy.toString() === req.userId.toString();
    if (!ownsJob) {
      const isAllowed = job.source === 'member' ? (await isStaff(req)) : isAdmin(req);
      if (!isAllowed) return res.status(403).json({ message: 'Not authorized' });
    }
    await Job.findByIdAndDelete(req.params.id);
    await createAuditLog({ category: 'staff', type: 'job_delete', actionType: 'delete', actorId: req.userId, actorName: actorSnapshot(req.user).actorName, actorRole: req.user.role, message: 'Deleted job', targetType: 'job', targetId: String(job._id), targetName: job.title_en || job.title_ar || '' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
