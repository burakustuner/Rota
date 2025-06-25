import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import {
  Button,
  Card,
  Title,
  Paragraph,
  ActivityIndicator,
  useTheme
} from 'react-native-paper';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import AuthService from '../services/AuthService';

// WebBrowser'ı auth session için yapılandır
WebBrowser.maybeCompleteAuthSession();

const redirectUri = AuthSession.makeRedirectUri({
  useProxy: true,
});

export default function LoginScreen({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  const handleOneIdLogin = async () => {
    try {
      setLoading(true);

      // OneID authorize URL'ini al
      const { data } = await AuthService.getOneIdAuthorizeUrl(redirectUri);
      
      // OAuth flow'u başlat
      const result = await AuthSession.startAsync({
        authUrl: data.authorize_url,
        returnUrl: redirectUri,
      });

      if (result.type === 'success') {
        const { code } = result.params;
        
        if (code) {
          // Code ile giriş yap
          const userData = await AuthService.loginWithOneId(code, redirectUri);
          
          // Kullanıcı tipini kontrol et
          if (userData.user.user_type !== 'driver') {
            Alert.alert(
              'Yetkisiz Erişim',
              'Bu uygulama sadece şoförler için tasarlanmıştır. Personel uygulamasını kullanın.',
              [{ text: 'Tamam' }]
            );
            return;
          }

          // Aracı kontrol et
          if (!userData.vehicle) {
            Alert.alert(
              'Araç Bulunamadı',
              'Size atanmış aktif bir araç bulunamadı. Lütfen yönetici ile iletişime geçin.',
              [{ text: 'Tamam' }]
            );
            return;
          }

          onLogin(userData);
        } else {
          throw new Error('Authorization code alınamadı');
        }
      } else if (result.type === 'error') {
        throw new Error(result.params?.error_description || 'Giriş iptal edildi');
      }
    } catch (error) {
      console.error('Giriş hatası:', error);
      Alert.alert(
        'Giriş Hatası',
        error.message || 'Giriş yapılırken bir hata oluştu'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Title style={[styles.title, { color: theme.colors.primary }]}>
            Rota Şoför
          </Title>
          <Paragraph style={styles.subtitle}>
            Servis takip sistemi
          </Paragraph>
        </View>

        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Title style={styles.cardTitle}>Giriş Yapın</Title>
            <Paragraph style={styles.cardSubtitle}>
              OneID hesabınızla giriş yaparak servis takibini başlatın
            </Paragraph>

            <Button
              mode="contained"
              onPress={handleOneIdLogin}
              disabled={loading}
              style={styles.loginButton}
              contentStyle={styles.loginButtonContent}
              icon="login"
            >
              {loading ? 'Giriş yapılıyor...' : 'OneID ile Giriş Yap'}
            </Button>

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            )}
          </Card.Content>
        </Card>

        <View style={styles.infoContainer}>
          <Paragraph style={styles.infoText}>
            📍 Giriş yaptıktan sonra konum takibi otomatik olarak başlayacaktır
          </Paragraph>
          <Paragraph style={styles.infoText}>
            🚌 Size atanmış servis aracının takibini yapabileceksiniz
          </Paragraph>
          <Paragraph style={styles.infoText}>
            📊 Günlük seyahat istatistiklerinizi görebileceksiniz
          </Paragraph>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  card: {
    elevation: 4,
    backgroundColor: 'white',
    marginBottom: 30,
  },
  cardContent: {
    padding: 20,
  },
  cardTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  cardSubtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
  loginButton: {
    marginVertical: 10,
  },
  loginButtonContent: {
    height: 50,
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  infoContainer: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 8,
    padding: 20,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 8,
    color: '#555',
  },
}); 