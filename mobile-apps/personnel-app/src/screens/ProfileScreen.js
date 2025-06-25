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
import SocketService from '../services/SocketService';

export default function ProfileScreen({ onLogout }) {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({
    notifications: true,
    autoRefresh: true,
    showOfflineVehicles: false,
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
              await SocketService.disconnect();
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

  const clearCache = () => {
    Alert.alert(
      'Önbelleği Temizle',
      'Uygulama verilerini temizlemek istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            try {
              // Cache temizleme işlemi burada yapılacak
              Alert.alert('Bilgi', 'Önbellek temizlendi');
            } catch (error) {
              Alert.alert('Hata', 'Önbellek temizlenirken hata oluştu');
            }
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

      {/* Yetki Bilgileri */}
      <Card style={styles.card}>
        <Card.Title
          title="Yetki Bilgileri"
          left={(props) => <Avatar.Icon {...props} icon="shield-account" />}
        />
        <Card.Content>
          <List.Item
            title="Kullanıcı Tipi"
            description="Personel"
            left={(props) => <List.Icon {...props} icon="account-group" />}
          />
          <List.Item
            title="Erişim Yetkisi"
            description="Tüm Araçlar"
            left={(props) => <List.Icon {...props} icon="key" />}
          />
          <List.Item
            title="Son Giriş"
            description={new Date().toLocaleDateString('tr-TR')}
            left={(props) => <List.Icon {...props} icon="clock" />}
          />
        </Card.Content>
      </Card>

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
            title="Otomatik Yenileme"
            description="Verileri otomatik güncelle"
            left={(props) => <List.Icon {...props} icon="refresh" />}
            right={() => (
              <Switch
                value={settings.autoRefresh}
                onValueChange={() => toggleSetting('autoRefresh')}
              />
            )}
          />
          <List.Item
            title="Çevrimdışı Araçları Göster"
            description="Offline araçları listede göster"
            left={(props) => <List.Icon {...props} icon="eye" />}
            right={() => (
              <Switch
                value={settings.showOfflineVehicles}
                onValueChange={() => toggleSetting('showOfflineVehicles')}
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
            title="Önbelleği Temizle"
            description="Geçici verileri sil"
            left={(props) => <List.Icon {...props} icon="delete" />}
            onPress={clearCache}
          />
          <Divider style={styles.divider} />
          <List.Item
            title="Veri Kullanımı"
            description="Aylık: ~30 MB"
            left={(props) => <List.Icon {...props} icon="chart-pie" />}
          />
        </Card.Content>
      </Card>

      {/* İstatistikler */}
      <Card style={styles.card}>
        <Card.Title
          title="Kullanım İstatistikleri"
          left={(props) => <Avatar.Icon {...props} icon="chart-bar" />}
        />
        <Card.Content>
          <List.Item
            title="Toplam Oturum"
            description="47 kez"
            left={(props) => <List.Icon {...props} icon="login" />}
          />
          <List.Item
            title="Ortalama Kullanım"
            description="25 dk/gün"
            left={(props) => <List.Icon {...props} icon="clock-outline" />}
          />
          <List.Item
            title="En Çok Takip Edilen"
            description="Servis 1 (34ABC123)"
            left={(props) => <List.Icon {...props} icon="star" />}
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
            Rota Personel v1.0.0
          </Paragraph>
          <Paragraph style={styles.versionText}>
            SDK 53.0.0
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