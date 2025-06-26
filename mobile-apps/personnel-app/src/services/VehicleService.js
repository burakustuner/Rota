import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import axios from 'axios';

class VehicleService {
  constructor() {
    this.baseURL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.0.201:3000';
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
    });

    // Request interceptor - token ekle
    this.api.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor - hata yönetimi
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('VehicleService API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Erişilebilir araçları getir
   */
  async getAccessibleVehicles() {
    try {
      const response = await this.api.get('/api/vehicles/accessible');
      return response.data.vehicles || [];
    } catch (error) {
      console.error('Araçlar getirilemedi:', error);
      // Offline durumda mock data döndür
      return this.getMockVehicles();
    }
  }

  /**
   * Belirli bir aracın detaylarını getir
   */
  async getVehicleDetails(vehicleId) {
    try {
      const response = await this.api.get(`/api/vehicles/${vehicleId}`);
      return response.data.vehicle;
    } catch (error) {
      console.error('Araç detayları getirilemedi:', error);
      throw error;
    }
  }

  /**
   * Araç konumunu getir
   */
  async getVehicleLocation(vehicleId) {
    try {
      const response = await this.api.get(`/api/vehicles/${vehicleId}/location`);
      return response.data.location;
    } catch (error) {
      console.error('Araç konumu getirilemedi:', error);
      throw error;
    }
  }

  /**
   * Araç rota geçmişini getir
   */
  async getVehicleRoute(vehicleId, startDate, endDate) {
    try {
      const response = await this.api.get(`/api/vehicles/${vehicleId}/route`, {
        params: {
          start_date: startDate,
          end_date: endDate
        }
      });
      return response.data.route || [];
    } catch (error) {
      console.error('Araç rotası getirilemedi:', error);
      return [];
    }
  }

  /**
   * Araç istatistiklerini getir
   */
  async getVehicleStats(vehicleId, period = 'today') {
    try {
      const response = await this.api.get(`/api/vehicles/${vehicleId}/stats`, {
        params: { period }
      });
      return response.data.stats;
    } catch (error) {
      console.error('Araç istatistikleri getirilemedi:', error);
      return this.getMockStats();
    }
  }

  /**
   * Filoluk istatistikleri getir
   */
  async getFleetStats(period = 'today') {
    try {
      const response = await this.api.get('/api/vehicles/fleet/stats', {
        params: { period }
      });
      return response.data.stats;
    } catch (error) {
      console.error('Filoluk istatistikleri getirilemedi:', error);
      return this.getMockFleetStats();
    }
  }

  /**
   * Araç durumunu güncelle
   */
  async updateVehicleStatus(vehicleId, status) {
    try {
      const response = await this.api.put(`/api/vehicles/${vehicleId}/status`, {
        status
      });
      return response.data;
    } catch (error) {
      console.error('Araç durumu güncellenemedi:', error);
      throw error;
    }
  }

  /**
   * Mock araç verileri (offline durumda)
   */
  getMockVehicles() {
    return [
      {
        id: 1,
        vehicle_name: 'Servis 1',
        plate_number: '34ABC123',
        driver_name: 'Ahmet Yılmaz',
        capacity: 20,
        status: 'active',
        is_online: true,
        latitude: 41.0082,
        longitude: 28.9784,
        speed: 35,
        heading: 90,
        last_update: new Date().toISOString(),
        battery_level: 85
      },
      {
        id: 2,
        vehicle_name: 'Servis 2',
        plate_number: '34DEF456',
        driver_name: 'Mehmet Kaya',
        capacity: 25,
        status: 'active',
        is_online: false,
        latitude: 41.0150,
        longitude: 28.9850,
        speed: 0,
        heading: 180,
        last_update: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 dakika önce
        battery_level: 45
      },
      {
        id: 3,
        vehicle_name: 'Servis 3',
        plate_number: '34GHI789',
        driver_name: null,
        capacity: 30,
        status: 'maintenance',
        is_online: false,
        latitude: null,
        longitude: null,
        speed: 0,
        heading: 0,
        last_update: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 saat önce
        battery_level: 0
      }
    ];
  }

  /**
   * Mock istatistik verileri
   */
  getMockStats() {
    return {
      total_distance: 287.4,
      total_trips: 15,
      average_speed: 35.2,
      fuel_consumption: 45.8,
      efficiency: 92
    };
  }

  /**
   * Mock filoluk istatistikleri
   */
  getMockFleetStats() {
    return {
      total_vehicles: 3,
      active_vehicles: 2,
      online_vehicles: 1,
      maintenance_vehicles: 1,
      total_distance: 1523.8,
      total_trips: 89,
      average_speed: 37.8,
      efficiency: 94
    };
  }

  /**
   * Real-time location updates için WebSocket bağlantısı
   */
  subscribeToLocationUpdates(callback) {
    // SocketService üzerinden konum güncellemelerini dinle
    // Bu fonksiyon MapScreen'de kullanılacak
    console.log('Location updates subscription başlatıldı');
    return callback;
  }

  /**
   * WebSocket bağlantısını kapat
   */
  unsubscribeFromLocationUpdates() {
    console.log('Location updates subscription kapatıldı');
  }
}

// Singleton pattern
const vehicleService = new VehicleService();
export default vehicleService; 