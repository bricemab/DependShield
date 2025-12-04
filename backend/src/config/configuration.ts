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
});
