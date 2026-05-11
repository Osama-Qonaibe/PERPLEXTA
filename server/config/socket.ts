import { Server } from "socket.io";
import { Server as HttpServer } from "http";

export let io: Server;

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.APP_URL || "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] New connection: ${socket.id}`);
    
    socket.on("join_user_room", (userId: number) => {
      socket.join(`user_${userId}`);
      console.log(`[Socket] User ${userId} joined room user_${userId}`);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });

  return io;
}
