"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../middleware/auth");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
const PayGrade_1 = require("../../../models/PayGrade");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.ORGANIZATION_READ, types_1.PERMISSIONS.SETTINGS_READ), async (_req, res, next) => {
    try {
        const payGrades = await PayGrade_1.PayGrade.find().sort({ basicSalary: 1, name: 1 });
        res.json({ success: true, data: payGrades });
    }
    catch (err) {
        next(err);
    }
});
router.post('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.ORGANIZATION_MANAGE), async (req, res, next) => {
    try {
        const payGrade = await PayGrade_1.PayGrade.create(req.body);
        res.status(201).json({ success: true, data: payGrade });
    }
    catch (err) {
        if (err.code === 11000) {
            res.status(409).json({ success: false, message: 'Pay grade already exists' });
            return;
        }
        next(err);
    }
});
router.put('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.ORGANIZATION_MANAGE), async (req, res, next) => {
    try {
        const payGrade = await PayGrade_1.PayGrade.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!payGrade) {
            res.status(404).json({ success: false, message: 'Pay grade not found' });
            return;
        }
        res.json({ success: true, data: payGrade });
    }
    catch (err) {
        next(err);
    }
});
router.delete('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.ORGANIZATION_MANAGE), async (req, res, next) => {
    try {
        await PayGrade_1.PayGrade.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Pay grade deleted' });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=payGrade.routes.js.map