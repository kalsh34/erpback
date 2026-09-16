"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const ApiError_1 = require("../common/ApiError");
const authenticate = (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw ApiError_1.ApiError.unauthorized('No token provided');
        }
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, env_1.config.jwtSecret);
        req.user = decoded;
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