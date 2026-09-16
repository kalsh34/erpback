"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RotationService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Rotation_1 = require("../../../models/Rotation");
const RotationAssignment_1 = require("../../../models/RotationAssignment");
const Site_1 = require("../../../models/Site");
const ApiError_1 = require("../../../common/ApiError");
const EventBus_1 = require("../../../core/events/EventBus");
function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}
class RotationService {
    static computeDayAssignments(rot, date) {
        const activeGuards = rot.guardPool
            .filter((g) => g.status === 'ACTIVE')
            .sort((a, b) => a.order - b.order);
        const poolSize = activeGuards.length;
        const slotCountPerDay = rot.dayShiftCount + rot.nightShiftCount;
        if (poolSize === 0 || slotCountPerDay === 0)
            return [];
        const startDate = new Date(rot.startDate);
        startDate.setHours(0, 0, 0, 0);
        const dayOffset = Math.max(0, Math.floor((date.getTime() - startDate.getTime()) / 86400000));
        const offset = (dayOffset * slotCountPerDay) % poolSize;
        const assignments = [];
        for (let i = 0; i < slotCountPerDay; i++) {
            const guardIndex = (offset + i) % poolSize;
            const guard = activeGuards[guardIndex];
            const shiftType = i < rot.dayShiftCount ? 'DAY' : 'NIGHT';
            const shiftTime = shiftType === 'DAY' ? rot.dayStartTime : rot.nightEndTime;
            assignments.push({ guardId: guard.guardId, shiftType, shiftTime });
        }
        return assignments;
    }
    static async create(data, userId, _auditCtx) {
        const site = await Site_1.Site.findById(data.siteId);
        if (!site)
            throw ApiError_1.ApiError.notFound('Site not found');
        const slotCountPerDay = data.dayShiftCount + data.nightShiftCount;
        if (slotCountPerDay < 2)
            throw ApiError_1.ApiError.badRequest('Total working positions must be at least 2');
        if (data.dayShiftCount < 1 || data.nightShiftCount < 1)
            throw ApiError_1.ApiError.badRequest('Need at least 1 guard on each shift');
        const rotation = await Rotation_1.Rotation.create({
            name: data.name,
            description: data.description,
            siteId: data.siteId,
            dayShiftCount: data.dayShiftCount,
            nightShiftCount: data.nightShiftCount,
            dayStartTime: data.dayStartTime || '06:00',
            nightEndTime: data.nightEndTime || '18:00',
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
        const allowed = ['name', 'description', 'dayShiftCount', 'nightShiftCount', 'dayStartTime', 'nightEndTime', 'startDate'];
        for (const key of allowed) {
            if (data[key] !== undefined)
                rotation[key] = data[key];
        }
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
        const workDaysPerCycle = cycleDays * slotCountPerDay / poolSize;
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
        const activeGuards = rot.guardPool.filter((g) => g.status === 'ACTIVE').sort((a, b) => a.order - b.order);
        const poolSize = activeGuards.length;
        const slotCountPerDay = rot.dayShiftCount + rot.nightShiftCount;
        if (poolSize === 0)
            throw ApiError_1.ApiError.badRequest('No active guards in pool');
        if (poolSize < slotCountPerDay)
            throw ApiError_1.ApiError.badRequest(`Need at least ${slotCountPerDay} guards`);
        const result = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let d = 0; d < days; d++) {
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
            shiftTimes: { day: rot.dayStartTime, night: rot.nightEndTime },
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
        const activeGuards = rot.guardPool.filter((g) => g.status === 'ACTIVE').sort((a, b) => a.order - b.order);
        const poolSize = activeGuards.length;
        const slotCountPerDay = rot.dayShiftCount + rot.nightShiftCount;
        if (poolSize === 0)
            throw ApiError_1.ApiError.badRequest('No active guards in pool');
        if (poolSize < slotCountPerDay)
            throw ApiError_1.ApiError.badRequest(`Need at least ${slotCountPerDay} guards`);
        await RotationAssignment_1.RotationAssignment.deleteMany({ rotationId: id });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const assignments = [];
        for (let d = 0; d < days; d++) {
            const date = new Date(today);
            date.setDate(date.getDate() + d);
            date.setHours(0, 0, 0, 0);
            const dayAssigns = this.computeDayAssignments(rot, date);
            for (const a of dayAssigns) {
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
        EventBus_1.eventBus.emit('hr.rotation.generated', { rotationId: id, count: created.length, days });
        return { count: created.length, days };
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