import { Router } from 'express';
import { messageController } from '../controllers/messageController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/', messageController.sendMessage);
router.post('/conversations/direct', messageController.createDirectConversation);
router.get('/conversation/:conversationId', messageController.getMessages);
router.put('/:id', messageController.updateMessage);
router.delete('/:id', messageController.deleteMessage);

export default router;
