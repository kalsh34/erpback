"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileValidation = exports.changePasswordValidation = exports.registerValidation = exports.loginValidation = void 0;
const express_validator_1 = require("express-validator");
exports.loginValidation = [
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required'),
];
exports.registerValidation = [
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    (0, express_validator_1.body)('firstName').notEmpty().withMessage('First name is required'),
    (0, express_validator_1.body)('lastName').notEmpty().withMessage('Last name is required'),
    (0, express_validator_1.body)('role').notEmpty().withMessage('Role is required'),
];
exports.changePasswordValidation = [
    (0, express_validator_1.body)('currentPassword').notEmpty().withMessage('Current password is required'),
    (0, express_validator_1.body)('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];
exports.updateProfileValidation = [
    (0, express_validator_1.body)('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    (0, express_validator_1.body)('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    (0, express_validator_1.body)('phone').optional().isString(),
];
//# sourceMappingURL=auth.validation.js.map