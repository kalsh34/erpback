import mongoose from 'mongoose';
import { IRotation, IShiftDefinition, IRestRule } from '../../../models/Rotation';
import { Cell, ConflictIssue, RestRule, ShiftDefInput } from './engine';
/**
 * Resolve effective shift definitions for a rotation.
 * New documents store shiftDefinitions; legacy documents only have day/night
 * count + times (night START historically lived in nightEndTime = '18:00').
 */
export declare function resolveShifts(rot: IRotation): ShiftDefInput[];
export declare class RotationService {
    static computeDayAssignments(rot: IRotation, date: Date): {
        guardId: mongoose.Types.ObjectId;
        shiftType: 'DAY' | 'NIGHT';
        shiftTime: string;
    }[];
    private static loadGuardCtxs;
    private static loadExternalDuties;
    private static buildLeaveWindows;
    private static periodBounds;
    private static buildEngineInput;
    private static runEngine;
    static create(data: {
        name: string;
        description?: string;
        siteId: string;
        shiftMode?: 'STANDARD_12H' | 'SINGLE_24H' | 'CUSTOM';
        shiftDefinitions?: IShiftDefinition[];
        dayShiftCount: number;
        nightShiftCount: number;
        dayStartTime?: string;
        dayEndTime?: string;
        nightStartTime?: string;
        nightEndTime?: string;
        restRules?: IRestRule[];
        startDate: string;
        endDate?: string;
    }, userId: string, _auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<mongoose.Document<unknown, {}, IRotation, {}, {}> & IRotation & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static getAll(filters?: {
        status?: string;
        search?: string;
    }): Promise<(mongoose.Document<unknown, {}, IRotation, {}, {}> & IRotation & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static getById(id: string): Promise<mongoose.Document<unknown, {}, IRotation, {}, {}> & IRotation & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static update(id: string, data: any, userId: string, _auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<mongoose.Document<unknown, {}, IRotation, {}, {}> & IRotation & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static delete(id: string, _userId: string, _auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<void>;
    /**
     * A guard may only serve in a site's rotation if they are currently assigned
     * to that site. Enforced on every pool write and re-checked before each
     * generation so assignments that ended later cannot keep working shifts.
     */
    private static filterGuardsAssignedToSite;
    static addGuards(id: string, guardIds: string[], userId: string, _auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<mongoose.Document<unknown, {}, IRotation, {}, {}> & IRotation & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static removeGuard(id: string, guardId: string, userId: string, _auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<mongoose.Document<unknown, {}, IRotation, {}, {}> & IRotation & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static reorderPool(id: string, orderedGuardIds: string[], userId: string): Promise<mongoose.Document<unknown, {}, IRotation, {}, {}> & IRotation & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static addFloaters(id: string, guardIds: string[], _userId: string): Promise<mongoose.Document<unknown, {}, IRotation, {}, {}> & IRotation & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static removeFloater(id: string, guardId: string, _userId: string): Promise<mongoose.Document<unknown, {}, IRotation, {}, {}> & IRotation & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static checkFairness(poolSize: number, slotCountPerDay: number): {
        isFair: boolean;
        message: string;
        cycleDays?: undefined;
        dutyPercent?: undefined;
        workDaysPerCycle?: undefined;
    } | {
        isFair: boolean;
        cycleDays: number;
        dutyPercent: number;
        message?: undefined;
        workDaysPerCycle?: undefined;
    } | {
        isFair: boolean;
        cycleDays: number;
        workDaysPerCycle: number;
        dutyPercent: number;
        message?: undefined;
    };
    static preview(id: string, days?: number, startDate?: string): Promise<{
        assignments: {
            date: Date;
            guardId: string;
            shiftType: any;
            shiftTime: string;
            slotIndex: number;
            shiftKey: string;
            shiftName: string;
            startAt: Date;
            endAt: Date;
            guard: {
                _id: string;
                firstName: string;
                lastName: string;
                employeeCode: string | undefined;
                status: string;
            } | null;
        }[];
        shiftTimes: {
            day: string;
            night: string;
        };
        siteName: any;
        poolSize: number;
        slotCountPerDay: number;
        cycleDays: number;
        guardStats: {
            guardId: string;
            name: string;
            employeeCode: string | undefined;
            dayShifts: number;
            nightShifts: number;
            totalShifts: number;
            restDays: number;
            hours: number;
        }[];
        days: number;
        startDate: Date;
        cells: Cell[];
        conflicts: ConflictIssue[];
        stats: import("./engine").StatsReport;
        feasibility: import("./engine").Feasibility;
        warnings: string[];
        algorithmVersion: string;
        rulesFingerprint: string;
        restRules: RestRule[];
        shiftDefinitions: ShiftDefInput[];
    }>;
    static generate(id: string, days?: number, userId?: string, _auditCtx?: {
        ip?: string;
        ua?: string;
    }, startDate?: string): Promise<{
        count: number;
        days: number;
        startDate: Date;
        conflicts: ConflictIssue[];
        stats: import("./engine").StatsReport;
        feasibility: import("./engine").Feasibility;
        warnings: string[];
        status: "REVIEW";
    }>;
    /** Re-validate the schedule currently stored in RotationAssignment. */
    static validate(id: string, days?: number, startDate?: string): Promise<{
        ok: boolean;
        issues: string[];
        conflicts: ConflictIssue[];
        checked: number;
        days: number;
        feasibility: string;
    }>;
    static getStats(id: string, days?: number, startDate?: string): Promise<any>;
    static getConflicts(id: string): Promise<{
        conflicts: any[];
        conflictCount: number;
        feasibility: "FULLY_COMPLIANT" | "BEST_POSSIBLE" | undefined;
        stale: boolean;
        generatedAt: Date | undefined;
    }>;
    static approve(id: string, userId: string, _auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<mongoose.Document<unknown, {}, IRotation, {}, {}> & IRotation & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static publish(id: string, userId: string, _auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<mongoose.Document<unknown, {}, IRotation, {}, {}> & IRotation & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static getAssignments(id: string, startDate?: string, endDate?: string): Promise<(mongoose.Document<unknown, {}, import("../../../models/RotationAssignment").IRotationAssignment, {}, {}> & import("../../../models/RotationAssignment").IRotationAssignment & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static activate(id: string, _userId: string, _auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<mongoose.Document<unknown, {}, IRotation, {}, {}> & IRotation & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static pause(id: string, _userId: string, _auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<mongoose.Document<unknown, {}, IRotation, {}, {}> & IRotation & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static archive(id: string, _userId: string, _auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<mongoose.Document<unknown, {}, IRotation, {}, {}> & IRotation & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static complete(id: string, userId: string, _auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<mongoose.Document<unknown, {}, IRotation, {}, {}> & IRotation & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static cancel(id: string, userId: string, _auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<mongoose.Document<unknown, {}, IRotation, {}, {}> & IRotation & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /**
     * Move a cell's guard within the same day (reassign to a resting pool guard,
     * or swap two working guards). Coverage is preserved by construction.
     * Violations -> 409 with the violation list (unless override).
     */
    static move(id: string, data: {
        date: string;
        fromGuardId: string;
        toGuardId: string;
        shiftKey?: string;
        override?: boolean;
    }, userId: string, _auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<{
        ok: boolean;
        violations: string[];
    }>;
    private static checkMoveFeasible;
    /** Day-scoped rotate: cyclically reassign the day's guards across its cells. */
    static rotate(id: string, data: {
        date?: string;
        dayIndex?: number;
        steps?: number;
        override?: boolean;
    }, userId: string, _auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<{
        ok: boolean;
        date: Date;
        violations: string[];
    } | {
        count: number;
        days: number;
        startDate: Date;
        conflicts: ConflictIssue[];
        stats: import("./engine").StatsReport;
        feasibility: import("./engine").Feasibility;
        warnings: string[];
        status: "REVIEW";
        ok: boolean;
        regenerated: boolean;
        date?: undefined;
        violations?: undefined;
    }>;
    /** Re-run the engine with minimal disruption intent (full deterministic recompute). */
    static recalculate(id: string, days?: number, userId?: string, _auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<{
        count: number;
        days: number;
        startDate: Date;
        conflicts: ConflictIssue[];
        stats: import("./engine").StatsReport;
        feasibility: import("./engine").Feasibility;
        warnings: string[];
        status: "REVIEW";
    }>;
    static suggestLeaveCoverA(id: string, guardId: string, date: Date): Promise<{
        guardId: any;
        reason: string;
    }[]>;
    static suggestLeaveCoverB(id: string, date: Date): Promise<{
        guardId: any;
        reason: string;
    }[]>;
    static applyLeaveCoverage(id: string, data: {
        guardId: string;
        startDate: string;
        endDate: string;
        path: string;
        coverGuardId: string;
    }, userId: string, _auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<mongoose.Document<unknown, {}, IRotation, {}, {}> & IRotation & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static isGuardInActiveRotation(guardId: string): Promise<string | null>;
    static cancelLeaveCoverage(id: string, guardId: string, startDate: Date, _userId: string): Promise<mongoose.Document<unknown, {}, IRotation, {}, {}> & IRotation & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
//# sourceMappingURL=rotation.service.d.ts.map