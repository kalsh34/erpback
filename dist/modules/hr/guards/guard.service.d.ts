import mongoose from 'mongoose';
import { UserRole } from '../../../types';
export declare class GuardService {
    static registerGuard(data: {
        firstName: string;
        lastName: string;
        phone?: string;
        idCardNumber?: string;
        employmentType: string;
        email: string;
        password: string;
        rate?: number;
        transportAllowance?: number;
        homeSiteId?: string;
    }, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<{
        employee: mongoose.Document<unknown, {}, import("../../../models/Employee").IEmployee, {}, {}> & import("../../../models/Employee").IEmployee & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        };
        user: {
            email: string;
            role: UserRole;
        };
    }>;
    static assignSite(data: {
        guardId: string;
        siteId: string;
        role?: 'GUARD' | 'SUPERVISOR';
    }, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<mongoose.Document<unknown, {}, import("../../../models/PrimarySiteAssignment").IPrimarySiteAssignment, {}, {}> & import("../../../models/PrimarySiteAssignment").IPrimarySiteAssignment & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /**
     * Operations can move the Primary Site later. The flag lives on the
     * assignment itself (never inferred from array order) and homeSiteId is kept
     * in sync. Historical attendance stays attached to the site it was recorded
     * at — nothing about attendance rows changes here.
     */
    static setPrimarySite(guardId: string, siteId: string, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<mongoose.Document<unknown, {}, import("../../../models/PrimarySiteAssignment").IPrimarySiteAssignment, {}, {}> & import("../../../models/PrimarySiteAssignment").IPrimarySiteAssignment & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static getGuardSites(guardId: string): Promise<(mongoose.Document<unknown, {}, import("../../../models/PrimarySiteAssignment").IPrimarySiteAssignment, {}, {}> & import("../../../models/PrimarySiteAssignment").IPrimarySiteAssignment & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static removeSiteAssignment(assignmentId: string, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<mongoose.Document<unknown, {}, import("../../../models/PrimarySiteAssignment").IPrimarySiteAssignment, {}, {}> & import("../../../models/PrimarySiteAssignment").IPrimarySiteAssignment & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /**
     * Guard roster with profiles + current site assignments.
     * Optional filters:
     *  - siteId      → only guards currently assigned to that site (isCurrent: true)
     *  - assignment  → 'assigned' | 'unassigned' — whether the guard holds any current site assignment
     *  - status      → employee status (ACTIVE, CONTRACTED, …); 'active' short-cut = ACTIVE or CONTRACTED
     *  - search      → matches name or employee code
     */
    static getAllGuards(filters?: {
        siteId?: string;
        assignment?: 'assigned' | 'unassigned';
        status?: string;
        search?: string;
    }): Promise<{
        employee: mongoose.Document<unknown, {}, import("../../../models/Employee").IEmployee, {}, {}> & import("../../../models/Employee").IEmployee & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        };
        profile: (mongoose.Document<unknown, {}, import("../../../models/GuardProfile").IGuardProfile, {}, {}> & import("../../../models/GuardProfile").IGuardProfile & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        }) | null;
        currentAssignments: (mongoose.Document<unknown, {}, import("../../../models/PrimarySiteAssignment").IPrimarySiteAssignment, {}, {}> & import("../../../models/PrimarySiteAssignment").IPrimarySiteAssignment & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
    }[]>;
    static getGuardDetail(employeeId: string): Promise<{
        employee: mongoose.Document<unknown, {}, import("../../../models/Employee").IEmployee, {}, {}> & import("../../../models/Employee").IEmployee & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        };
        profile: (mongoose.Document<unknown, {}, import("../../../models/GuardProfile").IGuardProfile, {}, {}> & import("../../../models/GuardProfile").IGuardProfile & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        }) | null;
        assignments: (mongoose.Document<unknown, {}, import("../../../models/PrimarySiteAssignment").IPrimarySiteAssignment, {}, {}> & import("../../../models/PrimarySiteAssignment").IPrimarySiteAssignment & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
        user: {
            email: string;
            role: UserRole;
            isActive: boolean;
        } | null;
    }>;
    static updateGuard(employeeId: string, data: any, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<mongoose.Document<unknown, {}, import("../../../models/Employee").IEmployee, {}, {}> & import("../../../models/Employee").IEmployee & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static updateGuardPayRate(assignmentId: string, hourlyRate: number, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<mongoose.Document<unknown, {}, import("../../../models/PrimarySiteAssignment").IPrimarySiteAssignment, {}, {}> & import("../../../models/PrimarySiteAssignment").IPrimarySiteAssignment & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static setHomeSite(employeeId: string, homeSiteId: string | null, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<mongoose.Document<unknown, {}, import("../../../models/Employee").IEmployee, {}, {}> & import("../../../models/Employee").IEmployee & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
//# sourceMappingURL=guard.service.d.ts.map