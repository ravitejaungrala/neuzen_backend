import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';
import { Server } from 'socket.io';
import morgan from 'morgan';

// Import routes
import aiRoutes from './routes/ai.js';
import hrRoutes from './routes/hrRoutes.js';
import candidateRoutes from './routes/candidateRoutes.js';
import authRoutes from './routes/auth.js';
import jobRoutes from './routes/jobs.js';
import analyticsRoutes from './routes/analytics.js';
import dashboardRoutes from './routes/dashboard.js';
import hrAIAnalysisRoutes from './routes/hrAIAnalysis.js';
import testimonalRoutes from './routes/testimonialRoutes.js';
import communicationRoutes from './routes/communicationRoutes.js';
import hrAICandidateRoutes from './routes/hrAICandidate.js';
import uploadRoutes from './routes/uploadRoutes.js';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// 👉 IMPORTANT: Tell Express it's behind a proxy (Render/Heroku/etc.)
app.set('trust proxy', 1);

// ================== ENHANCED CORS CONFIGURATION ==================
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://neuzen-frontend.onrender.com',
  'https://talenthr-front.onrender.com'
  // Netlify domain removed as requested
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-api-key'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ================== MIDDLEWARE ==================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// ================== RATE LIMITING ==================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});

app.use('/api/', limiter);

// ================== SOCKET.IO ==================
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

io.on('connection', (socket) => {
  console.log('✅ New client connected:', socket.id);

  socket.on('join-user', (userId) => {
    socket.join(`user-${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.set('io', io);

// ================== DATABASE ==================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-hire-platform';

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// ================== FILE UPLOAD FOLDERS ==================
const createUploadDirectories = () => {
  const directories = [
    path.join(__dirname, 'uploads', 'resumes'),
    path.join(__dirname, 'uploads', 'temp')
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log('✅ Created directory:', dir);
    }
  });
};

createUploadDirectories();

app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// ================== ROUTES ==================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development',
    cors: 'enabled'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/candidate', candidateRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/hr/ai', hrAIAnalysisRoutes);
app.use('/api/test', testimonalRoutes);
app.use('/api/communication', communicationRoutes);
app.use('/api/hr/aicandidate', hrAICandidateRoutes);

// ================== 404 HANDLER ==================
app.use('/api/*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `API endpoint ${req.originalUrl} not found`,
    suggestion: 'Check available routes like /api/health'
  });
});

// ================== GLOBAL ERROR HANDLER ==================
app.use((err, req, res, next) => {
  console.error('🚨 Error:', err.stack);

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      status: 'error',
      message: 'CORS Error: Origin not allowed',
      allowedOrigins: allowedOrigins
    });
  }

  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});

// ================== SERVER START ==================
const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
  🚀 AI Hire Platform Server Started!
  ===================================
  🌍 Port: ${PORT}
  🔗 API URL: http://localhost:${PORT}/api
  🌐 Allowed Origins: ${allowedOrigins.join(', ')}
  📡 WebSocket: ws://localhost:${PORT}
  🗄️ Database: Connected
  ===================================
  `);
});

export { app, server, io };
