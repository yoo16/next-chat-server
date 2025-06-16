import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);
const CLIENT_HOST = process.env.CLIENT_HOST || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'next-chat-secret';

const io = new Server(server, {
    cors: { origin: CLIENT_HOST, methods: ['GET', 'POST'] },
    maxHttpBufferSize: 10 * 1024 * 1024,
});

// 接続前の JWT 認証ミドルウェア
io.use((socket: Socket, next) => {
    const { token } = socket.handshake.auth as { token?: string };

    if (!token) {
        return next(new Error('Authentication error: Missing token'));
    }

    try {
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

        socket.join(room);
        socket.data.room = room;

        console.log(`${sender} joined room: ${room}`);
        console.log(`token: ${token}`);

        socket.emit('auth', { token: socket.handshake.auth.token, userId });

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

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.data.sender}`);
    });
});

const HOST = process.env.SERVER_HOST || 'localhost';
const PORT = process.env.SERVER_PORT || 3001;
server.listen(Number(PORT), HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
});