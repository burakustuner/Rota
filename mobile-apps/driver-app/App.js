import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';
import StatsScreen from './src/screens/StatsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Services
import AuthService from './src/services/AuthService';
import LocationService from './src/services/LocationService';
import SocketService from './src/services/SocketService';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const theme = {
  colors: {
    primary: '#2196F3',
    accent: '#03DAC6',
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#000000',
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Ana Sayfa') {
            iconName = 'home';
          } else if (route.name === 'Harita') {
            iconName = 'map';
          } else if (route.name === 'İstatistikler') {
            iconName = 'bar-chart';
          } else if (route.name === 'Profil') {
            iconName = 'person';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen name="Ana Sayfa" component={HomeScreen} />
      <Tab.Screen name="Harita" component={MapScreen} />
      <Tab.Screen name="İstatistikler" component={StatsScreen} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        // Token geçerliliğini kontrol et
        const isValid = await AuthService.validateToken(token);
        if (isValid) {
          setIsAuthenticated(true);
          
          // Socket bağlantısını başlat
          await SocketService.connect();
          
          // Konum servisini başlat
          await LocationService.startLocationTracking();
        } else {
          await AsyncStorage.removeItem('auth_token');
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      console.error('Auth durumu kontrol edilirken hata:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (userData) => {
    try {
      await AsyncStorage.setItem('auth_token', userData.token);
      await AsyncStorage.setItem('user_data', JSON.stringify(userData.user));
      
      setIsAuthenticated(true);
      
      // Socket bağlantısını başlat
      await SocketService.connect();
      
      // Konum servisini başlat
      await LocationService.startLocationTracking();
      
      Alert.alert('Başarılı', 'Giriş başarılı! Konum takibi başlatıldı.');
    } catch (error) {
      console.error('Giriş sonrası hata:', error);
      Alert.alert('Hata', 'Bir hata oluştu, lütfen tekrar deneyin.');
    }
  };

  const handleLogout = async () => {
    try {
      await LocationService.stopLocationTracking();
      await SocketService.disconnect();
      await AsyncStorage.multiRemove(['auth_token', 'user_data']);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Çıkış yapılırken hata:', error);
    }
  };

  if (isLoading) {
    return null; // Yükleme ekranı buraya gelecek
  }

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor={theme.colors.primary} />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <Stack.Screen name="Main">
              {(props) => <MainTabs {...props} onLogout={handleLogout} />}
            </Stack.Screen>
          ) : (
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
} 