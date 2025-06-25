import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000/api';

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

  async refreshToken() {
    try {
      const currentToken = await AsyncStorage.getItem('auth_token');
      if (!currentToken) {
        throw new Error('Token bulunamadı');
      }

      const response = await this.api.post('/auth/refresh', {
        token: currentToken
      });

      if (response.data.success) {
        const newToken = response.data.data.token;
        await AsyncStorage.setItem('auth_token', newToken);
        return newToken;
      } else {
        throw new Error('Token yenilenemedi');
      }
    } catch (error) {
      console.error('Token yenileme hatası:', error);
      await this.logout();
      throw error;
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

  async updateProfile(profileData) {
    try {
      const response = await this.api.put('/user/profile', profileData);
      
      if (response.data.success) {
        // Güncellenmiş kullanıcı verisini local storage'a kaydet
        await AsyncStorage.setItem('user_data', JSON.stringify(response.data.data));
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Profil güncellenemedi');
      }
    } catch (error) {
      console.error('Profil güncelleme hatası:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Profil güncellenirken hata oluştu');
    }
  }

  async registerDevice(deviceToken, deviceType, appVersion) {
    try {
      await this.api.post('/user/device', {
        device_token: deviceToken,
        device_type: deviceType,
        app_version: appVersion
      });
    } catch (error) {
      console.error('Cihaz kaydı hatası:', error);
      // Cihaz kaydı kritik değil, sessizce hata vermemeli
    }
  }
}

export default new AuthService(); 