import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Chip,
  List,
  Avatar,
  useTheme,
  Button
} from 'react-native-paper';

const screenWidth = Dimensions.get('window').width;

export default function StatsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [stats, setStats] = useState({
    fleet: {
      totalVehicles: 3,
      activeVehicles: 2,
      onlineVehicles: 1,
      maintenanceVehicles: 1
    },
    today: {
      totalDistance: 287.4,
      totalTrips: 15,
      averageSpeed: 35.2,
      fuelConsumption: 45.8
    },
    thisWeek: {
      totalDistance: 1523.8,
      totalTrips: 89,
      averageSpeed: 37.8,
      busyDay: 'Pazartesi'
    },
    thisMonth: {
      totalDistance: 6847.2,
      totalTrips: 342,
      efficiency: 94,
      bestDriver: 'Ahmet Yılmaz'
    }
  });

  const theme = useTheme();

  const onRefresh = async () => {
    setRefreshing(true);
    // API'den güncel istatistikleri çek
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const StatCard = ({ title, icon, children }) => (
    <Card style={styles.card}>
      <Card.Title
        title={title}
        left={(props) => <Avatar.Icon {...props} icon={icon} />}
      />
      <Card.Content>
        {children}
      </Card.Content>
    </Card>
  );

  const StatItem = ({ label, value, icon, color = theme.colors.primary }) => (
    <View style={styles.statItem}>
      <View style={styles.statValue}>
        <Title style={[styles.statNumber, { color }]}>{value}</Title>
        <Paragraph>{label}</Paragraph>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Filoluk Özet */}
      <StatCard title="Filoluk Özet" icon="garage">
        <View style={styles.fleetStats}>
          <StatItem 
            label="Toplam Araç" 
            value={stats.fleet.totalVehicles}
            color="#2196F3"
          />
          <StatItem 
            label="Aktif" 
            value={stats.fleet.activeVehicles}
            color="#4CAF50"
          />
          <StatItem 
            label="Çevrimiçi" 
            value={stats.fleet.onlineVehicles}
            color="#FF9800"
          />
          <StatItem 
            label="Bakımda" 
            value={stats.fleet.maintenanceVehicles}
            color="#F44336"
          />
        </View>
      </StatCard>

      {/* Dönem Seçici */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Dönem Seçin</Title>
          <View style={styles.periodSelector}>
            <Button
              mode={selectedPeriod === 'today' ? 'contained' : 'outlined'}
              onPress={() => setSelectedPeriod('today')}
              style={styles.periodButton}
            >
              Bugün
            </Button>
            <Button
              mode={selectedPeriod === 'week' ? 'contained' : 'outlined'}
              onPress={() => setSelectedPeriod('week')}
              style={styles.periodButton}
            >
              Bu Hafta
            </Button>
            <Button
              mode={selectedPeriod === 'month' ? 'contained' : 'outlined'}
              onPress={() => setSelectedPeriod('month')}
              style={styles.periodButton}
            >
              Bu Ay
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Günlük İstatistikler */}
      {selectedPeriod === 'today' && (
        <StatCard title="Bugünün İstatistikleri" icon="calendar-today">
          <View style={styles.todayStats}>
            <StatItem 
              label="Toplam Mesafe" 
              value={`${stats.today.totalDistance} km`}
            />
            <StatItem 
              label="Toplam Sefer" 
              value={stats.today.totalTrips}
            />
          </View>
          
          <List.Item
            title="Ortalama Hız"
            description={`${stats.today.averageSpeed} km/h`}
            left={(props) => <List.Icon {...props} icon="speedometer" />}
          />
          <List.Item
            title="Yakıt Tüketimi"
            description={`${stats.today.fuelConsumption} L`}
            left={(props) => <List.Icon {...props} icon="gas-station" />}
          />
        </StatCard>
      )}

      {/* Haftalık İstatistikler */}
      {selectedPeriod === 'week' && (
        <StatCard title="Bu Haftanın İstatistikleri" icon="view-week">
          <View style={styles.weekStats}>
            <StatItem 
              label="Toplam Mesafe" 
              value={`${stats.thisWeek.totalDistance} km`}
            />
            <StatItem 
              label="Toplam Sefer" 
              value={stats.thisWeek.totalTrips}
            />
          </View>
          
          <List.Item
            title="Ortalama Hız"
            description={`${stats.thisWeek.averageSpeed} km/h`}
            left={(props) => <List.Icon {...props} icon="speedometer" />}
          />
          <List.Item
            title="En Yoğun Gün"
            description={stats.thisWeek.busyDay}
            left={(props) => <List.Icon {...props} icon="calendar-star" />}
          />
        </StatCard>
      )}

      {/* Aylık İstatistikler */}
      {selectedPeriod === 'month' && (
        <StatCard title="Bu Ayın İstatistikleri" icon="calendar-month">
          <View style={styles.monthStats}>
            <StatItem 
              label="Toplam Mesafe" 
              value={`${stats.thisMonth.totalDistance} km`}
            />
            <StatItem 
              label="Toplam Sefer" 
              value={stats.thisMonth.totalTrips}
            />
          </View>
          
          <List.Item
            title="Filoluk Verimlilik"
            description={`%${stats.thisMonth.efficiency}`}
            left={(props) => <List.Icon {...props} icon="trending-up" />}
            right={() => (
              <Chip 
                style={{ backgroundColor: '#4CAF50' }}
                textStyle={{ color: 'white' }}
              >
                Mükemmel
              </Chip>
            )}
          />
          <List.Item
            title="En İyi Şoför"
            description={stats.thisMonth.bestDriver}
            left={(props) => <List.Icon {...props} icon="star" />}
          />
        </StatCard>
      )}

      {/* Araç Durumları */}
      <StatCard title="Araç Durumları" icon="car-multiple">
        <List.Item
          title="Servis 1 (34ABC123)"
          description="Aktif - Çevrimiçi"
          left={(props) => <Avatar.Icon {...props} icon="bus" size={40} style={{ backgroundColor: '#4CAF50' }} />}
          right={() => <Chip textStyle={{ color: 'white' }} style={{ backgroundColor: '#4CAF50' }}>Aktif</Chip>}
        />
        <List.Item
          title="Servis 2 (34DEF456)"
          description="Aktif - Çevrimdışı"
          left={(props) => <Avatar.Icon {...props} icon="bus" size={40} style={{ backgroundColor: '#757575' }} />}
          right={() => <Chip textStyle={{ color: 'white' }} style={{ backgroundColor: '#757575' }}>Çevrimdışı</Chip>}
        />
        <List.Item
          title="Servis 3 (34GHI789)"
          description="Bakımda"
          left={(props) => <Avatar.Icon {...props} icon="bus" size={40} style={{ backgroundColor: '#FF9800' }} />}
          right={() => <Chip textStyle={{ color: 'white' }} style={{ backgroundColor: '#FF9800' }}>Bakımda</Chip>}
        />
      </StatCard>
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
  fleetStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  todayStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  weekStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  monthStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  periodButton: {
    flex: 1,
    marginHorizontal: 4,
  },
}); 