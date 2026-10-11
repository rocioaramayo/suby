import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '@/context/auth-context';
import { getApiErrorMessage, getWonBidDetail, resolveApiAssetUrl, type WonBidDetailResponse } from '@/lib/api';

// TOKENS DE COLOR (De la nueva apariencia)
const C = {
  brown: '#653728',
  brownLight: 'rgba(101, 55, 40, 0.08)',
  bg: '#F8FAFC',
  white: '#ffffff',
  textDark: '#1D293D',
  textMid: '#314158',
  textLight: '#90A1B9',
  green: '#008236',
  greenBadge: '#DCFCE7',
  greenBg: '#00C950',
  orange: '#F97316',
  border: '#F1F5F9',
  border2: '#E2E8F0',
};

// UTILIDADES
function formatCurrency(value: number, currency?: string) {
  const normalizedCurrency = (currency ?? 'ARS').trim().toUpperCase();
  const symbol = normalizedCurrency === 'USD' ? 'US$' : normalizedCurrency === 'ARS' ? 'ARS $' : '$ ';
  return `${symbol} ${Math.round(value).toLocaleString('es-AR')}`;
}

// Función segura para formatear la fecha sin ensuciar el JSX
function getSafeDate(dateStr?: string) {
  if (!dateStr) return 'Fecha no disponible';
  try {
    const date = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateStr;
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
    return new Intl.DateTimeFormat('es-AR', options).format(date);
  } catch {
    return dateStr;
  }
}

