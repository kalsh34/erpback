"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const User_1 = require("../../../models/User");
const ApiError_1 = require("../../../common/ApiError");
const types_1 = require("../../../types");
const AuditService_1 = require("../../../core/audit/AuditService");
const EventBus_1 = require("../../../core/events/EventBus");
class UserController {
    static async getAll(req, res, next) {
        try {
            const { page = '1', limit = '20', role, search } = req.query;
            const pageNum = parseInt(page, 10);
            const limitNum = parseInt(limit, 10);
            const skip = (pageNum - 1) * limitNum;
            const filter = {};
            if (role)
                filter.role = role;
            if (search) {
                filter.$or = [
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                ];
            }
            const [users, total] = await Promise.all([
                User_1.User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
                User_1.User.countDocuments(filter),
            ]);
            res.json({
                success: true,
                data: users,
                pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getById(req, res, next) {
        try {
            const user = await User_1.User.findById(req.params.id);
            if (!user)
                throw ApiError_1.ApiError.notFound('User not found');
            res.json({ success: true, data: user });
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            const { email, password, firstName, lastName, role } = req.body;
            const existing = await User_1.User.findOne({ email });
            if (existing)
                throw ApiError_1.ApiError.conflict('Email already exists');
            const bcrypt = await Promise.resolve().then(() => __importStar(require('bcryptjs')));
            const hashedPassword = await bcrypt.hash(password, 12);
            const user = await User_1.User.create({ email, password: hashedPassword, firstName, lastName, role });
            AuditService_1.AuditService.log({
                userId: req.user?.userId || '',
                action: 'USER_CREATE',
                entity: 'User',
                entityId: user._id.toString(),
                newValues: { email, firstName, lastName, role },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            });
            EventBus_1.eventBus.emit('hr.user.created', { userId: user._id, role });
            res.status(201).json({ success: true, data: user });
        }
        catch (error) {
            next(error);
        }
    }
    static async update(req, res, next) {
        try {
            const { firstName, lastName, role, email } = req.body;
            const old = await User_1.User.findById(req.params.id);
            if (!old)
                throw ApiError_1.ApiError.notFound('User not found');
            const oldValues = { firstName: old.firstName, lastName: old.lastName, role: old.role, email: old.email };
            const user = await User_1.User.findByIdAndUpdate(req.params.id, { firstName, lastName, role, email }, { new: true, runValidators: true });
            if (!user)
                throw ApiError_1.ApiError.notFound('User not found');
            AuditService_1.AuditService.log({
                userId: req.user?.userId || '',
                action: 'USER_UPDATE',
                entity: 'User',
                entityId: req.params.id,
                oldValues,
                newValues: { firstName, lastName, role, email },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            });
            EventBus_1.eventBus.emit('hr.user.updated', { userId: user._id });
            res.json({ success: true, data: user });
        }
        catch (error) {
            next(error);
        }
    }
    static async delete(req, res, next) {
        try {
            const user = await User_1.User.findByIdAndDelete(req.params.id);
            if (!user)
                throw ApiError_1.ApiError.notFound('User not found');
            AuditService_1.AuditService.log({
                userId: req.user?.userId || '',
                action: 'USER_DELETE',
                entity: 'User',
                entityId: req.params.id,
                oldValues: { email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            });
            EventBus_1.eventBus.emit('hr.user.deleted', { userId: req.params.id });
            res.json({ success: true, message: 'User deleted' });
        }
        catch (error) {
            next(error);
        }
    }
    static async activate(req, res, next) {
        try {
            const user = await User_1.User.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
            if (!user)
                throw ApiError_1.ApiError.notFound('User not found');
            AuditService_1.AuditService.log({
                userId: req.user?.userId || '',
                action: 'USER_ACTIVATE',
                entity: 'User',
                entityId: req.params.id,
                newValues: { isActive: true },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            });
            res.json({ success: true, data: user });
        }
        catch (error) {
            next(error);
        }
    }
    static async deactivate(req, res, next) {
        try {
            const user = await User_1.User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
            if (!user)
                throw ApiError_1.ApiError.notFound('User not found');
            AuditService_1.AuditService.log({
                userId: req.user?.userId || '',
                action: 'USER_DEACTIVATE',
                entity: 'User',
                entityId: req.params.id,
                newValues: { isActive: false },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            });
            res.json({ success: true, data: user });
        }
        catch (error) {
            next(error);
        }
    }
    static async getRoles(_req, res) {
        const roles = Object.values(types_1.UserRole).map((role) => ({
            role,
            permissions: types_1.ROLE_PERMISSIONS[role],
        }));
        res.json({ success: true, data: roles });
    }
}
exports.UserController = UserController;
//# sourceMappingURL=user.controller.js.map