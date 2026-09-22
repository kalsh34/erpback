"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const site_controller_1 = require("./site.controller");
const auth_1 = require("../../../middleware/auth");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
const Site_1 = require("../../../models/Site");
const ShiftAssignment_1 = require("../../../models/ShiftAssignment");
const ShiftTemplate_1 = require("../../../models/ShiftTemplate");
const PrimarySiteAssignment_1 = require("../../../models/PrimarySiteAssignment");
const AttendanceRecord_1 = require("../../../models/AttendanceRecord");
const SiteNote_1 = require("../../../models/SiteNote");
const RotationAssignment_1 = require("../../../models/RotationAssignment");
const ApiError_1 = require("../../../common/ApiError");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.SITE_READ), site_controller_1.SiteController.getAll);
router.get('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.SITE_READ), site_controller_1.SiteController.getById);
router.post('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.SITE_CREATE), site_controller_1.SiteController.create);
router.put('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.SITE_UPDATE), site_controller_1.SiteController.update);
router.delete('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.SITE_UPDATE), site_controller_1.SiteController.delete);
router.get('/:id/detail', (0, rbac_1.authorize)(types_1.PERMISSIONS.SITE_READ), async (req, res, next) => {
    try {
        const site = await Site_1.Site.findById(req.params.id);
        if (!site)
            throw ApiError_1.ApiError.notFound('Site not found');
        const [activeAssignments, currentAssignments, recentAttendance, recentNotes, rotationAssignments, shiftTemplates] = await Promise.all([
            ShiftAssignment_1.ShiftAssignment.find({ siteId: req.params.id, status: 'ACTIVE' })
                .populate('guardId', 'firstName lastName employeeCode status'),
            PrimarySiteAssignment_1.PrimarySiteAssignment.find({ siteId: req.params.id, isCurrent: true })
                .populate('guardId', 'firstName lastName employeeCode status'),
            AttendanceRecord_1.AttendanceRecord.find({ siteId: req.params.id })
                .populate('guardId', 'firstName lastName employeeCode')
                .sort({ date: -1 })
                .limit(50),
            SiteNote_1.SiteNote.find({ siteId: req.params.id })
                .populate('recordedById', 'firstName lastName')
                .sort({ date: -1 })
                .limit(20),
            RotationAssignment_1.RotationAssignment.find({ siteId: req.params.id })
                .populate('guardId', 'firstName lastName employeeCode')
                .sort({ date: -1 })
                .limit(60),
            ShiftTemplate_1.ShiftTemplate.find({}).sort({ name: 1 }),
        ]);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const todayAttendance = await AttendanceRecord_1.AttendanceRecord.find({
            siteId: req.params.id,
            date: { $gte: today, $lt: tomorrow },
        }).populate('guardId', 'firstName lastName employeeCode');
        const onDuty = todayAttendance.filter((a) => a.clockIn && !a.clockOut);
        const clockedOut = todayAttendance.filter((a) => a.clockIn && a.clockOut);
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
                    onDutyGuards: onDuty.map((a) => ({
                        guardId: a.guardId?._id,
                        name: `${a.guardId?.firstName} ${a.guardId?.lastName}`,
                        code: a.guardId?.employeeCode,
                        clockIn: a.clockIn,
                        totalHours: a.totalHours,
                    })),
                },
            },
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=site.routes.js.map