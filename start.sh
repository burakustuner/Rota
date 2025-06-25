#!/bin/bash

echo "�� Rota Takip Sistemi - SDK 53 - Başlatılıyor..."
echo "================================================"

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Fonksiyonlar
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_mobile() {
    echo -e "${PURPLE}[MOBILE]${NC} $1"
}

log_docker() {
    echo -e "${CYAN}[DOCKER]${NC} $1"
}

# Sistem gereksinimleri kontrolü
check_system_requirements() {
    log_info "Sistem gereksinimleri kontrol ediliyor..."
    
    # Node.js kontrolü
    if ! command -v node &> /dev/null; then
        log_error "Node.js kurulu değil! Minimum Node.js 18.x gerekli."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js versiyonu çok eski! Minimum 18.x gerekli. Mevcut: $(node -v)"
        exit 1
    fi
    
    # NPM kontrolü
    if ! command -v npm &> /dev/null; then
        log_error "NPM kurulu değil!"
        exit 1
    fi
    
    log_success "Node.js $(node -v) ve NPM $(npm -v) hazır"
}

# Docker ve Docker Compose kontrolü
check_docker() {
    log_docker "Docker kontrolü yapılıyor..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker kurulu değil! Lütfen Docker'ı kurun."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose kurulu değil! Lütfen Docker Compose'u kurun."
        exit 1
    fi
    
    # Docker daemon kontrolü
    if ! docker info &> /dev/null; then
        log_error "Docker daemon çalışmıyor! Lütfen Docker'ı başlatın."
        exit 1
    fi
    
    log_success "Docker $(docker --version | cut -d' ' -f3 | sed 's/,//') hazır"
}

# Environment dosyası kontrolü
check_env() {
    log_info "Environment dosyası kontrolü..."
    
    if [ ! -f "backend/.env" ]; then
        log_warning "backend/.env dosyası bulunamadı, örnek dosyadan oluşturuluyor..."
        if [ -f "backend/.env.example" ]; then
            cp backend/.env.example backend/.env
            log_warning "⚠️  Lütfen backend/.env dosyasındaki OneID bilgilerini güncelleyin!"
        else
            log_info "Temel .env dosyası oluşturuluyor..."
            cat > backend/.env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rota_db
DB_USER=rota_user
DB_PASSWORD=rota_password123

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=rota_redis_password

# JWT Configuration
JWT_SECRET=rota_jwt_secret_key_2024_ultra_secure
JWT_EXPIRES_IN=7d

# OneID Configuration (Güncellenmelidir!)
ONEID_CLIENT_ID=your_oneid_client_id
ONEID_CLIENT_SECRET=your_oneid_client_secret
ONEID_REDIRECT_URI=http://localhost:3000/auth/oneid/callback

# API Configuration
API_RATE_LIMIT=100
NODE_ENV=development
PORT=3000
EOF
            log_warning "⚠️  Backend/.env dosyası oluşturuldu. OneID bilgilerini güncelleyin!"
        fi
    else
        log_success "Environment dosyası mevcut"
    fi
}

# Backend bağımlılıkları
install_backend_dependencies() {
    log_info "Backend bağımlılıkları kuruluyor..."
    
    if [ ! -f "package.json" ]; then
        log_error "package.json dosyası bulunamadı!"
        exit 1
    fi
    
    npm install
    if [ $? -eq 0 ]; then
        log_success "Backend bağımlılıkları kuruldu"
    else
        log_error "Backend bağımlılıkları kurulamadı!"
        exit 1
    fi
}

# Mobil uygulama bağımlılıkları
install_mobile_dependencies() {
    log_mobile "Mobil uygulama bağımlılıkları kuruluyor..."
    
    # Driver App
    if [ -d "mobile-apps/driver-app" ]; then
        log_mobile "Driver App bağımlılıkları kuruluyor..."
        cd mobile-apps/driver-app
        npm install
        if [ $? -eq 0 ]; then
            log_success "Driver App bağımlılıkları kuruldu"
        else
            log_error "Driver App bağımlılıkları kurulamadı!"
        fi
        cd ../..
    fi
    
    # Personnel App  
    if [ -d "mobile-apps/personnel-app" ]; then
        log_mobile "Personnel App bağımlılıkları kuruluyor..."
        cd mobile-apps/personnel-app
        npm install
        if [ $? -eq 0 ]; then
            log_success "Personnel App bağımlılıkları kuruldu"
        else
            log_error "Personnel App bağımlılıkları kurulamadı!"
        fi
        cd ../..
    fi
}

# Docker servisleri başlat
start_docker_services() {
    log_docker "Docker servisleri başlatılıyor..."
    
    # Eski container'ları temizle
    docker-compose down -v 2>/dev/null
    
    # Yeni container'ları başlat
    docker-compose up -d --build
    
    if [ $? -eq 0 ]; then
        log_success "Docker servisleri başlatıldı"
    else
        log_error "Docker servisleri başlatılamadı!"
        exit 1
    fi
}

