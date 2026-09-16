import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../../models/User';
import { Employee } from '../../models/Employee';
import { config } from '../../config/env';
import { ApiError } from '../../common/ApiError';
import { UserRole } from '../../types';

interface LoginResult {
  user: Omit<IUser, 'password'>;
  token: string;
}

export class AuthService {
  static async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  }): Promise<IUser> {
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      throw ApiError.conflict('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const user = await User.create({ ...data, password: hashedPassword });
    return user;
  }

  static async login(email: string, password: string): Promise<LoginResult> {
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('Account is deactivated');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(tokenPayload, config.jwtSecret, {
      expiresIn: 86400,
    });

    user.lastLogin = new Date();
    await user.save();

    const userObj = user.toObject();
    const { password: _, ...userWithoutPassword } = userObj as any;
    return { user: userWithoutPassword as IUser, token };
  }

  static async getMe(userId: string): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user;
  }

  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw ApiError.unauthorized('Current password is incorrect');
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
  }

  static async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string; phone?: string }
  ): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');

    if (data.firstName) user.firstName = data.firstName;
    if (data.lastName) user.lastName = data.lastName;
    await user.save();

    if (data.phone !== undefined && user.employeeId) {
      await Employee.findByIdAndUpdate(user.employeeId, { phone: data.phone });
    }

    return user;
  }
}
