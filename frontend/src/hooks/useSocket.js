import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

// Connects to current origin by default, or VITE_WS_URL if explicitly configured
const SOCKET_URL = import.meta.env.VITE_WS_URL || undefined;

export function useSocket(onEvent) {
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('message:status', (data) => {
      onEvent?.('message:status', data);
    });

    socket.on('campaign:update', (data) => {
      onEvent?.('campaign:update', data);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  return socketRef;
}
