"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || '5000', 10),
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/vitalpayroll',
    jwtSecret: process.env.JWT_SECRET || 'fallback-secret-change-me',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    nodeEnv: process.env.NODE_ENV || 'development',
    // Comma separated list of browser origins allowed to call this API, e.g.
    // CORS_ORIGIN=https://my-frontend.onrender.com,http://localhost:3000
    // "*" (the default) allows any origin so deployments keep working out of the box.
    corsOrigin: process.env.CORS_ORIGIN || '*',
};
//# sourceMappingURL=env.js.map