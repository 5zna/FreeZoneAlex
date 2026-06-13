import express from 'express';
import Report from '../models/Report.js';
import Reply from '../models/Reply.js';
import MemberRole from '../models/MemberRole.js';

var router = express.Router();

async function isStaff(req) {
  if (!req.user) return false;
  if (req.user.role === 'developer' || req.user.role === 'admin' || req.user.role === 'moderator') return true;
  try {
    var mr = await MemberRole.findOne({ userId: req.user._id }).lean();
    return mr && mr.roles && mr.roles.some(r => r.roleName && r.roleName.charAt(0) === '@');
  } catch { return false; }
}

function isOpener(report, userId) {
  return report && String(report.userId) === String(userId);
}

function validateAttachmentSize(data) {
  var prefixEnd = data.indexOf('base64,');
  if (prefixEnd === -1) return data.length;
  var b64 = data.slice(prefixEnd + 7);
  var padding = 0;
  if (b64.endsWith('==')) padding = 2;
  else if (b64.endsWith('=')) padding = 1;
  return (b64.length * 3) / 4 - padding;
}

router.post('/reports', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    var { type, title, content, attachments } = req.body;
    if (!type || !title) return res.status(400).json({ message: 'Type and title are required' });
    if (attachments && attachments.length) {
      for (var i = 0; i < attachments.length; i++) {
        var a = attachments[i];
        if (!a.data || !a.name || !a.type) return res.status(400).json({ message: 'Each attachment must have name, data, and type' });
        var bytes = validateAttachmentSize(a.data);
        if (bytes <= 0) return res.status(400).json({ message: 'Attachment file is empty: ' + a.name });
        if (bytes > 8 * 1024 * 1024) return res.status(400).json({ message: 'Attachment exceeds 8MB limit: ' + a.name });
      }
    }
    var report = await Report.create({ userId: req.user._id, type, title, content: content || '', attachments: attachments || [] });
    return res.status(201).json({ report });
  } catch (err) {
    console.error('Report create error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/reports/my', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    var reports = await Report.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
    return res.json({ reports });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/reports/inbox', async (req, res) => {
  try {
    if (!req.user || !(await isStaff(req))) return res.status(403).json({ message: 'Forbidden' });
    var reports = await Report.find().sort({ createdAt: -1 }).populate('userId', 'name username avatar').lean();
    return res.json({ reports });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.put('/reports/:id/status', async (req, res) => {
  try {
    if (!req.user || !(await isStaff(req))) return res.status(403).json({ message: 'Forbidden' });
    var { status } = req.body;
    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    var report = await Report.findByIdAndUpdate(req.params.id, { status }, { new: true }).lean();
    if (!report) return res.status(404).json({ message: 'Not found' });
    return res.json({ report });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/reports/:id/replies', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    var report = await Report.findById(req.params.id).lean();
    if (!report) return res.status(404).json({ message: 'Not found' });
    var allowed = isOpener(report, req.user._id) || (await isStaff(req));
    if (!allowed) return res.status(403).json({ message: 'Forbidden' });
    var replies = await Reply.find({ reportId: req.params.id }).sort({ createdAt: 1 }).populate('userId', 'name username avatar role').lean();
    return res.json({ replies });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/reports/:id/replies', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    var report = await Report.findById(req.params.id).lean();
    if (!report) return res.status(404).json({ message: 'Not found' });
    var allowed = isOpener(report, req.user._id) || (await isStaff(req));
    if (!allowed) return res.status(403).json({ message: 'Forbidden' });
    var { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ message: 'Content is required' });
    var reply = await Reply.create({ reportId: req.params.id, userId: req.user._id, content: content.trim() });
    var populated = await Reply.findById(reply._id).populate('userId', 'name username avatar role').lean();
    return res.status(201).json({ reply: populated });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
