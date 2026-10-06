import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { NotificationService } from './notification.service';

const router = Router();
router.use(authenticate);

/** GET /api/notifications — my latest notifications + unread count. */
router.get('/', async (req, res, next) => {
  try {
    const data = await NotificationService.listForUser(req.user!.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

/** POST /api/notifications/read-all — mark every notification read. */
router.post('/read-all', async (req, res, next) => {
  try {
    const modified = await NotificationService.markAllRead(req.user!.userId);
    res.json({ success: true, data: { modified } });
  } catch (err) { next(err); }
});

/** POST /api/notifications/:id/read — mark one notification read. */
router.post('/:id/read', async (req, res, next) => {
  try {
    const doc = await NotificationService.markRead(req.user!.userId, req.params.id);
    if (!doc) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
});

export default router;
