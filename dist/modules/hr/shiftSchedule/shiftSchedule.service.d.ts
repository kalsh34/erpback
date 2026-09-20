import mongoose from 'mongoose';
import { IShiftSchedule } from '../../../models/ShiftSchedule';
import { AlgorithmConfig, AlgorithmAssignment, ExternalDuty, ShiftMode, ShiftType } from './shiftSchedule.algorithm';
export interface RosterCell {
    date: string;
    shiftType: ShiftType;
    startTime: string;
    endTime: string;
    guardId: string;
    guardName: string;
    employeeCode: string;
    isOverride: boolean;
    source: 'POOL' | 'FLOATER';
}
export declare class ShiftScheduleService {
    static getAll(query: {
        status?: string;
        search?: string;
        siteId?: string;
    }): Promise<(mongoose.Document<unknown, {}, IShiftSchedule, {}, {}> & IShiftSchedule & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static getById(id: string): Promise<{
        generatedCount: number;
        name: string;
        description?: string;
        siteId: mongoose.Types.ObjectId;
        guardPool: import("../../../models/ShiftSchedule").ISchedulePoolGuard[];
        floaterPool: import("../../../models/ShiftSchedule").ISchedulePoolGuard[];
        shiftMode: import("../../../models/ShiftSchedule").ShiftMode;
        dayCount: number;
        nightCount: number;
        dayStartTime: string;
        dayEndTime: string;
        nightStartTime: string;
        nightEndTime: string;
        startDate: Date;
        endDate: Date;
        status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
        lastGeneratedAt?: Date;
        createdBy: mongoose.Types.ObjectId;
        createdAt: Date;
        updatedAt: Date;
        _id: mongoose.Types.ObjectId;
        $locals: Record<string, unknown>;
        $op: "save" | "validate" | "remove" | null;
        $where: Record<string, unknown>;
        baseModelName?: string;
        collection: mongoose.Collection;
        db: mongoose.Connection;
        errors?: mongoose.Error.ValidationError;
        id?: any;
        isNew: boolean;
        schema: mongoose.Schema;
        __v: number;
    }>;
    static normalizePayload(data: any, fallbackTimes?: {
        dayStartTime: string;
        dayEndTime: string;
        nightStartTime: string;
        nightEndTime: string;
    }): {
        name: any;
        description: any;
        siteId: any;
        shiftMode: ShiftMode;
        dayCount: number;
        nightCount: number;
        dayStartTime: string;
        dayEndTime: string;
        nightStartTime: string;
        nightEndTime: string;
        startDate: Date;
        endDate: Date;
    };
    static create(data: any, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<mongoose.Document<unknown, {}, IShiftSchedule, {}, {}> & IShiftSchedule & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static update(id: string, data: any, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<mongoose.Document<unknown, {}, IShiftSchedule, {}, {}> & IShiftSchedule & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static delete(id: string, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<void>;
    static addGuards(id: string, guardIds: string[], userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<mongoose.Document<unknown, {}, IShiftSchedule, {}, {}> & IShiftSchedule & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static removeGuard(id: string, guardId: string, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<mongoose.Document<unknown, {}, IShiftSchedule, {}, {}> & IShiftSchedule & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static reorderPool(id: string, orderedGuardIds: string[], userId: string): Promise<mongoose.Document<unknown, {}, IShiftSchedule, {}, {}> & IShiftSchedule & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static addFloaters(id: string, guardIds: string[], userId: string): Promise<mongoose.Document<unknown, {}, IShiftSchedule, {}, {}> & IShiftSchedule & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static removeFloater(id: string, guardId: string, userId: string): Promise<mongoose.Document<unknown, {}, IShiftSchedule, {}, {}> & IShiftSchedule & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /**
     * Every duty the pooled guards already have OUTSIDE this plan, inside a
     * window slightly wider than the scheduling range (rest needs up to 48h of
     * look-behind/look-ahead). Sources:
     *  - ScheduleAssignment documents from OTHER plans (cross-site awareness)
     *  - ShiftAssignment manual/recurring shift templates (expanded per day)
     */
    static loadExternalDuties(planId: string, guardIds: string[], rangeStart: Date, rangeEnd: Date): Promise<ExternalDuty[]>;
    private static buildAlgorithmConfig;
    /** Solve one scheduling window. Does not touch the database. */
    static solve(plan: IShiftSchedule, rangeStart: Date, rangeEnd: Date): Promise<{
        assignments: AlgorithmAssignment[];
        warnings: import("./shiftSchedule.algorithm").AlgorithmWarning[];
        uncoveredSlots: number;
        cfg: AlgorithmConfig;
        external: ExternalDuty[];
    }>;
    static preview(id: string, startDateStr?: string, endDateStr?: string): Promise<{
        plan: {
            id: any;
            name: string;
            siteName: any;
            shiftMode: import("../../../models/ShiftSchedule").ShiftMode;
            dayCount: number;
            nightCount: number;
            startDate: Date;
            endDate: Date;
            status: "DRAFT" | "ARCHIVED" | "PUBLISHED";
        };
        range: {
            startDate: Date;
            endDate: Date;
            days: number;
        };
        shiftTimes: {
            day: string;
            night: string;
        };
        roster: {
            date: string;
            shiftType: ShiftType;
            startTime: string;
            endTime: string;
            guardId: string;
            guardName: string;
            employeeCode: any;
            isOverride: boolean;
            source: "POOL" | "FLOATER";
        }[];
        guardStats: {
            guardId: any;
            name: string;
            employeeCode: any;
            dayShifts: number;
            nightShifts: number;
            fullShifts: number;
            totalShifts: number;
            hours: number;
            overrides: number;
        }[];
        warnings: import("./shiftSchedule.algorithm").AlgorithmWarning[];
        uncoveredSlots: number;
        externalCommitments: {
            guardId: string;
            count: number;
        }[];
    }>;
    /** Persist the computed schedule into ScheduleAssignment documents. */
    static generate(id: string, data: {
        startDate?: string;
        endDate?: string;
        overwrite?: boolean;
    }, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<{
        created: number;
        days: number;
        overrides: number;
        uncoveredSlots: number;
        warnings: import("./shiftSchedule.algorithm").AlgorithmWarning[];
    }>;
    static getAssignments(id: string, startDateStr?: string, endDateStr?: string): Promise<(mongoose.Document<unknown, {}, import("../../../models/ScheduleAssignment").IScheduleAssignment, {}, {}> & import("../../../models/ScheduleAssignment").IScheduleAssignment & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static clearAssignments(id: string, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<{
        deleted: number;
    }>;
    /** All commitments of the pooled guards in a range (from every plan + manual shifts) — for the UI. */
    static getGuardCommitments(id: string, startDateStr?: string, endDateStr?: string): Promise<{
        guardId: string;
        guardName: string;
        start: Date;
        end: Date;
        source: string | undefined;
    }[]>;
}
//# sourceMappingURL=shiftSchedule.service.d.ts.map