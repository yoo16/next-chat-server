import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import cors from "cors";
import { Message } from './interfaces/Message';

dotenv.config();

const app = express();
const server = http.createServer(app);
const JWT_SECRET = process.env.JWT_SECRET || 'next-chat-secret';

// CORS 許可リスト（必要に応じて複数追加）
const allowedOrigins = process.env.CORS_ORIGIN?.split(",") ?? []
console.log('CORS allowed origins:', allowedOrigins);

const roomMessages: Record<string, Message[]> = {};

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true
}));

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        credentials: true,
    },
    maxHttpBufferSize: 10 * 1024 * 1024,
});

// 接続前の JWT 認証ミドルウェア
io.use((socket: Socket, next) => {
    const { token } = socket.handshake.auth as { token?: string };

    if (!token) {
        return next(new Error('Authentication error: Missing token'));
    }

    try {
        // JWT の検証
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; sender: string };

        socket.data.userId = decoded.userId;
        socket.data.token = token;
        socket.data.sender = decoded.sender;

        next();
    } catch (err) {
        console.error('JWT verification failed:', err);
        return next(new Error('Authentication error: Invalid token'));
    }
});

// 接続後の処理
io.on('connection', (socket: Socket) => {
    socket.on('join-room', ({ room }) => {
        const sender = socket.data.sender;
        const userId = socket.data.userId;
        const token = socket.data.token;

        // JOIN ROOM
        socket.join(room);
        socket.data.room = room;

        console.log(`${sender} joined room: ${room}`);
        console.log(`token: ${token}`);

        // 認証
        socket.emit('auth', { token, userId });

        // ルームに参加したユーザーにメッセージを送信
        const message = {
            room,
            sender,
            userId,
            text: `${sender} joined the room`,
            date: new Date().toISOString(),
        };
        socket.to(room).emit('user-joined', message);
    });

    socket.on('message', (message) => {
        const room = socket.data.room as string;
        if (!room) return;

        message.date = new Date().toISOString();
        if (!roomMessages[room]) {
            roomMessages[room] = [];
        }
        roomMessages[room].push(message);
        console.log('message:', message);
        io.to(room).emit('message', message);
    });

    socket.on('image', (message) => {
        const room = socket.data.room as string;
        if (!room) return;

        message.date = new Date().toISOString();
        console.log('image:', message);
        io.to(room).emit('image', message);
    });

    // 履歴取得リクエスト
    socket.on("get-history", ({ room }) => {
        const messages = roomMessages[room] || [];
        socket.emit("history", messages);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.data.sender}`);
    });
});

const HOST = process.env.SERVER_HOST || 'localhost';
const PORT = process.env.SERVER_PORT || 3001;
server.listen(Number(PORT), HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
});