import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Cache problemini bypass etmek için hard-coded IP
const API_BASE_URL = 'http://192.168.0.201:3000/api';

class AuthService {
  constructor() {
    console.log('🏗️ AuthService Constructor:');
    console.log('🌐 API_BASE_URL:', API_BASE_URL);
    
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
    });
    
    console.log('⚙️ Axios instance oluşturuldu:');
    console.log('🔗 Base URL:', this.api.defaults.baseURL);
    console.log('⏱️ Timeout:', this.api.defaults.timeout);

    // Request interceptor - her istekte token ekle
    this.api.interceptors.request.use(async (config) => {
      console.log('🚀 API Request Interceptor:');
      console.log('🔗 URL:', config.url);
      console.log('🎯 Method:', config.method);
      console.log('🌐 Base URL:', config.baseURL);
      console.log('📦 Data:', config.data);
      
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔑 Token eklendi');
      } else {
        console.log('❌ Token bulunamadı');
      }
      
      console.log('📋 Headers:', config.headers);
      return config;
    });

    // Response interceptor - hata durumlarını yakalamak için
    this.api.interceptors.response.use(
      (response) => {
        console.log('✅ API Response Interceptor Success:');
        console.log('📊 Status:', response.status);
        console.log('🔗 URL:', response.config.url);
        console.log('📦 Data:', response.data);
        return response;
      },
      async (error) => {
        console.log('❌ API Response Interceptor Error:');
        console.log('📝 Error type:', error.constructor.name);
        console.log('💬 Error message:', error.message);
        console.log('🔍 Error code:', error.code);
        console.log('🌐 Error config URL:', error.config?.url);
        console.log('📊 Error response status:', error.response?.status);
        console.log('📄 Error response data:', error.response?.data);
        
        if (error.response?.status === 401) {
          console.log('🔐 401 Unauthorized - Kullanıcı çıkış yapılıyor');
          // Token geçersiz, kullanıcıyı çıkış yap
          await this.logout();
        }
        return Promise.reject(error);
      }
    );
  }

  // Network bağlantı testi
  async testNetworkConnection() {
    console.log('🌐 Network bağlantı testi başlatılıyor...');
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
      console.log('✅ Health check response status:', response.status);
      const data = await response.json();
      console.log('📦 Health check data:', data);
      return true;
    } catch (error) {
      console.log('❌ Health check failed:', error);
      return false;
    }
  }

  // Test için basit giriş (OneID olmadan)
  async testLogin(email = 'test@driver.com', userType = 'driver') {
    console.log('🔵 Test Login Başlatılıyor...');
    console.log('📧 Email:', email);
    console.log('👤 User Type:', userType);
    console.log('🌐 API Base URL:', API_BASE_URL);
    
    // Önce network bağlantısını test et
    console.log('🔍 Network bağlantısı test ediliyor...');
    const networkOk = await this.testNetworkConnection();
    console.log('📶 Network test sonucu:', networkOk);
    
    try {
      const requestData = {
        email,
        user_type: userType
      };
      
      console.log('📤 Request Data:', requestData);
      console.log('🔗 Full URL:', `${API_BASE_URL}/auth/test/login`);
      
      const response = await this.api.post('/auth/test/login', requestData);
      
      console.log('✅ Response alındı:', response.status);
      console.log('📦 Response Data:', response.data);

      if (response.data.success) {
        // Token ve kullanıcı verisini kaydet
        const { token, user, vehicle } = response.data.data;
        console.log('💾 Token ve kullanıcı verisi kaydediliyor...');
        console.log('🔑 Token:', token.substring(0, 20) + '...');
        console.log('👤 User:', user);
        
        // JWT token formatını kontrol et
        const tokenParts = token.split('.');
        console.log('🔍 JWT Token kontrol:', {
          parts: tokenParts.length,
          header: tokenParts[0] ? 'OK' : 'MISSING',
          payload: tokenParts[1] ? 'OK' : 'MISSING', 
          signature: tokenParts[2] ? 'OK' : 'MISSING'
        });
        
        await AsyncStorage.setItem('auth_token', token);
        await AsyncStorage.setItem('user_data', JSON.stringify({ user, vehicle }));
        
        console.log('✅ Test login başarılı!');
        return response.data.data;
      } else {
        console.log('❌ Response success: false');
        console.log('📄 Error message:', response.data.message);
        throw new Error(response.data.message || 'Test girişi başarısız');
      }
    } catch (error) {
      console.log('🚨 Test giriş hatası yakalandı:');
      console.log('📝 Error type:', error.constructor.name);
      console.log('💬 Error message:', error.message);
      console.log('🔍 Error code:', error.code);
      console.log('🌐 Error config:', error.config?.url);
      console.log('📊 Error response status:', error.response?.status);
      console.log('📄 Error response data:', error.response?.data);
      console.log('🔧 Full error object:', error);
      
      if (error.response?.data?.message) {
        console.log('🔄 Throwing response error message');
        throw new Error(error.response.data.message);
      }
      
      console.log('🔄 Throwing generic error message');
      throw new Error('Test girişi yapılırken hata oluştu');
    }
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