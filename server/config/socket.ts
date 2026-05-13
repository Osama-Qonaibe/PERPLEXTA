import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from 'jsonwebtoken';

export let io: Server;

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('[FATAL] JWT_SECRET is not set. Real-time security compromised.');
}

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.APP_URL || process.env.VITE_APP_URL || [],
      methods: ["GET", "POST"]
    }
  });


  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    jwt.verify(token, jwtSecret!, (err: any, decoded: any) => {
      if (err) {
        return next(new Error('Authentication error: Invalid token'));
      }
      (socket as any).user = decoded;
      next();
    });
  });

  io.on("connection", (socket) => {
    const user = (socket as any).user;

    

    socket.join(`user_${user.id}`);
    
    socket.on("register_user", (userId: number) => {
      if (userId !== user.id) {
        console.warn(`[Socket] User ${user.id} attempted to join unauthorized room: user_${userId}`);
        return;
      }
      socket.join(`user_${userId}`);
    });

    socket.on("chat_message", async (data: any) => {
      const { handleChatMessage } = await import('../services/chat.js');
      data.user = user;
      await handleChatMessage(socket, data);
    });

    socket.on("disconnect", () => {
    });
  });

  return io;
}
