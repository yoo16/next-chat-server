import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
// import jwt from "jsonwebtoken";

const app = express();
const server = http.createServer(app);
const CLIENT_HOST = process.env.CLIENT_HOST || 'http://localhost:3000';

const io = new Server(server, {
    cors: { origin: CLIENT_HOST, methods: ['GET', 'POST'] },
    maxHttpBufferSize: 10 * 1024 * 1024, // 10MB
});

// 接続前に auth を検証して socket.data に保存するミドルウェア
io.use((socket: Socket, next) => {
    const { token } = socket.handshake.auth as {
        token?: string;
    };
    // クライアントに自分の clientId を通知
    console.log(`User ID for ${socket.data.sender}: ${socket.data.userId}`);
    if (socket.data.token != token) {
        return next(new Error('Authentication error: token is required'));
    }
    next();
});

io.on('connection', (socket: Socket) => {
    // ルーム参加（クライアントからは { room } だけ送る）
    socket.on('join-room', ({ room, sender }) => {
        const token = uuidv4(); // トークンを生成
        const userId = socket.id; // ユーザーIDを生成

        socket.join(room);

        socket.data.room = room;
        socket.data.sender = sender;
        socket.data.token = token;
        socket.data.userId = userId;
        console.log(`${sender} joined room: ${room}`);
        console.log(`userId: ${userId}`);
        console.log(`token: ${token}`);

        socket.emit('auth', { token, userId });

        // 参加通知
        const message = {
            room,
            sender: sender,
            userId: userId,
            text: `${sender} joined the room`,
            date: new Date().toISOString(),
        };
        // ルーム内の他のユーザーに通知
        socket.to(room).emit('user-joined', message);
    });

    // テキストメッセージ受信
    socket.on('message', (message) => {
        const room = socket.data.room as string;
        if (!room) return;

        message.date = new Date().toISOString();
        console.log('message:', message);
        io.to(room).emit('message', message);
    });

    // 画像メッセージ受信
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
