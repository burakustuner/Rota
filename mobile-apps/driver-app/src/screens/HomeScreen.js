import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Chip,
  useTheme,
  List,
  Avatar,
  Surface
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LocationService from '../services/LocationService';

export default function HomeScreen() {
  const [user, setUser] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [todayStats, setTodayStats] = useState({
    distance: 0,
    duration: 0,
    stops: 0
  });
  const theme = useTheme();

  useEffect(() => {
    loadUserData();
    checkTrackingStatus();
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

  const checkTrackingStatus = async () => {
    const tracking = await LocationService.isTracking();
    setIsTracking(tracking);
  };

  const toggleTracking = async () => {
    try {
      if (isTracking) {
        await LocationService.stopLocationTracking();
        setIsTracking(false);
        Alert.alert('Bilgi', 'Konum takibi durduruldu');
      } else {
        await LocationService.startLocationTracking();
        setIsTracking(true);
        Alert.alert('Bilgi', 'Konum takibi başlatıldı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Konum takibi durumu değiştirilemedi');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    await checkTrackingStatus();
    // Bugünün istatistiklerini yükle (API'den)
    setRefreshing(false);
  };

  const getStatusColor = () => {
    if (isTracking) return '#4CAF50';
    return '#FF9800';
  };

  const getStatusText = () => {
    if (isTracking) return 'Aktif';
    return 'Durduruldu';
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Kullanıcı Bilgisi */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.profileSection}>
            <Avatar.Text
              size={64}
              label={user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
              style={{ backgroundColor: theme.colors.primary }}
            />
            <View style={styles.profileInfo}>
              <Title>{user?.full_name || 'Kullanıcı'}</Title>
              <Paragraph>{user?.email}</Paragraph>
              <Chip
                icon="account"
                style={{ marginTop: 8, alignSelf: 'flex-start' }}
              >
                Şoför
              </Chip>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Araç Bilgisi */}
      {vehicle && (
        <Card style={styles.card}>
          <Card.Title
            title="Araç Bilgileri"
            subtitle={vehicle.vehicle_name}
            left={(props) => <Avatar.Icon {...props} icon="car" />}
          />
          <Card.Content>
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
          </Card.Content>
        </Card>
      )}

      {/* Takip Durumu */}
      <Card style={styles.card}>
        <Card.Title
          title="Konum Takibi"
          subtitle={`Durum: ${getStatusText()}`}
          left={(props) => (
            <Avatar.Icon
              {...props}
              icon="map-marker"
              style={{ backgroundColor: getStatusColor() }}
            />
          )}
        />
        <Card.Content>
          <View style={styles.trackingStatus}>
            <Surface style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]}>
              <Paragraph style={styles.statusText}>
                {isTracking ? '● Aktif' : '● Durduruldu'}
              </Paragraph>
            </Surface>
          </View>
          
          <Button
            mode={isTracking ? 'outlined' : 'contained'}
            onPress={toggleTracking}
            style={styles.trackingButton}
            icon={isTracking ? 'pause' : 'play'}
          >
            {isTracking ? 'Takibi Durdur' : 'Takibi Başlat'}
          </Button>
        </Card.Content>
      </Card>

      {/* Günlük İstatistikler */}
      <Card style={styles.card}>
        <Card.Title
          title="Bugünün İstatistikleri"
          left={(props) => <Avatar.Icon {...props} icon="chart-line" />}
        />
        <Card.Content>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Title style={styles.statValue}>{todayStats.distance} km</Title>
              <Paragraph>Mesafe</Paragraph>
            </View>
            <View style={styles.statItem}>
              <Title style={styles.statValue}>{Math.floor(todayStats.duration / 60)}h {todayStats.duration % 60}m</Title>
              <Paragraph>Süre</Paragraph>
            </View>
            <View style={styles.statItem}>
              <Title style={styles.statValue}>{todayStats.stops}</Title>
              <Paragraph>Durak</Paragraph>
            </View>
          </View>
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
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  trackingStatus: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIndicator: {
    padding: 12,
    borderRadius: 20,
    elevation: 2,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
  },
  trackingButton: {
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
}); 