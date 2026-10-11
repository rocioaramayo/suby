import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForgotPasswordSuccess() {
  const handleBackToLogin = () => {
    // Navegamos al login raíz.
    // IMPORTANTE: No limpiamos el estado aquí para que los useEffect
    // de las pantallas de atrás no se activen y nos manden al Paso 1.
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.screenTitle}>Olvidaste Contraseña</Text>

        <View style={styles.card}>
          <View style={styles.iconHalo}>
            <View style={styles.iconCircle}>
              <Feather name="check" size={28} color="#10B981" />
            </View>
          </View>

          <Text style={styles.title}>¡Listo!</Text>
          <Text style={styles.subtitle}>
            Tu contraseña fue restablecida con éxito. Ya puedes iniciar sesión con tu nueva contraseña.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={handleBackToLogin}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>Ir al inicio de sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F7F7' },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 28,
    justifyContent: 'center',
  },
  screenTitle: {
    position: 'absolute',
    top: 52,
    left: 24,
    color: '#A5ACB8',
    fontSize: 16,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 42,
    paddingBottom: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 8,
  },
  iconHalo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#DCF5E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 5,
    borderColor: '#10B981',
    backgroundColor: '#F5FFFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#2D3748',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 16,
  },
  subtitle: {
    color: '#A0AEC0',
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 34,
    maxWidth: 320,
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: 18,
    backgroundColor: '#7A442C',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7A442C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});