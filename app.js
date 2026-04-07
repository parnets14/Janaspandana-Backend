import express from "express";
import cors from 'cors'; 
import dotenv from "dotenv";
import helmet from "helmet";
import mongoose from "mongoose";
import morgan from "morgan";
import authRoutes from './src/Routes/authRoutes.js';
import adminRoutes from './src/Routes/adminRoutes.js';
import departmentRoutes from './src/Routes/departmentRoutes.js';
import complaintRoutes from './src/Routes/complaintRoutes.js';
import { 
  sanitizeData, 
  preventXSS, 
  preventHPP, 
  hideEndpoints,
  requestLogger 
} from './src/Middleware/securityMiddleware.js';
 
dotenv.config();
 
const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  permissionsPolicy: {
    unload: []
  }
}));

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files (cross-origin allowed for images)
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  next()
}, express.static('uploads'));

// Security middleware
app.use(hideEndpoints);
app.use(requestLogger);
app.use(sanitizeData);
app.use(preventXSS);
app.use(preventHPP);

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/complaints', complaintRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong' 
    : err.message;
  
  res.status(err.statusCode || 500).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Database connection
mongoose 
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    console.log(`🔒 Security features enabled`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

const PORT = process.env.PORT || 5000;
 
const server = app.listen(PORT, () => { 
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
});
 

