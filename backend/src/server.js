require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { env } = require('./config/env');
const { connectRabbitMQ } = require('./config/rabbitmq');
const { initSocket } = require('./sockets/socketServer');
const { generalLimiter } = require('./middlewares/rateLimiter');
const { errorHandler } = require('./middlewares/errorHandler');
const { startWorker } = require('./queues/consumer');

const app = express();
const server = http.createServer(app);

// Security & Parsing
app.use(helmet());
const allowedOrigins = (env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    // Return false instead of throwing to let cors middleware respond with standard CORS failure
    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(generalLimiter);

// Routes
app.use('/api/v1/auth', require('./routes/auth.routes'));
app.use('/api/v1/admin', require('./routes/admin.routes'));
app.use('/api/v1/customer', require('./routes/customer.routes'));
app.use('/api/v1/zns', require('./routes/zns.routes'));
app.use('/api/v1/webhook', require('./routes/webhook.routes'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Initialize WebSocket
initSocket(server);

// Start server
async function start() {
  try {
    // Connect to RabbitMQ
    await connectRabbitMQ();

    // Start worker consumer
    await startWorker();

    server.listen(env.PORT, () => {
      console.log(`🚀 Server running on port ${env.PORT}`);
      console.log(`📡 Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Server startup error:', error);
    process.exit(1);
  }
}

start();

module.exports = { app, server };
