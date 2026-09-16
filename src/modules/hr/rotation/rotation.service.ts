import mongoose from 'mongoose';
import { Rotation, IRotation } from '../../../models/Rotation';
import { RotationAssignment } from '../../../models/RotationAssignment';
import { Site } from '../../../models/Site';
import { ApiError } from '../../../common/ApiError';
import { eventBus } from '../../../core/events/EventBus';

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export class RotationService {

  static computeDayAssignments(rot: IRotation, date: Date): { guardId: mongoose.Types.ObjectId; shiftType: 'DAY' | 'NIGHT'; shiftTime: string }[] {
    const activeGuards = (rot.guardPool as any[])
      .filter((g: any) => g.status === 'ACTIVE')
      .sort((a: any, b: any) => a.order - b.order);

    const poolSize = activeGuards.length;
    const slotCountPerDay = rot.dayShiftCount + rot.nightShiftCount;
    if (poolSize === 0 || slotCountPerDay === 0) return [];

    const startDate = new Date(rot.startDate);
    startDate.setHours(0, 0, 0, 0);
    const dayOffset = Math.max(0, Math.floor((date.getTime() - startDate.getTime()) / 86400000));
    const offset = (dayOffset * slotCountPerDay) % poolSize;

    const assignments: { guardId: mongoose.Types.ObjectId; shiftType: 'DAY' | 'NIGHT'; shiftTime: string }[] = [];

    for (let i = 0; i < slotCountPerDay; i++) {
      const guardIndex = (offset + i) % poolSize;
      const guard = activeGuards[guardIndex];
      const shiftType = i < rot.dayShiftCount ? 'DAY' : 'NIGHT';
      const shiftTime = shiftType === 'DAY' ? rot.dayStartTime : rot.nightEndTime;
      assignments.push({ guardId: guard.guardId, shiftType, shiftTime });
    }

    return assignments;
  }

  static async create(data: {
    name: string;
    description?: string;
    siteId: string;
    dayShiftCount: number;
    nightShiftCount: number;
    dayStartTime?: string;
    nightEndTime?: string;
    startDate: string;
  }, userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const site = await Site.findById(data.siteId);
    if (!site) throw ApiError.notFound('Site not found');

    const slotCountPerDay = data.dayShiftCount + data.nightShiftCount;
    if (slotCountPerDay < 2) throw ApiError.badRequest('Total working positions must be at least 2');
    if (data.dayShiftCount < 1 || data.nightShiftCount < 1) throw ApiError.badRequest('Need at least 1 guard on each shift');

    const rotation = await Rotation.create({
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

    eventBus.emit('hr.rotation.created', { rotationId: rotation._id, name: rotation.name });
    return rotation;
  }

  static async getAll(filters?: { status?: string; search?: string }) {
    const query: any = {};
    if (filters?.status) query.status = filters.status;
    if (filters?.search) query.name = { $regex: filters.search, $options: 'i' };
    return Rotation.find(query).sort({ createdAt: -1 }).populate('siteId', 'siteName siteCode');
  }

  static async getById(id: string) {
    const rot = await Rotation.findById(id)
      .populate('siteId', 'siteName siteCode')
      .populate('guardPool.guardId', 'firstName lastName employeeCode status')
      .populate('floaterPool.guardId', 'firstName lastName employeeCode status');
    if (!rot) throw ApiError.notFound('Rotation not found');
    return rot;
  }

  static async update(id: string, data: any, userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rotation = await Rotation.findById(id);
    if (!rotation) throw ApiError.notFound('Rotation not found');
    if (rotation.status !== 'DRAFT') throw ApiError.badRequest('Can only edit DRAFT rotations');

    const allowed = ['name', 'description', 'dayShiftCount', 'nightShiftCount', 'dayStartTime', 'nightEndTime', 'startDate'];
    for (const key of allowed) {
      if (data[key] !== undefined) (rotation as any)[key] = data[key];
    }
    await rotation.save();
    return rotation;
  }

  static async delete(id: string, _userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rotation = await Rotation.findById(id);
    if (!rotation) throw ApiError.notFound('Rotation not found');
    await RotationAssignment.deleteMany({ rotationId: id });
    await Rotation.findByIdAndDelete(id);
    eventBus.emit('hr.rotation.deleted', { rotationId: id });
  }

  static async addGuards(id: string, guardIds: string[], _userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rotation = await Rotation.findById(id);
    if (!rotation) throw ApiError.notFound('Rotation not found');

    for (const gid of guardIds) {
      const exists = (rotation.guardPool as any[]).find((g: any) => g.guardId.toString() === gid);
      if (!exists) {
        (rotation.guardPool as any[]).push({
          guardId: new mongoose.Types.ObjectId(gid),
          status: 'ACTIVE',
          order: (rotation.guardPool as any[]).length,
        });
      }
    }
    await rotation.save();
    return rotation;
  }

  static async removeGuard(id: string, guardId: string, _userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rotation = await Rotation.findById(id);
    if (!rotation) throw ApiError.notFound('Rotation not found');
    rotation.guardPool = (rotation.guardPool as any[]).filter((g: any) => g.guardId.toString() !== guardId) as any[];
    (rotation.guardPool as any[]).forEach((g: any, i: number) => { g.order = i; });
    await rotation.save();
    return rotation;
  }

  static async reorderPool(id: string, orderedGuardIds: string[], _userId: string) {
    const rotation = await Rotation.findById(id);
    if (!rotation) throw ApiError.notFound('Rotation not found');

    const poolMap = new Map((rotation.guardPool as any[]).map((g: any) => [g.guardId.toString(), g]));
    rotation.guardPool = orderedGuardIds.map((gid: string, i: number) => {
      const existing = poolMap.get(gid);
      return { guardId: new mongoose.Types.ObjectId(gid), status: existing?.status || 'ACTIVE', order: i };
    }) as any[];
    await rotation.save();
    return rotation;
  }

  static async addFloaters(id: string, guardIds: string[], _userId: string) {
    const rotation = await Rotation.findById(id);
    if (!rotation) throw ApiError.notFound('Rotation not found');
    for (const gid of guardIds) {
      const exists = (rotation.floaterPool as any[]).find((g: any) => g.guardId.toString() === gid);
      if (!exists) {
        (rotation.floaterPool as any[]).push({ guardId: new mongoose.Types.ObjectId(gid), status: 'ACTIVE' });
      }
    }
    await rotation.save();
    return rotation;
  }

  static async removeFloater(id: string, guardId: string, _userId: string) {
    const rotation = await Rotation.findById(id);
    if (!rotation) throw ApiError.notFound('Rotation not found');
    rotation.floaterPool = (rotation.floaterPool as any[]).filter((g: any) => g.guardId.toString() !== guardId) as any[];
    await rotation.save();
    return rotation;
  }

  static checkFairness(poolSize: number, slotCountPerDay: number) {
    if (poolSize <= 0 || slotCountPerDay <= 0) return { isFair: true, cycleDays: 0 };
    if (poolSize < slotCountPerDay) return { isFair: false, message: `Need at least ${slotCountPerDay} guards, have ${poolSize}` };
    const cycleDays = poolSize / gcd(poolSize, slotCountPerDay);
    const workDaysPerCycle = cycleDays * slotCountPerDay / poolSize;
    return {
      isFair: true,
      cycleDays,
      workDaysPerCycle,
      dutyPercent: Math.round((slotCountPerDay / poolSize) * 100),
    };
  }

  static async preview(id: string, days: number) {
    const rot = await Rotation.findById(id).populate('siteId', 'siteName siteCode');
    if (!rot) throw ApiError.notFound('Rotation not found');

    const activeGuards = (rot.guardPool as any[]).filter((g: any) => g.status === 'ACTIVE').sort((a: any, b: any) => a.order - b.order);
    const poolSize = activeGuards.length;
    const slotCountPerDay = rot.dayShiftCount + rot.nightShiftCount;

    if (poolSize === 0) throw ApiError.badRequest('No active guards in pool');
    if (poolSize < slotCountPerDay) throw ApiError.badRequest(`Need at least ${slotCountPerDay} guards`);

    const result: any[] = [];
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
      siteName: (rot.siteId as any)?.siteName || '',
      poolSize,
      slotCountPerDay,
      cycleDays: poolSize / gcd(poolSize, slotCountPerDay),
    };
  }

  static async generate(id: string, days: number, userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rot = await Rotation.findById(id);
    if (!rot) throw ApiError.notFound('Rotation not found');

    const activeGuards = (rot.guardPool as any[]).filter((g: any) => g.status === 'ACTIVE').sort((a: any, b: any) => a.order - b.order);
    const poolSize = activeGuards.length;
    const slotCountPerDay = rot.dayShiftCount + rot.nightShiftCount;

    if (poolSize === 0) throw ApiError.badRequest('No active guards in pool');
    if (poolSize < slotCountPerDay) throw ApiError.badRequest(`Need at least ${slotCountPerDay} guards`);

    await RotationAssignment.deleteMany({ rotationId: id });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const assignments: any[] = [];

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

    const created = await RotationAssignment.insertMany(assignments);
    rot.lastGeneratedDate = new Date();
    await rot.save();

    eventBus.emit('hr.rotation.generated', { rotationId: id, count: created.length, days });
    return { count: created.length, days };
  }

  static async getAssignments(id: string, startDate?: string, endDate?: string) {
    const filter: any = { rotationId: id };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    return RotationAssignment.find(filter)
      .populate('guardId', 'firstName lastName employeeCode')
      .sort({ date: 1, shiftType: 1 });
  }

  static async activate(id: string, _userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rot = await Rotation.findById(id);
    if (!rot) throw ApiError.notFound('Rotation not found');
    if (rot.status === 'ACTIVE') throw ApiError.badRequest('Already active');
    rot.status = 'ACTIVE';
    await rot.save();
    eventBus.emit('hr.rotation.activated', { rotationId: id });
    return rot;
  }

  static async pause(id: string, _userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rot = await Rotation.findById(id);
    if (!rot) throw ApiError.notFound('Rotation not found');
    if (rot.status !== 'ACTIVE') throw ApiError.badRequest('Can only pause ACTIVE rotations');
    rot.status = 'PAUSED';
    await rot.save();
    eventBus.emit('hr.rotation.paused', { rotationId: id });
    return rot;
  }

  static async archive(id: string, _userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rot = await Rotation.findById(id);
    if (!rot) throw ApiError.notFound('Rotation not found');
    rot.status = 'ARCHIVED';
    await rot.save();
    eventBus.emit('hr.rotation.archived', { rotationId: id });
    return rot;
  }

  static async suggestLeaveCoverA(id: string, guardId: string, date: Date) {
    const rot = await Rotation.findById(id);
    if (!rot) throw ApiError.notFound('Rotation not found');
    const dayAssigns = this.computeDayAssignments(rot, date);
    const workingIds = dayAssigns.map((a: any) => a.guardId.toString());
    const candidates = (rot.guardPool as any[])
      .filter((g: any) => g.status === 'ACTIVE' && !workingIds.includes(g.guardId.toString()) && g.guardId.toString() !== guardId)
      .map((g: any) => ({ guardId: g.guardId, reason: 'Pool guard not on duty this day' }));
    return candidates;
  }

  static async suggestLeaveCoverB(id: string, date: Date) {
    const rot = await Rotation.findById(id);
    if (!rot) throw ApiError.notFound('Rotation not found');
    const dayAssigns = this.computeDayAssignments(rot, date);
    const workingIds = dayAssigns.map((a: any) => a.guardId.toString());
    const candidates = (rot.floaterPool as any[])
      .filter((g: any) => g.status === 'ACTIVE' && !workingIds.includes(g.guardId.toString()))
      .map((g: any) => ({ guardId: g.guardId, reason: 'Floater available' }));
    return candidates;
  }

  static async applyLeaveCoverage(id: string, data: { guardId: string; startDate: string; endDate: string; path: string; coverGuardId: string }, userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rot = await Rotation.findById(id);
    if (!rot) throw ApiError.notFound('Rotation not found');
    (rot.leaveCoverages as any[]).push({
      guardId: new mongoose.Types.ObjectId(data.guardId),
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      coverGuardId: new mongoose.Types.ObjectId(data.coverGuardId),
      path: data.path,
      appliedBy: new mongoose.Types.ObjectId(userId),
      appliedAt: new Date(),
    });
    await rot.save();
    return rot;
  }

  static async isGuardInActiveRotation(guardId: string): Promise<string | null> {
    const activeRotation = await Rotation.findOne({
      status: 'ACTIVE',
      'guardPool.guardId': guardId,
      'guardPool.status': 'ACTIVE',
    });
    return activeRotation ? activeRotation._id.toString() : null;
  }

  static async cancelLeaveCoverage(id: string, guardId: string, startDate: Date, _userId: string) {
    const rot = await Rotation.findById(id);
    if (!rot) throw ApiError.notFound('Rotation not found');
    rot.leaveCoverages = (rot.leaveCoverages as any[]).filter(
      (lc: any) => lc.guardId.toString() !== guardId || lc.startDate.getTime() !== startDate.getTime()
    ) as any[];
    await rot.save();
    return rot;
  }
}
