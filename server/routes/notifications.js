import { Router } from 'express';
import auth from '../middleware/auth.js';
import Notification from '../models/Notification.js';

const router = Router();

/* GET /notifications - get current user's notifications */
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

/* GET /notifications/unread-count */
router.get('/notifications/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.userId, read: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

/* PUT /notifications/:id/read - mark single as read */
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

/* PUT /notifications/read-all - mark all as read */
router.put('/notifications/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.userId, read: false }, { read: true });
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

/* DELETE /notifications/:id - delete a notification */
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

/* Helper to create a notification (used by other route files) */
export async function createNotification({ userId, type, message, link = '' }) {
  try {
    return await Notification.create({ userId, type, message, link });
  } catch (err) {
    console.error('[NOTIF] Failed to create notification:', err.message);
  }
}
