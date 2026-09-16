"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = require("../../../middleware/auth");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
const FileAttachment_1 = require("../../../core/files/FileAttachment");
const Employee_1 = require("../../../models/Employee");
const uploadDir = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadDir))
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext))
            cb(null, true);
        else
            cb(new Error('File type not allowed'));
    },
});
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.post('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.EMPLOYEE_CREATE, types_1.PERMISSIONS.EMPLOYEE_UPDATE), upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, message: 'No file provided' });
            return;
        }
        const { entityType, entityId, title, description } = req.body;
        const attachment = await FileAttachment_1.FileAttachment.create({
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            path: `/uploads/${req.file.filename}`,
            uploadedBy: req.user.userId,
            entityType: entityType || 'employee',
            entityId,
            description: title || description,
            tags: title ? [title] : [],
        });
        if (entityType === 'employee' && entityId) {
            await Employee_1.Employee.findByIdAndUpdate(entityId, {
                $push: {
                    documents: {
                        title: title || req.file.originalname,
                        url: `/uploads/${req.file.filename}`,
                        fileName: req.file.filename,
                        uploadedAt: new Date(),
                    },
                },
            });
        }
        res.status(201).json({ success: true, data: { ...attachment.toJSON(), title: title || req.file.originalname } });
    }
    catch (err) {
        next(err);
    }
});
router.get('/:entityType/:entityId', (0, rbac_1.authorize)(types_1.PERMISSIONS.EMPLOYEE_READ), async (req, res, next) => {
    try {
        const files = await FileAttachment_1.FileAttachment.find({
            entityType: req.params.entityType,
            entityId: req.params.entityId,
        }).sort({ createdAt: -1 });
        res.json({ success: true, data: files });
    }
    catch (err) {
        next(err);
    }
});
router.delete('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.EMPLOYEE_UPDATE), async (req, res, next) => {
    try {
        const file = await FileAttachment_1.FileAttachment.findById(req.params.id);
        if (!file) {
            res.status(404).json({ success: false, message: 'File not found' });
            return;
        }
        const filePath = path_1.default.join(uploadDir, file.filename);
        if (fs_1.default.existsSync(filePath))
            fs_1.default.unlinkSync(filePath);
        await FileAttachment_1.FileAttachment.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'File deleted' });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=file.routes.js.map