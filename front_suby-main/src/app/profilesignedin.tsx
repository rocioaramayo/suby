import { useAuth } from '@/context/auth-context';
import { useNotifications } from '@/context/notifications-context';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
// IMPORTANTE: Usamos los íconos que ya vienen pre-instalados en Expo
import { getUserProfile, getUserStats, listOwnerProducts, logout, type UserProfileResponse, type UserStatsResponse } from '@/lib/api';
import { Feather, Ionicons } from '@expo/vector-icons';

/* ─── TOKENS ─────────────────────────────────────────────────── */
const C = {
  brown:        "#653728",
  brownMid:     "#7D432F",
  brownLight:   "#B86641",
  bg:           "#F8FAFC",
  white:        "#ffffff",
  border:       "#F1F5F9",
  border2:      "#E2E8F0",
  textDark:     "#1D293D",
  textMid:      "#314158",
  textMuted:    "#62748E",
  textLight:    "#90A1B9",
  textLighter:  "#CAD5E2",
  gold:         "#FDC700",
  goldText:     "#F0B100",
  orange:       "#F97316",
  red:          "#E7000B",
  redBg:        "#FEF2F2",
  redBadge:     "#FB2C36",
  iconBg1:      "#F1F5F9",
  iconBg2:      "#FFF7ED",
  iconBg3:      "#F8FAFC",
};

/* ─── INTERFACES ──────────────────────────────────────────────── */

interface MenuCardProps {
  children: React.ReactNode;
}

interface MenuRowProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle?: string;
  isLast?: boolean;
  isDestructive?: boolean;
  onPress?: () => void;
}

interface ProgressBarProps {
  label: string;
  current: number;
  total: number;
}

/* ─── SUB-COMPONENTS ──────────────────────────────────────────── */

function MenuCard({ children }: MenuCardProps) {
  return (
    <View style={styles.menuCard}>
      {children}
    </View>
  );
}

function MenuRow({ icon, iconBg, title, subtitle, isLast, isDestructive, onPress }: MenuRowProps) {
  return (
    <TouchableOpacity 
      style={[
        styles.menuRow,
        !isLast && styles.menuRowBorder,
        isDestructive && { height: 58 }
      ]}
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress && !isDestructive}
    >
      <View style={[
        styles.menuIconContainer, 
        { backgroundColor: isDestructive ? C.redBg : iconBg }
      ]}>
        {icon}
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={[
          styles.menuTitle, 
          { color: isDestructive ? C.red : C.textDark }
        ]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.menuSubtitle}>{subtitle}</Text>
        )}
      </View>
      {!isDestructive && <Feather name="chevron-right" size={16} color={C.textLighter} />}
    </TouchableOpacity>
  );
}

