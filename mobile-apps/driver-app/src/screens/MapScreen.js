import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Dimensions
} from 'react-native';
import {
  FAB,
  Card,
  Paragraph,
  Chip,
  useTheme
} from 'react-native-paper';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import LocationService from '../services/LocationService';

const { width, height } = Dimensions.get('window');

export default function MapScreen() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [routeHistory, setRouteHistory] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [mapRegion, setMapRegion] = useState(null);
  const mapRef = useRef(null);
  const theme = useTheme();

  useEffect(() => {
    initializeLocation();
    checkTrackingStatus();
  }, []);

  const initializeLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Konum izni verilmedi');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      
      setCurrentLocation({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

    } catch (error) {
      console.error('Konum alınırken hata:', error);
      Alert.alert('Hata', 'Konum bilgisi alınamadı');
    }
  };

  const checkTrackingStatus = async () => {
    const tracking = await LocationService.isTracking();
    setIsTracking(tracking);
  };

  const centerOnCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      
      const region = {
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setCurrentLocation(region);
      mapRef.current?.animateToRegion(region, 1000);

    } catch (error) {
      console.error('Mevcut konum alınırken hata:', error);
    }
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

  const loadTodayRoute = async () => {
    try {
      // Bugünün rota geçmişini API'den al
      // Bu kısım API implement edildiğinde doldurulacak
      console.log('Bugünün rotası yükleniyor...');
    } catch (error) {
      console.error('Rota geçmişi yüklenirken hata:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Harita */}
      {mapRegion && (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={mapRegion}
          showsUserLocation={true}
          showsMyLocationButton={false}
          followsUserLocation={isTracking}
          mapType="standard"
          loadingEnabled={true}
        >
          {/* Mevcut konum marker */}
          {currentLocation && (
            <Marker
              coordinate={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              }}
              title="Mevcut Konumum"
              description="Şu anda buradayım"
              pinColor={theme.colors.primary}
            />
          )}

          {/* Rota geçmişi */}
          {routeHistory.length > 1 && (
            <Polyline
              coordinates={routeHistory}
              strokeColor={theme.colors.primary}
              strokeWidth={3}
              strokeOpacity={0.8}
            />
          )}
        </MapView>
      )}

      {/* Durum kartı */}
      <Card style={styles.statusCard}>
        <Card.Content>
          <View style={styles.statusRow}>
            <Chip
              icon={isTracking ? 'record' : 'pause'}
              style={{
                backgroundColor: isTracking ? '#4CAF50' : '#FF9800'
              }}
              textStyle={{ color: 'white' }}
            >
              {isTracking ? 'Takip Aktif' : 'Takip Durduruldu'}
            </Chip>
            
            {currentLocation && (
              <Paragraph style={styles.coordinates}>
                {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </Paragraph>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        <FAB
          icon="crosshairs-gps"
          onPress={centerOnCurrentLocation}
          style={[styles.fab, { backgroundColor: theme.colors.surface }]}
          size="small"
        />
        
        <FAB
          icon={isTracking ? 'pause' : 'play'}
          onPress={toggleTracking}
          style={[
            styles.fab,
            styles.mainFab,
            {
              backgroundColor: isTracking ? '#FF9800' : theme.colors.primary
            }
          ]}
        />

        <FAB
          icon="map-search"
          onPress={loadTodayRoute}
          style={[styles.fab, { backgroundColor: theme.colors.accent }]}
          size="small"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
    width: width,
    height: height,
  },
  statusCard: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    elevation: 4,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coordinates: {
    fontSize: 12,
    color: '#666',
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 40,
    alignItems: 'center',
  },
  fab: {
    marginVertical: 8,
  },
  mainFab: {
    marginVertical: 12,
  },
}); 