import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  List,
  Avatar,
  Divider,
  Switch,
  useTheme
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../services/AuthService';
import LocationService from '../services/LocationService';

export default function ProfileScreen({ onLogout }) {
  const [user, setUser] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [settings, setSettings] = useState({
    notifications: true,
    autoStart: false,
    shareLocation: true,
    darkMode: false
  });
  const theme = useTheme();

  useEffect(() => {
    loadUserData();
    loadSettings();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setVehicle(parsedUser.vehicle);
      }
    } catch (error) {
      console.error('Kullanıcı verisi yüklenirken hata:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('app_settings');
      if (savedSettings) {
        setSettings({ ...settings, ...JSON.parse(savedSettings) });
      }
    } catch (error) {
      console.error('Ayarlar yüklenirken hata:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Ayarlar kaydedilirken hata:', error);
    }
  };

  const toggleSetting = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    saveSettings(newSettings);
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              await LocationService.stopLocationTracking();
              await AuthService.logout();
              onLogout();
            } catch (error) {
              console.error('Çıkış yapılırken hata:', error);
            }
          },
        },
      ]
    );
  };

  const clearLocationHistory = () => {
    Alert.alert(
      'Konum Geçmişini Sil',
      'Tüm konum geçmişiniz silinecek. Bu işlem geri alınamaz.',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            // LocationService.clearHistory();
            Alert.alert('Bilgi', 'Konum geçmişi silindi');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profil Bilgileri */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.profileHeader}>
            <Avatar.Text
              size={80}
              label={user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
              style={{ backgroundColor: theme.colors.primary }}
            />
            <View style={styles.profileInfo}>
              <Title>{user?.full_name || 'Kullanıcı'}</Title>
              <Paragraph>{user?.email}</Paragraph>
              <Paragraph style={styles.phoneText}>{user?.phone}</Paragraph>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Araç Bilgileri */}
      {vehicle && (
        <Card style={styles.card}>
          <Card.Title
            title="Araç Bilgileri"
            left={(props) => <Avatar.Icon {...props} icon="car" />}
          />
          <Card.Content>
            <List.Item
              title="Araç Adı"
              description={vehicle.vehicle_name}
              left={(props) => <List.Icon {...props} icon="car-side" />}
            />
            <List.Item
              title="Plaka"
              description={vehicle.plate_number}
              left={(props) => <List.Icon {...props} icon="card-text" />}
            />
            <List.Item
              title="Kapasite"
              description={`${vehicle.capacity} kişi`}
              left={(props) => <List.Icon {...props} icon="account-group" />}
            />
            <List.Item
              title="Durum"
              description={vehicle.status === 'active' ? 'Aktif' : 'Pasif'}
              left={(props) => <List.Icon {...props} icon="information" />}
            />
          </Card.Content>
        </Card>
      )}

      {/* Uygulama Ayarları */}
      <Card style={styles.card}>
        <Card.Title
          title="Uygulama Ayarları"
          left={(props) => <Avatar.Icon {...props} icon="cog" />}
        />
        <Card.Content>
          <List.Item
            title="Bildirimler"
            description="Push bildirimleri al"
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch
                value={settings.notifications}
                onValueChange={() => toggleSetting('notifications')}
              />
            )}
          />
          <List.Item
            title="Otomatik Başlat"
            description="Uygulama açılınca takibi başlat"
            left={(props) => <List.Icon {...props} icon="play-circle" />}
            right={() => (
              <Switch
                value={settings.autoStart}
                onValueChange={() => toggleSetting('autoStart')}
              />
            )}
          />
          <List.Item
            title="Konum Paylaşımı"
            description="Real-time konum paylaş"
            left={(props) => <List.Icon {...props} icon="map-marker-radius" />}
            right={() => (
              <Switch
                value={settings.shareLocation}
                onValueChange={() => toggleSetting('shareLocation')}
              />
            )}
          />
        </Card.Content>
      </Card>

      {/* Veri Yönetimi */}
      <Card style={styles.card}>
        <Card.Title
          title="Veri Yönetimi"
          left={(props) => <Avatar.Icon {...props} icon="database" />}
        />
        <Card.Content>
          <List.Item
            title="Konum Geçmişini Sil"
            description="Tüm konum verileri silinir"
            left={(props) => <List.Icon {...props} icon="delete" />}
            onPress={clearLocationHistory}
          />
          <Divider style={styles.divider} />
          <List.Item
            title="Veri Kullanımı"
            description="Aylık: ~50 MB"
            left={(props) => <List.Icon {...props} icon="chart-pie" />}
          />
        </Card.Content>
      </Card>

      {/* Hesap İşlemleri */}
      <Card style={styles.card}>
        <Card.Title
          title="Hesap"
          left={(props) => <Avatar.Icon {...props} icon="account" />}
        />
        <Card.Content>
          <Button
            mode="outlined"
            onPress={handleLogout}
            style={styles.logoutButton}
            icon="logout"
          >
            Çıkış Yap
          </Button>
        </Card.Content>
      </Card>

      {/* Uygulama Bilgileri */}
      <Card style={[styles.card, styles.lastCard]}>
        <Card.Content>
          <Paragraph style={styles.versionText}>
            Rota Şoför v1.0.0
          </Paragraph>
          <Paragraph style={styles.versionText}>
            © 2024 Rota Team
          </Paragraph>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  lastCard: {
    marginBottom: 40,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    marginLeft: 20,
    flex: 1,
  },
  phoneText: {
    color: '#666',
  },
  divider: {
    marginVertical: 8,
  },
  logoutButton: {
    marginTop: 16,
    borderColor: '#f44336',
  },
  versionText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
  },
}); 