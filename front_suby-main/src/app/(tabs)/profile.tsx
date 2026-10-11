import { Feather } from '@expo/vector-icons';
import ProfileSignedInScreen from '@/app/profilesignedin';
import { useAuth } from '@/context/auth-context';
import { router } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileGuestScreen() {
  const { session } = useAuth();

  if (session?.token) {
    return <ProfileSignedInScreen />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Header Marrón */}
        <View style={styles.headerBackground}>
          <View style={styles.headerTop}>
            
            <View style={styles.userInfo}>
              <View style={styles.avatarPlaceholder}>
                <Feather name="user" size={28} color="#A0AEC0" />
              </View>
              <View>
                <Text style={styles.welcomeText}>Bienvenido,</Text>
                <Text style={styles.userName}>Usuario Invitado</Text>
              </View>
            </View>

    

          </View>
        </View>

        {/* Contenedor Flexible para Centrar la Tarjeta */}
        <View style={styles.centerContent}>
          <View style={styles.registerCard}>
            <Text style={styles.cardSubtitle}>CREA UNA CUENTA</Text>
            <TouchableOpacity style={styles.registerButton} onPress={() => router.push('/register/step1')}>
              <Text style={styles.registerButtonText}>Regístrate</Text>
            </TouchableOpacity>
          </View>

        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1 },
  headerBackground: { backgroundColor: '#653728', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 40, borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  welcomeText: { color: '#E2E8F0', fontSize: 12 },
  userName: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  notificationBell: { position: 'relative' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#E50914', width: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#653728' },
  badgeText: { color: 'white', fontSize: 8, fontWeight: 'bold' },
  goldBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#8B5A2B', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 4 },
  goldBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  
  /* Nuevos estilos para centrar */
  centerContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  registerCard: { backgroundColor: 'white', borderRadius: 16, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, marginBottom: 16 },
  cardSubtitle: { fontSize: 11, fontWeight: '700', color: '#4A5568', letterSpacing: 1, marginBottom: 15 },
  registerButton: { backgroundColor: '#653728', width: '100%', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  registerButtonText: { color: 'white', fontWeight: 'bold', fontSize: 14 }
});
