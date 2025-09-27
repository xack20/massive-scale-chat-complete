import { Router } from 'express';
import { presenceController } from '../controllers/presenceController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.get('/online', presenceController.getOnlineUsers);
router.get('/status/:userId', presenceController.getUserStatus);
router.put('/status', presenceController.updateStatus);

export default router;
