import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/auth-context';
import { listUserPaymentMethods, PaymentMethod } from '@/lib/api';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PaymentMethodsScreen() {
  const { session } = useAuth();
  const { added } = useLocalSearchParams<{ added?: string }>();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const loadPaymentMethods = async () => {
    if (!session?.userId || !session.token) {
      setPaymentMethods([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const methods = await listUserPaymentMethods(session.userId, session.token);
      setPaymentMethods(methods);
    } catch (error) {
      Alert.alert('No pudimos cargar medios de pago', error instanceof Error ? error.message : 'Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentMethods();
  }, [session?.token, session?.userId]);

  useEffect(() => {
    if (!added) {
      return;
    }

    setShowSuccessToast(true);
    loadPaymentMethods();
    const timer = setTimeout(() => {
      setShowSuccessToast(false);
      router.setParams({ added: undefined });
    }, 2500);

    return () => clearTimeout(timer);
  }, [added]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerBackground}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Medios de Pago</Text>
          <Text style={styles.headerSubtitle}>Gestiona tus metodos de pago</Text>
        </View>

        {showSuccessToast && (
          <View style={styles.toastContainer}>
            <TouchableOpacity style={styles.toastClose} onPress={() => setShowSuccessToast(false)}>
              <Feather name="x" size={14} color="#4B8A5F" />
            </TouchableOpacity>
            <Feather name="check-circle" size={18} color="#0B8A3C" />
            <Text style={styles.toastText}>Medio de pago agregado correctamente</Text>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color="#653728" />
              <Text style={styles.loadingText}>Cargando medios de pago...</Text>
            </View>
          ) : paymentMethods.length === 0 ? (
            <View style={styles.emptyCard}>
              <Feather name="credit-card" size={40} color="#B7C4D8" />
              <Text style={styles.emptyTitle}>Sin medios de pago</Text>
              <Text style={styles.emptySubtitle}>Agrega al menos uno para participar</Text>
            </View>
          ) : (
            <View style={styles.methodsList}>
              {paymentMethods.map((method) => (
                <View style={styles.methodCard} key={method.id}>
                  <View style={styles.methodIconBox}>
                    <Feather
                      name={method.type === 'card' ? 'credit-card' : method.type === 'bank' ? 'briefcase' : 'file-text'}
                      size={20}
                      color="#60728F"
                    />
                  </View>
                  <View style={styles.methodTextBox}>
                    <View style={styles.methodHeader}>
                      <Text style={styles.methodTitle}>{method.title}</Text>
                      <View
                        style={[
                          styles.methodStatusPill,
                          (method.status ?? '').toLowerCase() === 'verificado'
                            ? styles.methodStatusVerified
                            : (method.status ?? '').toLowerCase() === 'rechazado'
                              ? styles.methodStatusRejected
                              : styles.methodStatusPending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.methodStatusText,
                            (method.status ?? '').toLowerCase() === 'verificado'
                              ? styles.methodStatusTextVerified
                              : (method.status ?? '').toLowerCase() === 'rechazado'
                                ? styles.methodStatusTextRejected
                                : styles.methodStatusTextPending,
                          ]}
                        >
                          {((method.status ?? 'pendiente').trim().toLowerCase() === 'verificado'
                            ? 'VERIFICADO'
                            : (method.status ?? '').trim().toLowerCase() === 'rechazado'
                              ? 'RECHAZADO'
                              : 'PENDIENTE')}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.methodSubtitle}>{method.subtitle}</Text>
                    {method.reviewNote ? <Text style={styles.methodNote}>{method.reviewNote}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.addButton} onPress={() => router.push('/payment-methods/new')}>
            <Feather name="plus-circle" size={20} color="#653728" />
            <Text style={styles.addButtonText}>Agregar Medio de Pago</Text>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Feather name="info" size={14} color="#8AA0BF" style={{ marginTop: 2 }} />
            <Text style={styles.infoText}>
              Primero cargás tu medio de pago y luego el equipo de Suby lo <Text style={styles.bold}>aprueba o rechaza</Text>.
              En tarjetas, el administrador define el <Text style={styles.bold}>límite máximo habilitado</Text>. En cuentas bancarias y cheques, el medio debe quedar <Text style={styles.bold}>verificado</Text> antes de poder entrar a pujar.
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F6FA' },
  container: { flex: 1 },
  headerBackground: {
    backgroundColor: '#653728',
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 26,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  backButton: { width: 28, marginBottom: 6 },
  headerTitle: { color: 'white', fontSize: 42 / 2, fontWeight: '700' },
  headerSubtitle: { color: '#E4D3CB', fontSize: 18 / 2, marginTop: 4 },
  toastContainer: {
    position: 'absolute',
    top: 16,
    left: 14,
    right: 14,
    backgroundColor: '#DFF6E7',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  toastClose: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#BCE9C8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toastText: { color: '#0E7B3A', fontWeight: '600', fontSize: 22 / 2 },
  content: { padding: 22, paddingBottom: 28 },
  loadingState: {
    backgroundColor: 'white',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DEE6F1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 26,
    marginBottom: 20,
    gap: 8,
  },
  loadingText: { color: '#60728F', fontSize: 14 },
  methodsList: { gap: 14, marginBottom: 16 },
  methodCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DEE6F1',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  methodIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF3FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodTextBox: { flex: 1 },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  methodTitle: { color: '#1F2E46', fontSize: 17, fontWeight: '700', marginBottom: 2 },
  methodSubtitle: { color: '#60728F', fontSize: 15 },
  methodNote: { color: '#8EA1BE', fontSize: 13, marginTop: 4, lineHeight: 18 },
  methodStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  methodStatusVerified: { backgroundColor: '#ECFDF3' },
  methodStatusPending: { backgroundColor: '#FFF3E9' },
  methodStatusRejected: { backgroundColor: '#FFF1F2' },
  methodStatusText: { fontSize: 10, fontWeight: '800' },
  methodStatusTextVerified: { color: '#0F9F4B' },
  methodStatusTextPending: { color: '#D97706' },
  methodStatusTextRejected: { color: '#DC2626' },
  emptyCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DEE6F1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    marginBottom: 20,
  },
  emptyTitle: { marginTop: 14, color: '#60728F', fontSize: 29 / 2, fontWeight: '600' },
  emptySubtitle: { marginTop: 4, color: '#9AAECC', fontSize: 15 },
  addButton: {
    backgroundColor: '#FFFDFC',
    borderWidth: 1,
    borderColor: '#F0DACA',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 18,
    marginBottom: 20,
  },
  addButtonText: { color: '#653728', fontSize: 31 / 2, fontWeight: '700' },
  infoBox: {
    borderRadius: 14,
    backgroundColor: '#ECF1F8',
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    gap: 10,
  },
  infoText: { flex: 1, color: '#60728F', fontSize: 14, lineHeight: 26 / 2 },
  bold: { fontWeight: '700', color: '#4C678F' },
});
