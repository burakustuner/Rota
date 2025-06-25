const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const db = require('./config/database');
const redisClient = require('./config/redis');

// Routes
const authRoutes = require('./routes/auth');
const locationRoutes = require('./routes/location');
const vehicleRoutes = require('./routes/vehicle');
const userRoutes = require('./routes/user');

// Middleware
const { authenticateToken } = require('./middleware/auth');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Çok fazla istek gönderdiniz, lütfen daha sonra tekrar deneyin.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/location', authenticateToken, locationRoutes);
app.use('/api/vehicle', authenticateToken, vehicleRoutes);
app.use('/api/user', authenticateToken, userRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// WebSocket connections
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userType = decoded.user_type;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(`Kullanıcı bağlandı: ${socket.userId} (${socket.userType})`);
  
  // Şoför ise kendi grubuna katıl
  if (socket.userType === 'driver') {
    socket.join(`driver_${socket.userId}`);
  }
  
  // Personel ise yetkili olduğu araçları dinle
      if (socket.userType === 'personnel') {
      socket.join(`personnel_${socket.userId}`);
    
    // Personelin takip edebileceği araçları getir
    db.query(`
      SELECT v.id as vehicle_id 
              FROM personnel_vehicle_access pva
        JOIN vehicles v ON pva.vehicle_id = v.id
        WHERE pva.personnel_id = $1
    `, [socket.userId])
    .then(result => {
      result.rows.forEach(row => {
        socket.join(`vehicle_${row.vehicle_id}`);
      });
    });
  }
  
  // Konum güncelleme (şoförler için)
  socket.on('location_update', async (data) => {
    if (socket.userType !== 'driver') {
      return socket.emit('error', 'Sadece şoförler konum gönderebilir');
    }
    
    try {
      const { latitude, longitude, accuracy, speed, heading } = data;
      
      // Şoförün aracını bul
      const vehicleResult = await db.query(
        'SELECT id FROM vehicles WHERE driver_id = $1 AND status = $2',
        [socket.userId, 'active']
      );
      
      if (vehicleResult.rows.length === 0) {
        return socket.emit('error', 'Aktif araç bulunamadı');
      }
      
      const vehicleId = vehicleResult.rows[0].id;
      
      // Konum geçmişine kaydet
      await db.query(`
        INSERT INTO location_history (vehicle_id, driver_id, location, latitude, longitude, accuracy, speed, heading)
        VALUES ($1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326), $3, $4, $5, $6, $7)
      `, [vehicleId, socket.userId, latitude, longitude, accuracy, speed, heading]);
      
      // Güncel konumu güncelle
      await db.query(`
        INSERT INTO current_locations (vehicle_id, driver_id, location, latitude, longitude, accuracy, speed, heading, last_update, is_online)
        VALUES ($1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326), $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, true)
        ON CONFLICT (vehicle_id) 
        DO UPDATE SET 
          driver_id = $2,
          location = ST_SetSRID(ST_MakePoint($4, $3), 4326),
          latitude = $3,
          longitude = $4,
          accuracy = $5,
          speed = $6,
          heading = $7,
          last_update = CURRENT_TIMESTAMP,
          is_online = true
      `, [vehicleId, socket.userId, latitude, longitude, accuracy, speed, heading]);
      
      // Real-time'da personellere gönder
      io.to(`vehicle_${vehicleId}`).emit('location_updated', {
        vehicle_id: vehicleId,
        latitude,
        longitude,
        accuracy,
        speed,
        heading,
        timestamp: new Date().toISOString()
      });
      
      socket.emit('location_saved', { success: true });
      
    } catch (error) {
      console.error('Konum kaydetme hatası:', error);
      socket.emit('error', 'Konum kaydedilemedi');
    }
  });
  
  socket.on('disconnect', async () => {
    console.log(`Kullanıcı ayrıldı: ${socket.userId}`);
    
    // Şoför ayrıldıysa aracını offline yap
    if (socket.userType === 'driver') {
      try {
        await db.query(`
          UPDATE current_locations 
          SET is_online = false 
          WHERE driver_id = $1
        `, [socket.userId]);
      } catch (error) {
        console.error('Offline durumu güncellenemedi:', error);
      }
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: 'Sunucu hatası',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint bulunamadı'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    console.log('HTTP server closed');
    
    db.pool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});

server.listen(PORT, () => {
  console.log(`🚌 Rota Takip Sistemi ${PORT} portunda çalışıyor`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = { app, server, io }; 