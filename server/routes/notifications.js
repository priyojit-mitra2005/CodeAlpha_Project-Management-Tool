import express from 'express';
import { run, query } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get unread and recent notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await query(
      `SELECT n.*, u.name as sender_name, u.avatar as sender_avatar
       FROM notifications n
       LEFT JOIN users u ON n.sender_id = u.id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC LIMIT 50`,
      [userId]
    );

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId, markAll } = req.body;

    if (markAll) {
      await run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
    } else if (notificationId) {
      await run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [notificationId, userId]);
    }

    res.json({ message: 'Notifications updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

export default router;
