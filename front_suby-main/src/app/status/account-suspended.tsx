import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/auth-context';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Linking, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AccountSuspendedScreen() {
  const { clearAll } = useAuth();
  const supportEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim();

  useEffect(() => {
    clearAll();
  }, [clearAll]);

  const handleContactSupport = async () => {
    if (!supportEmail) {
      return;
    }

    const target = `mailto:${supportEmail}?subject=${encodeURIComponent('Revision de cuenta suspendida')}`;

    try {
      await Linking.openURL(target);
    } catch {
      Alert.alert('No pudimos abrir tu correo', 'Probá nuevamente desde tu aplicación de mail.');
    }
  };

  const handleGoHome = () => {
    router.replace('/login' as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Feather name="alert-triangle" size={32} color="#EF4444" />
        </View>

        <Text style={styles.title}>Cuenta suspendida</Text>

        <Text style={styles.description}>Tu cuenta no puede operar por el momento.</Text>
        <Text style={styles.description}>Para conocer el motivo exacto y revisar tu caso,</Text>
        <Text style={styles.description}>necesitás asistencia del equipo de soporte.</Text>

        <View style={styles.restrictionsBox}>
          <Text style={styles.restrictionsTitle}>Mientras tanto:</Text>

          <View style={styles.bulletItem}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.bulletText}>No podés iniciar nuevas pujas.</Text>
          </View>

          <View style={styles.bulletItem}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.bulletText}>No podés operar con tu cuenta hasta que soporte la revise.</Text>
          </View>

          <View style={styles.bulletItem}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.bulletText}>Necesitás asistencia para conocer los próximos pasos.</Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          {supportEmail ? (
            <TouchableOpacity style={styles.supportButton} onPress={handleContactSupport}>
              <Feather name="headphones" size={18} color="white" style={styles.buttonIcon} />
              <Text style={styles.supportButtonText}>Contactar a soporte</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
            <Feather name="arrow-left" size={18} color="#E2E8F0" style={styles.buttonIcon} />
            <Text style={styles.homeButtonText}>Volver al login</Text>
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 25,
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
    marginBottom: 15,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 14,
    color: '#FCA5A5',
    textAlign: 'center',
    lineHeight: 22,
  },
  restrictionsBox: {
    backgroundColor: '#1E293B',
    width: '100%',
    borderRadius: 16,
    padding: 20,
    marginTop: 30,
    marginBottom: 40,
  },
  restrictionsTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 15,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  bulletPoint: {
    color: '#94A3B8',
    marginRight: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  bulletText: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  actionsContainer: {
    width: '100%',
    gap: 15,
  },
  supportButton: {
    backgroundColor: '#E50914',
    width: '100%',
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  homeButton: {
    backgroundColor: '#1E293B',
    width: '100%',
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 10,
  },
});
