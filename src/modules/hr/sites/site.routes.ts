import { Router, Request, Response, NextFunction } from 'express';
import { SiteController } from './site.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';
import { Site } from '../../../models/Site';
import { ShiftAssignment } from '../../../models/ShiftAssignment';
import { PrimarySiteAssignment } from '../../../models/PrimarySiteAssignment';
import { SiteNote } from '../../../models/SiteNote';
import { RotationAssignment } from '../../../models/RotationAssignment';
import { Rotation } from '../../../models/Rotation';
import { ApiError } from '../../../common/ApiError';

const router = Router();
router.use(authenticate);

router.get('/', authorize(PERMISSIONS.SITE_READ), SiteController.getAll);
router.get('/:id', authorize(PERMISSIONS.SITE_READ), SiteController.getById);
router.post('/', authorize(PERMISSIONS.SITE_CREATE), SiteController.create);
router.put('/:id', authorize(PERMISSIONS.SITE_UPDATE), SiteController.update);
router.delete('/:id', authorize(PERMISSIONS.SITE_UPDATE), SiteController.delete);

router.get('/:id/detail', authorize(PERMISSIONS.SITE_READ), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const site = await Site.findById(req.params.id);
    if (!site) throw ApiError.notFound('Site not found');
    const siteId = req.params.id;
    const isInactive = site.status === 'INACTIVE';

    // Guards: current when active; full history (incl. past) when inactive
    const primaryFilter = isInactive
      ? { siteId }
      : { siteId, isCurrent: true };

    const [activeAssignments, primaryAssignments, recentNotes, rotationAssignments, rotations] = await Promise.all([
      ShiftAssignment.find({ siteId, status: isInactive ? { $in: ['ACTIVE', 'INACTIVE'] } : 'ACTIVE' })
        .populate('guardId', 'firstName lastName employeeCode status')
        .populate('shiftTemplateId', 'name startTime endTime color'),
      PrimarySiteAssignment.find(primaryFilter)
        .populate('guardId', 'firstName lastName employeeCode status')
        .sort({ effectiveFrom: -1 }),
      SiteNote.find({ siteId })
        .populate('recordedById', 'firstName lastName')
        .sort({ date: -1 })
        .limit(20),
      RotationAssignment.find({ siteId })
        .populate('guardId', 'firstName lastName employeeCode')
        .sort({ date: -1 })
        .limit(90),
      Rotation.find({ siteId }).select('name title status startDate endDate').sort({ createdAt: -1 }).limit(5),
    ]);

    // Split primary assignments for UI
    const currentAssignments = isInactive ? [] : primaryAssignments.filter((a: any) => a.isCurrent);
    const pastAssignments = primaryAssignments.filter((a: any) => !a.isCurrent);

    res.json({
      success: true,
      data: {
        site,
        activeAssignments,
        currentAssignments,
        pastAssignments,
        recentNotes,
        rotationAssignments,
        rotations,
      },
    });
  } catch (error) { next(error); }
});

export default router;
