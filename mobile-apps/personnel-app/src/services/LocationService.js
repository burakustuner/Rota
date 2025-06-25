import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SocketService from './SocketService';

class LocationService {
  constructor() {
    this.watchId = null;
    this.isTracking = false;
    this.lastKnownLocation = null;
    this.locationCallbacks = [];
  }

  /**
   * Konum izni isteme
   */
  async requestLocationPermission() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        throw new Error('Konum izni reddedildi');
      }

      return true;
    } catch (error) {
      console.error('Konum izni hatası:', error);
      throw error;
    }
  }

  /**
   * Mevcut konumu al
   */
  async getCurrentLocation() {
    try {
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        throw new Error('Konum izni gerekli');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });

      this.lastKnownLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: new Date().toISOString(),
      };

      return this.lastKnownLocation;
    } catch (error) {
      console.error('Konum alma hatası:', error);
      throw error;
    }
  }

  /**
   * Konum güncellemelerini dinlemeye başla
   */
  async startLocationTracking() {
    try {
      if (this.isTracking) {
        console.log('Konum takibi zaten aktif');
        return;
      }

      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        throw new Error('Konum izni gerekli');
      }

      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 15000, // 15 saniye
          distanceInterval: 10, // 10 metre
        },
        (location) => {
          this.handleLocationUpdate(location);
        }
      );

      this.isTracking = true;
      console.log('Konum takibi başlatıldı');
    } catch (error) {
      console.error('Konum takibi başlatma hatası:', error);
      throw error;
    }
  }

  /**
   * Konum takibini durdur
   */
  async stopLocationTracking() {
    try {
      if (this.watchId) {
        this.watchId.remove();
        this.watchId = null;
      }
      
      this.isTracking = false;
      console.log('Konum takibi durduruldu');
    } catch (error) {
      console.error('Konum takibi durdurma hatası:', error);
    }
  }

  /**
   * Konum güncellemesini işle
   */
  handleLocationUpdate(location) {
    const locationData = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      speed: location.coords.speed || 0,
      heading: location.coords.heading || 0,
      timestamp: new Date().toISOString(),
    };

    this.lastKnownLocation = locationData;

    // Registered callbacks'leri çağır
    this.locationCallbacks.forEach(callback => {
      try {
        callback(locationData);
      } catch (error) {
        console.error('Location callback hatası:', error);
      }
    });

    // Local storage'a kaydet
    this.saveLocationToStorage(locationData);
  }

  /**
   * Konum güncellemelerini dinle
   */
  connectToLocationUpdates(callback) {
    if (typeof callback === 'function') {
      this.locationCallbacks.push(callback);
      
      // Eğer son konum varsa hemen callback'i çağır
      if (this.lastKnownLocation) {
        callback(this.lastKnownLocation);
      }
    }
  }

  /**
   * Konum güncellemesi dinlemesini kapat
   */
  disconnect() {
    this.locationCallbacks = [];
  }

  /**
   * Konumu local storage'a kaydet
   */
  async saveLocationToStorage(location) {
    try {
      const locationHistory = await this.getLocationHistory();
      locationHistory.push(location);
      
      // Son 100 konumu sakla
      if (locationHistory.length > 100) {
        locationHistory.splice(0, locationHistory.length - 100);
      }
      
      await AsyncStorage.setItem(
        'location_history', 
        JSON.stringify(locationHistory)
      );
    } catch (error) {
      console.error('Konum kaydetme hatası:', error);
    }
  }

  /**
   * Konum geçmişini al
   */
  async getLocationHistory() {
    try {
      const history = await AsyncStorage.getItem('location_history');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Konum geçmişi alma hatası:', error);
      return [];
    }
  }

  /**
   * Son bilinen konumu al
   */
  getLastKnownLocation() {
    return this.lastKnownLocation;
  }

  /**
   * İki nokta arası mesafe hesapla (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance * 1000; // Convert to meters
  }

  /**
   * Derece cinsinden değeri radian'a çevir
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Günlük mesafe hesapla
   */
  async calculateDailyDistance() {
    try {
      const history = await this.getLocationHistory();
      const today = new Date().toDateString();
      
      const todayLocations = history.filter(location => {
        const locationDate = new Date(location.timestamp).toDateString();
        return locationDate === today;
      });

      let totalDistance = 0;
      
      for (let i = 1; i < todayLocations.length; i++) {
        const prev = todayLocations[i - 1];
        const curr = todayLocations[i];
        
        const distance = this.calculateDistance(
          prev.latitude,
          prev.longitude,
          curr.latitude,
          curr.longitude
        );
        
        // Çok büyük sıçramalar (1km+) durumunda GPS hatası olarak sayma
        if (distance < 1000) {
          totalDistance += distance;
        }
      }
      
      return totalDistance / 1000; // Kilometre cinsinden döndür
    } catch (error) {
      console.error('Günlük mesafe hesaplama hatası:', error);
      return 0;
    }
  }

  /**
   * Tracking durumunu kontrol et
   */
  isLocationTracking() {
    return this.isTracking;
  }

  /**
   * Konum servislerinin aktif olup olmadığını kontrol et
   */
  async isLocationServicesEnabled() {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      console.error('Konum servisi kontrol hatası:', error);
      return false;
    }
  }

  /**
   * Mock konum verisi (test için)
   */
  getMockLocation() {
    return {
      latitude: 41.0082 + (Math.random() - 0.5) * 0.01,
      longitude: 28.9784 + (Math.random() - 0.5) * 0.01,
      accuracy: 10,
      speed: Math.random() * 50,
      heading: Math.random() * 360,
      timestamp: new Date().toISOString(),
    };
  }
}

// Singleton pattern
const locationService = new LocationService();
export default locationService; 