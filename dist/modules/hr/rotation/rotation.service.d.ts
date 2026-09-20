import mongoose from 'mongoose';
import { IRotation } from '../../../models/Rotation';
export declare class RotationService {
    static getShiftLabel(rot: IRotation, shiftType: 'DAY' | 'NIGHT'): string;
    static getActivePool(rot: IRotation): any[];
    static computeDayAssignments(rot: IRotation, date: Date): {
        guardId: mongoose.Types.ObjectId;
        shiftType: 'DAY' | 'NIGHT';
        shiftTime: string;
    }[];
    static create(data: {
        name: string;
        description?: string;
        siteId: string;
        shiftMode?: 'STANDARD_12H' | 'SINGLE_24H';
        dayShiftCount: number;
        nightShiftCount: number;
        dayStartTime?: string;
        dayEndTime?: string;
        nightStartTime?: string;
        nightEndTime?: string;
        startDate: string;
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
    static addGuards(id: string, guardIds: string[], _userId: string, _auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<mongoose.Document<unknown, {}, IRotation, {}, {}> & IRotation & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static removeGuard(id: string, guardId: string, _userId: string, _auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<mongoose.Document<unknown, {}, IRotation, {}, {}> & IRotation & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static reorderPool(id: string, orderedGuardIds: string[], _userId: string): Promise<mongoose.Document<unknown, {}, IRotation, {}, {}> & IRotation & Required<{
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
        cycleDays: number;
        message?: undefined;
        workDaysPerCycle?: undefined;
        dutyPercent?: undefined;
    } | {
        isFair: boolean;
        message: string;
        cycleDays?: undefined;
        workDaysPerCycle?: undefined;
        dutyPercent?: undefined;
    } | {
        isFair: boolean;
        cycleDays: number;
        workDaysPerCycle: number;
        dutyPercent: number;
        message?: undefined;
    };
    static preview(id: string, days: number): Promise<{
        assignments: any[];
        shiftTimes: {
            day: string;
            night: string;
        };
        siteName: any;
        poolSize: number;
        slotCountPerDay: number;
        cycleDays: number;
    }>;
    static generate(id: string, days: number, userId: string, _auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<{
        count: number;
        days: number;
        skipped: {
            guardId: string;
            date: string;
            shiftType: string;
            reason: string;
        }[];
        total: number;
    }>;
    static getAssignments(id: string, startDate?: string, endDate?: string): Promise<(mongoose.Document<unknown, {}, import("../../../models/RotationAssignment").IRotationAssignment, {}, {}> & import("../../../models/RotationAssignment").IRotationAssignment & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static rotateAssignments(id: string, date: string): Promise<(mongoose.Document<unknown, {}, import("../../../models/RotationAssignment").IRotationAssignment, {}, {}> & import("../../../models/RotationAssignment").IRotationAssignment & Required<{
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