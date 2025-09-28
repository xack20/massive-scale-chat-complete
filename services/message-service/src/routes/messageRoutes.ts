
import { Router } from 'express';
import { messageController } from '../controllers/messageController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);


// Clean routes without prefix
router.post('/', messageController.sendMessage);
router.post('/conversations/direct', messageController.createDirectConversation);
router.get('/conversation/:conversationId', messageController.getMessages);
router.put('/:id', messageController.updateMessage);
router.delete('/:id', messageController.deleteMessage);


// Catch-all for unmatched routes (must be after all other routes)
router.use((req, res) => {
  res.status(404).json({ error: 'Not Found in messageRoutes', path: req.originalUrl });
});

export default router;
