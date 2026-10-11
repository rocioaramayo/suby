import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FineData, FinePaymentMethod, getFinePaymentMethods, payFine } from '../../lib/api';

export type { FineData, FinePaymentMethod };

export function FinePaymentModal({
  visible,
  fine,
  onClose,
  onPaid,
  userId,
  token,
}: {
  visible: boolean;
  fine: FineData;
  onClose: () => void;
  onPaid: () => void;
  userId: number;
  token: string;
}) {
  const [paymentMethods, setPaymentMethods] = useState<FinePaymentMethod[]>([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;

    const load = async () => {
      setIsLoadingMethods(true);
      setPaymentMethods([]);
      setSelectedMethodId(null);
      try {
        const methods = await getFinePaymentMethods(userId, token);
        if (!cancelled) {
          setPaymentMethods(methods);
          setSelectedMethodId(methods[0]?.id ?? null);
        }
      } catch (err: any) {
        if (!cancelled) {
          Alert.alert('Error', err?.message ?? 'No se pudieron cargar los métodos de pago.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMethods(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [visible, userId, token]);

  const handlePay = async () => {
    if (!selectedMethodId) {
      Alert.alert('Seleccioná un método de pago');
      return;
    }
    setIsPaying(true);
    try {
      await payFine(userId, fine.id, selectedMethodId, token);
      Alert.alert('Multa abonada', 'Tu cuenta ha sido rehabilitada.', [{ text: 'OK', onPress: onPaid }]);
    } catch (err: any) {
      const message =
        err?.status === 402
          ? 'Saldo insuficiente para abonar la multa.'
          : (err?.message ?? 'No se pudo procesar el pago.');
      Alert.alert('Error', message);
    } finally {
      setIsPaying(false);
    }
  };

  const fineAmount = fine.amount > 0 ? fine.amount : (fine.winningBid ? fine.winningBid * (fine.percentage / 100) : 0);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={fineStyles.modalSafe}>
        {/* Header */}
        <View style={fineStyles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={fineStyles.backBtn}>
            <Feather name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <Text style={fineStyles.modalHeaderTitle}>Confirmar Pago</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView style={fineStyles.scrollContainer} contentContainerStyle={fineStyles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Main Card Wrapper */}
          <View style={fineStyles.cardWrapper}>
            {/* Red top strip */}
            <View style={fineStyles.redTopStrip} />

            {/* Lock icon - Tamaño reducido */}
            <View style={fineStyles.lockCircle}>
              <Feather name="lock" size={28} color="#E05252" />
            </View>

            <Text style={fineStyles.fineTitle}>¡PAGO DE MULTA!</Text>
            {fine.auctionTitle ? <Text style={fineStyles.fineSubtitle}>{fine.auctionTitle}</Text> : null}
            {fine.lotCode || fine.auctioneerName ? (
              <Text style={fineStyles.fineMeta}>
                {[fine.lotCode, fine.auctioneerName].filter(Boolean).join(' · ')}
              </Text>
            ) : null}

            {/* Breakdown - Paddings reducidos */}
            <View style={fineStyles.breakdownCard}>
              <Text style={fineStyles.breakdownTitle}>DESGLOSE DE PAGO</Text>
              {fine.winningBid ? (
                <View style={fineStyles.breakdownRow}>
                  <Text style={fineStyles.breakdownLabel}>Puja ganadora</Text>
                  <Text style={fineStyles.breakdownValue}>US$ {fine.winningBid.toLocaleString('es-AR')}</Text>
                </View>
              ) : null}
              <View style={fineStyles.breakdownRow}>
                <Text style={fineStyles.breakdownLabel}>Multa {fine.percentage ?? 10}%</Text>
                <Text style={fineStyles.breakdownValue}>US$ {fineAmount.toLocaleString('es-AR')}</Text>
              </View>
              <View style={fineStyles.divider} />
              <View style={fineStyles.breakdownRow}>
                <Text style={fineStyles.totalLabel}>Total a Pagar</Text>
                <Text style={fineStyles.totalValue}>US$ {fineAmount.toLocaleString('es-AR')}</Text>
              </View>
            </View>

            {/* Warning - Margen y padding reducidos */}
            <View style={fineStyles.warningBox}>
              <View style={fineStyles.warningIconCircle}>
                <Feather name="check" size={14} color="white" />
              </View>
              <Text style={fineStyles.warningText}>
                <Text style={fineStyles.warningBold}>⚠️ Importante: </Text>
                Si el usuario no cumple con su obligación de pago, el caso se deriva a la justicia.
              </Text>
            </View>

            {/* Payment methods */}
            <Text style={fineStyles.payMethodLabel}>MEDIO DE PAGO</Text>

            {isLoadingMethods ? (
              <View style={fineStyles.loadingMethods}>
                <ActivityIndicator color="#653728" />
                <Text style={fineStyles.loadingMethodsText}>Cargando métodos de pago…</Text>
              </View>
            ) : paymentMethods.length === 0 ? (
              <Text style={fineStyles.noMethodsText}>No tenés métodos de pago registrados.</Text>
            ) : (
              paymentMethods.map((pm) => (
                <TouchableOpacity
                  key={pm.id}
                  style={[fineStyles.methodRow, selectedMethodId === pm.id && fineStyles.methodRowSelected]}
                  onPress={() => setSelectedMethodId(pm.id)}
                  activeOpacity={0.8}
                >
                  <View style={fineStyles.methodIconBox}>
                    <Feather
                      name={
                        pm.subtitle?.toLowerCase().includes('cheque')
                          ? 'file-text'
                          : pm.subtitle?.toLowerCase().includes('bancari') || pm.subtitle?.toLowerCase().includes('fondos')
                          ? 'briefcase'
                          : 'credit-card'
                      }
                      size={18}
                      color={selectedMethodId === pm.id ? '#653728' : '#7C8DA6'}
                    />
                  </View>
                  <View style={fineStyles.methodTextBox}>
                    <Text style={[fineStyles.methodText, selectedMethodId === pm.id && fineStyles.methodTextSelected]}>
                      {pm.title}
                    </Text>
                    {pm.subtitle ? (
                      <Text style={[fineStyles.methodSubtitle, selectedMethodId === pm.id && fineStyles.methodSubtitleSelected]}>
                        {pm.subtitle}
                      </Text>
                    ) : null}
                  </View>
                  {selectedMethodId === pm.id && <Feather name="check-circle" size={18} color="#653728" />}
                </TouchableOpacity>
              ))
            )}

            {/* CTA Inside Card - Altura reducida */}
            <TouchableOpacity
              style={[
                fineStyles.confirmBtn,
                (isPaying || isLoadingMethods || paymentMethods.length === 0) && fineStyles.confirmBtnDisabled,
              ]}
              onPress={handlePay}
              disabled={isPaying || isLoadingMethods || paymentMethods.length === 0}
              activeOpacity={0.85}
            >
              {isPaying ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Feather name="check-circle" size={18} color="white" />
                  <Text style={fineStyles.confirmBtnText}>CONFIRMAR PAGO</Text>
                </>
              )}
            </TouchableOpacity>
            
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function Fines() {
  return null;
}


const fineStyles = StyleSheet.create({
  modalSafe: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  modalHeader: {
    backgroundColor: '#653728',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backBtn: {
    padding: 6,
  },
  modalHeaderTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24, 
  },
  cardWrapper: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
    width: '100%',
  },
  redTopStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#E05252',
  },
  lockCircle: {
    width: 60, 
    height: 60,
    borderRadius: 30, 
    backgroundColor: '#FFF0F0',
    borderWidth: 2,
    borderColor: '#E05252',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  fineTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1F2A44',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fineSubtitle: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '600',
    marginBottom: 2,
  },
  fineMeta: {
    fontSize: 12,
    color: '#7183A3',
    marginBottom: 16, 
  },
  breakdownCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14, 
    width: '100%',
    marginBottom: 12, 
  },
  breakdownTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1F2A44',
    letterSpacing: 0.8,
    marginBottom: 10, 
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8, 
  },
  breakdownLabel: {
    color: '#7183A3',
    fontSize: 13,
  },
  breakdownValue: {
    color: '#4A5568',
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#E8ECF2',
    marginVertical: 8,
  },
  totalLabel: {
    color: '#1F2A44',
    fontSize: 14,
    fontWeight: '800',
  },
  totalValue: {
    color: '#653728',
    fontSize: 15,
    fontWeight: '800',
  },
  warningBox: {
    backgroundColor: '#FFFBEA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F6C05E',
    padding: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16, 
  },
  warningIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F6C05E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningText: {
    flex: 1,
    fontSize: 11, 
    color: '#E05252',
    lineHeight: 16,
    fontWeight: '600',
  },
  warningBold: {
    fontWeight: '800',
  },
  payMethodLabel: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '800',
    color: '#1F2A44',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  loadingMethods: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  loadingMethodsText: {
    color: '#7183A3',
    fontSize: 13,
  },
  noMethodsText: {
    color: '#7183A3',
    fontSize: 13,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 16, 
    borderWidth: 1,
    borderColor: '#E8ECF2',
  },
  methodRowSelected: {
    borderColor: '#653728',
    backgroundColor: '#FDF6F2',
  },
  methodIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF3FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodTextBox: {
    flex: 1,
  },
  methodText: {
    fontSize: 13,
    color: '#1F2A44',
    fontWeight: '600',
  },
  methodTextSelected: {
    color: '#653728',
  },
  methodSubtitle: {
    fontSize: 11,
    color: '#7C8DA6',
    marginTop: 2,
  },
  methodSubtitleSelected: {
    color: '#9B6B58',
  },
  confirmBtn: {
    backgroundColor: '#653728',
    borderRadius: 12,
    paddingVertical: 14, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 14, 
    letterSpacing: 0.5,
  },
});
