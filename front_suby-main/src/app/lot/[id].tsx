import { getLotDetail, type LotDetailResponse } from '@/lib/api';
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
  bg: '#FFFFFF',
  brown: '#6F3D2D',
  brownSoft: '#8C604E',
  textDark: '#3F4A5A',
  textMid: '#7D8BA0',
  textSoft: '#A1ADBF',
  white: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#EAE6DF',
  accent: '#F04438',
  accentSoft: '#FFF1F0',
  shadow: '#6B7280',
};

function formatCurrency(value?: number | null, currency?: string) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return undefined;
  }

  const normalizedCurrency = (currency ?? 'ARS').trim().toUpperCase();
  const symbol = normalizedCurrency === 'USD' ? 'US$' : normalizedCurrency === 'ARS' ? 'ARS $' : '$';
  return `${symbol} ${Math.round(value).toLocaleString('es-AR')}`;
}

function DetailRow({ label, value, icon }: { label: string; value?: string | null; icon?: keyof typeof Feather.glyphMap }) {
  if (!value?.trim()) {
    return null;
  }

  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLabelWrap}>
        {icon ? <Feather name={icon} size={13} color={C.textSoft} /> : null}
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function TextSection({
  title,
  icon,
  content,
}: {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  content?: string | null;
}) {
  if (!content?.trim()) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name={icon} size={15} color={C.brownSoft} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.bodyText}>{content}</Text>
    </View>
  );
}

