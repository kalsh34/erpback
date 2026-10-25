import { INotification } from '../../models/Notification';
export interface CreateNotificationInput {
    userId: string;
    title: string;
    message: string;
    type?: INotification['type'];
    link?: string;
}
export declare class NotificationService {
    /** Latest notifications for one user + unread count (bell dropdown data). */
    static listForUser(userId: string, limit?: number): Promise<{
        items: (import("mongoose").Document<unknown, {}, INotification, {}, {}> & INotification & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        unreadCount: number;
    }>;
    static markRead(userId: string, notificationId: string): Promise<(import("mongoose").Document<unknown, {}, INotification, {}, {}> & INotification & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    static markAllRead(userId: string): Promise<number>;
    /**
     * Fan-out a notification to every ACTIVE user whose EFFECTIVE permissions
     * (role defaults + module grants − denies) include `permission`.
     * Capped so one event can never flood the collection.
     */
    static createForPermission(permission: string, input: Omit<CreateNotificationInput, 'userId'>, cap?: number): Promise<number>;
    /** Direct notification to a single user. */
    static create(input: CreateNotificationInput): Promise<import("mongoose").Document<unknown, {}, INotification, {}, {}> & INotification & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
//# sourceMappingURL=notification.service.d.ts.map