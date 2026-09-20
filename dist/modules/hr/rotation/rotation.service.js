"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RotationService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Rotation_1 = require("../../../models/Rotation");
const RotationAssignment_1 = require("../../../models/RotationAssignment");
const ShiftAssignment_1 = require("../../../models/ShiftAssignment");
const Site_1 = require("../../../models/Site");
const ApiError_1 = require("../../../common/ApiError");
const EventBus_1 = require("../../../core/events/EventBus");
const conflict_check_1 = require("../shifts/conflict-check");
function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}
class RotationService {
    static getShiftLabel(rot, shiftType) {
        if (shiftType === 'DAY') {
            const start = rot.dayStartTime || '06:00';
            const end = rot.dayEndTime || rot.nightEndTime || '18:00';
            return `${start}-${end}`;
        }
        const start = rot.nightStartTime || rot.nightEndTime || '18:00';
        const end = rot.nightEndTime || '06:00';
        return `${start}-${end}`;
    }
    static getActivePool(rot) {
        return rot.guardPool
            .filter((g) => g.status === 'ACTIVE')
            .sort((a, b) => {
            const aId = (a.guardId?.toString() || '');
            const bId = (b.guardId?.toString() || '');
            if (aId === bId)
                return 0;
            return aId.localeCompare(bId);
        });
    }
    static computeDayAssignments(rot, date) {
        const activeGuards = this.getActivePool(rot);
        const poolSize = activeGuards.length;
        const dayShiftCount = rot.shiftMode === 'SINGLE_24H' ? Math.max(0, rot.dayShiftCount) : rot.dayShiftCount;
        const nightShiftCount = rot.shiftMode === 'SINGLE_24H' ? 0 : rot.nightShiftCount;
        const totalSlots = dayShiftCount + nightShiftCount;
        if (poolSize === 0 || totalSlots === 0)
            return [];
        const startDate = new Date(rot.startDate);
        startDate.setHours(0, 0, 0, 0);
        const dayOffset = Math.max(0, Math.floor((date.getTime() - startDate.getTime()) / 86400000));
        const startIndex = dayOffset % poolSize;
        const orderedPool = activeGuards.map((_, index) => activeGuards[(index + startIndex) % poolSize]);
        const assignments = [];
        for (let i = 0; i < dayShiftCount; i += 1) {
            const guard = orderedPool[i];
            if (guard) {
                assignments.push({ guardId: guard.guardId, shiftType: 'DAY', shiftTime: this.getShiftLabel(rot, 'DAY') });
            }
        }
        for (let i = 0; i < nightShiftCount; i += 1) {
            const guard = orderedPool[(dayShiftCount + i) % poolSize];
            if (guard) {
                assignments.push({ guardId: guard.guardId, shiftType: 'NIGHT', shiftTime: this.getShiftLabel(rot, 'NIGHT') });
            }
        }
        return assignments;
    }
    static async create(data, userId, _auditCtx) {
        const site = await Site_1.Site.findById(data.siteId);
        if (!site)
            throw ApiError_1.ApiError.notFound('Site not found');
        const shiftMode = data.shiftMode || 'STANDARD_12H';
        const dayShiftCount = Number(data.dayShiftCount ?? 0);
        const nightShiftCount = Number(data.nightShiftCount ?? 0);
        if (dayShiftCount < 0 || nightShiftCount < 0) {
            throw ApiError_1.ApiError.badRequest('Shift counts cannot be negative');
        }
        if (shiftMode === 'SINGLE_24H') {
            if (dayShiftCount < 1)
                throw ApiError_1.ApiError.badRequest('Single-shift rotations need at least 1 guard on duty');
        }
        const finalDayCount = shiftMode === 'SINGLE_24H' ? Math.max(1, dayShiftCount) : dayShiftCount;
        const finalNightCount = shiftMode === 'SINGLE_24H' ? 0 : nightShiftCount;
        if (finalDayCount + finalNightCount <= 0)
            throw ApiError_1.ApiError.badRequest('At least one guard must be scheduled per day');
        const rotation = await Rotation_1.Rotation.create({
            name: data.name,
            description: data.description,
            siteId: data.siteId,
            shiftMode,
            dayShiftCount: finalDayCount,
            nightShiftCount: finalNightCount,
            dayStartTime: data.dayStartTime || '06:00',
            dayEndTime: data.dayEndTime || '18:00',
            nightStartTime: data.nightStartTime || '18:00',
            nightEndTime: data.nightEndTime || '06:00',
            startDate: new Date(data.startDate),
            status: 'DRAFT',
            guardPool: [],
            floaterPool: [],
            leaveCoverages: [],
            createdBy: userId,
        });
        EventBus_1.eventBus.emit('hr.rotation.created', { rotationId: rotation._id, name: rotation.name });
        return rotation;
    }
    static async getAll(filters) {
        const query = {};
        if (filters?.status)
            query.status = filters.status;
        if (filters?.search)
            query.name = { $regex: filters.search, $options: 'i' };
        return Rotation_1.Rotation.find(query).sort({ createdAt: -1 }).populate('siteId', 'siteName siteCode');
    }
    static async getById(id) {
        const rot = await Rotation_1.Rotation.findById(id)
            .populate('siteId', 'siteName siteCode')
            .populate('guardPool.guardId', 'firstName lastName employeeCode status')
            .populate('floaterPool.guardId', 'firstName lastName employeeCode status');
        if (!rot)
            throw ApiError_1.ApiError.notFound('Rotation not found');
        return rot;
    }
    static async update(id, data, userId, _auditCtx) {
        const rotation = await Rotation_1.Rotation.findById(id);
        if (!rotation)
            throw ApiError_1.ApiError.notFound('Rotation not found');
        if (rotation.status !== 'DRAFT')
            throw ApiError_1.ApiError.badRequest('Can only edit DRAFT rotations');
        const allowed = ['name', 'description', 'shiftMode', 'dayShiftCount', 'nightShiftCount', 'dayStartTime', 'dayEndTime', 'nightStartTime', 'nightEndTime', 'startDate'];
        const nextMode = data.shiftMode ?? rotation.shiftMode ?? 'STANDARD_12H';
        const nextDay = Number(data.dayShiftCount ?? rotation.dayShiftCount ?? 0);
        let nextNight = Number(data.nightShiftCount ?? rotation.nightShiftCount ?? 0);
        if (nextMode === 'SINGLE_24H') {
            if (nextDay < 1)
                throw ApiError_1.ApiError.badRequest('Single-shift rotations need at least 1 guard on duty');
            nextNight = 0;
        }
        if (nextDay < 0 || nextNight < 0)
            throw ApiError_1.ApiError.badRequest('Shift counts cannot be negative');
        if (nextDay + nextNight <= 0)
            throw ApiError_1.ApiError.badRequest('At least one guard must be scheduled per day');
        rotation.shiftMode = nextMode;
        rotation.dayShiftCount = nextDay;
        rotation.nightShiftCount = nextNight;
        rotation.dayStartTime = data.dayStartTime ?? rotation.dayStartTime ?? '06:00';
        rotation.dayEndTime = data.dayEndTime ?? rotation.dayEndTime ?? '18:00';
        rotation.nightStartTime = data.nightStartTime ?? rotation.nightStartTime ?? '18:00';
        rotation.nightEndTime = data.nightEndTime ?? rotation.nightEndTime ?? '18:00';
        if (data.startDate)
            rotation.startDate = new Date(data.startDate);
        if (data.name !== undefined)
            rotation.name = data.name;
        if (data.description !== undefined)
            rotation.description = data.description;
        await rotation.save();
        return rotation;
    }
    static async delete(id, _userId, _auditCtx) {
        const rotation = await Rotation_1.Rotation.findById(id);
        if (!rotation)
            throw ApiError_1.ApiError.notFound('Rotation not found');
        await RotationAssignment_1.RotationAssignment.deleteMany({ rotationId: id });
        await Rotation_1.Rotation.findByIdAndDelete(id);
        EventBus_1.eventBus.emit('hr.rotation.deleted', { rotationId: id });
    }
    static async addGuards(id, guardIds, _userId, _auditCtx) {
        const rotation = await Rotation_1.Rotation.findById(id);
        if (!rotation)
            throw ApiError_1.ApiError.notFound('Rotation not found');
        for (const gid of guardIds) {
            const exists = rotation.guardPool.find((g) => g.guardId.toString() === gid);
            if (!exists) {
                rotation.guardPool.push({
                    guardId: new mongoose_1.default.Types.ObjectId(gid),
                    status: 'ACTIVE',
                    order: rotation.guardPool.length,
                });
            }
        }
        await rotation.save();
        return rotation;
    }
    static async removeGuard(id, guardId, _userId, _auditCtx) {
        const rotation = await Rotation_1.Rotation.findById(id);
        if (!rotation)
            throw ApiError_1.ApiError.notFound('Rotation not found');
        rotation.guardPool = rotation.guardPool.filter((g) => g.guardId.toString() !== guardId);
        rotation.guardPool.forEach((g, i) => { g.order = i; });
        await rotation.save();
        return rotation;
    }
    static async reorderPool(id, orderedGuardIds, _userId) {
        const rotation = await Rotation_1.Rotation.findById(id);
        if (!rotation)
            throw ApiError_1.ApiError.notFound('Rotation not found');
        const poolMap = new Map(rotation.guardPool.map((g) => [g.guardId.toString(), g]));
        rotation.guardPool = orderedGuardIds.map((gid, i) => {
            const existing = poolMap.get(gid);
            return { guardId: new mongoose_1.default.Types.ObjectId(gid), status: existing?.status || 'ACTIVE', order: i };
        });
        await rotation.save();
        return rotation;
    }
    static async addFloaters(id, guardIds, _userId) {
        const rotation = await Rotation_1.Rotation.findById(id);
        if (!rotation)
            throw ApiError_1.ApiError.notFound('Rotation not found');
        for (const gid of guardIds) {
            const exists = rotation.floaterPool.find((g) => g.guardId.toString() === gid);
            if (!exists) {
                rotation.floaterPool.push({ guardId: new mongoose_1.default.Types.ObjectId(gid), status: 'ACTIVE' });
            }
        }
        await rotation.save();
        return rotation;
    }
    static async removeFloater(id, guardId, _userId) {
        const rotation = await Rotation_1.Rotation.findById(id);
        if (!rotation)
            throw ApiError_1.ApiError.notFound('Rotation not found');
        rotation.floaterPool = rotation.floaterPool.filter((g) => g.guardId.toString() !== guardId);
        await rotation.save();
        return rotation;
    }
    static checkFairness(poolSize, slotCountPerDay) {
        if (poolSize <= 0 || slotCountPerDay <= 0)
            return { isFair: true, cycleDays: 0 };
        if (poolSize < slotCountPerDay)
            return { isFair: false, message: `Need at least ${slotCountPerDay} guards, have ${poolSize}` };
        const cycleDays = poolSize / gcd(poolSize, slotCountPerDay);
        const workDaysPerCycle = (cycleDays * slotCountPerDay) / poolSize;
        return {
            isFair: true,
            cycleDays,
            workDaysPerCycle,
            dutyPercent: Math.round((slotCountPerDay / poolSize) * 100),
        };
    }
    static async preview(id, days) {
        const rot = await Rotation_1.Rotation.findById(id).populate('siteId', 'siteName siteCode');
        if (!rot)
            throw ApiError_1.ApiError.notFound('Rotation not found');
        const activeGuards = this.getActivePool(rot);
        const poolSize = activeGuards.length;
        const slotCountPerDay = rot.shiftMode === 'SINGLE_24H' ? Math.max(rot.dayShiftCount, 1) : rot.dayShiftCount + rot.nightShiftCount;
        if (poolSize === 0)
            throw ApiError_1.ApiError.badRequest('No active guards in pool');
        if (slotCountPerDay <= 0)
            throw ApiError_1.ApiError.badRequest('At least one shift duty must be assigned');
        const result = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let d = 0; d < days; d += 1) {
            const date = new Date(today);
            date.setDate(date.getDate() + d);
            date.setHours(0, 0, 0, 0);
            const dayAssigns = this.computeDayAssignments(rot, date);
            for (const a of dayAssigns) {
                result.push({
                    date,
                    guardId: a.guardId,
                    shiftType: a.shiftType,
                    shiftTime: a.shiftTime,
                    slotIndex: a.shiftType === 'DAY' ? 0 : 1,
                });
            }
        }
        return {
            assignments: result,
            shiftTimes: { day: this.getShiftLabel(rot, 'DAY'), night: this.getShiftLabel(rot, 'NIGHT') },
            siteName: rot.siteId?.siteName || '',
            poolSize,
            slotCountPerDay,
            cycleDays: poolSize / gcd(poolSize, slotCountPerDay),
        };
    }
    static async generate(id, days, userId, _auditCtx) {
        const rot = await Rotation_1.Rotation.findById(id);
        if (!rot)
            throw ApiError_1.ApiError.notFound('Rotation not found');
        const activeGuards = this.getActivePool(rot);
        const poolSize = activeGuards.length;
        const slotCountPerDay = rot.shiftMode === 'SINGLE_24H' ? Math.max(rot.dayShiftCount, 1) : rot.dayShiftCount + rot.nightShiftCount;
        if (poolSize === 0)
            throw ApiError_1.ApiError.badRequest('No active guards in pool');
        if (slotCountPerDay <= 0)
            throw ApiError_1.ApiError.badRequest('At least one shift duty must be assigned');
        await RotationAssignment_1.RotationAssignment.deleteMany({ rotationId: id });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const assignments = [];
        const skipped = [];
        const guardIds = activeGuards.map((g) => g.guardId.toString());
        const allExistingAssignments = await ShiftAssignment_1.ShiftAssignment.find({
            guardId: { $in: guardIds },
            status: 'ACTIVE',
        }).populate('shiftTemplateId', 'startTime endTime');
        const existingByGuard = new Map();
        for (const a of allExistingAssignments) {
            const gid = a.guardId.toString();
            if (!existingByGuard.has(gid))
                existingByGuard.set(gid, []);
            existingByGuard.get(gid).push(a);
        }
        for (let d = 0; d < days; d += 1) {
            const date = new Date(today);
            date.setDate(date.getDate() + d);
            date.setHours(0, 0, 0, 0);
            const dayAssigns = this.computeDayAssignments(rot, date);
            for (const a of dayAssigns) {
                const guardIdStr = a.guardId.toString();
                const shiftStart = a.shiftType === 'DAY' ? rot.dayStartTime : rot.nightStartTime;
                const shiftEnd = a.shiftType === 'DAY' ? rot.dayEndTime : rot.nightEndTime;
                const existingList = existingByGuard.get(guardIdStr) || [];
                let conflict = false;
                let conflictInfo = '';
                for (const existing of existingList) {
                    const dayEnd = new Date(date);
                    dayEnd.setHours(23, 59, 59, 999);
                    const existStart = existing.startDate;
                    const existEnd = existing.endDate && existing.endDate.getTime() > 0 ? existing.endDate : new Date('2099-12-31');
                    if (!(date < existEnd && existStart <= dayEnd))
                        continue;
                    const template = existing.shiftTemplateId;
                    if (!template)
                        continue;
                    const eS = template.startTime;
                    const eE = template.endTime;
                    const overlaps = (0, conflict_check_1.shiftsTimeOverlap)(shiftStart || '06:00', shiftEnd || '18:00', eS, eE);
                    if (overlaps) {
                        conflict = true;
                        const site = existing.siteId;
                        conflictInfo = `conflicts with shift "${template.name}" (${eS}-${eE}) at ${site?.siteName || 'another site'}`;
                        break;
                    }
                }
                if (conflict) {
                    skipped.push({
                        guardId: guardIdStr,
                        date: date.toISOString().split('T')[0],
                        shiftType: a.shiftType,
                        reason: conflictInfo,
                    });
                    continue;
                }
                assignments.push({
                    rotationId: rot._id,
                    guardId: a.guardId,
                    siteId: rot.siteId,
                    date,
                    shiftType: a.shiftType,
                    shiftTime: a.shiftTime,
                    assignedBy: userId,
                });
            }
        }
        const created = await RotationAssignment_1.RotationAssignment.insertMany(assignments);
        rot.lastGeneratedDate = new Date();
        await rot.save();
        EventBus_1.eventBus.emit('hr.rotation.generated', { rotationId: id, count: created.length, days, skippedCount: skipped.length });
        return { count: created.length, days, skipped, total: created.length + skipped.length };
    }
    static async getAssignments(id, startDate, endDate) {
        const filter = { rotationId: id };
        if (startDate || endDate) {
            filter.date = {};
            if (startDate)
                filter.date.$gte = new Date(startDate);
            if (endDate)
                filter.date.$lte = new Date(endDate);
        }
        return RotationAssignment_1.RotationAssignment.find(filter)
            .populate('guardId', 'firstName lastName employeeCode')
            .sort({ date: 1, shiftType: 1 });
    }
    static async rotateAssignments(id, date) {
        const rotation = await Rotation_1.Rotation.findById(id);
        if (!rotation)
            throw ApiError_1.ApiError.notFound('Rotation not found');
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        const assignments = await RotationAssignment_1.RotationAssignment.find({ rotationId: id, date: targetDate }).sort({ shiftType: 1, createdAt: 1 });
        if (!assignments.length)
            return [];
        const dayAssignments = assignments.filter((a) => a.shiftType === 'DAY');
        const nightAssignments = assignments.filter((a) => a.shiftType === 'NIGHT');
        const swapCount = Math.min(dayAssignments.length, nightAssignments.length);
        for (let i = 0; i < swapCount; i += 1) {
            const dayAssignment = dayAssignments[i];
            const nightAssignment = nightAssignments[i];
            const dayGuard = dayAssignment.guardId;
            const nightGuard = nightAssignment.guardId;
            if (dayGuard && nightGuard) {
                dayAssignment.guardId = nightGuard;
                dayAssignment.shiftTime = this.getShiftLabel(rotation, 'DAY');
                nightAssignment.guardId = dayGuard;
                nightAssignment.shiftTime = this.getShiftLabel(rotation, 'NIGHT');
                await dayAssignment.save();
                await nightAssignment.save();
            }
        }
        return RotationAssignment_1.RotationAssignment.find({ rotationId: id, date: targetDate }).populate('guardId', 'firstName lastName employeeCode').sort({ shiftType: 1 });
    }
    static async activate(id, _userId, _auditCtx) {
        const rot = await Rotation_1.Rotation.findById(id);
        if (!rot)
            throw ApiError_1.ApiError.notFound('Rotation not found');
        if (rot.status === 'ACTIVE')
            throw ApiError_1.ApiError.badRequest('Already active');
        rot.status = 'ACTIVE';
        await rot.save();
        EventBus_1.eventBus.emit('hr.rotation.activated', { rotationId: id });
        return rot;
    }
    static async pause(id, _userId, _auditCtx) {
        const rot = await Rotation_1.Rotation.findById(id);
        if (!rot)
            throw ApiError_1.ApiError.notFound('Rotation not found');
        if (rot.status !== 'ACTIVE')
            throw ApiError_1.ApiError.badRequest('Can only pause ACTIVE rotations');
        rot.status = 'PAUSED';
        await rot.save();
        EventBus_1.eventBus.emit('hr.rotation.paused', { rotationId: id });
        return rot;
    }
    static async archive(id, _userId, _auditCtx) {
        const rot = await Rotation_1.Rotation.findById(id);
        if (!rot)
            throw ApiError_1.ApiError.notFound('Rotation not found');
        rot.status = 'ARCHIVED';
        await rot.save();
        EventBus_1.eventBus.emit('hr.rotation.archived', { rotationId: id });
        return rot;
    }
    static async suggestLeaveCoverA(id, guardId, date) {
        const rot = await Rotation_1.Rotation.findById(id);
        if (!rot)
            throw ApiError_1.ApiError.notFound('Rotation not found');
        const dayAssigns = this.computeDayAssignments(rot, date);
        const workingIds = dayAssigns.map((a) => a.guardId.toString());
        const candidates = rot.guardPool
            .filter((g) => g.status === 'ACTIVE' && !workingIds.includes(g.guardId.toString()) && g.guardId.toString() !== guardId)
            .map((g) => ({ guardId: g.guardId, reason: 'Pool guard not on duty this day' }));
        return candidates;
    }
    static async suggestLeaveCoverB(id, date) {
        const rot = await Rotation_1.Rotation.findById(id);
        if (!rot)
            throw ApiError_1.ApiError.notFound('Rotation not found');
        const dayAssigns = this.computeDayAssignments(rot, date);
        const workingIds = dayAssigns.map((a) => a.guardId.toString());
        const candidates = rot.floaterPool
            .filter((g) => g.status === 'ACTIVE' && !workingIds.includes(g.guardId.toString()))
            .map((g) => ({ guardId: g.guardId, reason: 'Floater available' }));
        return candidates;
    }
    static async applyLeaveCoverage(id, data, userId, _auditCtx) {
        const rot = await Rotation_1.Rotation.findById(id);
        if (!rot)
            throw ApiError_1.ApiError.notFound('Rotation not found');
        rot.leaveCoverages.push({
            guardId: new mongoose_1.default.Types.ObjectId(data.guardId),
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
            coverGuardId: new mongoose_1.default.Types.ObjectId(data.coverGuardId),
            path: data.path,
            appliedBy: new mongoose_1.default.Types.ObjectId(userId),
            appliedAt: new Date(),
        });
        await rot.save();
        return rot;
    }
    static async isGuardInActiveRotation(guardId) {
        const activeRotation = await Rotation_1.Rotation.findOne({
            status: 'ACTIVE',
            'guardPool.guardId': guardId,
            'guardPool.status': 'ACTIVE',
        });
        return activeRotation ? activeRotation._id.toString() : null;
    }
    static async cancelLeaveCoverage(id, guardId, startDate, _userId) {
        const rot = await Rotation_1.Rotation.findById(id);
        if (!rot)
            throw ApiError_1.ApiError.notFound('Rotation not found');
        rot.leaveCoverages = rot.leaveCoverages.filter((lc) => lc.guardId.toString() !== guardId || lc.startDate.getTime() !== startDate.getTime());
        await rot.save();
        return rot;
    }
}
exports.RotationService = RotationService;
//# sourceMappingURL=rotation.service.js.map