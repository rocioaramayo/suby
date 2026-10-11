import { useAuth } from '@/context/auth-context';
import {
  getApiErrorMessage,
  getLotDetail,
  getUserStats,
  listUserBidHistory,
  searchLots,
  type UserBidHistoryItem,
  type UserStatsResponse,
} from '@/lib/api';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
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
  background: '#F6F8FC',
  brown: '#653728',
  brownSoft: '#653728',
  orange: '#FF7A1A',
  orangeSoft: '#FFF2E8',
  textDark: '#25324B',
  textMid: '#607494',
  textLight: '#8EA1BE',
  white: '#FFFFFF',
  border: '#E8EEF6',
  green: '#0F9F4B',
  greenSoft: '#ECFDF3',
  blue: '#4C91FF',
  slateSoft: '#F2F5FA',
  slateText: '#7F91AD',
  shadow: '#182538',
};

type ActivityStatus = 'ganado' | 'activo' | 'superado';

interface EnrichedBidItem extends UserBidHistoryItem {
  category: string;
  status: ActivityStatus;
}

interface CategorySummary {
  key: string;
  label: string;
  attended: number;
  won: number;
  paid: number;
}

function formatCurrency(value: number, currency?: string) {
  const normalizedCurrency = (currency ?? 'ARS').trim().toUpperCase();
  const symbol = normalizedCurrency === 'USD' ? 'US$' : normalizedCurrency === 'ARS' ? 'ARS $' : '$ ';
  return `${symbol} ${Math.round(value).toLocaleString('es-AR')}`;
}

