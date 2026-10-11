import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function RegisterSuccess() {
  const params = useLocalSearchParams<{ status?: string }>();
  const isUnknownStatus = params.status === 'unknown';
  const isDuplicateStatus = params.status === 'duplicate';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        
        <View style={styles.successHeader}>
          <View style={styles.checkCircle}>
            <Feather name="check" size={30} color="#48BB78" />
          </View>
          <Text style={styles.title}>
            {isDuplicateStatus ? 'Solicitud ya registrada' : '¡Registro enviado!'}
          </Text>
          <Text style={styles.subtitle}>
            {isDuplicateStatus
              ? 'Ya existe una solicitud asociada a este mail. No hace falta reenviarla.'
              : isUnknownStatus
              ? 'La solicitud quedó cargada, pero la app no pudo confirmar si el email salió correctamente.'
              : 'Tu solicitud está siendo procesada. Te notificaremos cuando tu cuenta esté habilitada.'}
          </Text>
        </View>

        <Text style={styles.statusTitle}>ESTADO DE TU SOLICITUD</Text>

        <View style={styles.statusItem}>
          <View style={[styles.iconCircle, { backgroundColor: '#E6FFFA' }]}>
            <Feather name="file-text" size={16} color="#38B2AC" />
          </View>
          <View style={styles.statusTextContainer}>
            <View style={styles.statusRow}>
              <Text style={styles.itemTitle}>Solicitud recibida</Text>
              <View style={[styles.badge, { backgroundColor: '#E6FFFA' }]}><Text style={[styles.badgeText, { color: '#38B2AC' }]}>Completado</Text></View>
            </View>
            <Text style={styles.itemSubtitle}>Tus datos y documentos ya fueron cargados en el sistema.</Text>
          </View>
        </View>

        <View style={styles.statusItem}>
          <View style={[styles.iconCircle, { backgroundColor: '#FFFAF0' }]}>
            <Feather name="shield" size={16} color="#DD6B20" />
          </View>
          <View style={styles.statusTextContainer}>
            <View style={styles.statusRow}>
              <Text style={styles.itemTitle}>Verificación de documentos</Text>
              <View style={[styles.badge, { backgroundColor: '#FFFAF0' }]}>
                <Text style={[styles.badgeText, { color: '#DD6B20' }]}>
                  {isDuplicateStatus ? 'En curso' : 'En curso'}
                </Text>
              </View>
            </View>
            <Text style={styles.itemSubtitle}>
              {isDuplicateStatus
                ? 'La app detectó que el backend informó una solicitud ya existente para este mail.'
                : 'Nuestro equipo revisará tu documentación en un plazo de 24-72 hs.'}
            </Text>
          </View>
        </View>

        <View style={styles.statusItem}>
          <View style={[styles.iconCircle, { backgroundColor: '#EDF2F7' }]}>
            <Feather name="bell" size={16} color="#4A5568" />
          </View>
          <View style={styles.statusTextContainer}>
            <View style={styles.statusRow}>
              <Text style={styles.itemTitle}>Notificación de aprobación</Text>
              <View style={[styles.badge, { backgroundColor: '#EDF2F7' }]}><Text style={[styles.badgeText, { color: '#4A5568' }]}>Pendiente</Text></View>
            </View>
            <Text style={styles.itemSubtitle}>Te avisaremos por email y notificación cuando tu cuenta esté activa.</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            <Text style={{ fontWeight: 'bold' }}>Importante:</Text>{' '}
            {isDuplicateStatus
              ? 'Si esperabas ver un estado como aprobado o admitido, esa información no la está devolviendo este endpoint: solo responde que ya existe una solicitud asociada.'
              : isUnknownStatus
              ? 'La app no recibió confirmación final del servidor, aunque la solicitud puede haber quedado creada. Evitá reenviarla si luego aparece como duplicada.'
              : 'La habilitación y el envío de email dependen del backend. Si el correo no llega, la solicitud puede igualmente haber quedado creada.'}
          </Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={() => router.replace('/login')}>
          <Text style={styles.buttonText}>Volver al inicio</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

// ... conservar los mismos estilos que tenías en este archivo ...
const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#F5F5F5', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  successHeader: { alignItems: 'center', marginBottom: 30, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
  checkCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E6FFFA', justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 2, borderColor: '#48BB78' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2D3748', marginBottom: 10 },
  subtitle: { textAlign: 'center', color: '#718096', fontSize: 14, lineHeight: 20 },
  statusTitle: { fontSize: 12, fontWeight: 'bold', color: '#A0AEC0', letterSpacing: 1, marginBottom: 20 },
  statusItem: { flexDirection: 'row', marginBottom: 25 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  statusTextContainer: { flex: 1 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  itemTitle: { fontWeight: 'bold', color: '#2D3748', fontSize: 14, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  itemSubtitle: { color: '#718096', fontSize: 12, lineHeight: 18 },
  infoBox: { backgroundColor: '#FDF6E3', padding: 15, borderRadius: 10, marginBottom: 25, borderWidth: 1, borderColor: '#FDE68A' },
  infoText: { color: '#7B3F00', fontSize: 13, lineHeight: 20 },
  button: { backgroundColor: '#653728', height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
