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
   * Şoförün atanmış olduğu aracı getir
   */
  async getAssignedVehicle() {
    try {
      const response = await this.api.get('/api/vehicles/assigned');
      return response.data.vehicle || null;
    } catch (error) {
      console.error('Atanmış araç getirilemedi:', error);
      // Offline durumda mock data döndür
      return this.getMockAssignedVehicle();
    }
  }

  /**
   * Araç durumunu güncelle
   */
  async updateVehicleStatus(status) {
    try {
      const response = await this.api.put('/api/vehicles/status', {
        status
      });
      return response.data;
    } catch (error) {
      console.error('Araç durumu güncellenemedi:', error);
      throw error;
    }
  }

  /**
   * Araç istatistiklerini getir
   */
  async getVehicleStats(period = 'today') {
    try {
      const response = await this.api.get('/api/vehicles/my-stats', {
        params: { period }
      });
      return response.data.stats;
    } catch (error) {
      console.error('Araç istatistikleri getirilemedi:', error);
      return this.getMockStats(period);
    }
  }

  /**
   * Günlük seferler
   */
  async getTodayTrips() {
    try {
      const response = await this.api.get('/api/vehicles/today-trips');
      return response.data.trips || [];
    } catch (error) {
      console.error('Günlük seferler getirilemedi:', error);
      return this.getMockTodayTrips();
    }
  }

  /**
   * Rota geçmişi
   */
  async getRouteHistory(startDate, endDate) {
    try {
      const response = await this.api.get('/api/vehicles/route-history', {
        params: {
          start_date: startDate,
          end_date: endDate
        }
      });
      return response.data.route || [];
    } catch (error) {
      console.error('Rota geçmişi getirilemedi:', error);
      return [];
    }
  }

  /**
   * Sefer başlat
   */
  async startTrip(tripData) {
    try {
      const response = await this.api.post('/api/vehicles/start-trip', tripData);
      return response.data;
    } catch (error) {
      console.error('Sefer başlatılamadı:', error);
      throw error;
    }
  }

  /**
   * Sefer bitir
   */
  async endTrip(tripId, endData) {
    try {
      const response = await this.api.put(`/api/vehicles/end-trip/${tripId}`, endData);
      return response.data;
    } catch (error) {
      console.error('Sefer bitirilemedi:', error);
      throw error;
    }
  }

  /**
   * Mock atanmış araç verisi
   */
  getMockAssignedVehicle() {
    return {
      id: 1,
      vehicle_name: 'Servis 1',
      plate_number: '34ABC123',
      capacity: 20,
      status: 'active',
      driver_id: 1,
      last_maintenance: '2024-01-15',
      fuel_level: 75,
      battery_level: 85,
      odometer: 45230
    };
  }

  /**
   * Mock istatistik verileri
   */
  getMockStats(period) {
    const baseStats = {
      total_distance: 287.4,
      total_trips: 15,
      average_speed: 35.2,
      fuel_consumption: 45.8,
      efficiency: 92,
      working_hours: 8.5
    };

    switch (period) {
      case 'today':
        return {
          ...baseStats,
          date: new Date().toISOString().split('T')[0]
        };
      case 'week':
        return {
          total_distance: 1523.8,
          total_trips: 89,
          average_speed: 37.8,
          fuel_consumption: 298.4,
          efficiency: 94,
          working_hours: 42.5,
          week_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };
      case 'month':
        return {
          total_distance: 6847.2,
          total_trips: 342,
          average_speed: 36.1,
          fuel_consumption: 1287.6,
          efficiency: 91,
          working_hours: 186.5,
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear()
        };
      default:
        return baseStats;
    }
  }

  /**
   * Mock günlük seferler
   */
  getMockTodayTrips() {
    return [
      {
        id: 1,
        start_time: '07:30:00',
        end_time: '08:15:00',
        start_location: 'Garaj',
        end_location: 'Okul',
        distance: 12.5,
        passenger_count: 18,
        status: 'completed'
      },
      {
        id: 2,
        start_time: '12:00:00',
        end_time: '12:45:00',
        start_location: 'Okul',
        end_location: 'Ev Rotası',
        distance: 15.2,
        passenger_count: 16,
        status: 'completed'
      },
      {
        id: 3,
        start_time: '16:30:00',
        end_time: null,
        start_location: 'Garaj',
        end_location: 'Okul',
        distance: 8.3,
        passenger_count: 14,
        status: 'in_progress'
      }
    ];
  }

  /**
   * Yakıt tüketimi hesapla
   */
  calculateFuelConsumption(distance, fuelEfficiency = 8) {
    // 100km'de kaç litre yakıt tükettiği
    return (distance / 100) * fuelEfficiency;
  }

  /**
   * Sefer süresi hesapla
   */
  calculateTripDuration(startTime, endTime) {
    if (!endTime) return null;
    
    const start = new Date(`2024-01-01T${startTime}`);
    const end = new Date(`2024-01-01T${endTime}`);
    
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;
    
    return `${hours}s ${minutes}dk`;
  }

  /**
   * Ortalama hız hesapla
   */
  calculateAverageSpeed(distance, duration) {
    if (!duration || duration === 0) return 0;
    return Math.round((distance / duration) * 60 * 100) / 100; // km/h
  }
}

// Singleton pattern
const vehicleService = new VehicleService();
export default vehicleService; 