import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';
import { SiteNote } from '../../../models/SiteNote';

const router = Router();
router.use(authenticate);

router.post('/', authorize(PERMISSIONS.ATTENDANCE_FILE), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { siteId, date, noteText } = req.body;
    if (!siteId || !date || !noteText?.trim()) {
      return res.status(400).json({ success: false, message: 'siteId, date, and noteText are required' });
    }
    const note = await SiteNote.create({
      siteId,
      date,
      noteText: noteText.trim(),
      recordedById: req.user?.userId,
    });
    res.status(201).json({ success: true, data: note });
  } catch (error) { next(error); }
});

router.get('/', authorize(PERMISSIONS.ATTENDANCE_READ), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { siteId, date, dateFrom, dateTo } = req.query;
    const filter: any = {};
    if (siteId) filter.siteId = siteId;
    if (date) {
      filter.date = date;
    } else if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = dateFrom as string;
      if (dateTo) filter.date.$lte = dateTo as string;
    }
    const notes = await SiteNote.find(filter)
      .populate('recordedById', 'name email')
      .sort({ date: -1, createdAt: -1 });
    res.json({ success: true, data: notes });
  } catch (error) { next(error); }
});

export default router;
