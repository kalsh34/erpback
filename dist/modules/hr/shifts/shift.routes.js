"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../middleware/auth");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
const ShiftTemplate_1 = require("../../../models/ShiftTemplate");
const ShiftAssignment_1 = require("../../../models/ShiftAssignment");
const rotation_service_1 = require("../rotation/rotation.service");
const ApiError_1 = require("../../../common/ApiError");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/templates', (0, rbac_1.authorize)(types_1.PERMISSIONS.ATTENDANCE_READ), async (req, res, next) => {
    try {
        const filter = { active: true };
        if (req.query.siteId)
            filter.siteId = req.query.siteId;
        const templates = await ShiftTemplate_1.ShiftTemplate.find(filter).populate('siteId', 'siteName siteCode').sort({ createdAt: -1 });
        res.json({ success: true, data: templates });
    }
    catch (error) {
        next(error);
    }
});
router.get('/templates/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.ATTENDANCE_READ), async (req, res, next) => {
    try {
        const template = await ShiftTemplate_1.ShiftTemplate.findById(req.params.id).populate('siteId', 'siteName siteCode');
        if (!template)
            throw ApiError_1.ApiError.notFound('Shift template not found');
        res.json({ success: true, data: template });
    }
    catch (error) {
        next(error);
    }
});
router.post('/templates', (0, rbac_1.authorize)(types_1.PERMISSIONS.SITE_CREATE), async (req, res, next) => {
    try {
        const { siteId, name, startTime, endTime, daysOfWeek, color, maxGuards } = req.body;
        if (!siteId || !name || !startTime || !endTime)
            throw ApiError_1.ApiError.badRequest('siteId, name, startTime, and endTime are required');
        const template = await ShiftTemplate_1.ShiftTemplate.create({
            siteId, name, startTime, endTime,
            daysOfWeek: daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
            maxGuards: maxGuards || 1, color: color || '#3B82F6',
        });
        res.status(201).json({ success: true, data: template });
    }
    catch (error) {
        next(error);
    }
});
router.put('/templates/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.SITE_UPDATE), async (req, res, next) => {
    try {
        const template = await ShiftTemplate_1.ShiftTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!template)
            throw ApiError_1.ApiError.notFound('Shift template not found');
        res.json({ success: true, data: template });
    }
    catch (error) {
        next(error);
    }
});
router.delete('/templates/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.SITE_UPDATE), async (req, res, next) => {
    try {
        const template = await ShiftTemplate_1.ShiftTemplate.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
        if (!template)
            throw ApiError_1.ApiError.notFound('Shift template not found');
        res.json({ success: true, message: 'Template deactivated' });
    }
    catch (error) {
        next(error);
    }
});
router.get('/assignments', (0, rbac_1.authorize)(types_1.PERMISSIONS.ATTENDANCE_READ), async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.siteId)
            filter.siteId = req.query.siteId;
        if (req.query.guardId)
            filter.guardId = req.query.guardId;
        if (req.query.status)
            filter.status = req.query.status;
        if (req.query.date) {
            const d = new Date(req.query.date);
            filter.startDate = { $lte: d };
            filter.$or = [{ endDate: { $gte: d } }, { endDate: { $exists: false } }, { endDate: null }];
        }
        const assignments = await ShiftAssignment_1.ShiftAssignment.find(filter)
            .populate('guardId', 'firstName lastName employeeCode')
            .populate('siteId', 'siteName siteCode')
            .populate('shiftTemplateId', 'name startTime endTime color daysOfWeek')
            .sort({ startDate: -1 });
        res.json({ success: true, data: assignments });
    }
    catch (error) {
        next(error);
    }
});
router.post('/assignments', (0, rbac_1.authorize)(types_1.PERMISSIONS.GUARD_ASSIGN_SITE), async (req, res, next) => {
    try {
        const { guardId, siteId, shiftTemplateId, startDate, endDate } = req.body;
        if (!guardId || !siteId || !shiftTemplateId || !startDate)
            throw ApiError_1.ApiError.badRequest('guardId, siteId, shiftTemplateId, and startDate are required');
        const template = await ShiftTemplate_1.ShiftTemplate.findById(shiftTemplateId);
        if (!template)
            throw ApiError_1.ApiError.notFound('Shift template not found');
        if (template.siteId.toString() !== siteId)
            throw ApiError_1.ApiError.badRequest('Shift template does not belong to the specified site');
        const rotationId = await rotation_service_1.RotationService.isGuardInActiveRotation(guardId);
        if (rotationId)
            throw ApiError_1.ApiError.badRequest('This guard is enrolled in an active rotation. Remove from rotation before manual shift assignment.');
        const assignDate = new Date(startDate);
        const assignDayOfWeek = assignDate.getDay();
        if (!template.daysOfWeek.includes(assignDayOfWeek)) {
            throw ApiError_1.ApiError.badRequest(`Shift "${template.name}" does not run on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][assignDayOfWeek]}s`);
        }
        const existingForGuard = await ShiftAssignment_1.ShiftAssignment.findOne({ guardId, siteId, status: 'ACTIVE', $or: [{ endDate: { $exists: false } }, { endDate: null }] });
        if (existingForGuard)
            throw ApiError_1.ApiError.badRequest('This guard already has an active shift assignment at this site. Remove it first.');
        const existingCount = await ShiftAssignment_1.ShiftAssignment.countDocuments({ shiftTemplateId, status: 'ACTIVE', startDate: { $lte: assignDate }, $or: [{ endDate: { $gte: assignDate } }, { endDate: { $exists: false } }, { endDate: null }] });
        if (existingCount >= template.maxGuards)
            throw ApiError_1.ApiError.badRequest(`Shift full: ${existingCount}/${template.maxGuards} guards already assigned to "${template.name}"`);
        const assignment = await ShiftAssignment_1.ShiftAssignment.create({ guardId, siteId, shiftTemplateId, startDate: assignDate, endDate: endDate ? new Date(endDate) : undefined, assignedById: req.user?.userId });
        res.status(201).json({ success: true, data: assignment });
    }
    catch (error) {
        next(error);
    }
});
router.put('/assignments/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.GUARD_ASSIGN_SITE), async (req, res, next) => {
    try {
        const assignment = await ShiftAssignment_1.ShiftAssignment.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!assignment)
            throw ApiError_1.ApiError.notFound('Assignment not found');
        res.json({ success: true, data: assignment });
    }
    catch (error) {
        next(error);
    }
});
router.delete('/assignments/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.GUARD_ASSIGN_SITE), async (req, res, next) => {
    try {
        const assignment = await ShiftAssignment_1.ShiftAssignment.findByIdAndUpdate(req.params.id, { status: 'INACTIVE' }, { new: true });
        if (!assignment)
            throw ApiError_1.ApiError.notFound('Assignment not found');
        res.json({ success: true, message: 'Assignment deactivated' });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=shift.routes.js.map