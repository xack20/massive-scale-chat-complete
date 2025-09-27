import { Kafka } from 'kafkajs';
import { logger } from '../utils/logger';

const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(',')
});

const consumer = kafka.consumer({ groupId: 'notification-group' });

export const initializeKafkaConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topics: ['message-sent', 'user-activity'], fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      logger.info(`Received message from ${topic}`);
      // Process messages and trigger notifications
    }
  });
};
