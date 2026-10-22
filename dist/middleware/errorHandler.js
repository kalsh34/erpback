"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, _req, res, _next) => {
    const code = err.code;
    const statusCode = err.statusCode
        || (err.name === 'ValidationError' || err.name === 'CastError' ? 400 : code === 11000 ? 409 : 500);
    const message = code === 11000 ? 'A record with this identifier already exists. Refresh and review the existing record.' : err.message || 'Internal server error';
    console.error(`[ERROR] ${statusCode} - ${message}`);
    if (statusCode === 500)
        console.error(err.stack);
    res.status(statusCode).json({
        success: false,
        message,
        error: statusCode === 500 && process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map