export default function BidHistoryDetailScreen() {
  const router = useRouter();
  const { itemId } = useLocalSearchParams<{ itemId?: string }>();
  const { session } = useAuth();
  
  // ESTADOS DEL BACKEND
  const [detail, setDetail] = useState<WonBidDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const parsedItemId = Number(itemId);

  // FETCH DATA MANTENIENDO TU LÓGICA ORIGINAL
  const load = useCallback(async () => {
    if (!session?.token || !session.userId || !Number.isFinite(parsedItemId) || parsedItemId <= 0) {
      setError('No pudimos abrir el detalle de la puja.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const nextDetail = await getWonBidDetail(session.userId, parsedItemId, session.token);
      setDetail(nextDetail);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'No pudimos cargar el detalle de la puja.'));
    } finally {
      setLoading(false);
    }
  }, [parsedItemId, session?.token, session?.userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const heroImage = useMemo(() => {
    const candidate = detail?.item.photos?.[0];
    return resolveApiAssetUrl(candidate);
  }, [detail]);

  const userWon = detail?.result.won ?? false;

  // ESTADO: CARGANDO
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator color={C.brown} size="large" />
          <Text style={styles.centerText}>Cargando detalle...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ESTADO: ERROR O SIN DATOS
  if (error || !detail) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Feather name="alert-triangle" size={28} color={C.orange} />
          <Text style={styles.errorTitle}>No pudimos abrir el lote</Text>
          <Text style={styles.centerText}>{error ?? 'Volvé a intentar en unos segundos.'}</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => load()}>
            <Text style={styles.errorButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ESTADO: ÉXITO - UI PRINCIPAL
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* IMAGEN HEADER */}
        <View style={styles.imageHeaderContainer}>
          {heroImage ? (
             <Image source={{ uri: heroImage }} style={styles.headerImage} />
          ) : (
             <View style={[styles.headerImage, { backgroundColor: '#E8EDF4' }]} />
          )}
          <LinearGradient
            colors={['rgba(101, 55, 40, 0.80)', 'rgba(101, 55, 40, 0.20)', 'transparent']}
            locations={[0, 0.5, 1]}
            style={styles.gradientOverlay}
          />
          
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={24} color="white" />
          </TouchableOpacity>

          <View style={[styles.statusBadge, !userWon && styles.statusBadgeLost]}>
            <Feather name={userWon ? 'check' : 'x'} size={14} color={userWon ? C.green : C.orange} />
            <Text style={[styles.statusBadgeText, !userWon && styles.statusBadgeTextLost]}>
              {userWon ? 'Ganada' : 'Perdida'}
            </Text>
          </View>

          <View style={styles.headerTextContainer}>
            <Text style={styles.lotTag}>{detail.item.lotCode || `LOT-${detail.item.itemId}`}</Text>
            <Text style={styles.titleText}>{detail.item.title}</Text>
          </View>
        </View>

        <View style={styles.contentPadding}>
          
          {/* INFO SUBASTA CARD */}
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="gavel" size={16} color={C.textLight} style={styles.infoIcon} />
              <View>
                <Text style={styles.infoLabel}>SUBASTA</Text>
                <Text style={styles.infoValue}>{detail.auction.name}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Feather name="user" size={16} color={C.textLight} style={styles.infoIcon} />
              <View>
                <Text style={styles.infoLabel}>REMATADOR</Text>
                <Text style={styles.infoValue}>{detail.auction.auctioneer ?? detail.item.ownerAtSale ?? 'Rematador no informado'}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Feather name="map-pin" size={16} color={C.textLight} style={styles.infoIcon} />
              <View>
                <Text style={styles.infoLabel}>SEDE</Text>
                <Text style={styles.infoValue}>{detail.auction.location ?? 'Sede no especificada'}</Text>
              </View>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Feather name="calendar" size={16} color={C.textLight} style={styles.infoIcon} />
              <View>
                <Text style={styles.infoLabel}>FECHA</Text>
                {/* Usamos el formateador seguro aquí para no romper el Text node */}
                <Text style={styles.infoValue}>{getSafeDate(detail.auction.date?.toString())}</Text>
              </View>
            </View>
          </View>

          {/* DESCRIPCIÓN CARD */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>DESCRIPCIÓN DEL LOTE</Text>
            <Text style={styles.descriptionText}>{detail.item.description ?? 'Sin descripción disponible.'}</Text>
          </View>

          {/* DESGLOSE CARD */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>DESGLOSE DE LA PUJA</Text>
            <View style={styles.breakdownContainer}>
              
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.dot, { backgroundColor: C.brown }]} />
                  <Text style={styles.breakdownLabel}>Mi oferta</Text>
                </View>
                <Text style={styles.breakdownValueDark}>{formatCurrency(detail.result.userBid)}</Text>
              </View>

              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.dot, { backgroundColor: C.greenBg }]} />
                  <Text style={styles.breakdownLabel}>Precio final del lote</Text>
                </View>
                <Text style={styles.breakdownValueGreen}>{formatCurrency(detail.result.winningBid)}</Text>
              </View>

              <View style={[styles.breakdownRow, styles.topBorder]}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.dot, { backgroundColor: C.orange }]} />
                  <Text style={styles.breakdownLabel}>Comisión Suby</Text>
                </View>
                <Text style={styles.breakdownValueOrange}>{formatCurrency(detail.result.subyCommissionAmount)}</Text>
              </View>

              {userWon ? (
                <View style={[styles.breakdownRow, styles.thickBorder, { paddingBottom: 0 }]}>
                  <Text style={styles.totalLabel}>Total a pagar</Text>
                  <Text style={styles.totalValue}>{formatCurrency(detail.result.totalPaid)}</Text>
                </View>
              ) : (
                <View style={[styles.breakdownRow, styles.thickBorder, { paddingBottom: 0 }]}>
                  <Text style={styles.totalLabel}>Resultado</Text>
                  <Text style={styles.totalValueLost}>No adjudicada</Text>
                </View>
              )}

            </View>
            <Text style={styles.bidsCount}>{detail.bidTimeline.length} ofertas en total durante el lote</Text>
          </View>

          {/* CRONOLOGÍA DE OFERTAS */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>CRONOLOGÍA DE OFERTAS</Text>
            
            <View style={styles.timelineContainer}>
              <View style={styles.timelineLine} />

              {/* Mapeo dinámico del Timeline del backend */}
              {detail.bidTimeline.map((entry: WonBidDetailResponse['bidTimeline'][number], index: number) => {
                const isYou = entry.bidderLabel.toLowerCase().includes('tu');
                const isWinner = entry.amount === detail.result.winningBid;
                
                return (
                  <TimelineItem 
                    key={`${entry.bidNumber}-${index}`}
                    time={new Date(entry.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    name={entry.bidderLabel} 
                    price={formatCurrency(entry.amount)} 
                    isYou={isYou}
                    isWinner={isWinner}
                  />
                );
              })}

            </View>
          </View>

          {/* BOTONES DE ACCIÓN */}
          <View style={styles.actionButtons}>
            {userWon ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push(`/won-items/${detail.item.itemId}/payment`)}
              >
                <View style={styles.btnContent}>
                  <Feather name="award" size={18} color="white" />
                  <Text style={styles.primaryBtnText}>Ver pantalla de puja ganada</Text>
                </View>
                <Feather name="chevron-right" size={18} color="white" />
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
              <Feather name="arrow-left" size={16} color={C.textLight} />
              <Text style={styles.secondaryBtnText}>Volver al historial</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// COMPONENTE SECUNDARIO PARA LA CRONOLOGÍA
function TimelineItem({ time, name, price, isYou = false, isWinner = false }: { time: string, name: string, price: string, isYou?: boolean, isWinner?: boolean }) {
  return (
    <View style={styles.timelineItem}>
      <View style={[styles.avatarCircle, isYou && styles.avatarCircleYou]}>
        <Feather name="user" size={16} color={isYou ? 'white' : C.textLight} />
      </View>
      <View style={[styles.timelineContent, isYou && styles.timelineContentYou]}>
        <View style={styles.timelineRowTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.timelineName, isYou && styles.timelineNameYou]}>{name}</Text>
            {isWinner ? (
              <View style={styles.winnerBadge}>
                <Text style={styles.winnerBadgeText}>GANADORA</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.timelineTime}>{time}</Text>
        </View>
        <Text style={[styles.timelinePrice, isYou && styles.timelinePriceYou]}>{price}</Text>
      </View>
    </View>
  );
}

// ESTILOS DE LA NUEVA APARIENCIA
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1 },

  // Center States (Cargando / Error)
  centerState: { flex: 1, minHeight: 500, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  centerText: { color: C.textMid, textAlign: 'center', fontSize: 14 },
  errorTitle: { color: C.textDark, fontSize: 20, fontWeight: '800' },
  errorButton: { backgroundColor: C.brown, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, marginTop: 6 },
  errorButtonText: { color: '#FFF', fontWeight: '800' },

  // Header Image
  imageHeaderContainer: { height: 224, width: '100%', position: 'relative' },
  headerImage: { width: '100%', height: '100%' },
  gradientOverlay: { ...StyleSheet.absoluteFillObject },
  
  backBtn: { position: 'absolute', top: 48, left: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  statusBadge: { position: 'absolute', top: 48, right: 20, backgroundColor: '#F0FDF4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 0.6, borderColor: '#B9F8CF', flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusBadgeText: { color: C.green, fontSize: 12, fontWeight: '700' },
  statusBadgeLost: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  statusBadgeTextLost: { color: C.orange },
  
  headerTextContainer: { position: 'absolute', bottom: 16, left: 20, right: 20 },
  lotTag: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 1.1, marginBottom: 2 },
  titleText: { color: 'white', fontSize: 20, fontWeight: '700', fontFamily: 'serif' },

  // Content
  contentPadding: { padding: 20, gap: 20 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 0.6, borderColor: C.border, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  
  // Info Rows
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 0.6, borderBottomColor: C.bg },
  infoIcon: { width: 16, textAlign: 'center' },
  infoLabel: { color: C.textLight, fontSize: 10, fontWeight: '500', letterSpacing: 0.25, marginBottom: 2 },
  infoValue: { color: C.textDark, fontSize: 14, fontWeight: '600', paddingRight: 10 },

  // Description
  sectionTitle: { color: '#62748E', fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },
  descriptionText: { color: C.textMid, fontSize: 14, lineHeight: 22 },

  // Breakdown
  breakdownContainer: { gap: 10, marginTop: 4 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  breakdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  breakdownLabel: { color: '#45556C', fontSize: 14 },
  breakdownValueDark: { color: C.textDark, fontSize: 14, fontWeight: '700' },
  breakdownValueGreen: { color: C.green, fontSize: 14, fontWeight: '700' },
  breakdownValueOrange: { color: C.orange, fontSize: 14, fontWeight: '700' },
  topBorder: { borderTopWidth: 0.6, borderTopColor: C.border, paddingTop: 6 },
  thickBorder: { borderTopWidth: 1.5, borderTopColor: C.border2, paddingTop: 8, marginTop: 4 },
  totalLabel: { color: C.textDark, fontSize: 14, fontWeight: '700' },
  totalValue: { color: C.brown, fontSize: 16, fontWeight: '700' },
  totalValueLost: { color: C.orange, fontSize: 16, fontWeight: '700' },
  bidsCount: { textAlign: 'right', color: C.textLight, fontSize: 11, marginTop: 12 },

  // Timeline
  timelineContainer: { position: 'relative', marginTop: 12, paddingBottom: 10 },
  timelineLine: { position: 'absolute', left: 17.5, top: 10, bottom: 20, width: 1, backgroundColor: C.border },
  
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'white', borderWidth: 1.5, borderColor: C.border2, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  avatarCircleYou: { backgroundColor: C.brown, borderColor: C.brown },
  
  timelineContent: { flex: 1, backgroundColor: C.bg, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 0.6, borderColor: C.border },
  timelineContentYou: { backgroundColor: C.brownLight, borderColor: 'rgba(101, 55, 40, 0.15)' },
  
  timelineRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  timelineName: { color: '#45556C', fontSize: 12, fontWeight: '600' },
  timelineNameYou: { color: C.brown },
  timelineTime: { color: C.textLight, fontSize: 10 },
  timelinePrice: { color: C.textMid, fontSize: 14, fontWeight: '700' },
  timelinePriceYou: { color: C.brown },

  winnerBadge: { backgroundColor: C.greenBadge, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  winnerBadgeText: { color: C.green, fontSize: 9, fontWeight: '700' },

  // Action Buttons
  actionButtons: { gap: 12, marginTop: 10 },
  primaryButton: { backgroundColor: C.brown, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, elevation: 3 },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  primaryBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  secondaryBtnText: { color: '#62748E', fontSize: 14, fontWeight: '500' },
});
