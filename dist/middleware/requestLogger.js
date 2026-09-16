"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const requestLogger = (req, _res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
    next();
};
exports.requestLogger = requestLogger;
//# sourceMappingURL=requestLogger.js.map