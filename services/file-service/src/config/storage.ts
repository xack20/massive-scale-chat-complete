import { Client } from 'minio';
import { logger } from '../utils/logger';

export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'minio',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
});

export const initializeStorage = async () => {
  const bucketName = process.env.MINIO_BUCKET_NAME || 'chat-uploads';
  const exists = await minioClient.bucketExists(bucketName);
  if (!exists) {
    await minioClient.makeBucket(bucketName);
    logger.info(`Bucket ${bucketName} created`);
  }
};
