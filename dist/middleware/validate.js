"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const express_validator_1 = require("express-validator");
const validate = (req, _res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const messages = errors.array().map((e) => e.msg);
        return next({
            statusCode: 400,
            message: messages.join(', '),
            isOperational: true,
        });
    }
    next();
};
exports.validate = validate;
//# sourceMappingURL=validate.js.map