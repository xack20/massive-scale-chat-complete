import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Response as ExResponse, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { blacklistToken, isRefreshTokenValid, revokeRefreshToken, storeRefreshToken } from '../utils/tokenBlacklist';

function issueAccessToken(user: { id: string; email: string; role: string }) {
  const accessTtl = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role, type: 'access' },
    (process.env.JWT_SECRET || 'dev-secret'),
    { expiresIn: accessTtl as any }
  );
}

function issueRefreshToken(user: { id: string; email: string; role: string }) {
  const refreshTtl = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, jti, type: 'refresh' },
    (process.env.JWT_SECRET || 'dev-secret'),
    { expiresIn: refreshTtl as any }
  );
  const decoded = jwt.decode(token) as { exp?: number } | null;
  if (decoded?.exp) storeRefreshToken(jti, token, user.id, decoded.exp);
  return token;
}

function setRefreshCookie(res: ExResponse, token: string) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/refresh'
  });
}

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

      const accessToken = issueAccessToken(user as any);
      const refreshToken = issueRefreshToken(user as any);
      setRefreshCookie(res, refreshToken);

      res.status(201).json({
        message: 'User registered successfully',
        user,
        token: accessToken
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

      const accessToken = issueAccessToken(user as any);
      const refreshToken = issueRefreshToken(user as any);
      setRefreshCookie(res, refreshToken);

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.fullName,
          role: user.role
        },
        token: accessToken
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
      const refreshCookie = (req as any).cookies?.refreshToken;
      const provided = req.body?.refreshToken || refreshCookie; // allow body fallback
      if (!provided) {
        return res.status(400).json({ error: 'Bad Request', message: 'Refresh token required' });
      }
      let decoded: any;
      try {
        decoded = jwt.verify(provided, (process.env.JWT_SECRET || 'dev-secret'));
      } catch (err) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid refresh token' });
      }
      if (decoded.type !== 'refresh') {
        return res.status(400).json({ error: 'Bad Request', message: 'Not a refresh token' });
      }
      const valid = await isRefreshTokenValid(provided, decoded.userId);
      if (!valid) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Refresh token revoked' });
      }
      // Rotate: revoke old, issue new
      await revokeRefreshToken(provided);
      const user = { id: decoded.userId, email: decoded.email, role: decoded.role };
      const newAccess = issueAccessToken(user);
      const newRefresh = issueRefreshToken(user);
      setRefreshCookie(res, newRefresh);
      res.json({ message: 'Token refreshed successfully', token: newAccess });
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
    }
  },

  async logout(req: Request, res: Response) {
    try {
      // Expect Bearer token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Authorization token required for logout'
        });
      }
      const token = authHeader.substring(7);

      // Decode to ensure it is a valid JWT (do not verify expiration strictly here)
      try {
        jwt.decode(token);
      } catch {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid token'
        });
      }

      // Add to blacklist
      await blacklistToken(token);
      // Revoke refresh cookie if present
      const refreshCookie = (req as any).cookies?.refreshToken;
      if (refreshCookie) await revokeRefreshToken(refreshCookie);
      res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
      res.json({ message: 'Logout successful' });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to logout'
      });
    }
  }
};