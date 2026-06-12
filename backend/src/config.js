import 'dotenv/config';
import path from 'path';

const WEAK_SECRETS = new Set([
  '',
  'change-me',
  'replace_with_a_long_random_secret',
  'personal-netflix-super-secret-key-change-me',
]);

function validateJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || WEAK_SECRETS.has(secret)) {
    console.error(
      'JWT_SECRET must be set in backend/.env and be at least 32 characters.\n' +
      'Generate one with: openssl rand -base64 48'
    );
    process.exit(1);
  }
  return secret;
}

validateJwtSecret();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET,
  mediaRoot: path.resolve(process.env.MEDIA_ROOT || '/mnt/external/media'),
  allowRegistration: process.env.ALLOW_REGISTRATION === 'true',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
};
