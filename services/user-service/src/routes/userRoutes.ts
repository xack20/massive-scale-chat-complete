import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { body, param, query } from 'express-validator';
import { userController } from '../controllers/userController';
import { authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { validateRequest } from '../middleware/validateRequest';

// Specific rate limiter for sensitive endpoints (password change)
const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many password change attempts, please try later.'
});

const router = Router();

// Public routes (if any)

// Protected routes - require authentication
router.use(authMiddleware);

// Get current user profile
router.get('/profile', userController.getProfile);

// Update current user profile
router.put('/profile',
  [
    body('fullName').optional().isString().trim().isLength({ min: 1, max: 100 }),
    body('bio').optional().isString().trim().isLength({ max: 500 }),
    body('username').optional().isString().trim().isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores')
  ],
  validateRequest,
  userController.updateProfile
);

// Update avatar
router.post('/avatar',
  upload.single('avatar'),
  userController.updateAvatar
);

// Change password
router.post('/change-password',
  passwordChangeLimiter,
  [
    body('currentPassword').isString().notEmpty(),
    body('newPassword').isString().isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
  ],
  validateRequest,
  userController.changePassword
);

// Delete account
router.delete('/account',
  [
    body('password').isString().notEmpty()
  ],
  validateRequest,
  userController.deleteAccount
);

// Search users
router.get('/search',
  [
    query('query').isString().trim().isLength({ min: 2 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  validateRequest,
  userController.searchUsers
);

// Get all users (paginated)
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString().trim()
  ],
  validateRequest,
  userController.getAllUsers
);

// Get user by ID
router.get('/:id',
  [
    param('id').isUUID()
  ],
  validateRequest,
  userController.getUserById
);

export default router;