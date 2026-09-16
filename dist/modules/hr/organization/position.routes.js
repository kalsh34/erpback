"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../middleware/auth");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
const Position_1 = require("../../../models/Position");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.SETTINGS_READ), async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.departmentId)
            filter.departmentId = req.query.departmentId;
        const positions = await Position_1.Position.find(filter).populate('departmentId', 'name').sort({ name: 1 });
        res.json({ success: true, data: positions });
    }
    catch (err) {
        next(err);
    }
});
router.post('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.SETTINGS_UPDATE), async (req, res, next) => {
    try {
        const position = await Position_1.Position.create(req.body);
        res.status(201).json({ success: true, data: position });
    }
    catch (err) {
        if (err.code === 11000) {
            res.status(409).json({ success: false, message: 'Position already exists' });
            return;
        }
        next(err);
    }
});
router.put('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.SETTINGS_UPDATE), async (req, res, next) => {
    try {
        const position = await Position_1.Position.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!position) {
            res.status(404).json({ success: false, message: 'Position not found' });
            return;
        }
        res.json({ success: true, data: position });
    }
    catch (err) {
        next(err);
    }
});
router.delete('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.SETTINGS_UPDATE), async (req, res, next) => {
    try {
        await Position_1.Position.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Position deleted' });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=position.routes.js.map