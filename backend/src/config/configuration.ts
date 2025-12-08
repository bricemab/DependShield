export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 3306,
    username: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || 'SQLadmin',
    name: process.env.DATABASE_NAME || 'dependshield',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'supersecretkey',
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackUrl: process.env.GITHUB_CALLBACK_URL,
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  },
  scan: {
    maxDuration: parseInt(process.env.SCAN_MAX_DURATION, 10) || 300000, // 5 minutes
    tempDir: process.env.SCAN_TEMP_DIR || './temp/scans',
  },
  email: {
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || 'user@example.com',
    password: process.env.EMAIL_PASSWORD || 'password',
    from: process.env.EMAIL_FROM || '"DependShield" <noreply@dependshield.com>',
  },
  epss: {
    apiUrl: process.env.EPSS_API_URL || 'https://api.first.org/data/v1/epss',
    cacheTtl: parseInt(process.env.EPSS_CACHE_TTL, 10) || 86400, // 24 hours
    batchSize: parseInt(process.env.EPSS_BATCH_SIZE, 10) || 100,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    priceIdPro: process.env.STRIPE_PRICE_ID_PRO,
  },
});
