import { useAuth } from '@/context/auth-context';
import { listOwnerProducts, OwnerProductItem } from '@/lib/api';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
  border: '#E3EAF3',
  green: '#16A34A',
  greenSoft: '#ECFDF3',
  amber: '#D97706',
  amberSoft: '#FFF8E6',
  red: '#FF4D4F',
  redSoft: '#FFF1F2',
  blueSoft: '#EEF5FF',
};

type FilterKey = 'all' | 'accepted' | 'review' | 'rejected';

function formatMoney(value?: number, currency?: string) {
  if (typeof value !== 'number' || Number.isNaN(value)) { return 'Sin estimación'; }
  const normalizedCurrency = (currency ?? 'ARS').trim().toUpperCase();
  const symbol = normalizedCurrency === 'USD' ? 'US$' : normalizedCurrency === 'ARS' ? 'ARS $' : '$ ';
  return `${symbol} ${value.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
}

function formatDate(value?: string) {
  if (!value) {
    return 'Sin fecha';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function normalizeStatus(status?: string): FilterKey {
  switch ((status ?? '').toLowerCase()) {
    case 'aceptado':
      return 'accepted';
    case 'rechazado':
      return 'rejected';
    case 'en_revision':
    case 'en_inspeccion':
    case 'pendiente':
    default:
      return 'review';
  }
}

function getStatusPresentation(item: OwnerProductItem) {
  const status = normalizeStatus(item.inspectionStatus);

  if (status === 'accepted') {
    return {
      label: item.deposit?.name ? `Aceptado · ${item.deposit.name}` : 'Aceptado',
      icon: 'check-circle' as const,
      iconColor: C.green,
      iconBg: C.greenSoft,
      badgeBg: '#ECFDF3',
      badgeColor: C.green,
    };
  }

  if (status === 'rejected') {
    return {
      label: 'Rechazado',
      icon: 'x-circle' as const,
      iconColor: C.red,
      iconBg: C.redSoft,
      badgeBg: '#FFF1F2',
      badgeColor: C.red,
    };
  }

  return {
    label: 'En revisión',
    icon: 'clock' as const,
    iconColor: C.amber,
    iconBg: C.amberSoft,
    badgeBg: '#FFF8E6',
    badgeColor: C.amber,
  };
}

function FilterPill({
  label,
  count,
  active,
  onPress,
  backgroundColor,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
  backgroundColor: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.filterPill, { backgroundColor: active ? backgroundColor : 'rgba(255,255,255,.14)' }]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <Text style={styles.filterCount}>{count}</Text>
      <Text style={styles.filterLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function OwnerProductsScreen() {
  const { session } = useAuth();
  const [products, setProducts] = useState<OwnerProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function load() {
        if (!session?.userId || !session.token) {
          if (isActive) {
            setProducts([]);
            setIsLoading(false);
          }
          return;
        }

        try {
          if (isActive) {
            setIsLoading(true);
            setError(null);
          }
          const response = await listOwnerProducts(session.userId, session.token);

          if (isActive) {
            setProducts(response.products);
          }
        } catch (loadError) {
          if (isActive) {
            setError(loadError instanceof Error ? loadError.message : 'No pudimos cargar tus artículos.');
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

  const counts = useMemo(() => {
    const accepted = products.filter((item) => normalizeStatus(item.inspectionStatus) === 'accepted').length;
    const review = products.filter((item) => normalizeStatus(item.inspectionStatus) === 'review').length;
    const rejected = products.filter((item) => normalizeStatus(item.inspectionStatus) === 'rejected').length;
    return { accepted, review, rejected };
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (activeFilter === 'all') {
      return products;
    }

    return products.filter((item) => normalizeStatus(item.inspectionStatus) === activeFilter);
  }, [activeFilter, products]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.85} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Artículos en Depósito</Text>
          <Text style={styles.headerSubtitle}>{products.length} artículos enviados</Text>

          <View style={styles.filtersRow}>
            <FilterPill label="Aceptados" count={counts.accepted} active={activeFilter === 'accepted'} onPress={() => setActiveFilter('accepted')} backgroundColor="rgba(34,197,94,.34)" />
            <FilterPill label="En revisión" count={counts.review} active={activeFilter === 'review'} onPress={() => setActiveFilter('review')} backgroundColor="rgba(217,119,6,.34)" />
            <FilterPill label="Rechazados" count={counts.rejected} active={activeFilter === 'rejected'} onPress={() => setActiveFilter('rejected')} backgroundColor="rgba(255,77,79,.34)" />
          </View>
        </View>

        <View style={styles.infoBanner}>
          <Feather name="info" size={16} color="#3B82F6" />
          <Text style={styles.infoText}>
            Los artículos en inspección pueden demorar hasta 5 días hábiles en ser evaluados.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={C.brown} />
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>No pudimos cargar tus artículos</Text>
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>No hay artículos para este filtro</Text>
            <Text style={styles.emptyText}>Cuando envíes nuevos bienes, los vas a ver acá.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredProducts.map((item) => {
              const presentation = getStatusPresentation(item);
              return (
                <View key={item.productId} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={[styles.iconWrap, { backgroundColor: presentation.iconBg }]}>
                      <Feather name={presentation.icon} size={22} color={presentation.iconColor} />
                    </View>

                    <View style={styles.cardCopy}>
                      <Text style={styles.cardTitle}>{item.name}</Text>
                      <Text style={styles.cardMeta}>
                        {item.category.charAt(0).toUpperCase() + item.category.slice(1)} · {formatDate(item.dateRegistered)}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: presentation.badgeBg }]}>
                        <Text style={[styles.statusBadgeText, { color: presentation.badgeColor }]}>{presentation.label}</Text>
                      </View>
                    </View>

                    {item.thumbnailUrl ? <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} /> : null}
                  </View>

                  <View style={styles.divider} />

                  {item.insurancePolicy ? (
                    <View style={styles.detailRow}>
                      <Feather name="file-text" size={14} color={C.muted} />
                      <Text style={[styles.detailText, { flexShrink: 1 }]}>{item.insurancePolicy}</Text>
                      {item.insurancePhone ? (
                        <View style={styles.phoneChip}>
                          <Feather name="phone" size={12} color={C.muted} />
                          <Text style={styles.phoneChipText}>{item.insurancePhone}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {item.deposit?.address ? (
                    <View style={styles.detailRow}>
                      <Feather name="map-pin" size={14} color={C.muted} />
                      <Text style={styles.detailText}>{item.deposit.address}</Text>
                    </View>
                  ) : null}

                  <Text style={styles.estimateText}>Valor estimado: {formatMoney(item.estimatedValue)}</Text>
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9} onPress={() => router.push('/upload_goods')}>
          <Feather name="package" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>Enviar nuevo artículo</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 32 },
  header: {
    backgroundColor: C.brown,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '800' },
  headerSubtitle: { color: 'rgba(255,255,255,.8)', fontSize: 14, marginTop: 4 },
  filtersRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  filterPill: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  filterCount: { color: '#fff', fontSize: 18, fontWeight: '800' },
  filterLabel: { color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  infoBanner: {
    marginHorizontal: 20,
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: C.blueSoft,
    borderWidth: 1,
    borderColor: '#D9E9FF',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, color: '#315276', lineHeight: 20, fontSize: 14 },
  centerState: { paddingHorizontal: 20, paddingTop: 32, alignItems: 'center' },
  emptyTitle: { color: C.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyText: { color: C.muted, fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: 'center' },
  list: { paddingHorizontal: 20, paddingTop: 16, gap: 14 },
  card: {
    backgroundColor: C.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  cardTop: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: { flex: 1, gap: 4 },
  cardTitle: { color: C.text, fontSize: 20, fontWeight: '800' },
  cardMeta: { color: C.muted, fontSize: 14 },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginTop: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  thumbnail: { width: 72, height: 72, borderRadius: 16 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 14 },
  detailRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  detailText: { color: '#66758F', fontSize: 14, flex: 1 },
  estimateText: { color: '#66758F', fontSize: 14, marginTop: 4 },
  primaryButton: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: C.brown,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  phoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF5FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  phoneChipText: {
    color: '#66758F',
    fontSize: 12,
  },
});
