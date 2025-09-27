import sharp from 'sharp';
import { logger } from '../utils/logger';

export class FileProcessor {
  static async generateThumbnail(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize(200, 200)
        .toBuffer();
    } catch (error) {
      logger.error('Thumbnail generation failed:', error);
      throw error;
    }
  }
}
