import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.0.201:3000/api';

class AuthService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
    });

    // Request interceptor - her istekte token ekle
    this.api.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor - hata durumlarını yakalamak için
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token geçersiz, kullanıcıyı çıkış yap
          await this.logout();
        }
        return Promise.reject(error);
      }
    );
  }

  async getOneIdAuthorizeUrl(redirectUri) {
    try {
      const response = await this.api.get('/auth/oneid/authorize-url', {
        params: { redirect_uri: redirectUri }
      });
      return response.data;
    } catch (error) {
      console.error('OneID authorize URL alınırken hata:', error);
      throw new Error('OneID bağlantısı kurulamadı');
    }
  }

  async loginWithOneId(code, redirectUri) {
    try {
      const response = await this.api.post('/auth/oneid/login', {
        code,
        redirect_uri: redirectUri
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Giriş başarısız');
      }
    } catch (error) {
      console.error('OneID giriş hatası:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Giriş yapılırken hata oluştu');
    }
  }

  async validateToken(token) {
    try {
      const response = await axios.get(`${API_BASE_URL}/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data.success;
    } catch (error) {
      console.error('Token doğrulama hatası:', error);
      return false;
    }
  }

  async logout() {
    try {
      await AsyncStorage.multiRemove(['auth_token', 'user_data']);
    } catch (error) {
      console.error('Çıkış yapılırken hata:', error);
    }
  }

  async getCurrentUser() {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        return JSON.parse(userData);
      }
      return null;
    } catch (error) {
      console.error('Kullanıcı bilgisi alınırken hata:', error);
      return null;
    }
  }

  // Araç listesi API'si
  async getAccessibleVehicles() {
    try {
      const response = await this.api.get('/vehicle/accessible');
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Araç listesi alınamadı');
      }
    } catch (error) {
      console.error('Araç listesi alma hatası:', error);
      throw error;
    }
  }

  // Araç konumları API'si
  async getCurrentVehicleLocations() {
    try {
      const response = await this.api.get('/location/vehicles/current');
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Araç konumları alınamadı');
      }
    } catch (error) {
      console.error('Araç konumları alma hatası:', error);
      throw error;
    }
  }

  // Belirli araç konumu API'si
  async getVehicleLocation(vehicleId) {
    try {
      const response = await this.api.get(`/location/vehicle/${vehicleId}/current`);
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Araç konumu alınamadı');
      }
    } catch (error) {
      console.error('Araç konumu alma hatası:', error);
      throw error;
    }
  }

  // Araç geçmişi API'si
  async getVehicleHistory(vehicleId, startDate, endDate) {
    try {
      const response = await this.api.get(`/location/vehicle/${vehicleId}/history`, {
        params: {
          start_date: startDate,
          end_date: endDate
        }
      });
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Araç geçmişi alınamadı');
      }
    } catch (error) {
      console.error('Araç geçmişi alma hatası:', error);
      throw error;
    }
  }
}

export default new AuthService(); 