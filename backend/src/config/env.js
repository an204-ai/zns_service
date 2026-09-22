const { z } = require('zod');
require('dotenv').config();

const envSchema = z.object({
  DATABASE_URL: z.string(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().default(''),
  RABBITMQ_URL: z.string().default('amqp://localhost:5672'),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  FPT_ZBS_BASE_URL: z.string().default('https://api-zbs.fpt.work'),
  ENCRYPTION_KEY: z.string().min(32),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.string().default('development'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  API_RATE_LIMIT_MAX: z.coerce.number().default(30),
});

let env;
try {
  env = envSchema.parse(process.env);
} catch (error) {
  console.error('❌ Invalid environment variables:', error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = { env };
