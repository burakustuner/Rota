import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Dimensions,
  Text
} from 'react-native';
import {
  FAB,
  Portal,
  Card,
  Title,
  Paragraph,
  Chip,
  useTheme
} from 'react-native-paper';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import VehicleService from '../services/VehicleService';
import LocationService from '../services/LocationService';

const { width, height } = Dimensions.get('window');

export default function MapScreen() {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState({
    latitude: 41.0082,
    longitude: 28.9784,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  
  const mapRef = useRef(null);
  const theme = useTheme();

  useEffect(() => {
    loadVehicles();
    const interval = setInterval(loadVehicles, 30000); // Her 30 saniyede güncelle
    
    // WebSocket bağlantısını başlat
    LocationService.connectToLocationUpdates((vehicleData) => {
      updateVehicleLocation(vehicleData);
    });

    return () => {
      clearInterval(interval);
      LocationService.disconnect();
    };
  }, []);

  const loadVehicles = async () => {
    try {
      const vehicleData = await VehicleService.getAccessibleVehicles();
      setVehicles(vehicleData);
      
      if (vehicleData.length > 0 && loading) {
        // İlk yüklemede tüm araçları gösterecek şekilde haritayı ayarla
        fitMapToVehicles(vehicleData);
      }
    } catch (error) {
      console.error('Araçlar yüklenirken hata:', error);
      Alert.alert('Hata', 'Araç bilgileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const updateVehicleLocation = (vehicleData) => {
    setVehicles(prevVehicles => 
      prevVehicles.map(vehicle => 
        vehicle.id === vehicleData.vehicle_id
          ? {
              ...vehicle,
              latitude: vehicleData.latitude,
              longitude: vehicleData.longitude,
              speed: vehicleData.speed,
              heading: vehicleData.heading,
              last_update: vehicleData.timestamp,
              is_online: true
            }
          : vehicle
      )
    );
  };

  const fitMapToVehicles = (vehicleData) => {
    const onlineVehicles = vehicleData.filter(v => v.latitude && v.longitude && v.is_online);
    
    if (onlineVehicles.length === 0) return;

    const coordinates = onlineVehicles.map(vehicle => ({
      latitude: parseFloat(vehicle.latitude),
      longitude: parseFloat(vehicle.longitude),
    }));

    mapRef.current?.fitToCoordinates(coordinates, {
      edgePadding: {
        top: 50,
        right: 50,
        bottom: 200,
        left: 50,
      },
      animated: true,
    });
  };

  const focusOnVehicle = (vehicle) => {
    if (!vehicle.latitude || !vehicle.longitude) {
      Alert.alert('Konum Bulunamadı', 'Bu aracın güncel konumu bulunmuyor');
      return;
    }

    setSelectedVehicle(vehicle);
    
    mapRef.current?.animateToRegion({
      latitude: parseFloat(vehicle.latitude),
      longitude: parseFloat(vehicle.longitude),
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 1000);
  };

  const getVehicleStatus = (vehicle) => {
    if (!vehicle.is_online) return { status: 'offline', color: '#757575', text: 'Çevrimdışı' };
    
    const lastUpdate = new Date(vehicle.last_update);
    const now = new Date();
    const diffMinutes = (now - lastUpdate) / (1000 * 60);
    
    if (diffMinutes > 10) {
      return { status: 'stale', color: '#FF9800', text: 'Güncel Değil' };
    }
    
    if (vehicle.speed > 5) {
      return { status: 'moving', color: '#4CAF50', text: 'Hareket Halinde' };
    }
    
    return { status: 'stopped', color: '#2196F3', text: 'Durdu' };
  };

  const renderVehicleMarker = (vehicle, index) => {
    if (!vehicle.latitude || !vehicle.longitude) return null;

    const status = getVehicleStatus(vehicle);
    const isSelected = selectedVehicle?.id === vehicle.id;

    return (
      <Marker
        key={vehicle.id}
        coordinate={{
          latitude: parseFloat(vehicle.latitude),
          longitude: parseFloat(vehicle.longitude),
        }}
        title={vehicle.vehicle_name}
        description={`${vehicle.driver_name} - ${status.text}`}
        onPress={() => setSelectedVehicle(vehicle)}
      >
        <View style={[
          styles.markerContainer,
          { backgroundColor: status.color },
          isSelected && styles.selectedMarker
        ]}>
          <Icon
            name="directions-bus"
            size={isSelected ? 28 : 24}
            color="white"
          />
          {vehicle.speed > 0 && (
            <View style={styles.speedIndicator}>
              <Text style={styles.speedText}>
                {Math.round(vehicle.speed)} km/h
              </Text>
            </View>
          )}
        </View>
      </Marker>
    );
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        loadingEnabled={loading}
      >
        {vehicles.map(renderVehicleMarker)}
      </MapView>

      {selectedVehicle && (
        <Card style={styles.vehicleCard}>
          <Card.Content>
            <View style={styles.vehicleHeader}>
              <View style={styles.vehicleInfo}>
                <Title>{selectedVehicle.vehicle_name}</Title>
                <Paragraph>{selectedVehicle.plate_number}</Paragraph>
              </View>
              <Chip
                mode="outlined"
                style={{ backgroundColor: getVehicleStatus(selectedVehicle).color }}
                textStyle={{ color: 'white' }}
              >
                {getVehicleStatus(selectedVehicle).text}
              </Chip>
            </View>
            
            <View style={styles.driverInfo}>
              <Paragraph>
                <Text style={styles.label}>Şoför:</Text> {selectedVehicle.driver_name}
              </Paragraph>
              <Paragraph>
                <Text style={styles.label}>Telefon:</Text> {selectedVehicle.driver_phone}
              </Paragraph>
              {selectedVehicle.speed > 0 && (
                <Paragraph>
                  <Text style={styles.label}>Hız:</Text> {Math.round(selectedVehicle.speed)} km/h
                </Paragraph>
              )}
              {selectedVehicle.last_update && (
                <Paragraph>
                  <Text style={styles.label}>Son Güncelleme:</Text>{' '}
                  {new Date(selectedVehicle.last_update).toLocaleTimeString('tr-TR')}
                </Paragraph>
              )}
            </View>
          </Card.Content>
        </Card>
      )}

      <Portal>
        <FAB.Group
          open={false}
          icon="menu"
          actions={[
            {
              icon: 'refresh',
              label: 'Yenile',
              onPress: loadVehicles,
            },
            {
              icon: 'center-focus-strong',
              label: 'Tüm Araçlar',
              onPress: () => fitMapToVehicles(vehicles),
            },
          ]}
          onStateChange={() => {}}
          fabStyle={{ backgroundColor: theme.colors.primary }}
        />
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  selectedMarker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  speedIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF5722',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  speedText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
  vehicleCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    elevation: 8,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  vehicleInfo: {
    flex: 1,
  },
  driverInfo: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  label: {
    fontWeight: 'bold',
  },
}); 