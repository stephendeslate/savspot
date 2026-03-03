import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env['PORT'] || '3001', 10),
  databaseUrl: process.env['DATABASE_URL'],
  redisUrl: process.env['REDIS_URL'],
  nodeEnv: process.env['NODE_ENV'] || 'development',
  webUrl: process.env['WEB_URL'] || 'http://localhost:3000',
}));
