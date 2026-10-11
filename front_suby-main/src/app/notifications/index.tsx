import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/auth-context';
import { useNotifications } from '@/context/notifications-context';
import { resolveApiAssetUrl } from '@/lib/api';
import { useFocusEffect, router } from 'expo-router';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const C = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1D293D',
  muted: '#62748E',
  border: '#E2E8F0',
  brown: '#653728',
  brownSoft: '#653728',
  unread: '#FB2C36',
  unreadBg: '#FFF1F2',
};

function getPresentation(type: string, read: boolean) {
  switch (type) {
    case 'bien_aceptado':
      return {
        icon: 'check-circle' as const,
        iconColor: '#16A34A',
        iconBg: '#ECFDF3',
        borderColor: read ? C.border : '#B7F0C5',
      };
    case 'bien_rechazado':
      return {
        icon: 'x-circle' as const,
        iconColor: '#FF4D4F',
        iconBg: '#FFF1F2',
        borderColor: read ? C.border : '#FFC8CB',
      };
    case 'propuesta_precio':
      return {
        icon: 'message-circle' as const,
        iconColor: '#2563EB',
        iconBg: '#EEF5FF',
        borderColor: read ? C.border : '#CFE0FF',
      };
    case 'pago_pendiente':
      return {
        icon: 'credit-card' as const,
        iconColor: '#2563EB',
        iconBg: '#EEF5FF',
        borderColor: read ? C.border : '#CFE0FF',
      };
    case 'ganador_subasta':
      return {
        icon: 'award' as const,
        iconColor: '#16A34A',
        iconBg: '#ECFDF3',
        borderColor: read ? C.border : '#B7F0C5',
      };
    case 'bien_vendido':
      return {
        icon: 'dollar-sign' as const,
        iconColor: '#0F766E',
        iconBg: '#ECFEFF',
        borderColor: read ? C.border : '#A5F3FC',
      };
    case 'pago_confirmado':
      return {
        icon: 'check-circle' as const,
        iconColor: '#16A34A',
        iconBg: '#ECFDF3',
        borderColor: read ? C.border : '#B7F0C5',
      };
    case 'aviso_general':
      return {
        icon: 'tool' as const,
        iconColor: '#F27A1A',
        iconBg: '#FFF7ED',
        borderColor: read ? C.border : '#F6D7BC',
      };
    default:
      return {
        icon: 'mail' as const,
        iconColor: C.brownSoft,
        iconBg: '#FFF7ED',
        borderColor: read ? C.border : '#F6D7BC',
      };
    }
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function NotificationsScreen() {
  const { session } = useAuth();
  const { notifications, unreadCount, isLoading, error, refreshNotifications } = useNotifications();

  useFocusEffect(
    useCallback(() => {
      void refreshNotifications();
    }, [refreshNotifications])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mensajes</Text>
        <View style={styles.headerPill}>
          <Text style={styles.headerPillText}>{unreadCount} sin leer</Text>
        </View>
      </View>

      {isLoading && notifications.length === 0 ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={C.brown} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={notifications.length === 0 ? styles.emptyList : styles.listContent}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => void refreshNotifications()} />}
          renderItem={({ item }) => (
            (() => {
              const presentation = getPresentation(item.type, item.read);
              return (
                <TouchableOpacity
                  style={[styles.card, { borderColor: presentation.borderColor }, !item.read && styles.cardUnread]}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/notifications/${item.id}`)}
                >
                  <View style={[styles.iconWrap, { backgroundColor: presentation.iconBg }]}>
                    {item.thumbnailUrl ? (
                      <Image
                        source={
                          session?.token
                            ? {
                                uri: resolveApiAssetUrl(item.thumbnailUrl) ?? item.thumbnailUrl,
                                headers: { Authorization: `Bearer ${session.token}` },
                              }
                            : { uri: resolveApiAssetUrl(item.thumbnailUrl) ?? item.thumbnailUrl }
                        }
                        style={styles.thumbnail}
                      />
                    ) : (
                      <Feather name={presentation.icon} size={22} color={presentation.iconColor} />
                    )}
                  </View>

                  <View style={styles.cardMain}>
                    <View style={styles.cardTop}>
                      <View style={styles.cardTitleRow}>
                        {!item.read && <View style={styles.unreadDot} />}
                        <Text style={styles.cardTitle} numberOfLines={2}>
                          {item.title}
                        </Text>
                      </View>
                      <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
                    </View>

                    <Text style={styles.cardBody} numberOfLines={3}>
                      {item.body}
                    </Text>

                    <View style={styles.cardFooter}>
                      <Text style={styles.cardType}>{item.type.replace(/_/g, ' ')}</Text>
                      <Text style={styles.cardStatus}>{item.read ? 'Leído' : 'Nuevo'}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })()
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="mail" size={28} color={C.brownSoft} />
              <Text style={styles.emptyTitle}>No hay mensajes por ahora</Text>
              <Text style={styles.emptyText}>
                {error ?? 'Cuando lleguen notificaciones, las vas a ver aca.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  header: {
    backgroundColor: C.brown,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerPill: {
    backgroundColor: 'rgba(255,255,255,.14)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerPillText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 20, gap: 12 },
  emptyList: { flexGrow: 1, padding: 20 },
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    gap: 14,
  },
  cardUnread: {
    borderColor: '#F8C8CC',
    backgroundColor: '#FFFBFB',
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  cardMain: {
    flex: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.unread },
  cardTitle: { color: C.text, fontSize: 16, fontWeight: '700', flex: 1 },
  cardDate: { color: C.muted, fontSize: 12 },
  cardBody: { color: C.muted, fontSize: 14, lineHeight: 20 },
  cardFooter: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardType: { color: C.brownSoft, fontSize: 12, textTransform: 'capitalize' },
  cardStatus: {
    color: C.text,
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: C.unreadBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    gap: 10,
  },
  emptyTitle: { color: C.text, fontSize: 18, fontWeight: '700' },
  emptyText: { color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
