import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { loginValidation, registerValidation, changePasswordValidation, updateProfileValidation } from './auth.validation';
import { PERMISSIONS } from '../../types';

const avatarDir = path.join(process.cwd(), 'uploads', 'avatars');
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, avatarDir),
    filename: (_req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname).toLowerCase());
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const router = Router();

router.post('/login', loginValidation, validate, AuthController.login);
router.post('/register', authenticate, authorize(PERMISSIONS.USER_CREATE), registerValidation, validate, AuthController.register);
router.get('/me', authenticate, AuthController.getMe);
router.put('/change-password', authenticate, changePasswordValidation, validate, AuthController.changePassword);
router.put('/profile', authenticate, updateProfileValidation, validate, AuthController.updateProfile);
router.post('/avatar', authenticate, avatarUpload.single('avatar'), AuthController.uploadAvatar);

export default router;
