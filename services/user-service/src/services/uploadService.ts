import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../utils/logger';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/uploads/avatars';

export async function uploadAvatar(file: Express.Multer.File, userId: string): Promise<string> {
  try {
    // Ensure upload directory exists
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    // Generate unique filename
    const filename = `${userId}_${uuidv4()}${path.extname(file.originalname)}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Process and save image
    await sharp(file.buffer)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 90 })
      .toFile(filepath);

    // Return the URL path (this would be served by a static file server or CDN)
    const avatarUrl = `/avatars/${filename}`;
    
    logger.info(`Avatar uploaded successfully for user ${userId}: ${avatarUrl}`);
    return avatarUrl;
  } catch (error) {
    logger.error('Error uploading avatar:', error);
    throw new Error('Failed to upload avatar');
  }
}