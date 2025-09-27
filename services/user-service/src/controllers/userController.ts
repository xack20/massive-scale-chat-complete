import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { uploadAvatar } from '../services/uploadService';

const prisma = new PrismaClient();

export const userController = {
  // Get all users
  async getAllUsers(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where = search ? {
        OR: [
          { username: { contains: search as string, mode: 'insensitive' as const } },
          { fullName: { contains: search as string, mode: 'insensitive' as const } },
          { email: { contains: search as string, mode: 'insensitive' as const } }
        ]
      } : {};

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: Number(limit),
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            avatar: true,
            bio: true,
            isActive: true,
            lastLogin: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
      ]);

      res.json({
        users,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      logger.error('Error fetching users:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch users'
      });
    }
  },

  // Get user by ID
  async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          avatar: true,
          bio: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found'
        });
      }

      res.json(user);
    } catch (error) {
      logger.error('Error fetching user:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch user'
      });
    }
  },

  // Get current user profile
  async getProfile(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          avatar: true,
          bio: true,
          role: true,
          isActive: true,
          isVerified: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found'
        });
      }

      res.json(user);
    } catch (error) {
      logger.error('Error fetching profile:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch profile'
      });
    }
  },

  // Update user profile
  async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { fullName, bio, username } = req.body;

      // Check if username is already taken
      if (username) {
        const existingUser = await prisma.user.findFirst({
          where: {
            username,
            NOT: { id: userId }
          }
        });

        if (existingUser) {
          return res.status(409).json({
            error: 'Conflict',
            message: 'Username is already taken'
          });
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          fullName,
          bio,
          username
        },
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          avatar: true,
          bio: true,
          updatedAt: true
        }
      });

      res.json({
        message: 'Profile updated successfully',
        user: updatedUser
      });
    } catch (error) {
      logger.error('Error updating profile:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update profile'
      });
    }
  },

  // Update user avatar
  async updateAvatar(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'No file uploaded'
        });
      }

      // Upload avatar and get URL
      const avatarUrl = await uploadAvatar(file, userId);

      // Update user avatar
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { avatar: avatarUrl },
        select: {
          id: true,
          username: true,
          avatar: true
        }
      });

      res.json({
        message: 'Avatar updated successfully',
        user: updatedUser
      });
    } catch (error) {
      logger.error('Error updating avatar:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update avatar'
      });
    }
  },

  // Change password
  async changePassword(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found'
        });
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });

      res.json({
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Error changing password:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to change password'
      });
    }
  },

  // Delete user account
  async deleteAccount(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { password } = req.body;

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found'
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Password is incorrect'
        });
      }

      // Soft delete (deactivate) the account
      await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          email: `deleted_${user.id}_${user.email}`,
          username: `deleted_${user.id}_${user.username}`
        }
      });

      res.json({
        message: 'Account deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting account:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete account'
      });
    }
  },

  // Search users
  async searchUsers(req: Request, res: Response) {
    try {
      const { query, limit = 10 } = req.query;

      if (!query || (query as string).length < 2) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Search query must be at least 2 characters'
        });
      }

      const users = await prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: query as string, mode: 'insensitive' as const } },
            { fullName: { contains: query as string, mode: 'insensitive' as const } }
          ],
          isActive: true
        },
        take: Number(limit),
        select: {
          id: true,
          username: true,
          fullName: true,
          avatar: true
        }
      });

      res.json(users);
    } catch (error) {
      logger.error('Error searching users:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to search users'
      });
    }
  }
};
