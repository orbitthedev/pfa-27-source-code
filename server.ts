/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

interface ClientSession {
  ws: WebSocket;
  roomCode: string | null;
  playerName: string;
  isHost: boolean;
  platform: 'mobile' | 'desktop';
}

interface Room {
  code: string;
  host: WebSocket;
  guest: WebSocket | null;
  hostName: string;
  guestName: string | null;
  status: 'WAITING' | 'READY' | 'PLAYING';
  hostPen: string;
  guestPen: string | null;
  hostPlatform: 'mobile' | 'desktop';
  guestPlatform: 'mobile' | 'desktop' | null;
  crossplay: boolean;
}

const clients = new Map<WebSocket, ClientSession>();
const rooms = new Map<string, Room>();

// Health / API check with room listing
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    game: 'PFA 27 Pen Fight',
    activeRooms: rooms.size,
    activePlayers: clients.size,
  });
});

app.get('/api/rooms', (_req, res) => {
  const publicRooms = Array.from(rooms.values())
    .filter((r) => r.status === 'WAITING')
    .map((r) => ({
      code: r.code,
      hostName: r.hostName,
      hostPen: r.hostPen,
      hostPlatform: r.hostPlatform,
      crossplay: r.crossplay,
    }));
  res.json({ rooms: publicRooms });
});

