const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// SECURITY HEADERS
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      mediaSrc: ["'self'", "data:", "blob:"],
      frameSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
    },
  },
  xFrameOptions: { action: 'sameorigin' },
  xContentTypeOptions: true,
  referrerPolicy: { policy: 'same-origin' },
}));

// CORS CONFIG
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : true;

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// RATE LIMITING
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// PARSERS
app.use(express.json({ limit: '10kb' })); 
app.use(cookieParser());
app.use(morgan('combined')); 

// DATABASE & OBJECT STORAGE INIT
const { initDb } = require('./db/database');
const { initMinio } = require('./services/minioService');
initDb();
initMinio();

// ROUTES
const authRoutes = require('./routes/authRoutes');
const terminalRoutes = require('./routes/terminalRoutes');
const fileRoutes = require('./routes/fileRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/terminals', terminalRoutes);
app.use('/api/files', fileRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// SERVE FRONTEND (SPA)
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

// ERROR HANDLING
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

const PORT = process.env.PORT || (process.env.NODE_ENV === 'production' ? 80 : 5000);
app.listen(PORT, () => {
  console.log(`[SECURITY] Secure Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});
