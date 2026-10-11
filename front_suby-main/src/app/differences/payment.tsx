import { useAuth } from '@/context/auth-context';
import {
  getDifferencePaymentMethods,
  getPendingDifference,
  payDifference,
  type DifferenceData,
  type FinePaymentMethod,
} from '@/lib/api';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const C = {
  bg: '#F7F8FB',
  white: '#FFFFFF',
  brown: '#653728',
  text: '#25344C',
  muted: '#8FA1BD',
  soft: '#62748E',
  border: '#E3EAF3',
  amber: '#F59E0B',
  amberSoft: '#FFF8E6',
  red: '#DC2626',
  redSoft: '#FFF1F2',
};

function formatMoney(amount: number) {
  return `$ ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function PaymentMethodCard({
  method,
  selected,
  onPress,
}: {
  method: FinePaymentMethod;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.methodCard, selected && styles.methodCardSelected]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <View style={styles.methodCopy}>
        <Text style={styles.methodTitle}>{method.title}</Text>
        <Text style={styles.methodSubtitle}>{method.subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function DifferencePaymentScreen() {
  const { session } = useAuth();
  const [difference, setDifference] = useState<DifferenceData | null>(null);
  const [methods, setMethods] = useState<FinePaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function load() {
        if (!session?.userId || !session.token) {
          if (isActive) {
            setError('Sesión no válida.');
            setIsLoading(false);
          }
          return;
        }

        try {
          if (isActive) {
            setIsLoading(true);
            setError(null);
          }

          const [diff, paymentMethods] = await Promise.all([
            getPendingDifference(session.userId, session.token),
            getDifferencePaymentMethods(session.userId, session.token),
          ]);

          if (!isActive) return;

          if (!diff) {
            setError('No tenés ninguna diferencia de saldo pendiente.');
            setIsLoading(false);
            return;
          }

          setDifference(diff);
          setMethods(paymentMethods);
          setSelectedMethodId(paymentMethods[0]?.id ?? null);
        } catch (loadError) {
          if (isActive) {
            setError(loadError instanceof Error ? loadError.message : 'No pudimos cargar la diferencia.');
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      }

      void load();
      return () => {
        isActive = false;
      };
    }, [session?.token, session?.userId])
  );

  const handlePay = async () => {
    if (!session?.userId || !session.token || !difference || !selectedMethodId) return;

    try {
      setIsSubmitting(true);
      await payDifference(session.userId, difference.id, selectedMethodId, session.token);
      Alert.alert(
        'Diferencia abonada',
        'Tu diferencia de saldo fue pagada exitosamente. Tu cuenta ha sido rehabilitada.',
        [
          {
            text: 'Ir al perfil',
            onPress: () =>
              router.dismissTo({
                pathname: '/profile',
                params: { differencePaymentConfirmed: `${Date.now()}` },
              }),
          },
        ]
      );
    } catch (submitError) {
      Alert.alert(
        'No pudimos procesar el pago',
        submitError instanceof Error ? submitError.message : 'Intentá nuevamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator color={C.brown} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !difference) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Feather name="check-circle" size={48} color="#16A34A" />
          <Text style={styles.errorTitle}>
            {error ?? 'No hay diferencias pendientes'}
          </Text>
          <Text style={styles.errorText}>
            {error ?? 'No tenés ninguna diferencia de saldo pendiente en este momento.'}
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pagar Diferencia</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.card}>
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.heroIconWrap}>
              <Feather name="alert-triangle" size={28} color={C.amber} />
            </View>
            <Text style={styles.heroTitle}>Diferencia de saldo pendiente</Text>
            {difference.itemTitle ? (
              <Text style={styles.heroSubtitle}>{difference.itemTitle}</Text>
            ) : null}
            {difference.lotCode ? (
              <Text style={styles.heroMeta}>{difference.lotCode}</Text>
            ) : null}
          </View>

          {/* Alerta */}
          <View style={styles.alertCard}>
            <Feather name="info" size={18} color={C.amber} />
            <Text style={styles.alertText}>
              Ganaste este bien por un monto mayor al saldo declarado en tu medio de pago.
              Debés abonar la diferencia dentro de las 72 hs para evitar el bloqueo de tu cuenta.
            </Text>
          </View>

          {/* Desglose */}
          <View style={styles.breakdownCard}>
            <Text style={styles.sectionTitle}>Desglose de la diferencia</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Puja ganadora</Text>
              <Text style={styles.rowValue}>{formatMoney(difference.winningBid)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Saldo disponible declarado</Text>
              <Text style={styles.rowValue}>{formatMoney(difference.availableBalance)}</Text>
            </View>
            <View style={styles.totalDivider} />
            <View style={styles.row}>
              <Text style={styles.totalLabel}>Diferencia a pagar</Text>
              <Text style={styles.totalValue}>{formatMoney(difference.differenceAmount)}</Text>
            </View>
          </View>

          {/* Métodos de pago */}
          <View style={styles.methodsSection}>
            <Text style={styles.sectionTitle}>Elegí el medio de pago</Text>
            {methods.length > 0 ? (
              methods.map((method) => (
                <PaymentMethodCard
                  key={method.id}
                  method={method}
                  selected={selectedMethodId === method.id}
                  onPress={() => setSelectedMethodId(method.id)}
                />
              ))
            ) : (
              <View style={styles.emptyMethods}>
                <Text style={styles.emptyMethodsText}>
                  No tenés medios de pago disponibles.
                </Text>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => router.push({ pathname: '/payment-methods/new' })}
                >
                  <Text style={styles.secondaryButtonText}>Agregar medio de pago</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Botón confirmar */}
          <TouchableOpacity
            style={[styles.primaryButton, (!selectedMethodId || isSubmitting) && styles.primaryButtonDisabled]}
            disabled={!selectedMethodId || isSubmitting}
            onPress={handlePay}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Pagar {formatMoney(difference.differenceAmount)}
              </Text>
            )}
          </TouchableOpacity>

          {/* Nota al pie */}
          <Text style={styles.footnote}>
            Este pago es independiente de la multa y del precio del bien. Una vez abonado,
            tu cuenta quedará rehabilitada automáticamente.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingBottom: 32 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 16 },

  header: {
    backgroundColor: C.brown,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSpacer: { width: 40 },

  card: {
    margin: 20,
    backgroundColor: C.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    gap: 18,
  },

  hero: { alignItems: 'center', paddingTop: 8, gap: 6 },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.amberSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  heroTitle: { color: C.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  heroSubtitle: { color: C.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  heroMeta: { color: C.muted, fontSize: 13, textAlign: 'center' },

  alertCard: {
    backgroundColor: C.amberSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  alertText: { flex: 1, color: '#92400E', fontSize: 14, lineHeight: 22 },

  breakdownCard: {
    backgroundColor: '#F8FAFD',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 10,
  },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowLabel: { color: C.soft, fontSize: 15, flex: 1 },
  rowValue: { color: C.text, fontSize: 15, fontWeight: '700' },
  totalDivider: { height: 1, backgroundColor: C.border, marginVertical: 4 },
  totalLabel: { color: C.text, fontSize: 17, fontWeight: '800', flex: 1 },
  totalValue: { color: C.brown, fontSize: 18, fontWeight: '900' },

  methodsSection: { gap: 10 },
  methodCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  methodCardSelected: { borderColor: C.brown, backgroundColor: '#FFF8F3' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#B8C6D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: C.brown },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.brown },
  methodCopy: { flex: 1 },
  methodTitle: { color: C.text, fontSize: 15, fontWeight: '800' },
  methodSubtitle: { color: C.muted, fontSize: 13, marginTop: 2 },

  emptyMethods: { gap: 10, paddingTop: 4 },
  emptyMethodsText: { color: C.muted, fontSize: 14, lineHeight: 20 },

  primaryButton: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: C.brown,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  secondaryButton: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.brown,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonText: { color: C.brown, fontSize: 15, fontWeight: '800' },

  footnote: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 8,
  },

  errorTitle: { color: C.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  errorText: { color: C.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
