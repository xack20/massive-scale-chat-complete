import { Request, Response } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const { email, password, username, fullName } = req.body;

      // Validate input
      if (!email || !password || !username) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Email, password, and username are required'
        });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username }
          ]
        }
      });

      if (existingUser) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'User with this email or username already exists'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          fullName: fullName || username,
          role: 'user'
        },
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          role: true,
          createdAt: true
        }
      });

      // Generate token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role
        },
        process.env.JWT_SECRET!,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Send response
      res.status(201).json({
        message: 'User registered successfully',
        user,
        token
      });

    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to register user'
      });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Email and password are required'
        });
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid credentials'
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid credentials'
        });
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });

      // Generate token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role
        },
        process.env.JWT_SECRET!,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Send response
      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.fullName,
          role: user.role
        },
        token
      });

    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to login'
      });
    }
  },

  async refreshToken(req: Request, res: Response) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Token is required'
        });
      }

      // Verify and decode token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      // Generate new token
      const newToken = jwt.sign(
        {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role
        },
        process.env.JWT_SECRET!,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.json({
        message: 'Token refreshed successfully',
        token: newToken
      });

    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }
  },

  async logout(req: Request, res: Response) {
    // In a stateless JWT system, logout is handled client-side
    // We could implement a token blacklist if needed
    res.json({
      message: 'Logout successful'
    });
  }
};