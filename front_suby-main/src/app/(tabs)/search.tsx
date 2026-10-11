import { useAuth } from '@/context/auth-context';
import { useNotifications } from '@/context/notifications-context';
import { getApiErrorMessage, getAuctionDetail, listAuctions, searchCatalogLots, type SearchLotResult } from '@/lib/api';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const C = {
  background: '#F6F8FC',
  brown: '#653728',
  brownSoft: '#653728',
  white: '#FFFFFF',
  textDark: '#24324A',
  textMid: '#607494',
  textSoft: '#8FA1BD',
  border: '#E8EDF5',
  orange: '#FF7A1A',
  orangeSoft: '#FFF2E8',
  red: '#D92D20',
  redSoft: '#FFF1F3',
  green: '#0F9F4B',
  greenSoft: '#ECFDF3',
  slate: '#6B7C93',
  slateSoft: '#F3F6FA',
  blueSoft: '#EEF4FF',
};

const CATEGORIES = ['Todas', 'Arte', 'Joyería', 'Vehículos', 'Mobiliario'];

interface SearchLotCard {
  itemId: number;
  lotCode: string;
  title: string;
  auctionId?: number;
  auctionName: string;
  owner?: string;
  basePrice: number;
  currency?: string;
  auctionCategory: string; 
  status: 'en_subasta' | 'proximo' | 'vendido';
  image?: string;
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function formatCurrency(value: number, currency?: string) {
  console.log(currency)
  const normalizedCurrency = (currency ?? 'ARS').trim().toUpperCase();
  const symbol = normalizedCurrency === 'USD' ? 'US$' : normalizedCurrency === 'ARS' ? 'ARS $' : '$';

  return `${symbol} ${Math.round(value).toLocaleString('es-AR')}`;
}

function buildLotStatus(rawDate?: string, rawAuctioned?: string): SearchLotCard['status'] {
  if (rawAuctioned?.trim().toLowerCase() === 'si') {
    return 'vendido';
  }

  if (!rawDate) {
    return 'en_subasta';
  }

  const parsedDate = new Date(`${rawDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!Number.isNaN(parsedDate.getTime()) && parsedDate.getTime() > today.getTime()) {
    return 'proximo';
  }

  return 'en_subasta';
}

function StatusBadge({ status }: { status: SearchLotCard['status'] }) {
  const label =
    status === 'vendido' ? 'Vendido' : status === 'proximo' ? 'Próximo' : 'En Subasta';
  const containerStyle =
    status === 'vendido'
      ? styles.statusBadgeSold
      : status === 'proximo'
        ? styles.statusBadgeUpcoming
        : styles.statusBadgeLive;
  const textStyle =
    status === 'vendido'
      ? styles.statusBadgeTextSold
      : status === 'proximo'
        ? styles.statusBadgeTextUpcoming
        : styles.statusBadgeTextLive;

  return (
    <View style={[styles.statusBadge, containerStyle]}>
      <Text style={[styles.statusBadgeText, textStyle]}>{label}</Text>
    </View>
  );
}

function LotCard({ item, isLoggedIn }: { item: SearchLotCard; isLoggedIn: boolean }) {
  return (
    <TouchableOpacity
      style={styles.resultCard}
      activeOpacity={0.82}
      onPress={() =>
        router.push({
          pathname: '/lot/[id]',
          params: {
            id: String(item.itemId),
            auctionId: String(item.auctionId ?? 0),
          },
        })
      }
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.resultImage} />
      ) : (
        <View style={[styles.resultImage, styles.imagePlaceholder]}>
          <Feather name="image" size={20} color="#9FB0C8" />
          <Text style={styles.imagePlaceholderText}>Sin foto</Text>
        </View>
      )}

      <View style={styles.resultContent}>
        <View style={styles.resultTopRow}>
          <Text style={styles.resultLotCode}>{item.lotCode}</Text>
          <StatusBadge status={item.status} />
        </View>

        <Text style={styles.resultTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <Text style={styles.resultMeta} numberOfLines={1}>
          {item.owner ? `${item.owner} · ` : ''}
          {item.auctionName}
        </Text>

        <View style={styles.resultBottomRow}>
          <View>
            <Text style={styles.resultAmount}>
              {isLoggedIn ? formatCurrency(item.basePrice, item.currency) : 'Precio reservado'}
            </Text>
            {isLoggedIn ? (
              <Text style={styles.resultAmountHint}>precio base</Text>
            ) : null}
          </View>

          <View style={styles.resultThemeChip}>
            <Text style={styles.resultThemeChipText}>{item.auctionCategory || '—'}</Text>
          </View>
        </View>
      </View>

      <Feather name="chevron-right" size={18} color="#C5D0E0" />
    </TouchableOpacity>
  );
}

const PAGE_SIZE = 20;

function lotsFromAuctionDetail(auction: Awaited<ReturnType<typeof getAuctionDetail>>): SearchLotCard[] {
  return auction.catalog.items
    .map((item) => ({
      itemId: item.itemId,
      lotCode: item.lotCode,
      title: item.title,
      auctionId: auction.id,
      auctionName: auction.name,
      owner: item.owner,
      basePrice: item.basePrice ?? 0,
      currency: item.currency ?? auction.currency,
      auctionCategory: item.itemCategory ?? auction.category ?? '',
      status: buildLotStatus(auction.date, item.auctioned),
      image: item.thumbnailUrl,
    }))
    .filter((item) => item.status !== 'vendido');
}

function searchResultToCard(item: SearchLotResult, auctionName = 'Subasta'): SearchLotCard {
  return {
    itemId: item.itemId,
    lotCode: item.lotCode,
    title: item.title,
    auctionId: item.auctionId,
    auctionName,
    basePrice: 0,
    currency: undefined,
    auctionCategory: item.category ?? '',
    status: buildLotStatus(undefined, item.auctioned),
    image: undefined,
  };
}

export default function SearchScreen() {
  const { session } = useAuth();
  const isLoggedIn = Boolean(session?.token);
  const { unreadCount, refreshNotifications } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [allLots, setAllLots] = useState<SearchLotCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useFocusEffect(
    useCallback(() => {
      if (session?.token) {
        void refreshNotifications();
      }
      return undefined;
    }, [refreshNotifications, session?.token])
  );

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      setIsLoading(true);
      setError(null);
      try {
        console.log('[products] loading initial products');
        const { auctions } = await listAuctions({ perPage: 100 });
        if (!active) return;

        console.log('[products] auctions response', auctions);

        const allCards: SearchLotCard[] = [];
        for (let i = 0; i < auctions.length; i += 4) {
          if (!active) return;
          const batch = auctions.slice(i, i + 4);
          const details = await Promise.all(
            batch.map(async (a) => {
              console.log('[products] loading auction detail', a.id);
              try {
                const detail = await getAuctionDetail(a.id);
                console.log('[products] auction detail response', a.id, detail);
                return detail;
              } catch (detailErr) {
                console.error('[products] failed loading auction detail', a.id, detailErr);
                return null;
              }
            })
          );
          details.forEach((detail) => {
            if (detail) {
              allCards.push(...lotsFromAuctionDetail(detail));
            }
          });
          if (active) {
            setAllLots([...allCards]);
          }
        }

        console.log('[products] final allLots', allCards);
      } catch (err) {
        console.error('[products] loadInitial error', err);
        if (active) {
          setError(getApiErrorMessage(err, 'No pudimos cargar los lotes.'));
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadInitial();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const query = searchTerm.trim();
    if (query.length < 2) return;

    let active = true;
    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const raw = await searchCatalogLots(query);
        if (!active) return;
        setAllLots((prev) => {
          const seen = new Set(prev.map((l) => l.itemId));
          const fresh = raw
            .filter((r) => !seen.has(r.itemId))
            .map((r) => searchResultToCard(r));
          const visibleFresh = fresh.filter((item) => item.status !== 'vendido');
          return visibleFresh.length > 0 ? [...prev, ...visibleFresh] : prev;
        });
      } catch {
        
      } finally {
        if (active) setIsSearching(false);
      }
    }, 320);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  // ── Filtering (pure front-end) ────────────────────────────────────────────
  const filteredResults = allLots.filter((item) => {
    const matchesCategory =
      selectedCategory === 'Todas' ||
      normalizeText(item.auctionCategory).includes(normalizeText(selectedCategory));

    const query = searchTerm.trim();
    const matchesSearch =
      query.length < 2 ||
      normalizeText(item.title).includes(normalizeText(query)) ||
      normalizeText(item.lotCode).includes(normalizeText(query)) ||
      normalizeText(item.auctionName).includes(normalizeText(query)) ||
      (item.owner ? normalizeText(item.owner).includes(normalizeText(query)) : false);

    return matchesCategory && matchesSearch;
  });

  const paginatedResults = filteredResults.slice(0, visibleCount);
  const hasMore = visibleCount < filteredResults.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.headerTitle}>Piezas</Text>
                <Text style={styles.headerSubtitle}>Buscá lotes individuales de cualquier subasta</Text>
              </View>

              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.mailButton} onPress={() => router.push('/notifications')}>
                  <Feather name="mail" size={18} color="#FFFFFF" />
                  {unreadCount > 0 ? (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>

                {session?.membershipTier ? (
                  <View style={styles.tierBadge}>
                    <Feather name="star" size={12} color="#F8C44F" />
                    <Text style={styles.tierBadgeText}>{session.membershipTier.toUpperCase()}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.infoBanner}>
              <Feather name="search" size={14} color={C.orange} />
              <Text style={styles.infoBannerText}>
                Esta pestaña busca piezas/lotes. Para buscar sesiones completas usá `Subastas`.
              </Text>
            </View>

            <View style={styles.searchInputWrap}>
              <Feather name="search" size={18} color="#9CA9BB" />
              <TextInput
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Pieza, lote, dueño o subasta..."
                placeholderTextColor="#A7B4C6"
                style={styles.searchInput}
                autoCapitalize="none"
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    selectedCategory === category ? styles.categoryChipActive : styles.categoryChipInactive,
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === category
                        ? styles.categoryChipTextActive
                        : styles.categoryChipTextInactive,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.resultsSection}>
            <Text style={styles.resultsCount}>
              {isLoading
                ? 'CARGANDO LOTES...'
                : `${filteredResults.length} PIEZAS ENCONTRADAS`}
            </Text>

            {isLoading ? (
              <View style={styles.feedbackCard}>
                <ActivityIndicator color={C.brown} />
                <Text style={styles.feedbackText}>Cargando lotes disponibles...</Text>
              </View>
            ) : null}

            {!isLoading && error ? (
              <View style={styles.feedbackCard}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {!isLoading && !error && filteredResults.length === 0 ? (
              <View style={styles.feedbackCard}>
                <Text style={styles.feedbackText}>
                  {allLots.length === 0
                    ? 'No se encontraron lotes disponibles.'
                    : 'No hay piezas que coincidan con tu búsqueda o categoría.'}
                </Text>
              </View>
            ) : null}

            {isSearching && !isLoading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
                <ActivityIndicator size="small" color={C.brown} />
                <Text style={styles.feedbackText}>Buscando más resultados...</Text>
              </View>
            ) : null}

            {paginatedResults
              .filter((item) => item.status !== 'vendido')
              .map((item) => (
                <LotCard key={`${item.itemId}-${item.lotCode}`} item={item} isLoggedIn={isLoggedIn} />
              ))}

            {hasMore && !isLoading ? (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={() => setVisibleCount((c) => c + PAGE_SIZE)}
                activeOpacity={0.8}
              >
                <Text style={styles.loadMoreText}>
                  Ver más ({filteredResults.length - visibleCount} restantes)
                </Text>
              </TouchableOpacity>
            ) : null}
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
    paddingBottom: 26,
  },
  header: {
    backgroundColor: C.brown,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12,
  },
  headerTitle: {
    color: C.white,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 210,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mailButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF4D4F',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationText: {
    color: C.white,
    fontSize: 9,
    fontWeight: '800',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  tierBadgeText: {
    color: C.white,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  infoBanner: {
    backgroundColor: C.orangeSoft,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoBannerText: {
    flex: 1,
    color: '#8A4C13',
    fontSize: 12,
    lineHeight: 17,
  },
  searchInputWrap: {
    backgroundColor: C.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: C.textDark,
    fontSize: 14,
  },
  categoryRow: {
    paddingTop: 12,
    gap: 8,
  },
  categoryChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  categoryChipActive: {
    backgroundColor: C.white,
  },
  categoryChipInactive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoryChipTextActive: {
    color: C.brown,
  },
  categoryChipTextInactive: {
    color: C.white,
  },
  resultsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  resultsCount: {
    color: C.textSoft,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.9,
    paddingHorizontal: 4,
  },
  feedbackCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 10,
  },
  feedbackText: {
    color: C.textMid,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  errorText: {
    color: C.red,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  resultCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultImage: {
    width: 88,
    height: 88,
    borderRadius: 14,
    backgroundColor: C.slateSoft,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  imagePlaceholderText: {
    color: C.textSoft,
    fontSize: 11,
    fontWeight: '700',
  },
  resultContent: {
    flex: 1,
  },
  resultTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  resultLotCode: {
    color: C.textSoft,
    fontSize: 11,
    fontWeight: '800',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeLive: {
    backgroundColor: C.redSoft,
  },
  statusBadgeUpcoming: {
    backgroundColor: C.blueSoft,
  },
  statusBadgeSold: {
    backgroundColor: C.greenSoft,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadgeTextLive: {
    color: C.red,
  },
  statusBadgeTextUpcoming: {
    color: '#355BB7',
  },
  statusBadgeTextSold: {
    color: C.green,
  },
  resultTitle: {
    color: C.textDark,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    marginBottom: 6,
  },
  resultMeta: {
    color: C.textMid,
    fontSize: 11,
    marginBottom: 8,
  },
  resultBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  resultAmount: {
    color: C.brown,
    fontSize: 17,
    fontWeight: '800',
  },
  resultAmountHint: {
    color: C.textSoft,
    fontSize: 10,
    marginTop: 2,
  },
  resultThemeChip: {
    backgroundColor: C.slateSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resultThemeChipText: {
    color: C.slate,
    fontSize: 10,
    fontWeight: '700',
  },
  loadMoreBtn: {
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  loadMoreText: {
    color: C.brown,
    fontSize: 13,
    fontWeight: '700',
  },
});