wss.on('connection', (ws: WebSocket) => {
  const session: ClientSession = {
    ws,
    roomCode: null,
    playerName: 'Player',
    isHost: false,
    platform: 'desktop',
  };
  clients.set(ws, session);

  ws.on('message', (messageRaw: string) => {
    try {
      const data = JSON.parse(messageRaw.toString());
      const type = data.type;

      switch (type) {
        case 'CREATE_ROOM': {
          const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
          const hostName = data.playerName || 'Player 1';
          const hostPen = data.penId || 'ballpoint_classic';
          const hostPlatform: 'mobile' | 'desktop' = data.platform === 'mobile' ? 'mobile' : 'desktop';
          const crossplay: boolean = data.crossplay !== false;

          const room: Room = {
            code: roomCode,
            host: ws,
            guest: null,
            hostName,
            guestName: null,
            status: 'WAITING',
            hostPen,
            guestPen: null,
            hostPlatform,
            guestPlatform: null,
            crossplay,
          };
          rooms.set(roomCode, room);

          session.roomCode = roomCode;
          session.playerName = hostName;
          session.isHost = true;
          session.platform = hostPlatform;

          ws.send(
            JSON.stringify({
              type: 'ROOM_CREATED',
              roomCode,
              role: 'host',
              platform: hostPlatform,
              crossplay,
              message: `Room ${roomCode} created (${crossplay ? 'Crossplay ON' : 'Same-Platform Only'}). Share code with opponent!`,
            })
          );
          break;
        }

        case 'LIST_ROOMS': {
          const openRooms = Array.from(rooms.values())
            .filter((r) => r.status === 'WAITING')
            .map((r) => ({
              code: r.code,
              hostName: r.hostName,
              hostPen: r.hostPen,
              hostPlatform: r.hostPlatform,
              crossplay: r.crossplay,
            }));
          ws.send(
            JSON.stringify({
              type: 'ROOMS_LIST',
              rooms: openRooms,
            })
          );
          break;
        }

        case 'JOIN_ROOM': {
          const targetCode = (data.roomCode || '').toUpperCase().trim();
          const room = rooms.get(targetCode);
          const guestName = data.playerName || 'Player 2';
          const guestPen = data.penId || 'gel_velocity';
          const guestPlatform: 'mobile' | 'desktop' = data.platform === 'mobile' ? 'mobile' : 'desktop';
          const guestCrossplay: boolean = data.crossplay !== false;

          if (!room) {
            ws.send(
              JSON.stringify({
                type: 'ERROR',
                message: `Room "${targetCode}" not found. Check code.`,
              })
            );
            return;
          }

          if (room.guest !== null) {
            ws.send(
              JSON.stringify({
                type: 'ERROR',
                message: `Room "${targetCode}" is full.`,
              })
            );
            return;
          }

          // Enforce Crossplay restrictions
          if (!room.crossplay && room.hostPlatform !== guestPlatform) {
            ws.send(
              JSON.stringify({
                type: 'ERROR',
                message: `Crossplay disabled by host. Room only accepts ${room.hostPlatform.toUpperCase()} players (You are on ${guestPlatform.toUpperCase()}).`,
              })
            );
            return;
          }

          if (!guestCrossplay && room.hostPlatform !== guestPlatform) {
            ws.send(
              JSON.stringify({
                type: 'ERROR',
                message: `Your settings specify SAME PLATFORM ONLY (${guestPlatform.toUpperCase()}), but the room host is on ${room.hostPlatform.toUpperCase()}.`,
              })
            );
            return;
          }

          room.guest = ws;
          room.guestName = guestName;
          room.guestPen = guestPen;
          room.guestPlatform = guestPlatform;
          room.status = 'READY';

          session.roomCode = targetCode;
          session.playerName = guestName;
          session.isHost = false;
          session.platform = guestPlatform;

          // Notify guest
          ws.send(
            JSON.stringify({
              type: 'ROOM_JOINED',
              roomCode: targetCode,
              role: 'guest',
              opponentName: room.hostName,
              opponentPen: room.hostPen,
              opponentPlatform: room.hostPlatform,
              myPlatform: guestPlatform,
              crossplay: room.crossplay,
            })
          );

          // Notify host
          room.host.send(
            JSON.stringify({
              type: 'OPPONENT_JOINED',
              roomCode: targetCode,
              opponentName: guestName,
              opponentPen: guestPen,
              opponentPlatform: guestPlatform,
              myPlatform: room.hostPlatform,
              crossplay: room.crossplay,
            })
          );
          break;
        }

        case 'FLICK_ACTION': {
          if (!session.roomCode) return;
          const room = rooms.get(session.roomCode);
          if (!room) return;

          const recipient = session.isHost ? room.guest : room.host;
          if (recipient && recipient.readyState === WebSocket.OPEN) {
            recipient.send(
              JSON.stringify({
                type: 'OPPONENT_FLICKED',
                power: data.power,
                angle: data.angle,
                curve: data.curve,
                flickStyleId: data.flickStyleId,
              })
            );
          }
          break;
        }

        case 'SYNC_STATE': {
          if (!session.roomCode) return;
          const room = rooms.get(session.roomCode);
          if (!room) return;

          const recipient = session.isHost ? room.guest : room.host;
          if (recipient && recipient.readyState === WebSocket.OPEN) {
            recipient.send(
              JSON.stringify({
                type: 'PEER_STATE_SYNC',
                pens: data.pens,
                activeTurn: data.activeTurn,
                score: data.score,
              })
            );
          }
          break;
        }

        case 'CHAT_TAUNT': {
          if (!session.roomCode) return;
          const room = rooms.get(session.roomCode);
          if (!room) return;

          const recipient = session.isHost ? room.guest : room.host;
          if (recipient && recipient.readyState === WebSocket.OPEN) {
            recipient.send(
              JSON.stringify({
                type: 'OPPONENT_TAUNT',
                message: data.message,
                sender: session.playerName,
              })
            );
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('WebSocket parse error', err);
    }
  });

  ws.on('close', () => {
    if (session.roomCode) {
      const room = rooms.get(session.roomCode);
      if (room) {
        const other = session.isHost ? room.guest : room.host;
        if (other && other.readyState === WebSocket.OPEN) {
          other.send(
            JSON.stringify({
              type: 'OPPONENT_DISCONNECTED',
              message: 'Opponent left the match.',
            })
          );
        }
        rooms.delete(session.roomCode);
      }
    }
    clients.delete(ws);
  });
});

// Configure Vite middleware in development
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';
  const PORT = Number(process.env.PORT) || 3000;

  const publicDir = path.resolve(__dirname, 'public');
  const srcAssetsImagesDir = path.resolve(__dirname, 'src', 'assets', 'images');
  const distDir = path.resolve(__dirname, 'dist');

  // Explicit static assets routing with 1-day browser caching
  app.use('/images', express.static(path.join(publicDir, 'images'), { maxAge: '1d' }));
  app.use(express.static(publicDir, { maxAge: '1d' }));

  // Backward compatibility: serve /src/assets/images from public/images and src/assets/images
  app.use('/src/assets/images', express.static(path.join(publicDir, 'images'), { maxAge: '1d' }));
  app.use('/src/assets/images', express.static(srcAssetsImagesDir, { maxAge: '1d' }));

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.use('/images', express.static(path.join(distDir, 'images'), { maxAge: '1d' }));
    app.use('/src/assets/images', express.static(path.join(distDir, 'images'), { maxAge: '1d' }));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`PFA 27 server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
