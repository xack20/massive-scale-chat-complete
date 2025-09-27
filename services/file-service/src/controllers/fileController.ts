import { Request, Response } from 'express';
import { minioClient } from '../config/storage';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export const fileController = {
  async uploadFile(req: Request, res: Response) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileName = `${uuidv4()}-${file.originalname}`;
      const bucketName = process.env.MINIO_BUCKET_NAME || 'chat-uploads';

      await minioClient.putObject(bucketName, fileName, file.buffer, file.size, {
        'Content-Type': file.mimetype
      });

      const fileUrl = `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucketName}/${fileName}`;

      res.json({
        fileName,
        fileUrl,
        size: file.size,
        mimeType: file.mimetype
      });
    } catch (error) {
      logger.error('Upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  },

  async getFile(req: Request, res: Response) {
    try {
      const { fileName } = req.params;
      const bucketName = process.env.MINIO_BUCKET_NAME || 'chat-uploads';
      
      const stream = await minioClient.getObject(bucketName, fileName);
      stream.pipe(res);
    } catch (error) {
      logger.error('Get file error:', error);
      res.status(404).json({ error: 'File not found' });
    }
  }
};
