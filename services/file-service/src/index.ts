import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import fileRoutes from './routes/fileRoutes';
import { errorHandler } from './middleware/errorHandler';
import { initializeStorage } from './config/storage';

dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.FILE_SERVICE_PORT || 3003;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'file-service' });
});

app.use('/api/files', fileRoutes);
app.use(errorHandler);

const startServer = async () => {
  await initializeStorage();
  app.listen(PORT, () => {
    logger.info(`File Service running on port ${PORT}`);
  });
};

startServer();
