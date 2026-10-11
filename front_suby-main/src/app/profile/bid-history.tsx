import { useAuth } from '@/context/auth-context';
import { getApiErrorMessage, getUserStats, listUserBidHistory, type UserBidHistoryItem } from '@/lib/api';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// TOKENS DE COLOR (De la nueva apariencia)
const C = {
  brown: '#653728',
  bg: '#F8FAFC',
  white: '#ffffff',
  textDark: '#1D293D',
  textMid: '#314158',
  textLight: '#90A1B9',
  green: '#008236',
  greenBadge: '#DCFCE7',
  greenBg: '#00C950',
  red: '#FB2C36',
  redBadge: '#FEE2E2',
  orange: '#F97316',
  orangeBadge: '#FFEDD5',
  border: '#F1F5F9',
  border2: '#E2E8F0',
};

// ==========================================
// LÓGICA DE NEGOCIO Y TIPOS (Original)
// ==========================================
type ActivityStatus = 'won' | 'lost' | 'active';

type HistoryCard = UserBidHistoryItem & {
  auctionId?: number;
  category: string;
  image?: string;
  status: ActivityStatus;
};

function formatCurrency(value: number, currency?: string) {
  const normalizedCurrency = (currency ?? 'ARS').trim().toUpperCase();
  const symbol = normalizedCurrency === 'USD' ? 'US$' : normalizedCurrency === 'ARS' ? 'ARS $' : '$ ';
  return `${symbol} ${Math.round(value).toLocaleString('es-AR')}`;
}

function normalizeCategory(value?: string) {
  return value?.trim() ? value : 'General';
}

function inferStatus(item: UserBidHistoryItem): ActivityStatus {
  if (String(item.winner).toLowerCase() === 'si' || String(item.winner).toLowerCase() === 'true') {
    return 'won';
  }

  const date = new Date(`${item.date}T00:00:00`);
  if (!Number.isNaN(date.getTime()) && date.getTime() >= new Date().setHours(0, 0, 0, 0)) {
    return 'active';
  }

  return 'lost';
}

async function enrichHistory(items: UserBidHistoryItem[]) {
  return Promise.all(
    items.map(async (item) => {
      try {
        return {
          ...item,
          category: normalizeCategory(item.auctionName),
          status: inferStatus(item),
        };
      } catch {
        return {
          ...item,
          category: 'General',
          status: inferStatus(item),
        };
      }
    })
  );
}

// ==========================================
// COMPONENTE TARJETA DE PUJA (Fusionado)
// ==========================================
function BidCard({ item }: { item: HistoryCard }) {
  const router = useRouter();
  const isWon = item.status === 'won';
  const isActive = item.status === 'active';

  // Lógica de navegación original
  const onPress = () => {
    if ((isWon || item.status === 'lost') && item.itemId) {
      router.push({ pathname: '/profile/bid-history/[itemId]', params: { itemId: String(item.itemId) } });
      return;
    }
    if (item.auctionId && item.itemId) {
      router.push({ pathname: '/lot/[id]', params: { id: String(item.itemId), auctionId: String(item.auctionId) } });
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.itemCard, isWon && styles.itemCardWon]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Imagen y Badge de Estado */}
      <View style={styles.imageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.itemImage} />
        ) : (
          <View style={[styles.itemImage, { backgroundColor: '#E8EDF4' }]} />
        )}
        <View style={[
          styles.statusDot, 
          { backgroundColor: isWon ? C.greenBg : isActive ? C.orange : C.red }
        ]} />
      </View>

      {/* Info Central */}
      <View style={styles.itemInfo}>
        <View style={styles.itemHeaderRow}>
          <Text style={styles.lotText}>{item.lotCode || `LOT-${item.itemId}`}</Text>
          <View style={[styles.badge, isWon ? styles.badgeWon : isActive ? styles.badgeActive : styles.badgeLost]}>
            <Text style={[styles.badgeText, isWon ? styles.badgeTextWon : isActive ? styles.badgeTextActive : styles.badgeTextLost]}>
              {isWon ? 'GANADA' : isActive ? 'ACTIVA' : 'PERDIDA'}
            </Text>
          </View>
        </View>
        
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.itemTitle}
        </Text>
        
        <View style={styles.itemBottomRow}>
          <Text style={styles.itemPrice}>{formatCurrency(item.amount)}</Text>
          {isWon ? (
            <View style={styles.ganadaRow}>
              <Feather name="check-circle" size={12} color={C.green} />
              <Text style={styles.ganadaText}>Ganada</Text>
            </View>
          ) : isActive ? (
            <Text style={[styles.superadoText, { color: C.orange }]}>En curso</Text>
          ) : (
            <Text style={styles.superadoText}>Superada</Text>
          )}
        </View>
      </View>

      {/* Flecha Derecha */}
      <Feather name="chevron-right" size={20} color={C.textLight} />
    </TouchableOpacity>
  );
}

