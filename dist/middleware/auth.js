"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const ApiError_1 = require("../common/ApiError");
const User_1 = require("../models/User");
const rbac_1 = require("./rbac");
const authenticate = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw ApiError_1.ApiError.unauthorized('No token provided');
        }
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, env_1.config.jwtSecret);
        // Resolve the CURRENT user on every request: deactivated accounts are cut
        // off immediately and permission checks see fresh module grants/denies.
        const user = await User_1.User.findById(decoded.userId)
            .select('role isActive moduleGrants moduleDenies')
            .lean();
        if (!user)
            throw ApiError_1.ApiError.unauthorized('User no longer exists');
        if (user.isActive === false)
            throw ApiError_1.ApiError.forbidden('Account is deactivated');
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: user.role,
            permissions: (0, rbac_1.computeEffectivePermissions)(user),
        };
        next();
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            next(error);
        }
        else {
            next(ApiError_1.ApiError.unauthorized('Invalid token'));
        }
    }
};
exports.authenticate = authenticate;
//# sourceMappingURL=auth.js.map