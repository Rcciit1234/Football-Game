import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { MatchManager } from './MatchManager.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 1000,
  pingTimeout: 2000,
});

const matchManager = new MatchManager(io);

io.on('connection', (socket) => {
  console.log(`[Server] Player connected: ${socket.id}`);

  let playerName = `Player_${socket.id.slice(0, 4)}`;

  socket.on('join_queue', (data?: { name?: string }) => {
    if (data?.name) playerName = data.name;
    matchManager.addToQueue(socket, playerName);
  });

  socket.on('leave_queue', () => {
    matchManager.removeFromQueue(socket);
  });

  socket.on('player_input', (input) => {
    matchManager.handleInput(socket.id, input);
  });

  socket.on('ready', () => {
    matchManager.handleReady(socket.id);
  });

  socket.on('request_match_info', () => {
    matchManager.sendMatchInfo(socket);
  });

  socket.on('chat_message', (msg: string) => {
    matchManager.handleChat(socket.id, msg);
  });

  socket.on('disconnect', () => {
    console.log(`[Server] Player disconnected: ${socket.id}`);
    matchManager.removePlayer(socket.id);
  });
});

// Health endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', players: io.engine.clientsCount });
});

server.listen(PORT, () => {
    console.log(`[Server] 3D Football Game 6v6 server running on port ${PORT}`);
  console.log(`[Server] Waiting for players...`);
});
