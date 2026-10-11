import { useAuth } from '@/context/auth-context';
import { getBidResult, type BidResultResponse } from '@/lib/api';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  green: '#12B65A',
  greenSoft: '#E9FFF1',
  text: '#25344C',
  textMuted: '#718198',
  border: '#E3EAF3',
  brown: '#653728',
  brownDeep: '#653728',
  gold: '#FFC21A',
  blueSoft: '#EAF2FF',
  blueBorder: '#D5E5FF',
  blueText: '#2E58A6',
  cream: '#FFF9EC',
  creamBorder: '#F7DB95',
};

function formatCurrency(value?: number | null, currency?: string) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    value = 0;
  }

  const normalizedCurrency = (currency ?? 'ARS').trim().toUpperCase();
  const symbol = normalizedCurrency === 'USD' ? 'US$' : normalizedCurrency === 'ARS' ? 'ARS $' : '$';

  return `${symbol} ${Math.round(value).toLocaleString('es-AR')}`;
}

export default function LotWonScreen() {
  const params = useLocalSearchParams<{ id?: string; auctionId?: string; nextItemId?: string }>();
  const { session } = useAuth();
  const itemId = Number(params.id);
  const auctionId = Number(params.auctionId);
  const nextItemId = Number(params.nextItemId);
  const [result, setResult] = useState<BidResultResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function load() {
        if (!session?.token || !Number.isFinite(itemId) || !Number.isFinite(auctionId)) {
          if (isActive) {
            setError('No pudimos identificar el lote ganado.');
            setIsLoading(false);
          }
          return;
        }

        try {
          if (isActive) {
            setIsLoading(true);
            setError(null);
          }

          const nextResult = await getBidResult(auctionId, itemId, session.token);
          if (!isActive) {
            return;
          }

          setResult(nextResult);
        } catch (loadError) {
          if (isActive) {
            setError(loadError instanceof Error ? loadError.message : 'No pudimos cargar el detalle del lote ganado.');
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
    }, [auctionId, itemId, session?.token])
  );

  const shippingEstimate = useMemo(() => {
    if (!result) {
      return 0;
    }

    return Math.max(0, result.totalToPay - result.winningBid - result.commissionAmount);
  }, [result]);

  const handleBackToAuction = useCallback(() => {
    if (!Number.isFinite(auctionId) || auctionId <= 0) {
      router.back();
      return;
    }

    if (Number.isFinite(nextItemId) && nextItemId > 0) {
      router.replace({
        pathname: '/lot/[id]/room',
        params: { id: String(nextItemId), auctionId: String(auctionId) },
      });
      return;
    }

    router.replace(`/auction/${auctionId}`);
  }, [auctionId, nextItemId]);

  const handleOpenMessages = useCallback(() => {
    router.push('/notifications');
  }, []);

  const handleOpenPayment = useCallback(() => {
    if (!result) {
      return;
    }

    router.push(`/won-items/${result.itemId}/payment`);
  }, [result]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator color={C.brown} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !result) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Feather name="alert-triangle" size={26} color="#DC2626" />
          <Text style={styles.errorTitle}>No pudimos abrir la confirmación</Text>
          <Text style={styles.errorText}>{error ?? 'Intentalo nuevamente.'}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleBackToAuction}>
            <Text style={styles.primaryButtonText}>Volver a la subasta</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.hero}>
            <View style={styles.heroIconWrap}>
              <View style={styles.heroIconCircle}>
                <Feather name="award" size={34} color={C.green} />
              </View>
              <View style={styles.heroIconBadge}>
                <Feather name="check" size={14} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.heroTitle}>¡Felicitaciones!</Text>
            <Text style={styles.heroSubtitle}>Ganaste la subasta</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryCode}>{result.lotCode}</Text>
            <Text style={styles.summaryTitle}>{result.title}</Text>
            <Text style={styles.summaryAuction}>{result.auctionName}</Text>
          </View>

          <View style={styles.bidCard}>
            <Text style={styles.bidLabel}>Tu oferta ganadora</Text>
            <View style={styles.bidRow}>
              <Text style={styles.bidAmount}>{formatCurrency(result.winningBid, result.currency)}</Text>
              <View style={styles.bidBadge}>
                <Feather name="award" size={18} color={C.brownDeep} />
              </View>
            </View>
          </View>

          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>Estimación de pago total</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Puja ganadora</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(result.winningBid, result.currency)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Comisión ({Math.round(result.commissionPercentage)}%)</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(result.commissionAmount, result.currency)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Envío estimado</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(shippingEstimate, result.currency)}</Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownTotalLabel}>Total estimado</Text>
              <Text style={styles.breakdownTotalValue}>{formatCurrency(result.totalToPay, result.currency)}</Text>
            </View>
          </View>

          <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>Próximos pasos</Text>
            <Text style={styles.stepItem}>1. Revisá el mensaje privado con los detalles completos del pago.</Text>
            <Text style={styles.stepItem}>2. Confirmá el pago con el medio seleccionado.</Text>
            <Text style={styles.stepItem}>3. Elegí entre envío a domicilio o retiro personal.</Text>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleOpenMessages}>
            <Feather name="mail" size={16} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Ver mensaje privado</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleOpenPayment}>
            <Feather name="credit-card" size={16} color={C.brown} />
            <Text style={styles.secondaryButtonText}>Ir a pagar ahora</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={handleBackToAuction}>
            <Text style={styles.backLinkText}>Volver a la subasta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 36,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 28,
    shadowColor: '#D7C9AA',
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    overflow: 'hidden',
  },
  hero: {
    backgroundColor: C.green,
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  heroIconWrap: {
    position: 'relative',
    marginBottom: 18,
  },
  heroIconCircle: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF8A1F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.white,
  },
  heroTitle: {
    color: C.white,
    fontSize: 28,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.94)',
    fontSize: 16,
    marginTop: 6,
    fontWeight: '600',
  },
  summaryCard: {
    marginHorizontal: 20,
    marginTop: 22,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#F8FAFD',
    padding: 16,
  },
  summaryCode: {
    color: '#9AA8BC',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryTitle: {
    color: C.text,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
  },
  summaryAuction: {
    color: C.textMuted,
    fontSize: 14,
    marginTop: 6,
  },
  bidCard: {
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.creamBorder,
    backgroundColor: C.cream,
    padding: 16,
  },
  bidLabel: {
    color: '#D97706',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  bidRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bidAmount: {
    color: C.brownDeep,
    fontSize: 22,
    fontWeight: '900',
  },
  bidBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownCard: {
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#F8FAFD',
    padding: 16,
    gap: 10,
  },
  breakdownTitle: {
    color: '#66758C',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  breakdownLabel: {
    color: '#51637E',
    fontSize: 15,
    flex: 1,
  },
  breakdownValue: {
    color: '#30425F',
    fontSize: 15,
    fontWeight: '700',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#DCE6F2',
    marginTop: 2,
  },
  breakdownTotalLabel: {
    color: C.text,
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  breakdownTotalValue: {
    color: C.brownDeep,
    fontSize: 18,
    fontWeight: '900',
  },
  stepsCard: {
    marginHorizontal: 20,
    marginTop: 22,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.blueBorder,
    backgroundColor: C.blueSoft,
    padding: 16,
    gap: 8,
  },
  stepsTitle: {
    color: C.blueText,
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  stepItem: {
    color: C.blueText,
    fontSize: 14,
    lineHeight: 22,
  },
  primaryButton: {
    marginHorizontal: 20,
    marginTop: 24,
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: C.brown,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  primaryButtonText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    marginHorizontal: 20,
    marginTop: 14,
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1.25,
    borderColor: C.brown,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButtonText: {
    color: C.brown,
    fontSize: 16,
    fontWeight: '800',
  },
  backLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  backLinkText: {
    color: C.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  errorTitle: {
    color: C.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorText: {
    color: C.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});