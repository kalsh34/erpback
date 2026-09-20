import { Router, Request, Response, NextFunction } from 'express';
import { SiteController } from './site.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';
import { Site } from '../../../models/Site';
import { ShiftTemplate } from '../../../models/ShiftTemplate';
import { ShiftAssignment } from '../../../models/ShiftAssignment';
import { PrimarySiteAssignment } from '../../../models/PrimarySiteAssignment';
import { AttendanceRecord } from '../../../models/AttendanceRecord';
import { SiteNote } from '../../../models/SiteNote';
import { RotationAssignment } from '../../../models/RotationAssignment';
import { Employee } from '../../../models/Employee';
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

    const [shiftTemplates, activeAssignments, currentAssignments, recentAttendance, recentNotes, rotationAssignments] = await Promise.all([
      ShiftTemplate.find({}).sort({ name: 1 }),
      ShiftAssignment.find({ siteId: req.params.id, status: 'ACTIVE' })
        .populate('guardId', 'firstName lastName employeeCode status'),
      PrimarySiteAssignment.find({ siteId: req.params.id, isCurrent: true })
        .populate('guardId', 'firstName lastName employeeCode status'),
      AttendanceRecord.find({ siteId: req.params.id })
        .populate('guardId', 'firstName lastName employeeCode')
        .sort({ date: -1 })
        .limit(50),
      SiteNote.find({ siteId: req.params.id })
        .populate('recordedById', 'firstName lastName')
        .sort({ date: -1 })
        .limit(20),
      RotationAssignment.find({ siteId: req.params.id })
        .populate('guardId', 'firstName lastName employeeCode')
        .sort({ date: 1 })
        .limit(60),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await AttendanceRecord.find({
      siteId: req.params.id,
      date: { $gte: today, $lt: tomorrow },
    }).populate('guardId', 'firstName lastName employeeCode');

    const onDuty = todayAttendance.filter((a: any) => a.clockIn && !a.clockOut);
    const clockedOut = todayAttendance.filter((a: any) => a.clockIn && a.clockOut);

    res.json({
      success: true,
      data: {
        site,
        shiftTemplates,
        activeAssignments,
        currentAssignments,
        recentAttendance,
        recentNotes,
        rotationAssignments,
        todaySummary: {
          onDuty: onDuty.length,
          clockedOut: clockedOut.length,
          totalFiled: todayAttendance.length,
          onDutyGuards: onDuty.map((a: any) => ({
            guardId: a.guardId?._id,
            name: `${a.guardId?.firstName} ${a.guardId?.lastName}`,
            code: a.guardId?.employeeCode,
            clockIn: a.clockIn,
            totalHours: a.totalHours,
          })),
        },
      },
    });
  } catch (error) { next(error); }
});

export default router;
