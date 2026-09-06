import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from 'jsonwebtoken';

export let io: Server;

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('[FATAL] JWT_SECRET is not set.');
}

const APP_URL = process.env.APP_URL;
if (!APP_URL) {
  throw new Error('[FATAL] APP_URL is not set.');
}

const ADMIN_ROOM = 'admin_room';
const USER_ROOM_PREFIX = 'user_';
const AD_CHAT_PREFIX = 'ad_chat_';
const ADMIN_STATS_INTERVAL = 30000;
const MAX_BUFFER_SIZE = 1e6;
const MIN_TOKEN_LENGTH = 20;

interface DecodedToken {
  id: number;
  role?: string;
  [key: string]: any;
}

interface AuthenticatedSocket extends Socket {
  user: DecodedToken;
}

interface ChatMessage {
  content: string;
  recipient_id: number;
  [key: string]: any;
}

interface AdTypingData {
  ad_id: number;
  recipient_id: number;
  is_typing: boolean;
}

export function initSocket(httpServer: HttpServer): Server {
  const envOrigins = process.env.CORS_ALLOWED_ORIGINS ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim()) : [];
  const allowedOrigins = [
    APP_URL,
    ...envOrigins
  ].filter(Boolean) as string[];

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        if (origin.endsWith('.run.app') || origin.endsWith('.aistudio.google') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ["websocket", "polling"],
    allowUpgrades: true,
    pingInterval: 25000,
    pingTimeout: 20000,
    maxHttpBufferSize: MAX_BUFFER_SIZE,
    serveClient: false,
    cookie: false
  });

  io.use((socket: Socket, next) => {
    try {
      const authSocket = socket as AuthenticatedSocket;
      const token = authSocket.handshake.auth.token || 
                    authSocket.handshake.headers['authorization']?.split(' ')[1];
      
      if (!token) {
        // Allow connection; action-level authentication will handle messages with embedded tokens
        return next();
      }

      if (typeof token !== 'string' || token.length < MIN_TOKEN_LENGTH) {
        return next();
      }

      jwt.verify(token, jwtSecret as string, { 
        algorithms: ['HS256'],
        maxAge: '24h'
      }, (err: any, decoded: any) => {
        if (!err && decoded && typeof decoded === 'object' && decoded.id) {
          authSocket.user = {
            id: decoded.id,
            role: decoded.role || 'user',
            ...decoded
          };
        }
        next();
      });
    } catch (error) {
      next();
    }
  });

  io.on("connection", (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const user = authSocket.user;
    const userRoom = user?.id ? `${USER_ROOM_PREFIX}${user.id}` : '';
    
    if (user?.id) {
      socket.join(userRoom);

      if (user.role === 'admin') {
        socket.join(ADMIN_ROOM);
        broadcastAdminStatsOnce().catch(err => 
          console.error('[Socket] Initial admin stats failed:', err)
        );
      }
    }

    socket.on("register_user", (userId: number) => {
      if (typeof userId !== 'number') {
        return;
      }
      if (user && user.id && user.id !== userId) {
        console.warn(`[Socket] User ${user.id} attempted to register mismatch room ${userId}`);
        return;
      }
      socket.join(`${USER_ROOM_PREFIX}${userId}`);
    });

    socket.on("chat_message", async (data: ChatMessage) => {
      try {
        if (!data || typeof data !== 'object') {
          socket.emit('error', { message: 'Invalid message format' });
          return;
        }

        if (!data.content || typeof data.content !== 'string') {
          socket.emit('error', { message: 'Missing message content' });
          return;
        }

        const { handleChatMessage } = await import('../services/chat.js');
        await handleChatMessage(socket, { ...data, user });
      } catch (error) {
        console.error('[Socket] Chat error:', error);
        socket.emit('error', { 
          message: 'Failed to process message',
          ...(process.env.NODE_ENV === 'development' && { details: String(error) })
        });
      }
    });

    socket.on("typing", (data: any) => {
      try {
        if (!data || typeof data !== 'object') {
          return;
        }
        socket.to(userRoom).emit("typing", data);
      } catch (error) {
        console.error('[Socket] Typing error:', error);
      }
    });

    socket.on("ad_typing", (data: AdTypingData) => {
      try {
        if (!data || typeof data !== 'object') {
          return;
        }

        if (!data.recipient_id || typeof data.recipient_id !== 'number') {
          return;
        }

        if (!data.ad_id || typeof data.ad_id !== 'number') {
          return;
        }

        const recipientRoom = `${USER_ROOM_PREFIX}${data.recipient_id}`;
        io.to(recipientRoom).emit("ad_typing", {
          ad_id: data.ad_id,
          sender_id: user.id,
          is_typing: !!data.is_typing
        });
      } catch (error) {
        console.error('[Socket] Ad typing error:', error);
      }
    });

    socket.on("join_ad_chat", (adId: number) => {
      try {
        if (typeof adId !== 'number' || adId <= 0) {
          console.warn(`[Socket] User ${user.id} invalid ad chat join`);
          return;
        }
        socket.join(`${AD_CHAT_PREFIX}${adId}`);
      } catch (error) {
        console.error('[Socket] Join ad chat error:', error);
      }
    });

    socket.on("disconnect", () => {
      try {
        const rooms = Array.from(socket.rooms);
        for (const room of rooms) {
          if (room.startsWith(USER_ROOM_PREFIX) || room.startsWith(AD_CHAT_PREFIX)) {
            socket.leave(room);
          }
        }
      } catch (error) {
        console.error('[Socket] Disconnect error:', error);
      }
    });
  });

  const adminStatsInterval = setInterval(async () => {
    try {
      const adminRoom = io.sockets.adapter.rooms.get(ADMIN_ROOM);
      if (adminRoom && adminRoom.size > 0) {
        await broadcastAdminStats();
      }
    } catch (error) {
      console.error('[Socket] Periodic stats error:', error);
    }
  }, ADMIN_STATS_INTERVAL);

  return io;
}

async function broadcastAdminStats(): Promise<void> {
  try {
    const { broadcastAdminStats: broadcast } = await import('../services/admin.js');
    await broadcast();
  } catch (error) {
    console.error('[Socket] Admin stats broadcast error:', error);
    throw error;
  }
}

async function broadcastAdminStatsOnce(): Promise<void> {
  try {
    await broadcastAdminStats();
  } catch (error) {
    console.error('[Socket] Initial admin stats error:', error);
  }
}

export function closeSocket(): void {
  if (io) {
    io.close();
  }
}