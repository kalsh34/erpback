"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../middleware/auth");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
const SiteNote_1 = require("../../../models/SiteNote");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.post('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.ATTENDANCE_FILE), async (req, res, next) => {
    try {
        const { siteId, date, noteText } = req.body;
        if (!siteId || !date || !noteText?.trim()) {
            return res.status(400).json({ success: false, message: 'siteId, date, and noteText are required' });
        }
        const note = await SiteNote_1.SiteNote.create({
            siteId,
            date,
            noteText: noteText.trim(),
            recordedById: req.user?.userId,
        });
        res.status(201).json({ success: true, data: note });
    }
    catch (error) {
        next(error);
    }
});
router.get('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.ATTENDANCE_READ), async (req, res, next) => {
    try {
        const { siteId, date, dateFrom, dateTo } = req.query;
        const filter = {};
        if (siteId)
            filter.siteId = siteId;
        if (date) {
            filter.date = date;
        }
        else if (dateFrom || dateTo) {
            filter.date = {};
            if (dateFrom)
                filter.date.$gte = dateFrom;
            if (dateTo)
                filter.date.$lte = dateTo;
        }
        const notes = await SiteNote_1.SiteNote.find(filter)
            .populate('recordedById', 'name email')
            .sort({ date: -1, createdAt: -1 });
        res.json({ success: true, data: notes });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=siteNotes.routes.js.map