export default function LotDetailScreen() {
  const params = useLocalSearchParams<{ id?: string; auctionId?: string }>();
  const itemId = Number(params.id);
  const auctionId = Number(params.auctionId);

  const [lot, setLot] = useState<LotDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const loadLot = useCallback(async () => {
    if (!Number.isFinite(itemId) || itemId <= 0) {
      setError('ID de lote invalido.');
      setIsLoading(false);
      return;
    }

    if (!Number.isFinite(auctionId) || auctionId <= 0) {
      setError('No se pudo determinar a que subasta pertenece este lote.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await getLotDetail(auctionId, itemId);
      setLot(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No pudimos cargar el detalle del lote.';
      setError(msg);
      setLot(null);
    } finally {
      setIsLoading(false);
    }
  }, [auctionId, itemId]);

  useFocusEffect(
    useCallback(() => {
      void loadLot();
    }, [loadLot])
  );

  useEffect(() => {
    if (!lot) {
      setSelectedImage(null);
      return;
    }

    setSelectedImage(lot.image ?? lot.gallery?.[0] ?? null);
  }, [lot]);

  const isAuctioned = lot?.auctioned?.trim().toLowerCase() === 'si';

  const identificationRows = useMemo(() => {
    if (!lot) {
      return [];
    }

    return [
      { label: 'N° de Pieza', value: lot.lotCode },
      { label: 'Dueno Actual', value: lot.owner, icon: 'user' as const },
      { label: 'Precio Base', value: formatCurrency(lot.basePrice, lot.currency) },
    ].filter((entry) => entry.value?.trim());
  }, [lot]);

  const authorshipRows = useMemo(() => {
    if (!lot) {
      return [];
    }

    return [
      { label: 'Artista / Disenador', value: lot.artist },
      { label: 'Periodo / Ano', value: lot.period, icon: 'calendar' as const },
    ].filter((entry) => entry.value?.trim());
  }, [lot]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator color={C.brown} size="large" />
          <Text style={styles.loadingText}>Cargando lote...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !lot) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Feather name="alert-triangle" size={32} color={C.accent} />
          <Text style={styles.errorTitle}>No pudimos abrir el lote</Text>
          <Text style={styles.errorText}>{error ?? 'Volve a intentar en unos segundos.'}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={22} color={C.white} />
          </TouchableOpacity>

          <View style={styles.heroCopy}>
            {lot.category?.trim() ? (
              <Text style={styles.categoryText}>{lot.category.toUpperCase()}</Text>
            ) : null}
            <Text style={styles.heroTitle}>{lot.title}</Text>
            <Text style={styles.lotCodeText}>{lot.lotCode}</Text>

            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{isAuctioned ? 'Finalizado' : 'En Subasta'}</Text>
            </View>
          </View>
        </View>

        {selectedImage ? (
          <View style={styles.imageCard}>
            <Image source={{ uri: selectedImage }} style={styles.mainImage} resizeMode="cover" />
          </View>
        ) : (
          <View style={[styles.imageCard, styles.imagePlaceholder]}>
            <Feather name="image" size={34} color={C.textSoft} />
            <Text style={styles.imagePlaceholderText}>Sin imagen</Text>
          </View>
        )}

        {lot.gallery && lot.gallery.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.galleryRow}
          >
            {lot.gallery.map((uri, index) => (
              <TouchableOpacity
                key={`${uri}-${index}`}
                activeOpacity={0.86}
                onPress={() => setSelectedImage(uri)}
                style={[styles.galleryThumbWrap, selectedImage === uri && styles.galleryThumbWrapActive]}
              >
                <Image source={{ uri }} style={styles.galleryThumb} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        {identificationRows.length > 0 ? (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionMarker}>#</Text>
              <Text style={styles.sectionTitle}>IDENTIFICACION</Text>
            </View>
            {identificationRows.map((entry) => (
              <DetailRow key={entry.label} label={entry.label} value={entry.value} icon={entry.icon} />
            ))}
          </View>
        ) : null}

        {authorshipRows.length > 0 ? (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="palette-outline" size={15} color={C.brownSoft} />
              <Text style={styles.sectionTitle}>AUTORIA Y PERIODO</Text>
            </View>
            {authorshipRows.map((entry) => (
              <DetailRow key={entry.label} label={entry.label} value={entry.value} icon={entry.icon} />
            ))}
          </View>
        ) : null}

        <TextSection title="DESCRIPCION" icon="text-box-outline" content={lot.description} />
        <TextSection title="HISTORIA Y PROCEDENCIA" icon="archive-outline" content={lot.history} />
        <TextSection title="ESTADO DE CONSERVACION" icon="magnify" content={lot.condition} />

        {lot.auction ? (
          <View style={[styles.card, styles.auctionCard]}>
            <Text style={styles.auctionEyebrow}>SESION DE SUBASTA</Text>
            {lot.auction.name?.trim() ? (
              <View style={styles.auctionMetaRow}>
                <MaterialCommunityIcons name="gavel" size={15} color={C.brownSoft} />
                <Text style={styles.auctionName}>{lot.auction.name}</Text>
              </View>
            ) : null}
            {lot.auction.auctioneer?.trim() ? (
              <View style={styles.auctionMetaRow}>
                <Feather name="user" size={14} color={C.brownSoft} />
                <Text style={styles.auctionMetaText}>Rematador: {lot.auction.auctioneer}</Text>
              </View>
            ) : null}
            {lot.auction.date?.trim() ? (
              <View style={styles.auctionMetaRow}>
                <Feather name="calendar" size={14} color={C.textSoft} />
                <Text style={styles.auctionMetaText}>{lot.auction.date}</Text>
              </View>
            ) : null}

            {Number.isFinite(auctionId) && auctionId > 0 ? (
              <TouchableOpacity
                style={styles.catalogButton}
                activeOpacity={0.88}
                onPress={() =>
                  router.push({
                    pathname: '/auction/[id]',
                    params: { id: String(auctionId) },
                  })
                }
              >
                <Text style={styles.catalogButtonText}>Ver catalogo completo</Text>
                <Feather name="external-link" size={16} color={C.brownSoft} />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 24,
  },
  loadingText: {
    color: C.textMid,
    fontSize: 14,
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
    paddingHorizontal: 24,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: C.white,
    fontSize: 14,
    fontWeight: '700',
  },
  hero: {
    backgroundColor: C.brown,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 18,
    paddingBottom: 22,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    marginTop: 18,
    alignItems: 'center',
    gap: 6,
  },
  categoryText: {
    color: '#E7B16D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  heroTitle: {
    color: C.white,
    fontSize: 19,
    lineHeight: 27,
    fontWeight: '800',
    textAlign: 'center',
  },
  lotCodeText: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statusPill: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    backgroundColor: C.accentSoft,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.accent,
  },
  statusText: {
    color: C.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  imageCard: {
    marginTop: 14,
    marginHorizontal: 16,
    borderRadius: 22,
    backgroundColor: C.white,
    overflow: 'hidden',
  },
  mainImage: {
    width: '100%',
    height: 286,
    backgroundColor: '#FFFFFF',
  },
  imagePlaceholder: {
    height: 286,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  imagePlaceholderText: {
    color: C.textSoft,
    fontSize: 13,
    fontWeight: '700',
  },
  galleryRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
  },
  galleryThumbWrap: {
    width: 62,
    height: 62,
    padding: 2,
    borderRadius: 14,
    backgroundColor: '#E8EEF7',
  },
  galleryThumbWrapActive: {
    backgroundColor: '#D08A4C',
  },
  galleryThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  card: {
    marginTop: 14,
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    padding: 16,
    shadowColor: C.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionMarker: {
    color: '#F2994A',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#6F7D91',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  detailLabelWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    color: C.textSoft,
    fontSize: 13,
    fontWeight: '600',
  },
  detailValue: {
    flex: 1,
    color: C.textDark,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'right',
  },
  bodyText: {
    color: C.textDark,
    fontSize: 14,
    lineHeight: 27,
  },
  auctionCard: {
    backgroundColor: '#F1F3F8',
  },
  auctionEyebrow: {
    color: '#B5BDCB',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 10,
  },
  auctionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  auctionName: {
    flex: 1,
    color: C.textDark,
    fontSize: 17,
    fontWeight: '800',
  },
  auctionMetaText: {
    color: C.textMid,
    fontSize: 13,
    fontWeight: '600',
  },
  catalogButton: {
    marginTop: 10,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: C.white,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catalogButtonText: {
    color: C.brown,
    fontSize: 15,
    fontWeight: '800',
  },
});
