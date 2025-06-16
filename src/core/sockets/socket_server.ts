// src/core/sockets/socket_server.ts

import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { registerGroupRoomHandler } from "./handlers/group_room_handler";

export default class SocketServer {
    private static instance: SocketServer;
    private io: Server;
    private onlineUsers = new Map<string, string>(); // Map<userId, socketId>

    // Private constructor: enforce singleton usage
    private constructor(server: HttpServer) {
        this.io = new Server(server, {
            cors: {
                origin: "*", 
                methods: ["GET", "POST"],
            },
        });
        this.initialize(); 
    }


    public static initialize(server: HttpServer): SocketServer {
        if (!SocketServer.instance) {
            SocketServer.instance = new SocketServer(server);
        }
        return SocketServer.instance;
    }

    public static getInstance(): SocketServer {
        if (!SocketServer.instance) {
            throw new Error("SocketServer not initialized. Call initialize(server) first.");
        }
        return SocketServer.instance;
    }

    private initialize() {
        this.io.on("connection", (socket) => {
            const userId = socket.handshake.query.userId as string;
            if (userId) {
                this.onlineUsers.set(userId, socket.id);
                console.log(`User ${userId} connected with socket ID: ${socket.id}`);
            }

            registerGroupRoomHandler(this.io, socket, this.onlineUsers);

            socket.on("disconnect", () => {
                if (userId) {
                    this.onlineUsers.delete(userId);
                    console.log(`User ${userId} disconnected`);
                }
            });
           
        });
    }

    public getIO(): Server {
        return this.io;
    }

    public isUserOnline(userId: string): boolean {
        return this.onlineUsers.has(userId);
    }

    public getSocketId(userId: string): string | undefined {
        return this.onlineUsers.get(userId);
    }
}
