import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';
import { Department } from '../../../models/Department';

const router = Router();
router.use(authenticate);

router.get('/', authorize(PERMISSIONS.SETTINGS_READ), async (req, res, next) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    res.json({ success: true, data: departments });
  } catch (err) { next(err); }
});

router.post('/', authorize(PERMISSIONS.SETTINGS_UPDATE), async (req, res, next) => {
  try {
    const department = await Department.create(req.body);
    res.status(201).json({ success: true, data: department });
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(409).json({ success: false, message: 'Department already exists' });
      return;
    }
    next(err);
  }
});

router.put('/:id', authorize(PERMISSIONS.SETTINGS_UPDATE), async (req, res, next) => {
  try {
    const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!department) { res.status(404).json({ success: false, message: 'Department not found' }); return; }
    res.json({ success: true, data: department });
  } catch (err) { next(err); }
});

router.delete('/:id', authorize(PERMISSIONS.SETTINGS_UPDATE), async (req, res, next) => {
  try {
    await Department.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Department deleted' });
  } catch (err) { next(err); }
});

export default router;
