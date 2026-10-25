"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const Notification_1 = require("../../models/Notification");
const User_1 = require("../../models/User");
const rbac_1 = require("../../middleware/rbac");
class NotificationService {
    /** Latest notifications for one user + unread count (bell dropdown data). */
    static async listForUser(userId, limit = 50) {
        const [items, unreadCount] = await Promise.all([
            Notification_1.Notification.find({ userId }).sort({ createdAt: -1 }).limit(Math.min(limit, 100)),
            Notification_1.Notification.countDocuments({ userId, read: false }),
        ]);
        return { items, unreadCount };
    }
    static async markRead(userId, notificationId) {
        const doc = await Notification_1.Notification.findOne({ _id: notificationId, userId });
        if (!doc)
            return null;
        if (!doc.read) {
            doc.read = true;
            doc.readAt = new Date();
            await doc.save();
        }
        return doc;
    }
    static async markAllRead(userId) {
        const result = await Notification_1.Notification.updateMany({ userId, read: false }, { $set: { read: true, readAt: new Date() } });
        return result.modifiedCount;
    }
    /**
     * Fan-out a notification to every ACTIVE user whose EFFECTIVE permissions
     * (role defaults + module grants − denies) include `permission`.
     * Capped so one event can never flood the collection.
     */
    static async createForPermission(permission, input, cap = 50) {
        const users = await User_1.User.find({ isActive: true })
            .select('role moduleGrants moduleDenies')
            .lean();
        const recipients = users
            .filter((u) => {
            const perms = (0, rbac_1.computeEffectivePermissions)(u);
            return perms.includes(permission);
        })
            .slice(0, cap);
        if (recipients.length === 0)
            return 0;
        const docs = await Notification_1.Notification.insertMany(recipients.map((u) => ({
            userId: u._id,
            title: input.title,
            message: input.message,
            type: input.type || 'INFO',
            link: input.link,
        })));
        return docs.length;
    }
    /** Direct notification to a single user. */
    static async create(input) {
        return Notification_1.Notification.create({
            userId: input.userId,
            title: input.title,
            message: input.message,
            type: input.type || 'INFO',
            link: input.link,
        });
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=notification.service.js.map