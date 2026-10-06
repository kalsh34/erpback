"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const site_controller_1 = require("./site.controller");
const auth_1 = require("../../../middleware/auth");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
const Site_1 = require("../../../models/Site");
const ShiftAssignment_1 = require("../../../models/ShiftAssignment");
const PrimarySiteAssignment_1 = require("../../../models/PrimarySiteAssignment");
const SiteNote_1 = require("../../../models/SiteNote");
const RotationAssignment_1 = require("../../../models/RotationAssignment");
const Rotation_1 = require("../../../models/Rotation");
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
        const siteId = req.params.id;
        const isInactive = site.status === 'INACTIVE';
        // Guards: current when active; full history (incl. past) when inactive
        const primaryFilter = isInactive
            ? { siteId }
            : { siteId, isCurrent: true };
        const [activeAssignments, primaryAssignments, recentNotes, rotationAssignments, rotations] = await Promise.all([
            ShiftAssignment_1.ShiftAssignment.find({ siteId, status: isInactive ? { $in: ['ACTIVE', 'INACTIVE'] } : 'ACTIVE' })
                .populate('guardId', 'firstName lastName employeeCode status')
                .populate('shiftTemplateId', 'name startTime endTime color'),
            PrimarySiteAssignment_1.PrimarySiteAssignment.find(primaryFilter)
                .populate('guardId', 'firstName lastName employeeCode status')
                .sort({ effectiveFrom: -1 }),
            SiteNote_1.SiteNote.find({ siteId })
                .populate('recordedById', 'firstName lastName')
                .sort({ date: -1 })
                .limit(20),
            RotationAssignment_1.RotationAssignment.find({ siteId })
                .populate('guardId', 'firstName lastName employeeCode')
                .sort({ date: -1 })
                .limit(90),
            Rotation_1.Rotation.find({ siteId }).select('name title status startDate endDate').sort({ createdAt: -1 }).limit(5),
        ]);
        // Split primary assignments for UI
        const currentAssignments = isInactive ? [] : primaryAssignments.filter((a) => a.isCurrent);
        const pastAssignments = primaryAssignments.filter((a) => !a.isCurrent);
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
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=site.routes.js.map