# Servislerin hazır olmasını bekle
wait_for_services() {
    log_info "Servislerin hazır olması bekleniyor..."
    
    # PostgreSQL hazır olana kadar bekle
    log_info "PostgreSQL bekleniyor..."
    attempt=0
    max_attempts=30
    until docker exec rota_postgres pg_isready -U rota_user -d rota_db &> /dev/null; do
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
        if [ $attempt -eq $max_attempts ]; then
            log_error "PostgreSQL başlatılamadı!"
            exit 1
        fi
    done
    echo ""
    log_success "PostgreSQL hazır"
    
    # Redis hazır olana kadar bekle
    log_info "Redis bekleniyor..."
    attempt=0
    until docker exec rota_redis redis-cli -a rota_redis_password ping &> /dev/null; do
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
        if [ $attempt -eq $max_attempts ]; then
            log_error "Redis başlatılamadı!"
            exit 1
        fi
    done
    echo ""
    log_success "Redis hazır"
    
    # Backend hazır olana kadar bekle
    log_info "Backend API bekleniyor..."
    attempt=0
    until curl -sf http://localhost:3000/health &> /dev/null; do
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
        if [ $attempt -eq $max_attempts ]; then
            log_warning "Backend API henüz yanıt vermiyor, devam ediliyor..."
            break
        fi
    done
    echo ""
    log_success "Backend API hazır"
}

# Sistem durumunu kontrol et
check_system_status() {
    log_info "Sistem durumu kontrol ediliyor..."
    
    # Backend health check
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
    if [ "$response" = "200" ]; then
        log_success "✅ Backend API çalışıyor (Port: 3000)"
    else
        log_warning "⚠️  Backend API henüz yanıt vermiyor (HTTP: $response)"
    fi
    
    # PostgreSQL durumu
    if docker exec rota_postgres pg_isready -U rota_user -d rota_db &> /dev/null; then
        log_success "✅ PostgreSQL çalışıyor (Port: 5432)"
    else
        log_error "❌ PostgreSQL erişilebilir değil"
    fi
    
    # Redis durumu
    if docker exec rota_redis redis-cli -a rota_redis_password ping &> /dev/null; then
        log_success "✅ Redis çalışıyor (Port: 6379)"
    else
        log_error "❌ Redis erişilebilir değil"
    fi
}

# Mobil uygulama başlatma bilgisi
show_mobile_info() {
    echo ""
    echo "==============================================="
    log_mobile "📱 Mobil Uygulamalar - Expo SDK 53"
    echo ""
    echo "🚗 Şoför Uygulaması (Driver App):"
    echo "  cd mobile-apps/driver-app"
    echo "  npx expo start --clear"
    echo "  # veya: npm run mobile:driver:start"
    echo ""
    echo "👥 Personel Uygulaması (Personnel App):"
    echo "  cd mobile-apps/personnel-app"
    echo "  npx expo start --clear"
    echo "  # veya: npm run mobile:personnel:start"
    echo ""
    log_info "🔧 Geliştirme Komutları:"
    echo "  - Backend logs: docker-compose logs -f backend"
    echo "  - Database logs: docker-compose logs -f postgres"
    echo "  - Tüm servisler: docker-compose logs -f"
    echo "  - Servisleri durdur: docker-compose down"
    echo "  - Verileri temizle: docker-compose down -v"
    echo ""
    log_info "🌐 Erişim URL'leri:"
    echo "  - API: http://localhost:3000"
    echo "  - Health: http://localhost:3000/health"
    echo "  - PostgreSQL: localhost:5432"
    echo "  - Redis: localhost:6379"
    echo ""
    log_info "📚 Faydalı NPM Komutları:"
    echo "  - npm run setup         # Tüm bağımlılıkları kur"
    echo "  - npm run setup:full    # Kurulum + Docker başlat"
    echo "  - npm run mobile:install # Mobil bağımlılıkları kur"
    echo "  - npm run docker:up     # Docker servisleri başlat"
    echo "  - npm run docker:down   # Docker servisleri durdur"
    echo "==============================================="
}

# Usage bilgisi
show_usage() {
    echo "Kullanım: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  --full          Tam kurulum (bağımlılıklar + Docker)"
    echo "  --docker-only   Sadece Docker servisleri"
    echo "  --mobile-only   Sadece mobil bağımlılıklar"
    echo "  --check         Sadece durum kontrolü"
    echo "  --help          Bu yardım mesajını göster"
    echo ""
}

# Ana işlem akışı
main() {
    case "${1:-}" in
        --help)
            show_usage
            exit 0
            ;;
        --check)
            check_system_requirements
            check_docker
            check_system_status
            exit 0
            ;;
        --docker-only)
            check_docker
            start_docker_services
            wait_for_services
            check_system_status
            show_mobile_info
            exit 0
            ;;
        --mobile-only)
            check_system_requirements
            install_mobile_dependencies
            show_mobile_info
            exit 0
            ;;
        --full|"")
            echo ""
            log_info "🚀 Tam sistem başlatma işlemi başlıyor..."
            echo ""
            
            check_system_requirements
            check_docker
            check_env
            install_backend_dependencies
            install_mobile_dependencies
            start_docker_services
            wait_for_services
            check_system_status
            show_mobile_info
            
            echo ""
            log_success "🎉 Rota Takip Sistemi hazır!"
            echo ""
            ;;
        *)
            log_error "Bilinmeyen parametre: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Script'i çalıştır
main "$@" 