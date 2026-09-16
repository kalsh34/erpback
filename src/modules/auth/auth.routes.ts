import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { loginValidation, registerValidation, changePasswordValidation, updateProfileValidation } from './auth.validation';
import { PERMISSIONS } from '../../types';

const router = Router();

router.post('/login', loginValidation, validate, AuthController.login);
router.post('/register', authenticate, authorize(PERMISSIONS.USER_CREATE), registerValidation, validate, AuthController.register);
router.get('/me', authenticate, AuthController.getMe);
router.put('/change-password', authenticate, changePasswordValidation, validate, AuthController.changePassword);
router.put('/profile', authenticate, updateProfileValidation, validate, AuthController.updateProfile);

export default router;