function formatPercent(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function toTitleCase(value: string) {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function normalizeCategoryLabel(value?: string) {
  if (!value?.trim()) {
    return 'General';
  }

  return toTitleCase(value.replace(/[_-]+/g, ' '));
}

function inferCategoryFromText(...values: string[]) {
  const haystack = normalizeText(values.join(' '));

  if (haystack.includes('joy') || haystack.includes('oro') || haystack.includes('reloj')) {
    return 'Joyeria';
  }

  if (
    haystack.includes('sillon') ||
    haystack.includes('mueble') ||
    haystack.includes('mesa') ||
    haystack.includes('chesterfield')
  ) {
    return 'Mobiliario';
  }

  if (
    haystack.includes('arte') ||
    haystack.includes('pintura') ||
    haystack.includes('oleo') ||
    haystack.includes('escultura')
  ) {
    return 'Arte';
  }

  if (haystack.includes('vino') || haystack.includes('bodega')) {
    return 'Vinos';
  }

  return 'General';
}

function formatDateLabel(rawDate: string) {
  if (!rawDate) {
    return '--';
  }

  const date = new Date(`${rawDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return rawDate;
  }

  const month = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][
    date.getMonth()
  ];

  return `${date.getDate()} ${month}`;
}

function isTodayOrFuture(rawDate: string) {
  if (!rawDate) {
    return false;
  }

  const date = new Date(`${rawDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() >= today.getTime();
}

function getActivityStatus(item: UserBidHistoryItem): ActivityStatus {
  if (item.winner) {
    return 'ganado';
  }

  if (isTodayOrFuture(item.date)) {
    return 'activo';
  }

  return 'superado';
}

function getBidItemKey(item: Pick<UserBidHistoryItem, 'itemId' | 'lotCode' | 'bidId'>) {
  return String(item.itemId ?? item.lotCode ?? item.bidId);
}

async function enrichBidHistory(items: UserBidHistoryItem[]) {
  const enrichmentCache = new Map<string, Promise<{ category: string; auctionId?: number }>>();

  return Promise.all(
    items.map(async (item) => {
      const key = getBidItemKey(item);
      const fallbackCategory = inferCategoryFromText(item.itemTitle, item.auctionName, item.lotCode);

      if (!enrichmentCache.has(key)) {
        enrichmentCache.set(
          key,
          (async () => {
            try {
              const searchResults = await searchLots(item.lotCode || item.itemTitle);
              const exactMatch =
                searchResults.find((candidate) => candidate.itemId === item.itemId) ??
                searchResults.find(
                  (candidate) => candidate.lotCode.trim().toLowerCase() === item.lotCode.trim().toLowerCase()
                ) ??
                searchResults[0];

              const auctionId = item.auctionId ?? exactMatch?.auctionId;
              const itemId = item.itemId ?? exactMatch?.itemId;

              if (!auctionId || !itemId) {
                return { category: fallbackCategory, auctionId };
              }

              const lotDetail = await getLotDetail(auctionId, itemId);

              return {
                category: normalizeCategoryLabel(lotDetail.category),
                auctionId: lotDetail.auction?.id ?? auctionId,
              };
            } catch {
              return {
                category: fallbackCategory,
                auctionId: item.auctionId,
              };
            }
          })()
        );
      }

      const enrichment = await enrichmentCache.get(key)!;

      return {
        ...item,
        auctionId: item.auctionId ?? enrichment.auctionId,
        category: enrichment.category,
        status: getActivityStatus(item),
      };
    })
  );
}

function buildUniqueItemHistory(items: EnrichedBidItem[]) {
  const uniqueItems = new Map<string, EnrichedBidItem>();

  for (const item of items) {
    const key = getBidItemKey(item);
    if (!uniqueItems.has(key)) {
      uniqueItems.set(key, item);
    }
  }

  return Array.from(uniqueItems.values());
}

function buildCategorySummary(items: EnrichedBidItem[]) {
  const grouped = new Map<string, CategorySummary>();

  for (const item of items) {
    const categoryLabel = normalizeCategoryLabel(item.category);
    const key = normalizeText(categoryLabel);
    const current = grouped.get(key) ?? {
      key,
      label: categoryLabel,
      attended: 0,
      won: 0,
      paid: 0,
    };

    current.attended += 1;
    if (item.winner) {
      current.won += 1;
      current.paid += item.amount;
    }

    grouped.set(key, current);
  }

  return Array.from(grouped.values()).sort((left, right) => {
    if (right.paid !== left.paid) {
      return right.paid - left.paid;
    }

    return right.attended - left.attended;
  });
}

function MetricPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.metricPill}>
      <Text style={[styles.metricValue, accent && styles.metricValueAccent]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function FinancialCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.financialCell}>
      <View style={styles.financialIcon}>{icon}</View>
      <Text style={styles.financialValue}>{value}</Text>
      <Text style={styles.financialLabel}>{label}</Text>
    </View>
  );
}

function CategoryRow({ item }: { item: CategorySummary }) {
  const successRate = item.attended > 0 ? Math.round((item.won / item.attended) * 100) : 0;

  return (
    <View style={styles.categoryRow}>
      <View style={styles.categoryCopy}>
        <Text style={styles.categoryTitle}>{item.label}</Text>
        <Text style={styles.categorySubtitle}>
          {item.attended} subastas · {item.won} ganadas
        </Text>
      </View>

      <View style={styles.categoryAmountBlock}>
        <Text style={styles.categoryAmount}>{formatCurrency(item.paid)}</Text>
        <Text style={styles.categoryAmountLabel}>pagado</Text>
      </View>

      <View style={styles.categoryRateBadge}>
        <Text style={styles.categoryRateText}>{successRate}%</Text>
      </View>
    </View>
  );
}

function ActivityRow({ item }: { item: EnrichedBidItem }) {
  const isWon = item.status === 'ganado';
  const isActive = item.status === 'activo';
  const badgeStyle = isWon ? styles.activityBadgeWon : isActive ? styles.activityBadgeActive : styles.activityBadgeDefault;
  const badgeTextStyle = isWon
    ? styles.activityBadgeTextWon
    : isActive
      ? styles.activityBadgeTextActive
      : styles.activityBadgeTextDefault;
  const rowAction = () => {
    if (item.auctionId) {
      router.push(`/auction/${item.auctionId}`);
      return;
    }

    if (item.itemId) {
      router.push({
        pathname: '/lot/[id]',
        params: {
          id: String(item.itemId),
          auctionId: String(item.auctionId ?? 0),
        },
      });
    }
  };

  return (
    <TouchableOpacity style={styles.activityRow} activeOpacity={0.82} onPress={rowAction}>
      <View style={[styles.activityIconWrap, isWon ? styles.activityIconWon : isActive ? styles.activityIconActive : styles.activityIconDefault]}>
        <Feather name={isWon ? 'award' : isActive ? 'clock' : 'bookmark'} size={16} color={isWon ? C.green : isActive ? C.orange : C.slateText} />
      </View>

      <View style={styles.activityCopy}>
        <Text style={styles.activityTitle} numberOfLines={1}>
          {item.itemTitle}
        </Text>
        <Text style={styles.activityDate}>{formatDateLabel(item.date)}</Text>
      </View>

      <View style={styles.activityMeta}>
        <Text style={styles.activityAmount}>{formatCurrency(item.amount)}</Text>
        <View style={[styles.activityBadge, badgeStyle]}>
          <Text style={[styles.activityBadgeText, badgeTextStyle]}>
            {isWon ? 'GANADO' : isActive ? 'ACTIVA' : 'SUPERADO'}
          </Text>
        </View>
      </View>

      <Feather name="chevron-right" size={18} color="#C6D2E3" />
    </TouchableOpacity>
  );
}

export default function ProfileStatsScreen() {
  const { session } = useAuth();
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [history, setHistory] = useState<EnrichedBidItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
 
  const loadStats = useCallback(async () => {
    if (!session?.token || !session.userId) {
      setStats(null);
      setHistory([]);
      setError('Necesitás iniciar sesión para ver tus estadísticas.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [nextStats, bidHistory] = await Promise.all([
        getUserStats(session.userId, session.token),
        listUserBidHistory(session.userId, session.token),
      ]);

      const nextHistory = await enrichBidHistory(bidHistory.bids);

      setStats(nextStats);
      setHistory(nextHistory);
      
    } catch (loadError) {
      setStats(null);
      setHistory([]);
      setError(getApiErrorMessage(loadError, 'No pudimos cargar tus estadísticas.'));
    } finally {
      setIsLoading(false);
    }
  }, [session?.token, session?.userId]);

  useFocusEffect(
    useCallback(() => {
      void loadStats();
      console.log("mis estadisticas:",stats?.successRate);
    }, [loadStats])
  );

  const uniqueHistory = buildUniqueItemHistory(history);
  const categories = buildCategorySummary(uniqueHistory).slice(0, 5);
  const totalOffered = history.reduce((sum, item) => sum + item.amount, 0);
  const totalPaid = uniqueHistory.filter((item) => item.winner).reduce((sum, item) => sum + item.amount, 0);
  const averageBid = history.length > 0 ? totalOffered / history.length : 0;
  const activeBids = uniqueHistory.filter((item) => item.status === 'activo').length;
  const recentActivity = uniqueHistory.slice(0, 5);

  if (!session?.token || !session.userId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.authEmptyState}>
          <Text style={styles.authEmptyTitle}>Iniciá sesión para ver tus estadísticas</Text>
          <Text style={styles.authEmptyText}>Necesitamos tu cuenta activa para traer datos reales del backend.</Text>
          <TouchableOpacity style={styles.authEmptyButton} onPress={() => router.replace('/login')}>
            <Text style={styles.authEmptyButtonText}>Ir a login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Feather name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>Mis Estadísticas</Text>
            </View>

            <View style={styles.metricsCard}>
              <MetricPill label="ASISTIDAS" value={String(stats?.totalAuctionsParticipated ?? 0)} />
              <MetricPill label="GANADAS" value={String(stats?.auctionsWon ?? 0)} />
              <MetricPill label="ÉXITO" value={formatPercent(stats?.successRate ?? 0)} accent />
              <MetricPill label="ACTIVAS" value={String(activeBids)} />
            </View>
          </View>

          <View style={styles.financialCard}>
            <FinancialCell
              icon={<MaterialCommunityIcons name="gavel" size={16} color={C.orange} />}
              label="TOTAL OFERTADO"
              value={formatCurrency(totalOffered)}
            />
            <FinancialCell
              icon={<Feather name="dollar-sign" size={16} color={C.green} />}
              label="TOTAL PAGADO"
              value={formatCurrency(totalPaid)}
            />
            <FinancialCell
              icon={<Feather name="trending-up" size={16} color={C.blue} />}
              label="PUJA PROM."
              value={formatCurrency(averageBid)}
            />
          </View>

          {isLoading ? (
            <View style={styles.statusCard}>
              <ActivityIndicator color={C.brown} />
              <Text style={styles.statusText}>Cargando tus estadísticas reales...</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={18} color="#B45309" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>POR CATEGORÍA</Text>
            <View style={styles.sectionCard}>
              {categories.length > 0 ? (
                categories.map((item, index) => (
                  <View key={item.key}>
                    <CategoryRow item={item} />
                    {index < categories.length - 1 ? <View style={styles.divider} /> : null}
                  </View>
                ))
              ) : (
                <Text style={styles.emptySectionText}>Todavía no hay suficiente historial para agrupar por categoría.</Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACTIVIDAD RECIENTE</Text>
            <View style={styles.sectionCard}>
              {recentActivity.length > 0 ? (
                recentActivity.map((item, index) => (
                  <View key={`${item.bidId}-${item.lotCode}`}>
                    <ActivityRow item={item} />
                    {index < recentActivity.length - 1 ? <View style={styles.divider} /> : null}
                  </View>
                ))
              ) : (
                <Text style={styles.emptySectionText}>Aún no encontramos actividad reciente para mostrar.</Text>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.background,
  },
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    backgroundColor: C.brown,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 32,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 12,
  },
  headerTitleWrap: {
    alignItems: 'center',
    marginTop: -8,
    marginBottom: 18,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  metricsCard: {
    backgroundColor: C.brownSoft,
    borderRadius: 22,
    flexDirection: 'row',
    paddingVertical: 18,
    paddingHorizontal: 10,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 5,
  },
  metricPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  metricValueAccent: {
    color: C.orange,
  },
  metricLabel: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  financialCard: {
    marginTop: 18,
    marginHorizontal: 20,
    backgroundColor: C.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  financialCell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 18,
    borderRightWidth: 1,
    borderRightColor: C.border,
  },
  financialIcon: {
    marginBottom: 8,
  },
  financialValue: {
    color: C.textDark,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  financialLabel: {
    marginTop: 6,
    color: C.textLight,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.7,
    textAlign: 'center',
  },
  statusCard: {
    marginTop: 16,
    marginHorizontal: 20,
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 10,
  },
  statusText: {
    color: C.textMid,
    fontSize: 13,
  },
  errorCard: {
    marginTop: 16,
    marginHorizontal: 20,
    backgroundColor: '#FFF7ED',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FCD5A5',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    flex: 1,
    color: '#9A3412',
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    marginTop: 18,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: C.textMid,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 10,
  },
  sectionCard: {
    backgroundColor: C.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 12,
  },
  categoryCopy: {
    flex: 1,
  },
  categoryTitle: {
    color: C.textDark,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  categorySubtitle: {
    color: C.textLight,
    fontSize: 12,
  },
  categoryAmountBlock: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    color: C.brown,
    fontSize: 16,
    fontWeight: '800',
  },
  categoryAmountLabel: {
    marginTop: 4,
    color: C.textLight,
    fontSize: 11,
  },
  categoryRateBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F8FAFD',
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryRateText: {
    color: C.orange,
    fontSize: 15,
    fontWeight: '800',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 12,
  },
  activityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIconWon: {
    backgroundColor: C.greenSoft,
  },
  activityIconActive: {
    backgroundColor: C.orangeSoft,
  },
  activityIconDefault: {
    backgroundColor: C.slateSoft,
  },
  activityCopy: {
    flex: 1,
  },
  activityTitle: {
    color: C.textDark,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  activityDate: {
    color: C.textLight,
    fontSize: 12,
  },
  activityMeta: {
    alignItems: 'flex-end',
    gap: 8,
  },
  activityAmount: {
    color: C.textDark,
    fontSize: 15,
    fontWeight: '800',
  },
  activityBadge: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  activityBadgeWon: {
    backgroundColor: C.greenSoft,
  },
  activityBadgeActive: {
    backgroundColor: C.orangeSoft,
  },
  activityBadgeDefault: {
    backgroundColor: C.slateSoft,
  },
  activityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  activityBadgeTextWon: {
    color: C.green,
  },
  activityBadgeTextActive: {
    color: C.orange,
  },
  activityBadgeTextDefault: {
    color: C.slateText,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginLeft: 18,
  },
  emptySectionText: {
    color: C.textLight,
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  authEmptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 12,
  },
  authEmptyTitle: {
    color: C.textDark,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  authEmptyText: {
    color: C.textMid,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  authEmptyButton: {
    marginTop: 6,
    backgroundColor: C.brown,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  authEmptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
