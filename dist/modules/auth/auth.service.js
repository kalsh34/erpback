"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../../models/User");
const Employee_1 = require("../../models/Employee");
const env_1 = require("../../config/env");
const ApiError_1 = require("../../common/ApiError");
class AuthService {
    static async register(data) {
        const existing = await User_1.User.findOne({ email: data.email });
        if (existing) {
            throw ApiError_1.ApiError.conflict('Email already registered');
        }
        const hashedPassword = await bcryptjs_1.default.hash(data.password, 12);
        const user = await User_1.User.create({ ...data, password: hashedPassword });
        return user;
    }
    static async login(email, password) {
        const user = await User_1.User.findOne({ email }).select('+password');
        if (!user) {
            throw ApiError_1.ApiError.unauthorized('Invalid email or password');
        }
        if (!user.isActive) {
            throw ApiError_1.ApiError.forbidden('Account is deactivated');
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            throw ApiError_1.ApiError.unauthorized('Invalid email or password');
        }
        const tokenPayload = {
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        };
        const token = jsonwebtoken_1.default.sign(tokenPayload, env_1.config.jwtSecret, {
            expiresIn: 86400,
        });
        user.lastLogin = new Date();
        await user.save();
        const userObj = user.toObject();
        const { password: _, ...userWithoutPassword } = userObj;
        return { user: userWithoutPassword, token };
    }
    static async getMe(userId) {
        const user = await User_1.User.findById(userId);
        if (!user) {
            throw ApiError_1.ApiError.notFound('User not found');
        }
        return user;
    }
    static async changePassword(userId, currentPassword, newPassword) {
        const user = await User_1.User.findById(userId).select('+password');
        if (!user) {
            throw ApiError_1.ApiError.notFound('User not found');
        }
        const isMatch = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isMatch) {
            throw ApiError_1.ApiError.unauthorized('Current password is incorrect');
        }
        user.password = await bcryptjs_1.default.hash(newPassword, 12);
        await user.save();
    }
    static async updateProfile(userId, data) {
        const user = await User_1.User.findById(userId);
        if (!user)
            throw ApiError_1.ApiError.notFound('User not found');
        if (data.firstName)
            user.firstName = data.firstName;
        if (data.lastName)
            user.lastName = data.lastName;
        await user.save();
        if (data.phone !== undefined && user.employeeId) {
            await Employee_1.Employee.findByIdAndUpdate(user.employeeId, { phone: data.phone });
        }
        return user;
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map