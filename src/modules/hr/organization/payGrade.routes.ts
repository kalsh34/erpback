import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';
import { PayGrade } from '../../../models/PayGrade';

const router = Router();
router.use(authenticate);

router.get('/', authorize(PERMISSIONS.ORGANIZATION_READ, PERMISSIONS.SETTINGS_READ), async (_req, res, next) => {
  try {
    const payGrades = await PayGrade.find().sort({ basicSalary: 1, name: 1 });
    res.json({ success: true, data: payGrades });
  } catch (err) { next(err); }
});

router.post('/', authorize(PERMISSIONS.ORGANIZATION_MANAGE), async (req, res, next) => {
  try {
    const payGrade = await PayGrade.create(req.body);
    res.status(201).json({ success: true, data: payGrade });
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(409).json({ success: false, message: 'Pay grade already exists' });
      return;
    }
    next(err);
  }
});

router.put('/:id', authorize(PERMISSIONS.ORGANIZATION_MANAGE), async (req, res, next) => {
  try {
    const payGrade = await PayGrade.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!payGrade) { res.status(404).json({ success: false, message: 'Pay grade not found' }); return; }
    res.json({ success: true, data: payGrade });
  } catch (err) { next(err); }
});

router.delete('/:id', authorize(PERMISSIONS.ORGANIZATION_MANAGE), async (req, res, next) => {
  try {
    await PayGrade.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Pay grade deleted' });
  } catch (err) { next(err); }
});

export default router;
