"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const notification_service_1 = require("./notification.service");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
/** GET /api/notifications — my latest notifications + unread count. */
router.get('/', async (req, res, next) => {
    try {
        const data = await notification_service_1.NotificationService.listForUser(req.user.userId);
        res.json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
/** POST /api/notifications/read-all — mark every notification read. */
router.post('/read-all', async (req, res, next) => {
    try {
        const modified = await notification_service_1.NotificationService.markAllRead(req.user.userId);
        res.json({ success: true, data: { modified } });
    }
    catch (err) {
        next(err);
    }
});
/** POST /api/notifications/:id/read — mark one notification read. */
router.post('/:id/read', async (req, res, next) => {
    try {
        const doc = await notification_service_1.NotificationService.markRead(req.user.userId, req.params.id);
        if (!doc) {
            res.status(404).json({ success: false, message: 'Notification not found' });
            return;
        }
        res.json({ success: true, data: doc });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=notification.routes.js.map