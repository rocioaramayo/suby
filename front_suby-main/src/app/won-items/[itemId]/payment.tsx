import { useAuth } from '@/context/auth-context';
import { confirmWonItemPayment, getWonItemPaymentDetail, type PaymentMethod, type WonItemPaymentDetail } from '@/lib/api';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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
  brownDeep: '#653728',
  text: '#25344C',
  muted: '#8FA1BD',
  border: '#E3EAF3',
  green: '#16A34A',
  greenSoft: '#ECFDF3',
  amber: '#F59E0B',
  amberSoft: '#FFF8E6',
};

function formatMoney(amount: number, currency = 'ARS') {
  const symbol = currency === 'USD' ? 'US$' : '$';
  return `${symbol} ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function PaymentMethodCard({
  method,
  selected,
  onPress,
}: {
  method: PaymentMethod;
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

export default function WonItemPaymentScreen() {
  const { itemId } = useLocalSearchParams<{ itemId?: string }>();
  const { session } = useAuth();
  const [detail, setDetail] = useState<WonItemPaymentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [pickupSelected, setPickupSelected] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function load() {
        if (!session?.userId || !session.token || !itemId) {
          if (isActive) {
            setError('No pudimos identificar la compra.');
            setIsLoading(false);
          }
          return;
        }

        try {
          if (isActive) {
            setIsLoading(true);
            setError(null);
          }
          const nextDetail = await getWonItemPaymentDetail(session.userId, Number(itemId), session.token);
          if (!isActive) {
            return;
          }
          setDetail(nextDetail);
          setSelectedMethodId(nextDetail.paymentMethods[0]?.id ?? null);
        } catch (loadError) {
          if (isActive) {
            setError(loadError instanceof Error ? loadError.message : 'No pudimos cargar el detalle de pago.');
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
    }, [itemId, session?.token, session?.userId])
  );

  const totals = useMemo(() => {
    if (!detail) {
      return { shippingAmount: 0, total: 0 };
    }
    const shippingAmount = pickupSelected ? detail.pickupAmount : detail.shippingAmount;
    return {
      shippingAmount,
      total: detail.winningBid + detail.commission + shippingAmount,
    };
  }, [detail, pickupSelected]);

  const handleConfirm = async () => {
    if (!session?.userId || !session.token || !itemId || !selectedMethodId) {
      return;
    }

    try {
      setIsSubmitting(true);
      const message = await confirmWonItemPayment(session.userId, Number(itemId), session.token, {
        paymentMethodId: Number(selectedMethodId),
        retiroPresencial: pickupSelected,
      });
      Alert.alert('Pago confirmado', message, [
        {
          text: 'Ir al perfil',
          onPress: () =>
            router.dismissTo({
              pathname: '/profile',
              params: { paymentConfirmed: `${Date.now()}` },
            }),
        },
      ]);
    } catch (submitError) {
      Alert.alert(
        'No pudimos confirmar el pago',
        submitError instanceof Error ? submitError.message : 'Intenta nuevamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator color={C.brown} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !detail) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>No pudimos abrir el pago</Text>
          <Text style={styles.errorText}>{error ?? 'Intenta nuevamente.'}</Text>
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
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirmar Pago</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.card}>
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Feather name="award" size={28} color={C.green} />
            </View>
            <Text style={styles.heroTitle}>Ganaste la subasta</Text>
            <Text style={styles.heroSubtitle}>{detail.title}</Text>
            <Text style={styles.heroMeta}>
              {detail.lotCode} · {detail.auctioneer ? `${detail.auctioneer} · ` : ''}{detail.auctionName ?? 'Subasta'}
            </Text>
          </View>

          <View style={styles.breakdownCard}>
            <Text style={styles.sectionTitle}>Desglose de pago</Text>
            <View style={styles.row}><Text style={styles.rowLabel}>Puja ganadora</Text><Text style={styles.rowValue}>{formatMoney(detail.winningBid, detail.currency)}</Text></View>
            <View style={styles.row}><Text style={styles.rowLabel}>Comision</Text><Text style={styles.rowValue}>{formatMoney(detail.commission, detail.currency)}</Text></View>
            <View style={styles.row}><Text style={styles.rowLabel}>{pickupSelected ? 'Retiro personal' : 'Entrega coordinada'}</Text><Text style={styles.rowValue}>{pickupSelected ? 'Sin cargo' : formatMoney(totals.shippingAmount, detail.currency)}</Text></View>
            <View style={styles.totalDivider} />
            <View style={styles.row}><Text style={styles.totalLabel}>Total a pagar</Text><Text style={styles.totalValue}>{formatMoney(totals.total, detail.currency)}</Text></View>
          </View>

          <TouchableOpacity
            style={[styles.optionCard, pickupSelected && styles.optionCardSelected]}
            activeOpacity={0.85}
            onPress={() => setPickupSelected((prev) => !prev)}
          >
            <View style={[styles.checkbox, pickupSelected && styles.checkboxSelected]}>
              {pickupSelected ? <Feather name="check" size={14} color="#fff" /> : null}
            </View>
            <View style={styles.optionCopy}>
              <Text style={styles.optionTitle}>Retiro personal en depósito</Text>
              <Text style={styles.optionText}>Podés retirar el bien en depósito sin costo adicional.</Text>
              <Text style={styles.optionWarning}>Importante: al retirar personalmente, el artículo pierde la cobertura del seguro.</Text>
            </View>
          </TouchableOpacity>

          {!pickupSelected ? (
            <View style={styles.shippingCard}>
              <Text style={styles.shippingTitle}>Envío a domicilio</Text>
              <Text style={styles.shippingText}>
                {detail.shippingAddress?.trim()
                  ? `Se registrará el envío a: ${detail.shippingAddress}`
                  : 'Se registrará el envío con la dirección cargada en tu perfil.'}
              </Text>
            </View>
          ) : null}

          <View style={styles.methodsSection}>
            <Text style={styles.sectionTitle}>Medio de pago</Text>
            {detail.paymentMethods.length > 0 ? (
              detail.paymentMethods.map((method) => (
                <PaymentMethodCard
                  key={method.id}
                  method={method}
                  selected={selectedMethodId === method.id}
                  onPress={() => setSelectedMethodId(method.id)}
                />
              ))
            ) : (
              <View style={styles.emptyMethods}>
                <Text style={styles.emptyMethodsText}>No tenes medios de pago disponibles para esta compra.</Text>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => router.push({ pathname: '/payment-methods/new' })}
                >
                  <Text style={styles.secondaryButtonText}>Agregar medio de pago</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, (!selectedMethodId || isSubmitting) && styles.primaryButtonDisabled]}
            disabled={!selectedMethodId || isSubmitting}
            onPress={handleConfirm}
          >
            <Text style={styles.primaryButtonText}>{isSubmitting ? 'Confirmando...' : 'Confirmar pago'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingBottom: 32 },
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
  hero: { alignItems: 'center', paddingTop: 8 },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: { color: C.text, fontSize: 30 / 1.3, fontWeight: '800', marginBottom: 6 },
  heroSubtitle: { color: C.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  heroMeta: { color: C.muted, fontSize: 13, marginTop: 4, textAlign: 'center' },
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
  rowLabel: { color: C.text, fontSize: 15, flex: 1 },
  rowValue: { color: C.text, fontSize: 15, fontWeight: '700' },
  totalDivider: { height: 1, backgroundColor: C.border, marginTop: 6, marginBottom: 4 },
  totalLabel: { color: C.text, fontSize: 17, fontWeight: '800' },
  totalValue: { color: C.brownDeep, fontSize: 18, fontWeight: '900' },
  optionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#FBFDFF',
    padding: 14,
    flexDirection: 'row',
    gap: 12,
  },
  optionCardSelected: {
    borderColor: '#F6C35C',
    backgroundColor: C.amberSoft,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#B8C6D8',
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: C.amber, borderColor: C.amber },
  optionCopy: { flex: 1, gap: 4 },
  optionTitle: { color: C.text, fontSize: 15, fontWeight: '800' },
  optionText: { color: C.text, fontSize: 14, lineHeight: 20 },
  optionWarning: { color: '#DC2626', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  shippingCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D7E7FF',
    backgroundColor: '#EEF5FF',
    padding: 14,
    gap: 6,
  },
  shippingTitle: { color: C.text, fontSize: 15, fontWeight: '800' },
  shippingText: { color: '#46617F', fontSize: 14, lineHeight: 20 },
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
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 12 },
  errorTitle: { color: C.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  errorText: { color: C.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
