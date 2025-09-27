import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.post('/send', notificationController.sendNotification);
router.get('/', notificationController.getNotifications);
router.put('/:notificationId/read', notificationController.markAsRead);

export default router;
