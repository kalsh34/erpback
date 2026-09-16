import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';
import { Position } from '../../../models/Position';

const router = Router();
router.use(authenticate);

router.get('/', authorize(PERMISSIONS.SETTINGS_READ), async (req, res, next) => {
  try {
    const filter: any = {};
    if (req.query.departmentId) filter.departmentId = req.query.departmentId;
    const positions = await Position.find(filter).populate('departmentId', 'name').sort({ name: 1 });
    res.json({ success: true, data: positions });
  } catch (err) { next(err); }
});

router.post('/', authorize(PERMISSIONS.SETTINGS_UPDATE), async (req, res, next) => {
  try {
    const position = await Position.create(req.body);
    res.status(201).json({ success: true, data: position });
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(409).json({ success: false, message: 'Position already exists' });
      return;
    }
    next(err);
  }
});

router.put('/:id', authorize(PERMISSIONS.SETTINGS_UPDATE), async (req, res, next) => {
  try {
    const position = await Position.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!position) { res.status(404).json({ success: false, message: 'Position not found' }); return; }
    res.json({ success: true, data: position });
  } catch (err) { next(err); }
});

router.delete('/:id', authorize(PERMISSIONS.SETTINGS_UPDATE), async (req, res, next) => {
  try {
    await Position.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Position deleted' });
  } catch (err) { next(err); }
});

export default router;
