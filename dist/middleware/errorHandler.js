"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, _req, res, _next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';
    console.error(`[ERROR] ${statusCode} - ${message}`);
    if (statusCode === 500) {
        console.error(err.stack);
    }
    res.status(statusCode).json({
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map