"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../middleware/auth");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
const Department_1 = require("../../../models/Department");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.SETTINGS_READ), async (req, res, next) => {
    try {
        const departments = await Department_1.Department.find().sort({ name: 1 });
        res.json({ success: true, data: departments });
    }
    catch (err) {
        next(err);
    }
});
router.post('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.SETTINGS_UPDATE), async (req, res, next) => {
    try {
        const department = await Department_1.Department.create(req.body);
        res.status(201).json({ success: true, data: department });
    }
    catch (err) {
        if (err.code === 11000) {
            res.status(409).json({ success: false, message: 'Department already exists' });
            return;
        }
        next(err);
    }
});
router.put('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.SETTINGS_UPDATE), async (req, res, next) => {
    try {
        const department = await Department_1.Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!department) {
            res.status(404).json({ success: false, message: 'Department not found' });
            return;
        }
        res.json({ success: true, data: department });
    }
    catch (err) {
        next(err);
    }
});
router.delete('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.SETTINGS_UPDATE), async (req, res, next) => {
    try {
        await Department_1.Department.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Department deleted' });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=department.routes.js.map