function ProgressBar({ label, current, total }: ProgressBarProps) {
  const safeTotal = total > 0 ? total : 1;
  const pct = Math.round((current / safeTotal) * 100);
  return (
    <View style={styles.pbContainer}>
      <View style={styles.pbHeader}>
        <Text style={styles.pbLabel}>{label}</Text>
        <Text style={styles.pbCount}>{current}/{total}</Text>
      </View>
      <View style={styles.pbTrack}>
        <View style={[styles.pbBar, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

/* ─── MAIN SCREEN ─────────────────────────────────────────────── */

export default function PerfilScreen() {
  const { paymentConfirmed } = useLocalSearchParams<{ paymentConfirmed?: string }>();
  const { clearAll, session } = useAuth();
  const { unreadCount, refreshNotifications } = useNotifications();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [showPaymentToast, setShowPaymentToast] = useState(false);
  const [productsCount, setProductsCount] = useState({ total: 0, accepted: 0 });

  useEffect(() => {
    if (!paymentConfirmed) {
      setShowPaymentToast(false);
      return;
    }

    setShowPaymentToast(true);
    const timeoutId = setTimeout(() => {
      setShowPaymentToast(false);
      router.replace('/profile');
    }, 3500);

    return () => clearTimeout(timeoutId);
  }, [paymentConfirmed]);

  const loadProfile = useCallback(async () => {
    const token = session?.token;
    const userId = session?.userId;

    if (!token || !userId) {
      setProfile(null);
      setStats(null);
      setProductsCount({ total: 0, accepted: 0 }); 
      setProfileError(null);
      setIsLoadingProfile(false);
      return;
    }

    setIsLoadingProfile(true);
    setProfileError(null);

    try {
      const [nextProfile, nextStats, productsResponse] = await Promise.all([
        getUserProfile(userId, token),
        getUserStats(userId, token),
        listOwnerProducts(userId, token).catch(() => ({ products: [] })) 
      ]);

      setProfile(nextProfile);
      setStats(nextStats);

      const items = productsResponse.products || [];
      const acceptedItems = items.filter((p: any) => 
        (p.inspectionStatus || '').toLowerCase() === 'aceptado'
      ).length;
      
      setProductsCount({
        total: items.length,
        accepted: acceptedItems
      });

    } catch (error) {
      setProfile(null);
      setStats(null);
      setProductsCount({ total: 0, accepted: 0 });
      setProfileError(error instanceof Error ? error.message : 'No pudimos cargar tu perfil.');
    } finally {
      setIsLoadingProfile(false);
    }
  }, [session?.token, session?.userId]);


  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  const displayName =
    profile?.name?.trim() ||
    [session?.firstName, session?.lastName].filter(Boolean).join(' ').trim() ||
    session?.displayName?.trim() ||
    session?.email ||
    'Usuario';
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || 'U';
  const membershipTier = profile?.category?.trim()?.toUpperCase() || session?.membershipTier?.trim()?.toUpperCase() || 'COMUN';
  const declaredGuarantee = profile?.declaredGuarantee ?? session?.declaredGuarantee ?? 0;

  const handleOpenPaymentMethods = () => {
    router.push('/payment-methods');
  };

  const handleOpenProfileStats = () => {
    router.push('/profile-stats');
  };

  const handleOpenBidHistory = () => {
    router.push('/profile/bid-history');
  };

  const handleOpenOwnerProducts = () => {
    router.push('/owner-products');
  };

  const handleLogout = async () => {
    try {
      if (session?.token) {
        await logout(session.token);
      }
    } catch {
      // Si el backend no responde, igual cerramos la sesión local.
    } finally {
      clearAll();
      router.replace('/login');
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      void refreshNotifications();
    }, [refreshNotifications])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {showPaymentToast ? (
          <View style={styles.paymentToast}>
            <Feather name="check-circle" size={18} color="#15803D" />
            <Text style={styles.paymentToastText}>Pago confirmado. Recibiras la confirmacion por email.</Text>
          </View>
        ) : null}
        
        {/* ── HEADER ───────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.glow} />

          {/* User row */}
          <View style={styles.userRow}>
            {/* Avatar + name */}
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarInitial}>{avatarInitial}</Text>
              </View>
              <View>
                <Text style={styles.welcomeText}>Bienvenido,</Text>
                <Text style={styles.nameText}>{displayName}</Text>
              </View>
            </View>

            {/* ORO badge + messages */}
            <View style={styles.badgesContainer}>
              <View style={styles.goldBadge}>
                <View style={styles.goldDot} />
                <Text style={styles.goldBadgeText}>{membershipTier}</Text>
              </View>

              <TouchableOpacity style={styles.mailButton} onPress={() => router.push('/notifications')}>
                <View style={styles.mailIcon}>
                  <Feather name="mail" size={17} color="rgba(255,255,255,.90)" />
                </View>
                {unreadCount > 0 ? (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>
          </View>

         
        </View>

        {/* ── SCROLLABLE CONTENT ───────────────────────────── */}
        <ScrollView 
          style={styles.scrollArea} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Categoría asignada */}
          <View style={styles.card}>
            <View style={styles.progressTopRow}>
              <View style={styles.progressTitleRow}>
                <Ionicons name="trophy-outline" size={14} color={C.orange} />
                <Text style={styles.progressTitle}>Categoría asignada</Text>
              </View>
              <View style={styles.progressLevels}>
                <Text style={styles.oroText}>{membershipTier}</Text>
              </View>
            </View>

            <Text style={styles.progressHint}>
              {profileError ?? (isLoadingProfile ? 'Actualizando datos reales de tu cuenta...' : 'La categoría la asigna manualmente el equipo de Suby y ya no cambia automáticamente por actividad.')}
            </Text>
          </View>

          {/* Subastar un Artículo banner */}
          <TouchableOpacity style={styles.bannerCard} activeOpacity={0.8} onPress={() => router.push('/upload_goods')}>
            <View style={styles.bannerGlow} />
            <View style={styles.bannerContent}>
              <View style={styles.bannerIcon}>
                <Feather name="package" size={20} color="#EAD3C2" />
              </View>
              <View>
                <Text style={styles.bannerTitle}>Subastar un Artículo</Text>
                <Text style={styles.bannerSubtitle}>Vende tus piezas al mejor postor</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color="#DFB99F" />
          </TouchableOpacity>

          {/* Menu Card 1 */}
          <MenuCard>
            <MenuRow
              icon={<Feather name="package" size={17} color={C.textMuted} />}
              iconBg={C.iconBg1}
              title="Mis Artículos en Depósito"
              subtitle={`${productsCount.total} artículo${productsCount.total !== 1 ? 's' : ''} · ${productsCount.accepted} aceptado${productsCount.accepted !== 1 ? 's' : ''}`}
              onPress={handleOpenOwnerProducts}
            />
            <MenuRow
              icon={<Feather name="bar-chart-2" size={17} color={C.textMuted} />}
              iconBg={C.iconBg2}
              title="Mis Estadísticas"
              subtitle="Tasa de éxito, historial y más"
              onPress={handleOpenProfileStats}
              isLast
            />
          </MenuCard>

          {/* Menu Card 2 */}
          <MenuCard>
            <MenuRow
              icon={<Feather name="credit-card" size={17} color={C.textMuted} />}
              iconBg={C.iconBg3}
              title="Medios de Pago"
              subtitle="Tarjetas y cuentas vinculadas"
              onPress={handleOpenPaymentMethods}
            />
            <MenuRow
              icon={<Feather name="file-text" size={17} color={C.textMuted} />}
              iconBg={C.iconBg3}
              title="Historial de Pujas"
              subtitle="Tus participaciones anteriores"
              onPress={handleOpenBidHistory}
            />
            <MenuRow
              icon={<Feather name="log-out" size={17} color={C.red} />}
              iconBg={C.redBg}
              title="Cerrar Sesión"
              isLast
              isDestructive
              onPress={handleLogout}
            />
          </MenuCard>
        </ScrollView>

      

      </View>
    </SafeAreaView>
  );
}

/* ─── STYLES ──────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, backgroundColor: C.bg },
  
  // Header
  header: {
    height: 180,
    backgroundColor: C.brown,
    borderBottomRightRadius: 24,
    borderBottomLeftRadius: 24,
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    width: 150, height: 150,
    right: -20, top: -50,
    backgroundColor: "rgba(184,102,65,.3)",
    borderRadius: 75,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 21,
    marginTop: 45,
  },
  userInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 56, height: 56,
    borderRadius: 28,
    borderWidth: 1.75,
    borderColor: "rgba(255,255,255,.30)",
    backgroundColor: C.brownMid,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { color: "#EAD3C2", fontSize: 24, fontWeight: "700" },
  welcomeText: { color: "rgba(255,255,255,.78)", fontSize: 14 },
  nameText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  badgesContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  goldBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,.10)",
    borderWidth: 0.58, borderColor: "rgba(255,255,255,.20)",
    borderRadius: 14,
    paddingHorizontal: 10, height: 28,
  },
  goldDot: { width: 10, height: 10, backgroundColor: C.gold, borderRadius: 5 },
  goldBadgeText: { color: "#fff", fontSize: 11, fontWeight: "600", letterSpacing: 0.6 },
  mailButton: { position: "relative" },
  mailIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(255,255,255,.12)",
    alignItems: "center", justifyContent: "center",
  },
  notificationBadge: {
    position: "absolute", top: -2, right: -2,
    width: 18, height: 18,
    backgroundColor: C.redBadge, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
    elevation: 3, shadowColor: C.redBadge, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.45, shadowRadius: 6,
  },
  notificationText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  garantiaCard: {
    position: "absolute", left: 24, right: 24, top: 132,
    height: 81, backgroundColor: C.white, borderRadius: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20,
    elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6,
  },
  garantiaLabel: { color: C.textMuted, fontSize: 10, fontWeight: "600", letterSpacing: 0.25, marginBottom: 2 },
  garantiaAmount: { color: C.brown, fontSize: 24, fontWeight: "700" },

  // Scroll Content
  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, gap: 10 },
  paymentToast: {
    position: 'absolute',
    top: 12,
    left: 20,
    right: 20,
    zIndex: 20,
    backgroundColor: '#ECFDF3',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  paymentToastText: {
    color: '#15803D',
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 16, borderWidth: 0.67, borderColor: C.border,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
    elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
    marginBottom: 10,
  },
  progressTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  progressTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  progressTitle: { color: C.textMid, fontSize: 12, fontWeight: "600", letterSpacing: 0.3 },
  progressLevels: { flexDirection: "row", alignItems: "center", gap: 5 },
  oroText: { color: C.goldText, fontSize: 11, fontWeight: "700" },
  platinoText: { color: C.brownLight, fontSize: 11, fontWeight: "700" },
  progressBars: { gap: 8 },
  progressHint: { marginTop: 8, color: C.textLight, fontSize: 10, lineHeight: 15 },
  
  bannerCard: {
    height: 75, backgroundColor: C.brown,
    borderRadius: 16, borderWidth: 0.67, borderColor: C.brownMid,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, marginBottom: 10, overflow: "hidden",
    elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6,
  },
  bannerGlow: {
    position: "absolute", right: 10, top: -22,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(184,102,65,.4)",
  },
  bannerContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  bannerIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.brownMid,
    alignItems: "center", justifyContent: "center",
  },
  bannerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  bannerSubtitle: { color: "#EAD3C2", fontSize: 11 },

  // Component: MenuCard
  menuCard: {
    backgroundColor: C.white, borderRadius: 16, borderWidth: 0.67, borderColor: C.border,
    overflow: "hidden", marginBottom: 10,
    elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  
  // Component: MenuRow
  menuRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, height: 63, gap: 12 },
  menuRowBorder: { borderBottomWidth: 0.67, borderBottomColor: C.border },
  menuIconContainer: { width: 34, height: 34, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  menuTextContainer: { flex: 1 },
  menuTitle: { fontSize: 14, fontWeight: "600" },
  menuSubtitle: { color: C.textLight, fontSize: 11, fontWeight: "400", marginTop: 2 },

  // Component: ProgressBar
  pbContainer: {},
  pbHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  pbLabel: { color: C.textMuted, fontSize: 11 },
  pbCount: { color: C.textMid, fontSize: 11, fontWeight: "600" },
  pbTrack: { height: 6, backgroundColor: C.border, borderRadius: 3, overflow: "hidden" },
  pbBar: { height: "100%", backgroundColor: C.brownLight, borderRadius: 3 },

  // Bottom Nav
  bottomNav: {
    height: 80, backgroundColor: C.white,
    borderTopWidth: 0.67, borderTopColor: C.border2,
    flexDirection: "row", justifyContent: "space-around", alignItems: "center",
  },
  navTab: { width: 80, height: 43, alignItems: "center", justifyContent: "center", gap: 4 },
  navTabLabel: { fontSize: 10, fontWeight: "500", letterSpacing: 0.25 },
});
