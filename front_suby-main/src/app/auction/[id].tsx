import { useAuth } from '@/context/auth-context';
import { getApiErrorMessage, getAuctionDetail, type AuctionDetailResponse } from '@/lib/api';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  bg: '#F6F8FC',
  brown: '#653728',
  brownSoft: '#653728',
  brownDeep: '#39231B',
  orange: '#FF7A1A',
  orangeSoft: '#FFF2E8',
  white: '#FFFFFF',
  textDark: '#24324A',
  textMid: '#607494',
  textSoft: '#8FA1BD',
  border: '#E8EDF5',
  green: '#0F9F4B',
  greenSoft: '#ECFDF3',
  red: '#D92D20',
  redSoft: '#FFF1F3',
  slateSoft: '#F3F6FA',
};

function formatCurrency(value?: number | null, currency?: string) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--';
  }

  const normalizedCurrency = (currency ?? 'ARS').trim().toUpperCase();
  const symbol = normalizedCurrency === 'USD' ? 'US$' : normalizedCurrency === 'ARS' ? 'ARS $' : '$';

  return `${symbol} ${Math.round(value).toLocaleString('es-AR')}`;
}

function normalizeCategory(category?: string) {
  return (category ?? 'general').trim().toUpperCase();
}

function parseAuctionStart(date?: string, hour?: string) {
  if (!date || !hour) {
    return null;
  }

  const parsed = new Date(`${date}T${hour}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatRemaining(target: Date | null, nowMs: number) {
  if (!target) {
    return null;
  }

  const diff = target.getTime() - nowMs;
  if (diff <= 0) {
    return '00:00:00';
  }

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function AuctionCard({
  auctionId,
  item,
  status,
  featured = false,
  hidePrice = false,
}: {
  auctionId: number;
  item: AuctionDetailResponse['catalog']['items'][number];
  status?: string;
  featured?: boolean;
  hidePrice?: boolean;
}) {
  const isLive = status === 'en_vivo' && featured;
  const ownerLabel = item.owner ?? 'Sin propietario informado';
  const attribution = item.attribution?.trim() || 'Catalogo real del backend';
  const featuredPrice = formatCurrency(item.basePrice, item.currency);

  return (
    <TouchableOpacity
      style={[styles.lotCard, featured && styles.lotCardFeatured]}
      activeOpacity={0.84}
      onPress={() =>
        router.push({
          pathname: '/lot/[id]',
          params: { id: String(item.itemId), auctionId: String(auctionId) },
        })
      }
    >
      <View style={styles.lotImageWrap}>
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={styles.lotImage} resizeMode="cover" />
        ) : (
          <View style={[styles.lotImage, styles.imagePlaceholder]}>
            <Feather name="image" size={22} color={C.textSoft} />
            <Text style={styles.imagePlaceholderText}>Sin foto</Text>
          </View>
        )}
        {isLive ? (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.lotCopy}>
        <View style={styles.lotTopRow}>
          <Text style={styles.lotCode}>{item.lotCode}</Text>
          <Text style={styles.lotPrice}>{hidePrice ? 'Precio reservado' : featuredPrice}</Text>
        </View>

        <Text style={styles.lotTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <Text style={styles.lotAttribution} numberOfLines={1}>
          {attribution}
        </Text>

        <Text style={styles.lotOwner} numberOfLines={1}>
          {ownerLabel}
        </Text>

        <View style={styles.lotFooter}>
          <View style={styles.basePriceWrap}>
            <Text style={styles.basePriceLabel}>base</Text>
            <Text style={styles.basePriceValue}>{hidePrice ? '--' : featuredPrice}</Text>
          </View>
          <Feather name="chevron-right" size={18} color="#B8C2D4" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function AuctionDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const auctionId = Number(params.id);
  const { session } = useAuth();
  const [auction, setAuction] = useState<AuctionDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const loadAuction = useCallback(async () => {
    if (!Number.isFinite(auctionId) || auctionId <= 0) {
      setAuction(null);
      setError('No encontramos la subasta.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const nextAuction = await getAuctionDetail(auctionId);
      setAuction(nextAuction);
    } catch (loadError) {
      setAuction(null);
      setError(getApiErrorMessage(loadError, 'No pudimos cargar la subasta.'));
    } finally {
      setIsLoading(false);
    }
  }, [auctionId]);

  useFocusEffect(
    useCallback(() => {
      void loadAuction();
    }, [loadAuction])
  );

  useEffect(() => {
    if (!auction || auction.status !== 'proxima') {
      return;
    }

    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [auction]);

  useEffect(() => {
    const startsAt = parseAuctionStart(auction?.date, auction?.hour);
    if (!auction || auction.status !== 'proxima' || !startsAt || startsAt.getTime() > nowMs) {
      return;
    }

    void loadAuction();
  }, [auction, loadAuction, nowMs]);

  const statusLabel = useMemo(() => {
    if (!auction) {
      return '--';
    }

    if (auction.status === 'en_vivo') {
      return 'LIVE';
    }

    if (auction.status === 'proxima') {
      return 'PRÓXIMA';
    }

    return 'FINALIZADA';
  }, [auction]);

  const countdownLabel = useMemo(
    () => formatRemaining(parseAuctionStart(auction?.date, auction?.hour), nowMs),
    [auction?.date, auction?.hour, nowMs]
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator color={C.brown} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !auction) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Feather name="alert-triangle" size={26} color={C.red} />
          <Text style={styles.errorTitle}>No pudimos abrir la subasta</Text>
          <Text style={styles.errorText}>{error ?? 'Volvé a intentar en unos segundos.'}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const items = auction.catalog.items ?? [];
  const isGuest = !session?.token;
  const auctioneerName = auction.auctioneer?.name ?? 'Dr. Roberto Sánchez';
  const locationLabel = auction.location ?? 'Online';
  const closingLabel = auction.endTime ?? '--:--:--';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Feather name="arrow-left" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerCopy}>
              <Text style={styles.categoryText}>{normalizeCategory(auction.category)}</Text>
              <Text style={styles.title} numberOfLines={2}>
                {auction.name}
              </Text>

              <View style={styles.headerPillsRow}>
                <View style={styles.statusChip}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusChipText}>
                    {statusLabel === 'LIVE' ? 'En vivo' : statusLabel === 'PRÓXIMA' ? 'Próxima' : 'Finalizada'}
                  </Text>
                </View>
                <View style={styles.goldChip}>
                  <Text style={styles.goldChipText}>ORO</Text>
                </View>
                <View style={styles.dateChip}>
                  <Feather name="calendar" size={12} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.dateChipText}>{auction.date}</Text>
                </View>
              </View>

              <Text style={styles.subtitle}>{auctioneerName}</Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryValue}>{items.length}</Text>
              <Text style={styles.summaryLabel}>LOTES</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryValue} numberOfLines={1}>
                {locationLabel}
              </Text>
              <Text style={styles.summaryLabel}>UBICACIÓN</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryValue}>{closingLabel}</Text>
              <Text style={styles.summaryLabel}>CIERRE</Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Feather name="book-open" size={16} color={C.textMid} />
              <Text style={styles.sectionTitle}>CATÁLOGO DE LOTES</Text>
            </View>

            <View style={styles.catalogList}>
              {items.length > 0 ? (
                items.map((item, index) => (
                  <AuctionCard
                    key={item.itemId}
                    auctionId={auction.id}
                    item={item}
                    status={auction.status}
                    featured={index === 0}
                    hidePrice={isGuest}
                  />
                ))
              ) : (
                <Text style={styles.emptyText}>El catálogo todavía no tiene lotes cargados.</Text>
              )}
            </View>
          </View>

          {auction.status === 'proxima' ? (
            <View style={styles.upcomingNotice}>
              <Feather name="clock" size={16} color={C.orange} />
              <Text style={styles.upcomingNoticeTitle}>La subasta todavía no comenzó</Text>
              <Text style={styles.upcomingNoticeText}>
                {countdownLabel ? `Comienza en ${countdownLabel}.` : 'La sala se habilitará cuando llegue la fecha y hora configuradas.'}
              </Text>
            </View>
          ) : null}

          <View style={styles.bottomActionWrap}>
            {auction.status === 'finalizada' ? null : (
              <TouchableOpacity
                style={[styles.bottomActionButton, auction.status === 'proxima' && styles.bottomActionButtonDisabled]}
                activeOpacity={0.88}
                disabled={auction.status === 'proxima'}
                onPress={() => {
                  const targetItem = items[0];
                  if (!targetItem) {
                    return;
                  }

                  router.push({
                    pathname: '/lot/[id]/room',
                    params: { id: String(targetItem.itemId), auctionId: String(auction.id) },
                  });
                }}
              >
                <MaterialCommunityIcons name="gavel" size={20} color="#FFFFFF" />
                <Text style={styles.bottomActionText}>ENTRAR A LA SALA DE PUJA</Text>
                <Feather name="chevron-right" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingBottom: 28 },
  header: {
    backgroundColor: C.brown,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    marginTop: 14,
    gap: 8,
    alignItems: 'center',
  },
  categoryText: {
    color: '#D7D0C8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  title: {
    color: C.white,
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 31,
    textAlign: 'center',
  },
  headerPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,245,245,0.95)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5C5C',
  },
  statusChipText: {
    color: '#D92D20',
    fontSize: 12,
    fontWeight: '800',
  },
  goldChip: {
    backgroundColor: '#FFF7E1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  goldChipText: {
    color: '#A56B00',
    fontSize: 12,
    fontWeight: '800',
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  dateChipText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    textAlign: 'center',
  },
  summaryCard: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
    shadowColor: '#8A95AA',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  summaryBlock: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: C.border,
  },
  summaryValue: {
    color: C.brown,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  summaryLabel: {
    marginTop: 4,
    color: C.textSoft,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  section: {
    marginTop: 18,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#334760',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  catalogList: {
    paddingHorizontal: 16,
    gap: 14,
  },
  bottomActionWrap: {
    marginTop: 18,
    paddingHorizontal: 16,
  },
  upcomingNotice: {
    marginTop: 18,
    marginHorizontal: 16,
    backgroundColor: C.orangeSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FFD5B0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  upcomingNoticeTitle: {
    color: C.brown,
    fontSize: 15,
    fontWeight: '800',
  },
  upcomingNoticeText: {
    color: C.textMid,
    fontSize: 13,
    lineHeight: 19,
  },
  bottomActionButton: {
    backgroundColor: C.brown,
    borderRadius: 18,
    minHeight: 66,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#563022',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  bottomActionButtonDisabled: {
    opacity: 0.55,
  },
  bottomActionText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  lotCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.white,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#8A95AA',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  lotCardFeatured: {
    borderColor: '#FFB47B',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 3,
  },
  lotImageWrap: {
    width: 138,
    height: 132,
    flexShrink: 0,
    position: 'relative',
    backgroundColor: '#EDF2F7',
  },
  lotImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EDF2F7',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  imagePlaceholderText: {
    color: C.textSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  liveBadge: {
    position: 'absolute',
    left: 10,
    top: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.48)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6A6A',
  },
  liveBadgeText: {
    color: C.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  lotCopy: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'flex-start',
    gap: 4,
    alignSelf: 'stretch',
  },
  lotTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  lotCode: {
    color: '#A9B7D1',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  lotPrice: {
    color: C.brown,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'right',
  },
  lotTitle: {
    color: '#24324A',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
    marginTop: 2,
  },
  lotAttribution: {
    color: C.orange,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  lotOwner: {
    color: C.textSoft,
    fontSize: 11,
    marginTop: 0,
  },
  lotFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  basePriceWrap: {
    flex: 1,
  },
  basePriceLabel: {
    color: C.textSoft,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  basePriceValue: {
    color: C.brown,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  errorTitle: {
    color: C.textDark,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorText: {
    color: C.textMid,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: C.brown,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: C.white,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyText: {
    color: C.textMid,
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 18,
  },
});
