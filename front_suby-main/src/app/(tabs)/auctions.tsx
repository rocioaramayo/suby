import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/auth-context';
import { useNotifications } from '@/context/notifications-context';
import { getApiErrorMessage, listAuctions, normalizeAuctionStatus, type AuctionListItem } from '@/lib/api';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
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
  white: '#FFFFFF',
  textDark: '#24324A',
  textMid: '#607494',
  textSoft: '#8FA1BD',
  border: '#E8EDF5',
  orange: '#FF7A1A',
  orangeSoft: '#FFF2E8',
  green: '#0F9F4B',
  greenSoft: '#ECFDF3',
  red: '#D92D20',
  redSoft: '#FFF1F3',
  slateSoft: '#F3F6FA',
};

const CATEGORIES = ['Todas', 'Arte', 'Joyería', 'Vehículos', 'Mobiliario'];

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function inferThemeCategory(...values: string[]) {
  const haystack = normalizeText(values.join(' '));

  if (haystack.includes('joy') || haystack.includes('oro') || haystack.includes('reloj')) {
    return 'Joyería';
  }

  if (haystack.includes('veh') || haystack.includes('auto') || haystack.includes('moto')) {
    return 'Vehículos';
  }

  if (
    haystack.includes('mobili') ||
    haystack.includes('antig') ||
    haystack.includes('sillon') ||
    haystack.includes('mesa')
  ) {
    return 'Mobiliario';
  }

  return 'Arte';
}

