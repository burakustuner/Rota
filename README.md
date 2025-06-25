# 🚌 Rota

Modern, gerçek zamanlı araç takip sistemi. Şoför ve personel uygulamaları.

## ✨ Özellikler

### 🚗 Şoför Uygulaması (Driver App)
- 📱 Expo SDK 53 ile modern React Native
- 🗺️ Gerçek zamanlı GPS takibi
- 🔔 Anlık bildirimler

### 👥 Personel Uygulaması (Personnel App)
- 🗺️ Canlı harita ile tüm araç takibi

### 🔧 Backend API
- ⚡ Node.js + Express.js
- 🗄️ PostgreSQL + PostGIS
- 🔌 Socket.IO real-time iletişim
- 🔒 OneID entegrasyon
- 📊 Redis cache sistemi

## 🚀 Hızlı Başlangıç

### Sistem Gereksinimleri
- Node.js 18.x veya üzeri
- Docker & Docker Compose
- Git

### 1️⃣ Tek Komutla Başlatma
```bash
# Tam kurulum ve başlatma
./start.sh

# Sadece Docker servisleri
./start.sh --docker-only

# Sadece mobil bağımlılıklar
./start.sh --mobile-only

# Sistem durumu kontrolü
./start.sh --check
```

### 2️⃣ Manuel Kurulum

#### Backend ve Docker Servisleri
```bash
# Bağımlılıkları kur
npm install

# Docker servisleri başlat
npm run docker:up

# Logları izle
npm run docker:logs
```

#### Mobil Uygulamalar
```bash
# Tüm mobil bağımlılıkları kur
npm run mobile:install

# Şoför uygulaması
npm run mobile:driver:start

# Personel uygulaması
npm run mobile:personnel:start
```

## 📱 Mobil Uygulamaları Başlatma

### Şoför Uygulaması
```bash
cd mobile-apps/driver-app
npx expo start --clear
```

### Personel Uygulaması
```bash
cd mobile-apps/personnel-app
npx expo start --clear
```

QR kodu telefonunuzda Expo Go ile tarayarak uygulamaları test edebilirsiniz.

## 🔧 Geliştirme

### NPM Komutları
```bash
# Backend geliştirme modunda çalıştır
npm run dev

# Docker işlemleri
npm run docker:build    # Build container'ları
npm run docker:up       # Servisleri başlat
npm run docker:down     # Servisleri durdur
npm run docker:logs     # Logları göster

# Mobil uygulama işlemleri
npm run mobile:driver:android    # Android build
npm run mobile:personnel:android     # Android build
npm run mobile:driver:build      # Production build
npm run mobile:personnel:build       # Production build
```

### Veritabanı Migration
```bash
npm run db:migrate
```

### Sistem Durumu Kontrolü
```bash
npm run health
```

## 🌐 Erişim URL'leri

- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 📊 Teknoloji Stack

### Frontend (Mobil)
- **React Native**: 0.76.3
- **Expo SDK**: 53.0.0
- **React Navigation**: 6.x
- **React Native Paper**: Material Design
- **React Native Maps**: Harita integrasyon
- **Socket.IO Client**: Real-time iletişim

### Backend
- **Node.js**: 20.x
- **Express.js**: 4.19.x
- **Socket.IO**: 4.8.x
- **PostgreSQL**: 15.x + PostGIS
- **Redis**: 7.x
- **JWT**: Authentication

### DevOps
- **Docker & Docker Compose**
- **Multi-stage builds**
- **Health checks**
- **Auto-restart policies**

## 🔒 Güvenlik

- JWT token authentication
- OneID entegrasyon
- Rate limiting
- CORS protection
- Helmet security headers
- Non-root container execution

## 📁 Proje Yapısı

```
Rota/
├── backend/                 # Backend API
│   ├── config/             # Konfigürasyon
│   ├── middleware/         # Express middleware
│   ├── routes/             # API routes
│   ├── migrations/         # Veritabanı migration
│   └── server.js           # Ana server dosyası
├── mobile-apps/
│   ├── driver-app/         # Şoför uygulaması
│   └── personnel-app/      # Personel uygulaması
├── docker-compose.yml      # Docker servis tanımları
├── Dockerfile.backend      # Backend container
├── start.sh               # Otomatik başlatma script
└── package.json           # Ana NPM konfigürasyonu
```

## 🔧 Konfigürasyon

### Environment Variables
Backend `.env` dosyasını düzenleyin:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rota_db
DB_USER=rota_user
DB_PASSWORD=rota_password123

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=rota_redis_password

# JWT
JWT_SECRET=your_ultra_secure_secret
JWT_EXPIRES_IN=7d

# OneID (Güncellenmelidir!)
ONEID_CLIENT_ID=your_oneid_client_id
ONEID_CLIENT_SECRET=your_oneid_client_secret
ONEID_REDIRECT_URI=http://localhost:3000/auth/oneid/callback
```

## 📋 API Endpoints

### Authentication
- `POST /api/auth/oneid/login` - OneID ile giriş
- `GET /api/auth/oneid/authorize-url` - OneID authorize URL
- `POST /api/auth/logout` - Çıkış

### Vehicles
- `GET /api/vehicles/accessible` - Erişilebilir araçlar
- `GET /api/vehicles/assigned` - Atanmış araç (şoför)
- `PUT /api/vehicles/status` - Araç durumu güncelle
- `GET /api/vehicles/stats` - Araç istatistikleri

### Location
- `GET /api/location/vehicles/current` - Güncel araç konumları
- `GET /api/location/vehicle/:id/current` - Belirli araç konumu
- `GET /api/location/vehicle/:id/history` - Araç konum geçmişi

### WebSocket Events
- `location_update` - Konum güncellemesi
- `driver_status_update` - Şoför durum güncellemesi
- `vehicle_status_change` - Araç durum değişikliği

## 🧪 Test

```bash
# Backend testleri çalıştır
npm test

# Mobil uygulama testleri
cd mobile-apps/driver-app && npm test
cd mobile-apps/personnel-app && npm test
```

## 📊 Monitoring

- Health check endpoint: `/health`
- Docker container health checks
- Redis connection monitoring
- PostgreSQL connection monitoring

## 🚀 Production Deployment

### Docker ile Production
```bash
# Production profili ile başlat
docker-compose --profile production up -d

# Nginx reverse proxy dahil
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Mobil Uygulama Build
```bash
# Android APK
npm run mobile:driver:build
npm run mobile:personnel:build

# Expo Application Services (EAS) ile
cd mobile-apps/driver-app && eas build --platform android
cd mobile-apps/personnel-app && eas build --platform android
```

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add some amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.