import { Notification, INotification } from '../../models/Notification';
import { User } from '../../models/User';
import { computeEffectivePermissions } from '../../middleware/rbac';
import { PERMISSIONS } from '../../types';

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type?: INotification['type'];
  link?: string;
}

export class NotificationService {
  /** Latest notifications for one user + unread count (bell dropdown data). */
  static async listForUser(userId: string, limit = 50) {
    const [items, unreadCount] = await Promise.all([
      Notification.find({ userId }).sort({ createdAt: -1 }).limit(Math.min(limit, 100)),
      Notification.countDocuments({ userId, read: false }),
    ]);
    return { items, unreadCount };
  }

  static async markRead(userId: string, notificationId: string) {
    const doc = await Notification.findOne({ _id: notificationId, userId });
    if (!doc) return null;
    if (!doc.read) {
      doc.read = true;
      doc.readAt = new Date();
      await doc.save();
    }
    return doc;
  }

  static async markAllRead(userId: string) {
    const result = await Notification.updateMany(
      { userId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );
    return result.modifiedCount;
  }

  /**
   * Fan-out a notification to every ACTIVE user whose EFFECTIVE permissions
   * (role defaults + module grants − denies) include `permission`.
   * Capped so one event can never flood the collection.
   */
  static async createForPermission(
    permission: string,
    input: Omit<CreateNotificationInput, 'userId'>,
    cap = 50
  ): Promise<number> {
    const users = await User.find({ isActive: true })
      .select('role moduleGrants moduleDenies')
      .lean();
    const recipients = users
      .filter((u) => {
        const perms = computeEffectivePermissions(u as any);
        return perms.includes(permission as any);
      })
      .slice(0, cap);

    if (recipients.length === 0) return 0;
    const docs = await Notification.insertMany(
      recipients.map((u) => ({
        userId: (u as any)._id,
        title: input.title,
        message: input.message,
        type: input.type || 'INFO',
        link: input.link,
      }))
    );
    return docs.length;
  }

  /** Direct notification to a single user. */
  static async create(input: CreateNotificationInput) {
    return Notification.create({
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type || 'INFO',
      link: input.link,
    });
  }
}
