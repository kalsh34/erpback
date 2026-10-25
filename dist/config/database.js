"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./env");
const connectDatabase = async () => {
    try {
        await mongoose_1.default.connect(env_1.config.mongoUri);
        console.log(`[DB] MongoDB connected: ${mongoose_1.default.connection.host}`);
    }
    catch (error) {
        console.error('[DB] MongoDB connection error:', error);
        process.exit(1);
    }
    mongoose_1.default.connection.on('disconnected', () => {
        console.warn('[DB] MongoDB disconnected');
    });
    mongoose_1.default.connection.on('error', (err) => {
        console.error('[DB] MongoDB error:', err);
    });
};
exports.connectDatabase = connectDatabase;
//# sourceMappingURL=database.js.map