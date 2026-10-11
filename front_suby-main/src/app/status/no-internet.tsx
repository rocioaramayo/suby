import { Feather } from '@expo/vector-icons';
import * as Network from 'expo-network';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function NoInternetScreen() {
  const [isRetrying, setIsRetrying] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const networkState = Network.useNetworkState();
  const hasInternet = networkState.isInternetReachable ?? networkState.isConnected ?? false;

  useEffect(() => {
    if (hasInternet) {
      setFeedbackMessage('La conexión volvió. Tocá continuar para regresar e intentar otra vez.');
      return;
    }

    setFeedbackMessage(null);
  }, [hasInternet]);

  const handleBackToLogin = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/login' as never);
  };

  const handleRetry = async () => {
    setIsRetrying(true);

    try {
      const latestNetworkState = await Network.getNetworkStateAsync();
      const internetAvailable = latestNetworkState.isInternetReachable ?? latestNetworkState.isConnected ?? false;

      if (internetAvailable) {
        handleBackToLogin();
        return;
      }

      setFeedbackMessage('Seguís sin conexión. Revisá Wi-Fi o datos móviles e intentá otra vez.');
    } catch {
      setFeedbackMessage('No pudimos verificar tu conexión en este momento.');
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Feather name="alert-triangle" size={32} color="#EF4444" />
        </View>

        <Text style={styles.title}>{hasInternet ? 'La conexión volvió' : 'No tenés internet'}</Text>

        <Text style={styles.description}>
          {hasInternet ? 'Detectamos conexión nuevamente.' : 'No pudimos conectarnos a internet.'}
        </Text>
        <Text style={styles.description}>
          {hasInternet ? 'Podés regresar y volver a intentar el inicio de sesión.' : 'Verificá tu conexión e intentá nuevamente.'}
        </Text>

        {feedbackMessage ? <Text style={styles.feedbackText}>{feedbackMessage}</Text> : null}

        <TouchableOpacity style={styles.retryButton} onPress={handleRetry} disabled={isRetrying}>
          {isRetrying ? (
            <ActivityIndicator color="#E2E8F0" />
          ) : (
            <Text style={styles.retryButtonText}>{hasInternet ? 'Continuar' : 'Reintentar'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleBackToLogin}>
          <Text style={styles.secondaryButtonText}>Volver al login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#FCA5A5',
    textAlign: 'center',
    lineHeight: 22,
  },
  feedbackText: {
    marginTop: 18,
    color: '#CBD5E1',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#1E293B',
    width: '100%',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  retryButtonText: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
});
