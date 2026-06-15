import { Router } from 'express';
import auth from '../server/middleware/auth.js';
import Notification from '../server/models/Notification.js';

const router = Router();

router.get('/notifications', auth, async (req, res) => {
  try {
    const { unreadOnly } = req.query;
    const filter = { userId: req.userId };
    if (unreadOnly === 'true') filter.read = false;
    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/notifications/unread/count', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.userId, read: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/notifications/:id/read', auth, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { read: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    res.json({ notification: notif });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/notifications/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.userId, read: false }, { read: true });
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/notifications/:id', auth, async (req, res) => {
  try {
    const notif = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

export async function createNotification({ userId, type, message, link = '' }) {
  try {
    return await Notification.create({ userId, type, message, link });
  } catch (err) {
    console.error('[NOTIF] Failed to create notification:', err.message);
  }
}
