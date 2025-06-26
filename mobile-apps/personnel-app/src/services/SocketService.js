import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.0.201:3000';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.locationUpdateCallback = null;
  }

  async connect() {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication token bulunamadı');
      }

      this.socket = io(API_BASE_URL, {
        auth: {
          token: token
        },
        transports: ['websocket'],
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        console.log('Socket bağlantısı kuruldu (Personel)');
        this.isConnected = true;
      });

      this.socket.on('disconnect', () => {
        console.log('Socket bağlantısı kesildi (Personel)');
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket bağlantı hatası:', error);
        this.isConnected = false;
      });

      this.socket.on('error', (error) => {
        console.error('Socket hatası:', error);
      });

      // Araç konum güncellemelerini dinle
      this.socket.on('location_updated', (data) => {
        console.log('Araç konumu güncellendi:', data);
        if (this.locationUpdateCallback) {
          this.locationUpdateCallback(data);
        }
      });

      return new Promise((resolve, reject) => {
        this.socket.on('connect', () => {
          this.isConnected = true;
          resolve();
        });
        this.socket.on('connect_error', (error) => {
          this.isConnected = false;
          reject(error);
        });
      });

    } catch (error) {
      console.error('Socket bağlantısı kurulurken hata:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
      this.isConnected = false;
      this.locationUpdateCallback = null;
    } catch (error) {
      console.error('Socket bağlantısı kapatılırken hata:', error);
    }
  }

  // Konum güncellemelerini dinlemek için callback ekle
  onLocationUpdate(callback) {
    this.locationUpdateCallback = callback;
  }

  // Konum güncellemelerini dinlemeyi durdur
  offLocationUpdate() {
    this.locationUpdateCallback = null;
  }

  // Belirli aracı dinleme (room'a katılma)
  subscribeToVehicle(vehicleId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe_vehicle', { vehicle_id: vehicleId });
    }
  }

  // Belirli araç dinlemesini durdur
  unsubscribeFromVehicle(vehicleId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe_vehicle', { vehicle_id: vehicleId });
    }
  }

  // Tüm araçları dinle
  subscribeToAllVehicles() {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe_all_vehicles');
    }
  }

  // Tüm araç dinlemesini durdur
  unsubscribeFromAllVehicles() {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe_all_vehicles');
    }
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

export default new SocketService(); 