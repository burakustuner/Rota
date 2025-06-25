import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import MapScreen from './src/screens/MapScreen';
import VehicleListScreen from './src/screens/VehicleListScreen';
import StatsScreen from './src/screens/StatsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Services
import AuthService from './src/services/AuthService';
import SocketService from './src/services/SocketService';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const theme = {
  colors: {
    primary: '#FF9800',
    accent: '#FFC107',
    background: '#ffffff',
    surface: '#ffffff',
    text: '#000000',
    placeholder: '#757575',
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          
          switch (route.name) {
            case 'Harita':
              iconName = 'map';
              break;
            case 'Araçlar':
              iconName = 'directions-bus';
              break;
            case 'İstatistikler':
              iconName = 'bar-chart';
              break;
            case 'Profil':
              iconName = 'person';
              break;
            default:
              iconName = 'help';
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
      <Tab.Screen 
        name="Harita" 
        component={MapScreen}
        options={{ title: 'Canlı Harita' }}
      />
      <Tab.Screen 
        name="Araçlar" 
        component={VehicleListScreen}
        options={{ title: 'Araç Listesi' }}
      />
      <Tab.Screen 
        name="İstatistikler" 
        component={StatsScreen}
        options={{ title: 'İstatistikler' }}
      />
      <Tab.Screen 
        name="Profil" 
        component={ProfileScreen}
        options={{ title: 'Profil' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token && AuthService.isTokenValid(token)) {
        setIsLoggedIn(true);
        // Socket bağlantısını başlat
        await SocketService.connect();
      }
    } catch (error) {
      console.error('Auth durumu kontrol edilirken hata:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      setIsLoggedIn(true);
      await SocketService.connect();
    } catch (error) {
      console.error('Giriş sonrası hata:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await SocketService.disconnect();
      await AsyncStorage.multiRemove(['auth_token', 'user_data']);
      setIsLoggedIn(false);
    } catch (error) {
      console.error('Çıkış yapılırken hata:', error);
    }
  };

  if (isLoading) {
    return null; // Loading screen eklenebilir
  }

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor={theme.colors.primary} />
        {isLoggedIn ? (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs">
              {(props) => <MainTabs {...props} onLogout={handleLogout} />}
            </Stack.Screen>
          </Stack.Navigator>
        ) : (
          <Stack.Navigator>
            <Stack.Screen 
              name="Login" 
              options={{ 
                headerShown: false 
              }}
            >
              {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
            </Stack.Screen>
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </PaperProvider>
  );
} 