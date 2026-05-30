import 'dotenv/config';
import path from 'path';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  mediaRoot: path.resolve(process.env.MEDIA_ROOT || '/mnt/external/media'),
};
