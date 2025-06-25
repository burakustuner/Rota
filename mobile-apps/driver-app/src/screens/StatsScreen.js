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
  useTheme
} from 'react-native-paper';
import { LineChart, BarChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

export default function StatsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    today: {
      distance: 45.2,
      duration: 180, // dakika
      stops: 12,
      fuelEfficiency: 8.5
    },
    weekly: {
      totalDistance: 256.8,
      totalDuration: 1240,
      averageSpeed: 42,
      workingDays: 5
    },
    monthly: {
      totalDistance: 1124.5,
      totalTrips: 87,
      bestDay: 'Pazartesi',
      efficiency: 92
    }
  });

  const theme = useTheme();

  // Haftalık mesafe verileri (örnek)
  const weeklyDistanceData = {
    labels: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
    datasets: [
      {
        data: [52.3, 48.7, 55.1, 49.8, 51.2, 0, 0],
        strokeWidth: 2,
      },
    ],
  };

  // Günlük durak sayıları
  const weeklyStopsData = {
    labels: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'],
    datasets: [
      {
        data: [15, 12, 18, 14, 16],
      },
    ],
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // API'den güncel istatistikleri çek
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}s ${mins}d`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Bugünün Özeti */}
      <Card style={styles.card}>
        <Card.Title
          title="Bugünün Özeti"
          subtitle={new Date().toLocaleDateString('tr-TR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
          left={(props) => <Avatar.Icon {...props} icon="calendar-today" />}
        />
        <Card.Content>
          <View style={styles.todayStats}>
            <View style={styles.statBox}>
              <Title style={styles.statNumber}>{stats.today.distance}</Title>
              <Paragraph>KM</Paragraph>
            </View>
            <View style={styles.statBox}>
              <Title style={styles.statNumber}>{formatDuration(stats.today.duration)}</Title>
              <Paragraph>Süre</Paragraph>
            </View>
            <View style={styles.statBox}>
              <Title style={styles.statNumber}>{stats.today.stops}</Title>
              <Paragraph>Durak</Paragraph>
            </View>
            <View style={styles.statBox}>
              <Title style={styles.statNumber}>{stats.today.fuelEfficiency}</Title>
              <Paragraph>L/100km</Paragraph>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Haftalık Mesafe Grafiği */}
      <Card style={styles.card}>
        <Card.Title
          title="Haftalık Mesafe"
          subtitle="Son 7 günün mesafe verisi"
          left={(props) => <Avatar.Icon {...props} icon="chart-line" />}
        />
        <Card.Content>
          <LineChart
            data={weeklyDistanceData}
            width={screenWidth - 80}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </Card.Content>
      </Card>

      {/* Haftalık Durak Grafiği */}
      <Card style={styles.card}>
        <Card.Title
          title="Günlük Durak Sayıları"
          subtitle="Bu haftaki durak istatistikleri"
          left={(props) => <Avatar.Icon {...props} icon="chart-bar" />}
        />
        <Card.Content>
          <BarChart
            data={weeklyStopsData}
            width={screenWidth - 80}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            showValuesOnTopOfBars={true}
          />
        </Card.Content>
      </Card>

      {/* Haftalık Özet */}
      <Card style={styles.card}>
        <Card.Title
          title="Haftalık Özet"
          left={(props) => <Avatar.Icon {...props} icon="view-week" />}
        />
        <Card.Content>
          <List.Item
            title="Toplam Mesafe"
            description={`${stats.weekly.totalDistance} km`}
            left={(props) => <List.Icon {...props} icon="map-marker-distance" />}
            right={() => <Chip>Bu Hafta</Chip>}
          />
          <List.Item
            title="Toplam Süre"
            description={formatDuration(stats.weekly.totalDuration)}
            left={(props) => <List.Icon {...props} icon="clock" />}
          />
          <List.Item
            title="Ortalama Hız"
            description={`${stats.weekly.averageSpeed} km/h`}
            left={(props) => <List.Icon {...props} icon="speedometer" />}
          />
          <List.Item
            title="Çalışma Günü"
            description={`${stats.weekly.workingDays} gün`}
            left={(props) => <List.Icon {...props} icon="calendar-check" />}
          />
        </Card.Content>
      </Card>

      {/* Aylık Performans */}
      <Card style={styles.card}>
        <Card.Title
          title="Aylık Performans"
          left={(props) => <Avatar.Icon {...props} icon="calendar-month" />}
        />
        <Card.Content>
          <List.Item
            title="Toplam Mesafe"
            description={`${stats.monthly.totalDistance} km`}
            left={(props) => <List.Icon {...props} icon="road" />}
            right={() => <Chip mode="outlined">Bu Ay</Chip>}
          />
          <List.Item
            title="Toplam Sefer"
            description={`${stats.monthly.totalTrips} sefer`}
            left={(props) => <List.Icon {...props} icon="truck" />}
          />
          <List.Item
            title="En Yoğun Gün"
            description={stats.monthly.bestDay}
            left={(props) => <List.Icon {...props} icon="star" />}
          />
          <List.Item
            title="Verimlilik"
            description={`%${stats.monthly.efficiency}`}
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
  todayStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
}); 