import { useAuth } from '@/context/auth-context';
import { useNotifications } from '@/context/notifications-context';
import {
  getApiErrorMessage,
  getHomeDashboard,
  getUserProfile,
  getUserStats,
  HomeAuction,
  HomeDashboard,
  type UserProfileResponse,
  type UserStatsResponse,
} from '@/lib/api';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { FineData, FinePaymentMethod } from '../../lib/api';
import { getFinePaymentMethods, getPendingFine } from '../../lib/api';
import { FinePaymentModal } from './Fines';



function formatCurrency(value: number, hidden = false, currency?: string) {
  if (hidden) {
    return 'Precio reservado';
  }
  const normalizedCurrency = (currency ?? 'ARS').trim().toUpperCase();
  const symbol = normalizedCurrency === 'USD' ? 'US$' : normalizedCurrency === 'ARS' ? 'ARS $' : '$';
  return `${symbol} ${value.toLocaleString('es-AR')}`;
}
 
function toTitleCase(value: string) {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
 
function getFallbackDisplayName(email: string) {
  const localPart = email.split('@')[0] ?? 'usuario';
  return toTitleCase(localPart.replace(/[._-]+/g, ' '));
}
 
function getInitials(name: string) {
  const parts = name.split(' ').filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}
 
function formatAuctionMeta(item: HomeAuction) {
  if (item.time) {
    return item.time;
  }
 
  if (item.date) {
    return item.date;
  }
 
  return item.status ? toTitleCase(item.status) : 'Disponible';
}

export default function HomeScreen() {
  const { session } = useAuth();
  const { unreadCount, refreshNotifications } = useNotifications();
  const isLoggedIn = Boolean(session?.token);
  
  const [homeData, setHomeData] = useState<HomeDashboard | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(null);
  const [userStats, setUserStats] = useState<UserStatsResponse | null>(null);
  const [isLoadingHome, setIsLoadingHome] = useState(false);
  const [homeError, setHomeError] = useState<string | null>(null);
  
  const [pendingFine, setPendingFine] = useState<FineData | null>(null);
  const [finePaymentMethods, setFinePaymentMethods] = useState<FinePaymentMethod[]>([]);
  const [showFineModal, setShowFineModal] = useState(false);
  
  useEffect(() => {
    if (isLoggedIn) {
      void refreshNotifications();
    }
  }, [isLoggedIn, refreshNotifications]);
 
  useEffect(() => {
    const token = session?.token ?? '';
 
    let isMounted = true;
 
    async function loadHome() {
      try {
        if (isMounted) {
          setIsLoadingHome(true);
          setHomeError(null);
        }
 
        const nextHomeData = await getHomeDashboard(token);
 
        if (isMounted) {
          setHomeData(nextHomeData);
        }
      } catch (error) {
        if (!isMounted) return;
        setHomeError(getApiErrorMessage(error, 'No pudimos cargar el home.'));
      } finally {
        if (isMounted) {
          setIsLoadingHome(false);
        }
      }
    }
    
    void loadHome();
 
    return () => {
      isMounted = false;
    };
  }, [session?.token]);
 
  useEffect(() => {
    const token = session?.token;
    const userId = session?.userId;
 
    if (typeof token !== 'string' || typeof userId !== 'number') {
      setUserProfile(null);
      setUserStats(null);
      return;
    }
 
    let isMounted = true;
    
    async function loadUserInfo() {
      try {
        const [nextProfile, nextStats] = await Promise.all([
          getUserProfile(userId as number, token as string),
          getUserStats(userId as number, token as string),
        ]);
 
        if (!isMounted) return;
 
        setUserProfile(nextProfile);
        setUserStats(nextStats);
      } catch {
        if (!isMounted) return;
        setUserProfile(null);
        setUserStats(null);
      }
    }
 
    void loadUserInfo();
 
    return () => {
      isMounted = false;
    };
  }, [session?.token, session?.userId]);
 
  useEffect(() => {
    const userId = session?.userId;
    const token = session?.token;

    if (!userId || !token) return;

    async function checkFineStatus() {
      try {
        const fine = await getPendingFine(userId as number, token as string);
        setPendingFine(fine);

        if (fine) {
          try {
            const methods = await getFinePaymentMethods(userId as number, token as string);
            setFinePaymentMethods(methods);
          } catch (err) {
            if (__DEV__) console.log('[DEBUG] Error al buscar métodos de pago:', err);
          }
        }
      } catch (err) {
        if (__DEV__) console.log('[DEBUG] Error al buscar la multa (o no hay multa):', err);
        setPendingFine(null);
      }
    }

    void checkFineStatus();

    const intervalId = setInterval(() => {
      if (__DEV__) console.log('[DEBUG] Ejecutando chequeo periódico de multas (5 min)...');
      void checkFineStatus();
    }, 300000);

    return () => clearInterval(intervalId);
  }, [session?.userId, session?.token]);


 
  const displayName =
    userProfile?.name?.trim() ||
    homeData?.displayName?.trim() ||
    session?.displayName?.trim() ||
    (session?.email ? getFallbackDisplayName(session.email) : 'Usuario');
    
  const membershipTier = (
    userStats?.categoryProgress.currentCategory?.trim() ||
    userProfile?.category?.trim() ||
    homeData?.membershipTier?.trim() ||
    session?.membershipTier?.trim() ||
    'COMUN'
  ).toUpperCase();
  
  const declaredGuarantee = userProfile?.declaredGuarantee ?? homeData?.declaredGuarantee ?? session?.declaredGuarantee ?? 250000;
  const featuredLots = homeData?.featuredLots ?? [];
  const liveAuctions = homeData?.liveAuctions ?? [];
  const upcomingAuctions = homeData?.upcomingAuctions ?? [];
  const homeAuctions = liveAuctions.length > 0 ? liveAuctions : upcomingAuctions;
  const auctionsSectionTitle = liveAuctions.length > 0 ? 'Subastas en Vivo' : 'Próximas Subastas';
 
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBackground}>
          <View style={styles.headerTop}>
            <View style={styles.userInfo}>
              {isLoggedIn ? (
                <TouchableOpacity style={styles.userProfileButton} onPress={() => router.push('/profile')} activeOpacity={0.8}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitials}>{getInitials(displayName)}</Text>
                  </View>
                  <View style={styles.userCopy}>
                    <Text style={styles.welcomeText}>Bienvenido,</Text>
                    <Text style={styles.userName} numberOfLines={1}>
                      {displayName}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitials}>{getInitials(displayName)}</Text>
                  </View>
                  <View style={styles.userCopy}>
                    <Text style={styles.welcomeText}>Bienvenido,</Text>
                    <Text style={styles.userName} numberOfLines={1}>
                      Usuario Invitado
                    </Text>
                  </View>
                </>
              )}
            </View>
 
            {isLoggedIn && (
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.notificationBell} onPress={() => router.push('/notifications')}>
                <Feather name="mail" size={20} color="white" />
                {unreadCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
 
              <View style={styles.tierBadge}>
                <Feather name="star" size={14} color="#F5C84C" />
                <Text style={styles.tierBadgeText}>{membershipTier}</Text>
              </View>
            </View>
          )}
          </View>
  
        </View>
 
        {/* ── 4. Banner de Multa ──────────────────────────────────────────────── */}
        {pendingFine && (
          <View style={fineBannerStyles.bannerContainer}>
            <View style={fineBannerStyles.bannerIconWrapper}>
              <Feather name="alert-circle" size={18} color="#E05252" />
            </View>
            <View style={fineBannerStyles.bannerTextWrapper}>
              <Text style={fineBannerStyles.bannerTitle}>Alerta de Multa</Text>
              <Text style={fineBannerStyles.bannerBody}>
                Tenés una multa pendiente del {pendingFine.percentage}% por falta de fondos en tu última subasta.
                Regularizá el pago antes de 72hs para seguir participando.
              </Text>
            </View>
            <TouchableOpacity
              style={fineBannerStyles.bannerBtn}
              onPress={() => setShowFineModal(true)}
              activeOpacity={0.85}
            >
              <Text style={fineBannerStyles.bannerBtnText}>PAGAR MULTA</Text>
            </TouchableOpacity>
          </View>
        )}

 
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Lotes Destacados</Text>
          <TouchableOpacity onPress={() => router.push('/search')}>
            <Text style={styles.seeAllText}>Ver todos</Text>
          </TouchableOpacity>
        </View>
 
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {featuredLots.map((item) => (
            <View key={item.id} style={styles.featuredCard}>
              <View style={styles.imageWrapper}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.featuredImage} />
                ) : (
                  <View style={[styles.featuredImage, styles.imagePlaceholder]}>
                    <Feather name="image" size={22} color="#A8B6C9" />
                    <Text style={styles.imagePlaceholderText}>Sin foto</Text>
                  </View>
                )}
                <View style={styles.tagContainer}>
                  <Text style={styles.tagText}>{item.category}</Text>
                </View>
                <View style={styles.featuredBadgeContainer}>
                  <Text style={styles.featuredBadgeText}>{item.badge}</Text>
                </View>
              </View>
 
              <View style={styles.featuredInfo}>
                <Text style={styles.featuredTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.featuredSubtitle} numberOfLines={1}>
                  {item.lotCode} · {item.subtitle}
                </Text>
 
                <View style={styles.featuredFooter}>
                  <View>
                    {isLoggedIn ? (
                      <Text style={styles.priceLabel}>PRECIO BASE</Text>
                    ) : null}

                    <Text style={styles.priceValue}>
                      {formatCurrency(item.basePrice, !isLoggedIn, item.currency)}
                    </Text>
                  </View>
 
                  <TouchableOpacity
                    style={styles.catalogButton}
                    onPress={() => router.push(`/auction/${item.auctionId ?? item.itemId ?? item.id}`)}
                  >
                    <Text style={styles.catalogBtnText}>Ver Catálogo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
 
        <View style={styles.sectionHeader}>
          <View style={styles.liveTitleRow}>
            <View style={styles.redDot} />
            <Text style={styles.sectionTitle}>{auctionsSectionTitle}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/auctions')}>
            <Text style={styles.seeAllText}>Ir a la sala</Text>
          </TouchableOpacity>
        </View>
 
        {isLoggedIn && isLoadingHome ? <Text style={styles.feedbackText}>Cargando información del home...</Text> : null}
        {isLoggedIn && homeError ? <Text style={styles.feedbackText}>{homeError}</Text> : null}
 
        <View style={styles.verticalList}>
          {homeAuctions.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.upcomingItem}
              onPress={() => router.push(`/auction/${item.auctionId ?? item.id}`)}
            >
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.upcomingImg} />
              ) : (
                <View style={[styles.upcomingImg, styles.imagePlaceholder]}>
                  <Feather name="image" size={22} color="#A8B6C9" />
                  <Text style={styles.imagePlaceholderText}>Sin foto</Text>
                </View>
              )}
 
              <View style={styles.upcomingInfo}>
                <Text style={styles.upcomingTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.upcomingSubtitle} numberOfLines={2}>
                  {item.subtitle}
                </Text>
 
                {item.currentBid ? (
                  <Text style={styles.bidText}>
                    {isLoggedIn ? `Puja: ${formatCurrency(item.currentBid, false, item.currency)}` : 'Puja reservada'}
                  </Text>
                ) : null}
 
                <View style={styles.timeRow}>
                  <View style={styles.timeInfo}>
                    <Feather name="clock" size={13} color="#7C8DA6" />
                    <Text style={styles.timeText}>{formatAuctionMeta(item)}</Text>
                  </View>
                  <Text style={styles.enterText}>Entrar</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
 
          {isLoggedIn && !isLoadingHome && homeAuctions.length === 0 ? (
            <Text style={styles.feedbackText}>No hay subastas para mostrar en este momento.</Text>
          ) : null}
        </View>
      </ScrollView>

      {/* Modal de pago */}
      {pendingFine && session?.userId && session?.token && (
        <FinePaymentModal
          visible={showFineModal}
          fine={pendingFine}
          
          userId={session.userId}
          token={session.token}
          onClose={() => setShowFineModal(false)}
          onPaid={() => {
            setShowFineModal(false);
            setPendingFine(null); 
          }}
        />
      )}
    </SafeAreaView>
  );
}
 
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  container: {
    flex: 1,
  },
  headerBackground: {
    backgroundColor: '#653728',
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userProfileButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#7D432F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.30)',
  },
  avatarInitials: {
    color: '#EAD3C2',
    fontSize: 24,
    fontWeight: '700',
  },
  userCopy: {
    flex: 1,
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    marginBottom: 4,
  },
  userName: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationBell: {
    padding: 6,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -1,
    backgroundColor: '#FF3A38',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#653728',
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#653728',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  tierBadgeText: {
    color: '#FFF0D9',
    fontSize: 12,
    fontWeight: '700',
  },
  registerCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C8DA6',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  registerButton: {
    backgroundColor: '#653728',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  registerButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 22,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  summaryLabel: {
    color: '#7283A2',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryValue: {
    color: '#653728',
    fontSize: 28,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2A44',
  },
  seeAllText: {
    color: '#F27A1A',
    fontSize: 15,
    fontWeight: '600',
  },
  horizontalList: {
    paddingLeft: 20,
    paddingRight: 8,
    paddingBottom: 10,
  },
  featuredCard: {
    width: 350,
    backgroundColor: 'white',
    borderRadius: 20,
    marginRight: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  imageWrapper: {
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: 220,
  },
  imagePlaceholder: {
    backgroundColor: '#EEF3F8',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  imagePlaceholderText: {
    color: '#8FA1BD',
    fontSize: 12,
    fontWeight: '700',
  },
  tagContainer: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(52, 42, 33, 0.72)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  tagText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  featuredBadgeContainer: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: '#C9784E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  featuredBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  featuredInfo: {
    padding: 18,
  },
  featuredTitle: {
    color: '#24304A',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  featuredSubtitle: {
    color: '#7183A3',
    fontSize: 13,
    marginBottom: 16,
  },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  priceLabel: {
    color: '#97A3BA',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  priceValue: {
    color: '#653728',
    fontSize: 17,
    fontWeight: '800',
  },
  catalogButton: {
    backgroundColor: '#653728',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
  },
  catalogBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  liveTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  redDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF3A38',
    marginRight: 10,
  },
  verticalList: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  feedbackText: {
    paddingHorizontal: 20,
    marginBottom: 12,
    color: '#7183A3',
    fontSize: 13,
  },
  upcomingItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  upcomingImg: {
    width: 88,
    height: 88,
    borderRadius: 18,
    marginRight: 14,
    backgroundColor: '#EEF3F8',
  },
  upcomingInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  upcomingTitle: {
    color: '#24304A',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  upcomingSubtitle: {
    color: '#7183A3',
    fontSize: 13,
    marginBottom: 8,
  },
  bidText: {
    color: '#F06A17',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    color: '#7183A3',
    fontSize: 12,
  },
  enterText: {
    color: '#653728',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

const fineBannerStyles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: '#FFF5F5',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop:10,
    gap: 8,
  },
  bannerIconWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bannerTextWrapper: {
    gap: 2,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#C53030',
  },
  bannerBody: {
    fontSize: 12,
    color: '#744210',
    lineHeight: 17,
  },
  bannerBtn: {
    backgroundColor: '#E05252',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  bannerBtnText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.4,
  },
});