function AuctionImage({
  imageUri,
  style,
}: {
  imageUri?: string;
  style: object;
}) {
  if (imageUri) {
    return <Image source={{ uri: imageUri }} style={style} />;
  }

  return (
    <View style={[style, styles.imagePlaceholder]}>
      <Feather name="image" size={22} color={C.textSoft} />
      <Text style={styles.imagePlaceholderText}>Sin foto</Text>
    </View>
  );
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

function matchesSearch(auction: AuctionListItem, searchTerm: string) {
  const term = normalizeText(searchTerm);
  if (!term) {
    return true;
  }

  return (
    normalizeText(auction.name).includes(term) ||
    normalizeText(auction.auctioneer ?? '').includes(term) ||
    normalizeText(auction.category).includes(term)
  );
}

function LiveAuctionCard({
  auction,
  themeCategory,
}: {
  auction: AuctionListItem;
  themeCategory: string;
}) {
  return (
    <TouchableOpacity
      style={styles.liveCard}
      activeOpacity={0.84}
      onPress={() => router.push(`/auction/${auction.id}`)}
    >
      <View style={styles.liveImageWrap}>
        <AuctionImage imageUri={auction.thumbnailUrl} style={styles.liveImage} />
        <View style={styles.liveOverlay} />

        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveBadgeText}>LIVE</Text>
        </View>

        <View style={styles.accessBadge}>
          <Text style={styles.accessBadgeText}>{auction.category.toUpperCase()}</Text>
        </View>

        <View style={styles.liveCopy}>
          <Text style={styles.liveCategory}>{themeCategory}</Text>
          <Text style={styles.liveTitle} numberOfLines={2}>
            {auction.name}
          </Text>
          <Text style={styles.liveMeta} numberOfLines={1}>
            {auction.auctioneer || 'Rematador'} · {auction.totalLots} lotes
          </Text>
          <Text style={styles.liveStats}>
            {auction.activeLots} lotes activos · termina {auction.endTime ?? 'hoy'}
          </Text>
        </View>
      </View>

      <View style={styles.liveFooter}>
        <View style={styles.footerItem}>
          <Feather name="activity" size={14} color={C.orange} />
          <Text style={styles.footerText}>{auction.activeLots} en subasta</Text>
        </View>
        <View style={styles.footerItem}>
          <Feather name="calendar" size={14} color={C.orange} />
          <Text style={styles.footerText}>{formatDateLabel(auction.date)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.catalogButton}
        activeOpacity={0.84}
        onPress={() => router.push(`/auction/${auction.id}`)}
      >
        <View style={styles.catalogButtonCopy}>
          <Feather name="book-open" size={14} color={C.brown} />
          <Text style={styles.catalogButtonText}>Ver catálogo</Text>
          <Text style={styles.catalogButtonHint}>· {auction.totalLots} lotes</Text>
        </View>
        <Feather name="arrow-right" size={14} color={C.brown} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function UpcomingAuctionCard({
  auction,
  themeCategory,
}: {
  auction: AuctionListItem;
  themeCategory: string;
}) {
  return (
    <TouchableOpacity
      style={styles.upcomingCard}
      activeOpacity={0.84}
      onPress={() => router.push(`/auction/${auction.id}`)}
    >
      <AuctionImage imageUri={auction.thumbnailUrl} style={styles.upcomingImage} />

      <View style={styles.upcomingCopy}>
        <View style={styles.upcomingTopRow}>
          <Text style={styles.upcomingTier}>{auction.category.toUpperCase()}</Text>
          <Text style={styles.upcomingDate}>{auction.date}</Text>
        </View>

        <Text style={styles.upcomingTitle} numberOfLines={2}>
          {auction.name}
        </Text>

        <Text style={styles.upcomingMeta} numberOfLines={1}>
          {auction.auctioneer || 'Rematador'} · {auction.totalLots} lotes
        </Text>

        <Text style={styles.upcomingHint}>{themeCategory} · {auction.activeLots} disponibles</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function AuctionsScreen() {
  const { session } = useAuth();
  const { unreadCount, refreshNotifications } = useNotifications();
  const [auctions, setAuctions] = useState<AuctionListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAuctions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await listAuctions({ perPage: 50 });
      setAuctions(response.auctions);
    } catch (loadError) {
      setAuctions([]);
      setError(getApiErrorMessage(loadError, 'No pudimos cargar las subastas.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAuctions();

      if (session?.token) {
        void refreshNotifications();
      }
    }, [loadAuctions, refreshNotifications, session?.token])
  );

  const visibleAuctions = auctions
    .filter((auction) => normalizeAuctionStatus(auction.status) !== 'finalizada')
    .filter((auction) => matchesSearch(auction, searchTerm))
    .filter((auction) => {
      const themeCategory = inferThemeCategory(auction.name, auction.auctioneer ?? '');
      return selectedCategory === 'Todas' || themeCategory === selectedCategory;
    });

  const liveAuctions = visibleAuctions.filter((auction) => normalizeAuctionStatus(auction.status) === 'en_vivo');
  const upcomingAuctions = visibleAuctions.filter((auction) => normalizeAuctionStatus(auction.status) === 'proxima');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.headerTitleWrap}>
                <Feather name="list" size={24} color="#FFFFFF" />
                <View>
                  <Text style={styles.headerTitle}>Subastas</Text>
                  <Text style={styles.headerSubtitle}>Buscá sesiones completas por nombre o rematador</Text>
                </View>
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
              <Feather name="info" size={14} color={C.orange} />
              <Text style={styles.infoBannerText}>
                Esta pestaña busca subastas completas. Para piezas o lotes puntuales usá `Piezas`.
              </Text>
            </View>

            <View style={styles.searchInputWrap}>
              <Feather name="search" size={18} color="#9CA9BB" />
              <TextInput
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Nombre de subasta o rematador..."
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

          <View style={styles.body}>
            {isLoading ? (
              <View style={styles.feedbackCard}>
                <ActivityIndicator color={C.brown} />
                <Text style={styles.feedbackText}>Cargando subastas disponibles...</Text>
              </View>
            ) : null}

            {!isLoading && error ? (
              <View style={styles.feedbackCard}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {!isLoading && !error && visibleAuctions.length === 0 ? (
              <View style={styles.feedbackCard}>
                <Text style={styles.feedbackText}>No encontramos subastas con ese nombre, rematador o categoría.</Text>
              </View>
            ) : null}

            {!isLoading && !error && liveAuctions.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>EN VIVO AHORA</Text>
                </View>

                {liveAuctions.map((auction) => (
                  <LiveAuctionCard
                    key={auction.id}
                    auction={auction}
                    themeCategory={inferThemeCategory(auction.name, auction.auctioneer ?? '')}
                  />
                ))}
              </View>
            ) : null}

            {!isLoading && !error && upcomingAuctions.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Feather name="clock" size={14} color={C.textMid} />
                  <Text style={styles.sectionTitle}>PRÓXIMAS SUBASTAS</Text>
                </View>

                {upcomingAuctions.map((auction) => (
                  <UpcomingAuctionCard
                    key={auction.id}
                    auction={auction}
                    themeCategory={inferThemeCategory(auction.name, auction.auctioneer ?? '')}
                  />
                ))}
              </View>
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
    paddingBottom: 24,
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
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
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
    maxWidth: 220,
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
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 18,
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
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.red,
  },
  sectionTitle: {
    color: C.textDark,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  liveCard: {
    backgroundColor: C.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  liveImageWrap: {
    height: 204,
    position: 'relative',
  },
  liveImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    backgroundColor: C.slateSoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  imagePlaceholderText: {
    color: C.textSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  liveOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(39, 24, 17, 0.44)',
  },
  liveBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.white,
  },
  liveBadgeText: {
    color: C.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  accessBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  accessBadgeText: {
    color: C.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  liveCopy: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  liveCategory: {
    color: '#FFD2B2',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  liveTitle: {
    color: C.white,
    fontSize: 21,
    fontWeight: '800',
    lineHeight: 26,
    marginBottom: 6,
  },
  liveMeta: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 12,
    marginBottom: 4,
  },
  liveStats: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 12,
  },
  liveFooter: {
    backgroundColor: C.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    color: C.textMid,
    fontSize: 12,
    fontWeight: '600',
  },
  catalogButton: {
    backgroundColor: '#FFFDFB',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catalogButtonCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  catalogButtonText: {
    color: C.brown,
    fontSize: 14,
    fontWeight: '800',
  },
  catalogButtonHint: {
    color: C.textSoft,
    fontSize: 12,
  },
  upcomingCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 10,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  upcomingImage: {
    width: 86,
    height: 86,
    borderRadius: 14,
    backgroundColor: C.slateSoft,
  },
  upcomingCopy: {
    flex: 1,
  },
  upcomingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  upcomingTier: {
    color: C.brown,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  upcomingDate: {
    color: C.textSoft,
    fontSize: 10,
    fontWeight: '700',
  },
  upcomingTitle: {
    color: C.textDark,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    marginBottom: 6,
  },
  upcomingMeta: {
    color: C.textMid,
    fontSize: 11,
    marginBottom: 4,
  },
  upcomingHint: {
    color: C.textSoft,
    fontSize: 11,
  },
});
