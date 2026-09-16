"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("./auth.service");
const ApiError_1 = require("../../common/ApiError");
class AuthController {
    static async register(req, res, next) {
        try {
            const user = await auth_service_1.AuthService.register(req.body);
            const userObj = user.toObject();
            const { password: _, ...userWithoutPassword } = userObj;
            res.status(201).json({ success: true, data: userWithoutPassword });
        }
        catch (error) {
            next(error);
        }
    }
    static async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const result = await auth_service_1.AuthService.login(email, password);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getMe(req, res, next) {
        try {
            if (!req.user)
                return next(ApiError_1.ApiError.unauthorized());
            const user = await auth_service_1.AuthService.getMe(req.user.userId);
            res.json({ success: true, data: user });
        }
        catch (error) {
            next(error);
        }
    }
    static async changePassword(req, res, next) {
        try {
            if (!req.user)
                return next(ApiError_1.ApiError.unauthorized());
            const { currentPassword, newPassword } = req.body;
            await auth_service_1.AuthService.changePassword(req.user.userId, currentPassword, newPassword);
            res.json({ success: true, message: 'Password changed successfully' });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateProfile(req, res, next) {
        try {
            if (!req.user)
                return next(ApiError_1.ApiError.unauthorized());
            const user = await auth_service_1.AuthService.updateProfile(req.user.userId, req.body);
            const userObj = user.toObject();
            const { password: _, ...userWithoutPassword } = userObj;
            res.json({ success: true, data: userWithoutPassword });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map