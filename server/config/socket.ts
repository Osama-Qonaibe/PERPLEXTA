import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from 'jsonwebtoken';

export let io: Server;

const jwtSecret = process.env.JWT_SECRET || 'perplexta_secure_fallback_secret_2026';
if (!process.env.JWT_SECRET) {
  console.warn('[WARNING] JWT_SECRET is not set. Using secure fallback secret.');
}

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.APP_URL || true,
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ["websocket", "polling"],
    allowUpgrades: true,
    pingInterval: 25000,
    pingTimeout: 20000
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
    
    if (user.role === 'admin') {
      socket.join('admin_room');
      import('../services/admin.js').then(({ broadcastAdminStats }) => {
        broadcastAdminStats().catch(err => console.error('[Socket] Initial admin stats broadcast failed:', err));
      }).catch(err => console.error('[Socket] Failed to load admin service for initial stats:', err));
    }
    
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

    socket.on("typing", (data: any) => {
      socket.to(`user_${user.id}`).emit("typing", data);
    });

    socket.on("ad_typing", (data: { ad_id: number; recipient_id: number; is_typing: boolean }) => {
      if (data && data.recipient_id) {
        io.to(`user_${data.recipient_id}`).emit("ad_typing", {
          ad_id: data.ad_id,
          sender_id: user.id,
          is_typing: data.is_typing
        });
      }
    });

    socket.on("join_ad_chat", (adId: number) => {
      socket.join(`ad_chat_${adId}`);
    });

    socket.on("disconnect", () => {
    });
  });

  setInterval(() => {
    const adminRoom = io.sockets.adapter.rooms.get('admin_room');
    if (adminRoom && adminRoom.size > 0) {
      import('../services/admin.js').then(({ broadcastAdminStats }) => {
        broadcastAdminStats().catch(err => console.error('[Socket] Periodic broadcast failed:', err));
      }).catch(err => console.error('[Socket] Failed to load admin service for periodic broadcast:', err));
    }
  }, 15000);

  return io;
}
