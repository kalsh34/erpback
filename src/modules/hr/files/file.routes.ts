import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';
import { FileAttachment } from '../../../core/files/FileAttachment';
import { Employee } from '../../../models/Employee';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('File type not allowed'));
  },
});

const router = Router();
router.use(authenticate);

router.post('/', authorize(PERMISSIONS.EMPLOYEE_CREATE, PERMISSIONS.EMPLOYEE_UPDATE), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) { res.status(400).json({ success: false, message: 'No file provided' }); return; }
    const { entityType, entityId, title, description } = req.body;
    const attachment = await FileAttachment.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: `/uploads/${req.file.filename}`,
      uploadedBy: (req as any).user.userId,
      entityType: entityType || 'employee',
      entityId,
      description: title || description,
      tags: title ? [title] : [],
    });

    if (entityType === 'employee' && entityId) {
      await Employee.findByIdAndUpdate(entityId, {
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
  } catch (err) { next(err); }
});

router.get('/:entityType/:entityId', authorize(PERMISSIONS.EMPLOYEE_READ), async (req, res, next) => {
  try {
    const files = await FileAttachment.find({
      entityType: req.params.entityType,
      entityId: req.params.entityId,
    }).sort({ createdAt: -1 });
    res.json({ success: true, data: files });
  } catch (err) { next(err); }
});

router.delete('/:id', authorize(PERMISSIONS.EMPLOYEE_UPDATE), async (req, res, next) => {
  try {
    const file = await FileAttachment.findById(req.params.id);
    if (!file) { res.status(404).json({ success: false, message: 'File not found' }); return; }
    const filePath = path.join(uploadDir, file.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await FileAttachment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'File deleted' });
  } catch (err) { next(err); }
});

export default router;
