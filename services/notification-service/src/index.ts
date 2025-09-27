import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import notificationRoutes from './routes/notificationRoutes';
import { errorHandler } from './middleware/errorHandler';
import { connectRedis } from './config/redis';
import { initializeKafkaConsumer } from './services/kafkaConsumer';

dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.NOTIFICATION_SERVICE_PORT || 3004;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'notification-service' });
});

app.use('/api/notifications', notificationRoutes);
app.use(errorHandler);

const startServer = async () => {
  await connectRedis();
  await initializeKafkaConsumer();
  
  app.listen(PORT, () => {
    logger.info(`Notification Service running on port ${PORT}`);
  });
};

startServer();
