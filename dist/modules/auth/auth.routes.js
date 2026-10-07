"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_controller_1 = require("./auth.controller");
const auth_1 = require("../../middleware/auth");
const rbac_1 = require("../../middleware/rbac");
const validate_1 = require("../../middleware/validate");
const auth_validation_1 = require("./auth.validation");
const types_1 = require("../../types");
const avatarDir = path_1.default.join(process.cwd(), 'uploads', 'avatars');
if (!fs_1.default.existsSync(avatarDir))
    fs_1.default.mkdirSync(avatarDir, { recursive: true });
const avatarUpload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (_req, _file, cb) => cb(null, avatarDir),
        filename: (_req, file, cb) => {
            const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, unique + path_1.default.extname(file.originalname).toLowerCase());
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/'))
            cb(null, true);
        else
            cb(new Error('Only image files are allowed'));
    },
});
const router = (0, express_1.Router)();
router.post('/login', auth_validation_1.loginValidation, validate_1.validate, auth_controller_1.AuthController.login);
router.post('/register', auth_1.authenticate, (0, rbac_1.authorize)(types_1.PERMISSIONS.USER_CREATE), auth_validation_1.registerValidation, validate_1.validate, auth_controller_1.AuthController.register);
router.get('/me', auth_1.authenticate, auth_controller_1.AuthController.getMe);
router.put('/change-password', auth_1.authenticate, auth_validation_1.changePasswordValidation, validate_1.validate, auth_controller_1.AuthController.changePassword);
router.put('/profile', auth_1.authenticate, auth_validation_1.updateProfileValidation, validate_1.validate, auth_controller_1.AuthController.updateProfile);
router.post('/avatar', auth_1.authenticate, avatarUpload.single('avatar'), auth_controller_1.AuthController.uploadAvatar);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map