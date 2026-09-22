const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: env.FRONTEND_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Auth middleware for WebSocket
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.userId} (${socket.userRole})`);

    // Join user-specific room for targeted notifications
    socket.join(`user:${socket.userId}`);

    // Admin joins admin room for system-wide notifications
    if (socket.userRole === 'ADMIN') {
      socket.join('admin');
    }

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.userId}`);
    });
  });

  console.log('✅ Socket.io initialized');
  return io;
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO };
