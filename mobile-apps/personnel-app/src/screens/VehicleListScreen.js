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
  Chip,
  List,
  Avatar,
  Button,
  Searchbar,
  useTheme
} from 'react-native-paper';
import AuthService from '../services/AuthService';

export default function VehicleListScreen({ navigation }) {
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    filterVehicles();
  }, [searchQuery, vehicles]);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const vehicleData = await AuthService.getAccessibleVehicles();
      setVehicles(vehicleData);
    } catch (error) {
      console.error('Araç listesi yüklenirken hata:', error);
      Alert.alert('Hata', 'Araç listesi yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const filterVehicles = () => {
    if (!searchQuery) {
      setFilteredVehicles(vehicles);
      return;
    }

    const filtered = vehicles.filter(vehicle =>
      vehicle.vehicle_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.plate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.driver_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredVehicles(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVehicles();
    setRefreshing(false);
  };

  const getStatusColor = (status, isOnline) => {
    if (!isOnline) return '#757575';
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'maintenance':
        return '#FF9800';
      case 'inactive':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusText = (status, isOnline) => {
    if (!isOnline) return 'Çevrimdışı';
    switch (status) {
      case 'active':
        return 'Aktif';
      case 'maintenance':
        return 'Bakımda';
      case 'inactive':
        return 'Pasif';
      default:
        return 'Bilinmiyor';
    }
  };

  const viewVehicleDetails = (vehicle) => {
    // Araç detayına git - henüz implement edilmedi
    Alert.alert('Bilgi', `${vehicle.vehicle_name} detayları gösterilecek`);
  };

  const trackVehicle = (vehicle) => {
    // Harita ekranına git ve belirli aracı takip et
    navigation.navigate('Harita', { vehicleId: vehicle.id });
  };

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Araç ara..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredVehicles.map((vehicle) => (
          <Card key={vehicle.id} style={styles.card}>
            <Card.Title
              title={vehicle.vehicle_name}
              subtitle={vehicle.plate_number}
              left={(props) => (
                <Avatar.Icon
                  {...props}
                  icon="bus"
                  style={{
                    backgroundColor: getStatusColor(vehicle.status, vehicle.is_online)
                  }}
                />
              )}
              right={(props) => (
                <View style={styles.cardActions}>
                  <Chip
                    style={{
                      backgroundColor: getStatusColor(vehicle.status, vehicle.is_online)
                    }}
                    textStyle={{ color: 'white' }}
                  >
                    {getStatusText(vehicle.status, vehicle.is_online)}
                  </Chip>
                </View>
              )}
            />
            
            <Card.Content>
              <List.Item
                title="Şoför"
                description={vehicle.driver_name || 'Atanmamış'}
                left={(props) => <List.Icon {...props} icon="account" />}
              />
              <List.Item
                title="Kapasite"
                description={`${vehicle.capacity} kişi`}
                left={(props) => <List.Icon {...props} icon="account-group" />}
              />
              {vehicle.last_location && (
                <List.Item
                  title="Son Konum"
                  description={`${new Date(vehicle.last_update).toLocaleString('tr-TR')}`}
                  left={(props) => <List.Icon {...props} icon="map-marker" />}
                />
              )}
            </Card.Content>

            <Card.Actions>
              <Button
                mode="outlined"
                onPress={() => viewVehicleDetails(vehicle)}
                icon="information"
              >
                Detaylar
              </Button>
              <Button
                mode="contained"
                onPress={() => trackVehicle(vehicle)}
                icon="map"
                disabled={!vehicle.is_online}
              >
                Takip Et
              </Button>
            </Card.Actions>
          </Card>
        ))}

        {filteredVehicles.length === 0 && !loading && (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Avatar.Icon
                size={64}
                icon="bus-alert"
                style={{ backgroundColor: '#E0E0E0', marginBottom: 16 }}
              />
              <Title>Araç Bulunamadı</Title>
              <Paragraph style={{ textAlign: 'center' }}>
                {searchQuery
                  ? 'Arama kriterlerinize uygun araç bulunamadı'
                  : 'Henüz hiç araç tanımlanmamış'}
              </Paragraph>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchbar: {
    margin: 16,
    elevation: 2,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 2,
  },
  cardActions: {
    alignItems: 'center',
    paddingRight: 16,
  },
  emptyCard: {
    marginHorizontal: 16,
    marginTop: 50,
    elevation: 2,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 32,
  },
}); 