// ==========================================
// PANTALLA PRINCIPAL (Fusionada)
// ==========================================
export default function BidHistoryScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [history, setHistory] = useState<HistoryCard[]>([]);
  const [stats, setStats] = useState<{ total: number; won: number; lost: number; successRate: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carga de datos original del backend
  const load = useCallback(async () => {
    if (!session?.token || !session.userId) {
      setError('Necesitás iniciar sesión para ver tu historial.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [statsResponse, historyResponse] = await Promise.all([
        getUserStats(session.userId, session.token),
        listUserBidHistory(session.userId, session.token),
      ]);
      const enriched = await enrichHistory(historyResponse.bids);
      setHistory(enriched);
      setStats({
        total: historyResponse.total,
        won: enriched.filter((item) => item.status === 'won').length,
        lost: enriched.filter((item) => item.status === 'lost').length,
        successRate: statsResponse.successRate,
      });
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'No pudimos cargar tu historial de pujas.'));
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [session?.token, session?.userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const uniqueHistory = useMemo(() => {
    const seen = new Set<string>();
    return history.filter((item) => {
      const key = String(item.itemId ?? item.bidId);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [history]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* HEADER VISUAL NUEVO */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="chevron-left" size={26} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Historial de Pujas</Text>
          <Text style={styles.headerSubtitle}>Toca un lote para ver el detalle completo</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* STATS CARD VISUAL NUEVA (Alimentada por el Backend) */}
          <View style={styles.statsCard}>
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: C.textDark }]}>{stats?.total ?? 0}</Text>
              <Text style={styles.statLabel}>TOTAL</Text>
            </View>
            <View style={[styles.statCol, styles.statBorder]}>
              <Text style={[styles.statNum, { color: C.greenBg }]}>{stats?.won ?? 0}</Text>
              <Text style={styles.statLabel}>GANADAS</Text>
            </View>
            <View style={[styles.statCol, styles.statBorder]}>
              <Text style={[styles.statNum, { color: C.red }]}>{stats?.lost ?? 0}</Text>
              <Text style={styles.statLabel}>PERDIDAS</Text>
            </View>
            <View style={[styles.statCol, styles.statBorder, { borderRightWidth: 0 }]}>
              <Text style={[styles.statNum, { color: C.orange }]}>{Math.round(stats?.successRate ?? 0)}%</Text>
              <Text style={styles.statLabel}>ÉXITO</Text>
            </View>
          </View>

          {/* ESTADOS DE CARGA Y ERROR */}
          {loading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={C.brown} size="large" />
              <Text style={styles.stateText}>Cargando tu historial...</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorCard}>
              <Feather name="alert-triangle" size={18} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* LISTA DE PUJAS VISUAL NUEVA */}
          <View style={styles.listContainer}>
            {uniqueHistory.map((item) => (
              <BidCard key={`${item.bidId}-${item.lotCode || item.itemId}`} item={item} />
            ))}
          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// ==========================================
// ESTILOS DE LA NUEVA APARIENCIA
// ==========================================
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, backgroundColor: C.bg },
  
  // Header
  header: {
    backgroundColor: C.brown,
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomRightRadius: 24,
    borderBottomLeftRadius: 24,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6,
  },
  backButton: { position: 'absolute', top: 52, left: 24, padding: 4 },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: '700', fontFamily: 'serif', marginTop: 10 },
  headerSubtitle: { color: 'rgba(255, 255, 255, 0.60)', fontSize: 12, marginTop: 4 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

  // Tarjeta de Stats
  statsCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 20,
    borderWidth: 0.6, borderColor: C.border,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3,
  },
  statCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statBorder: { borderLeftWidth: 0.6, borderLeftColor: C.border },
  statNum: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  statLabel: { color: C.textLight, fontSize: 10, fontWeight: '500', letterSpacing: 0.25 },

  // Estados
  stateCard: { backgroundColor: 'white', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 0.6, borderColor: C.border, marginBottom: 20 },
  stateText: { color: C.textLight, marginTop: 12, fontSize: 14, fontWeight: '500' },
  errorCard: { backgroundColor: '#FEF2F2', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 0.6, borderColor: '#FECACA', marginBottom: 20 },
  errorText: { color: '#DC2626', marginLeft: 10, flex: 1, fontSize: 14, fontWeight: '500' },

  // Lista
  listContainer: { gap: 10 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    borderWidth: 0.6, borderColor: C.border,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3,
  },
  itemCardWon: { borderColor: '#7BF1A8', borderWidth: 1 }, // Borde verde para las ganadas
  
  imageContainer: { position: 'relative', marginRight: 12 },
  itemImage: { width: 56, height: 56, borderRadius: 14, backgroundColor: C.border },
  statusDot: {
    position: 'absolute', bottom: -2, right: -2,
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: 'white',
  },

  itemInfo: { flex: 1, justifyContent: 'center' },
  itemHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  lotText: { color: C.textLight, fontSize: 10, fontWeight: '700', letterSpacing: 0.25 },
  
  // Badges dinámicos
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  badgeWon: { backgroundColor: C.greenBadge },
  badgeActive: { backgroundColor: C.orangeBadge },
  badgeLost: { backgroundColor: C.redBadge },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.2 },
  badgeTextWon: { color: C.green },
  badgeTextActive: { color: C.orange },
  badgeTextLost: { color: C.red },
  
  itemTitle: { color: C.textDark, fontSize: 14, fontWeight: '600', marginBottom: 4, paddingRight: 4 },
  
  itemBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 8 },
  itemPrice: { color: C.textMid, fontSize: 12, fontWeight: '700' },
  ganadaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ganadaText: { color: C.green, fontSize: 10, fontWeight: '700' },
  superadoText: { color: C.red, fontSize: 10, fontWeight: '600' },
});
