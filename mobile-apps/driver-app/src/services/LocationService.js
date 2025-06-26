import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SocketService from './SocketService';
import io from 'socket.io-client';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.0.201:3000';

class LocationService {
  constructor() {
    this.socket = null;
    this.isTrackingLocation = false;
    this.watchId = null;
    this.locationInterval = null;
  }

  async startLocationTracking() {
    try {
      // Konum izni kontrol et
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Konum izni verilmedi');
      }

      // Background location permission (isteğe bağlı)
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      // Socket bağlantısı kur
      await this.connectSocket();

      // Konum takibini başlat
      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 15000, // 15 saniye
          distanceInterval: 10, // 10 metre
        },
        (location) => {
          this.sendLocationUpdate(location);
        }
      );

      this.isTrackingLocation = true;
      await AsyncStorage.setItem('is_tracking', 'true');

      console.log('Konum takibi başlatıldı');
      return true;

    } catch (error) {
      console.error('Konum takibi başlatılırken hata:', error);
      throw error;
    }
  }

  async stopLocationTracking() {
    try {
      // Konum takibini durdur
      if (this.watchId) {
        this.watchId.remove();
        this.watchId = null;
      }

      if (this.locationInterval) {
        clearInterval(this.locationInterval);
        this.locationInterval = null;
      }

      // Socket bağlantısını kapat
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      this.isTrackingLocation = false;
      await AsyncStorage.setItem('is_tracking', 'false');

      console.log('Konum takibi durduruldu');
      return true;

    } catch (error) {
      console.error('Konum takibi durdurulurken hata:', error);
      throw error;
    }
  }

  async connectSocket() {
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
        console.log('Socket bağlantısı kuruldu');
      });

      this.socket.on('disconnect', () => {
        console.log('Socket bağlantısı kesildi');
      });

      this.socket.on('error', (error) => {
        console.error('Socket hatası:', error);
      });

      this.socket.on('location_saved', (data) => {
        console.log('Konum kaydedildi:', data);
      });

      return new Promise((resolve, reject) => {
        this.socket.on('connect', () => resolve());
        this.socket.on('connect_error', (error) => reject(error));
      });

    } catch (error) {
      console.error('Socket bağlantısı kurulurken hata:', error);
      throw error;
    }
  }

  sendLocationUpdate(location) {
    if (!this.socket || !this.socket.connected) {
      console.warn('Socket bağlantısı yok, konum gönderilemiyor');
      return;
    }

    const locationData = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      speed: location.coords.speed || 0,
      heading: location.coords.heading || 0,
      timestamp: new Date().toISOString()
    };

    this.socket.emit('location_update', locationData);
    
    // Local storage'a da kaydet (offline durumlar için)
    this.saveLocationToLocal(locationData);
  }

  async saveLocationToLocal(locationData) {
    try {
      const existingData = await AsyncStorage.getItem('location_history');
      const locationHistory = existingData ? JSON.parse(existingData) : [];
      
      // Son 100 konumu sakla
      locationHistory.push(locationData);
      if (locationHistory.length > 100) {
        locationHistory.shift();
      }

      await AsyncStorage.setItem('location_history', JSON.stringify(locationHistory));
    } catch (error) {
      console.error('Konum local storage\'a kaydedilirken hata:', error);
    }
  }

  async getCurrentLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Konum izni verilmedi');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Mevcut konum alınırken hata:', error);
      throw error;
    }
  }

  async isTracking() {
    try {
      const trackingStatus = await AsyncStorage.getItem('is_tracking');
      return trackingStatus === 'true';
    } catch (error) {
      return false;
    }
  }

  async getLocationHistory() {
    try {
      const data = await AsyncStorage.getItem('location_history');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Konum geçmişi alınırken hata:', error);
      return [];
    }
  }

  async clearLocationHistory() {
    try {
      await AsyncStorage.removeItem('location_history');
      return true;
    } catch (error) {
      console.error('Konum geçmişi silinirken hata:', error);
      return false;
    }
  }

  // Mesafe hesaplama (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  }

  deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  async getTodayStats() {
    try {
      const history = await this.getLocationHistory();
      
      if (history.length < 2) {
        return { distance: 0, duration: 0, stops: 0 };
      }

      let totalDistance = 0;
      let stops = 0;
      const today = new Date().toDateString();
      
      const todayLocations = history.filter(loc => 
        new Date(loc.timestamp).toDateString() === today
      );

      // Mesafe hesapla
      for (let i = 1; i < todayLocations.length; i++) {
        const prev = todayLocations[i - 1];
        const current = todayLocations[i];
        
        const distance = this.calculateDistance(
          prev.latitude, prev.longitude,
          current.latitude, current.longitude
        );
        
        totalDistance += distance;
        
        // Durak sayısı hesapla (hız 5 km/h'den düşükse)
        if (current.speed < 5) {
          stops++;
        }
      }

      // Süre hesapla
      const startTime = new Date(todayLocations[0].timestamp);
      const endTime = new Date(todayLocations[todayLocations.length - 1].timestamp);
      const duration = Math.floor((endTime - startTime) / (1000 * 60)); // dakika

      return {
        distance: Math.round(totalDistance * 10) / 10, // 1 ondalık
        duration,
        stops
      };

    } catch (error) {
      console.error('Günlük istatistikler hesaplanırken hata:', error);
      return { distance: 0, duration: 0, stops: 0 };
    }
  }
}

export default new LocationService(); 