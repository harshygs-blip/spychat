import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './auth/authRoutes';
import userRoutes from './users/userRoutes';
import conversationRoutes from './conversations/conversationRoutes';
import messageRoutes from './messages/messageRoutes';
import callRoutes from './calls/callRoutes';
import adminRoutes from './admin/adminRoutes';
import { getAdminPortalHtml } from './admin/adminPortalHtml';
import { setupSocketHandler } from './socket/socketHandler';
import { db } from './database/db';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// Standalone Web Admin Portal (Open in browser at /admin-portal or /admin-dashboard)
app.get('/admin-portal', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(getAdminPortalHtml());
});

app.get('/admin-dashboard', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(getAdminPortalHtml());
});

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key']
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Global IP Ban Firewall Check
app.use((req, res, next) => {
  const clientIp = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '').split(',')[0].trim();
  if (clientIp && db.isIpBanned(clientIp)) {
    return res.status(403).json({ error: 'Access Denied: Your IP address has been blacklisted by Administrator.' });
  }
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SPYCHAT Privacy Server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/conversations', conversationRoutes);
app.use('/messages', messageRoutes);
app.use('/calls', callRoutes);
app.use('/admin', adminRoutes);

// Direct APK Download & Sharing Routes
app.get('/app-version', (req, res) => {
  res.json({
    version: '1.0.5',
    versionCode: 5,
    forceUpdate: false,
    downloadUrl: 'https://github.com/harshygs-blip/spychat/raw/main/app-debug.apk',
    changelog: '⚡ WhatsApp-style Auto-Update System\n🎙️ WebRTC HD Audio & Video Calling Fixes\n🔒 E2EE Enclave Security Enhancements',
    releaseDate: new Date().toISOString().split('T')[0]
  });
});

app.get('/download/app.apk', (req, res) => {
  res.redirect('https://github.com/harshygs-blip/spychat/raw/main/app-debug.apk');
});

app.get('/download', (req, res) => {
  res.redirect('https://github.com/harshygs-blip/spychat/raw/main/app-debug.apk');
});

// Socket.io Setup (100MB buffer for bulk multi-media)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e8, // 100MB
  pingTimeout: 30000,
  pingInterval: 10000
});

setupSocketHandler(io);

// Start Server
server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`  🔒 SPYCHAT SERVER RUNNING ON PORT ${PORT}  `);
  console.log(`  🔗 WebRTC Signaling & E2EE Relay Ready `);
  console.log(`=========================================`);
});
