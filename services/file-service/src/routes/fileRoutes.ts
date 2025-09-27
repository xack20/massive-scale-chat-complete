import { Router } from 'express';
import { fileController } from '../controllers/fileController';
import { authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.use(authMiddleware);
router.post('/upload', upload.single('file'), fileController.uploadFile);
router.get('/:fileName', fileController.getFile);

export default router;
