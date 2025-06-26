import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    // Cache problemini bypass etmek için hard-coded IP
    this.baseURL = 'http://192.168.0.201:3000';
  }

  async connect() {
    console.log('🔌 Socket bağlantısı başlatılıyor...');
    console.log('🌐 Base URL:', this.baseURL);
    
    try {
      // Önceki bağlantıları temizle
      if (this.socket) {
        console.log('🧹 Önceki socket bağlantısı temizleniyor...');
        this.socket.disconnect();
        this.socket = null;
        this.isConnected = false;
      }

      const token = await AsyncStorage.getItem('auth_token');
      console.log('🔑 Token alındı:', token ? 'Mevcut' : 'Yok');
      
      if (!token) {
        throw new Error('Auth token bulunamadı');
      }

      console.log('⚙️ Socket.IO konfigürasyonu:', {
        baseURL: this.baseURL,
        transports: ['websocket', 'polling'],
        timeout: 5000
      });

      this.socket = io(this.baseURL, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        timeout: 5000,
        reconnection: true,
        reconnectionDelay: this.reconnectInterval,
        reconnectionAttempts: this.maxReconnectAttempts
      });
      
      console.log('📡 Socket instance oluşturuldu');

      this.setupEventListeners();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Socket bağlantı zaman aşımı'));
        }, 10000);

        this.socket.on('connect', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          console.log('Socket bağlantısı kuruldu:', this.socket.id);
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          console.error('Socket bağlantı hatası:', error);
          reject(error);
        });
      });

    } catch (error) {
      console.error('Socket bağlantı kurma hatası:', error);
      throw error;
    }
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('Socket bağlandı:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log('Socket bağlantısı kesildi:', reason);
      
      if (reason === 'io server disconnect') {
        // Sunucu tarafından bağlantı kesildi, yeniden bağlan
        this.socket.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket bağlantı hatası:', error);
      this.handleReconnection();
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket yeniden bağlantı başarısız');
      this.isConnected = false;
    });

    // Konum güncellemesi confirmations
    this.socket.on('location_received', (data) => {
      console.log('Konum alındı onayı:', data);
    });

    // Sunucudan gelen mesajlar
    this.socket.on('driver_message', (data) => {
      console.log('Şoför mesajı alındı:', data);
      // Notification göster vs.
    });
  }

  handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Yeniden bağlantı denemesi ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    }
  }

  async sendLocation(locationData) {
    if (!this.isConnected || !this.socket) {
      console.warn('Socket bağlı değil, konum gönderilemedi');
      return false;
    }

    try {
      const userData = await AsyncStorage.getItem('user_data');
      const user = userData ? JSON.parse(userData) : null;

      if (!user) {
        throw new Error('Kullanıcı bilgisi bulunamadı');
      }

      const payload = {
        user_id: user.id,
        vehicle_id: user.vehicle_id,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        speed: locationData.speed || 0,
        heading: locationData.heading || 0,
        accuracy: locationData.accuracy || 0,
        timestamp: locationData.timestamp || new Date().toISOString()
      };

      this.socket.emit('location_update', payload);
      console.log('Konum gönderildi:', payload);
      return true;

    } catch (error) {
      console.error('Konum gönderme hatası:', error);
      return false;
    }
  }

  async updateDriverStatus(status) {
    if (!this.isConnected || !this.socket) {
      console.warn('Socket bağlı değil, durum güncellemesi gönderilemedi');
      return false;
    }

    try {
      const userData = await AsyncStorage.getItem('user_data');
      const user = userData ? JSON.parse(userData) : null;

      if (!user) {
        throw new Error('Kullanıcı bilgisi bulunamadı');
      }

      const payload = {
        user_id: user.id,
        status: status, // 'online', 'offline', 'break', 'driving'
        timestamp: new Date().toISOString()
      };

      this.socket.emit('driver_status_update', payload);
      console.log('Şoför durumu gönderildi:', payload);
      return true;

    } catch (error) {
      console.error('Durum güncelleme hatası:', error);
      return false;
    }
  }

  disconnect() {
    try {
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
      this.isConnected = false;
      this.reconnectAttempts = 0;
      console.log('Socket bağlantısı kapatıldı');
    } catch (error) {
      console.error('Socket kapatma hatası:', error);
    }
  }

  // Event listener ekleme
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Event listener kaldırma
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Özel mesaj gönderme
  emit(event, data) {
    if (this.isConnected && this.socket) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket bağlı değil, mesaj gönderilemedi:', event);
    }
  }

  // Bağlantı durumunu kontrol et
  isSocketConnected() {
    return this.isConnected && this.socket?.connected;
  }
}

// Singleton pattern
const socketService = new SocketService();
export default socketService; 