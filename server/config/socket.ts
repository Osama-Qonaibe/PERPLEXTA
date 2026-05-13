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

  // Sovereign: Authenticate socket connection
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
    console.log(`[Socket] Secure connection established: ${socket.id} (User: ${user.id})`);
    
    // Automatically join the user to their private room
    socket.join(`user_${user.id}`);
    
    socket.on("register_user", (userId: number) => {
      // Sovereign Safety Check: Only allow joining the room that matches the authenticated user ID
      if (userId !== user.id) {
        console.warn(`[Socket] User ${user.id} attempted to join unauthorized room: user_${userId}`);
        return;
      }
      // Already joined on connection, but we keep this for compatibility if needed
      socket.join(`user_${userId}`);
      console.log(`[Socket] User ${userId} verified and confirmed in room user_${userId}`);
    });

    socket.on("chat_message", async (data: any) => {
      const { handleChatMessage } = await import('../services/chat.js');
      // Pass the authenticated user to the handler
      data.user = user;
      await handleChatMessage(socket, data);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Disconnected: ${socket.id} (User: ${user.id})`);
    });
  });

  return io;
}
