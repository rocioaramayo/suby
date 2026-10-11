import { useAuth } from '@/context/auth-context';
import {
  getApiErrorMessage,
  getAuctionDetail,
  getBidResult,
  getLiveBidStatus,
  leaveAuctionRoom,
  getLotDetail,
  getPendingFine,
  listUserPaymentMethods,
  placeBid,
  type AttendeeRegistrationResponse,
  type AuctionDetailResponse,
  type BidResultResponse,
  type LiveBidStatusResponse,
  type LotDetailResponse,
  type PaymentMethod,
} from '@/lib/api';
import {
  clearAuctionAttendeeRegistration,
  ensureAuctionAttendeeRegistration,
  getCachedAuctionAttendeeRegistration,
} from '@/lib/auction-attendee-registry';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const C = {
  bg: '#F6F8FC',
  brown: '#653728',
  brownSoft: '#653728',
  brownDeep: '#1C2435',
  orange: '#FF7A1A',
  orangeSoft: '#FFF2E8',
  white: '#FFFFFF',
  textDark: '#1F2A3D',
  textMid: '#607494',
  textSoft: '#8FA1BD',
  border: '#E6ECF5',
  green: '#0F9F4B',
  greenSoft: '#ECFDF3',
  red: '#D92D20',
  redSoft: '#FFF1F3',
  slateSoft: '#EEF3FA',
};

function formatCurrency(value?: number | null, currency?: string) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    value = 0;
  }

  const normalizedCurrency = (currency ?? 'ARS').trim().toUpperCase();
  const symbol = normalizedCurrency === 'USD' ? 'US$' : normalizedCurrency === 'ARS' ? 'ARS $' : '$';

  return `${symbol} ${Math.round(value).toLocaleString('es-AR')}`;
}

function formatCountdown(seconds?: number, ended = false) {
  if (ended) {
    return 'Finalizado';
  }

  const safeSeconds = Math.max(0, Math.floor(seconds ?? 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remaining = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

function formatDateLabel(rawDate?: string) {
  if (!rawDate) {
    return '--';
  }

  const date = new Date(`${rawDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return rawDate;
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function normalizeStatus(status?: string) {
  return (status ?? 'proxima').trim().toLowerCase();
}

function parseAmount(value: string) {
  const normalized = value.replace(/[^\d]/g, '');
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatAmountInput(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
    return '';
  }

  return Math.round(value).toString();
}

function mapNoticeType(kind: 'success' | 'error' | 'info') {
  if (kind === 'success') {
    return { background: C.greenSoft, color: C.green, icon: 'check-circle' as const };
  }

  if (kind === 'error') {
    return { background: C.redSoft, color: C.red, icon: 'alert-circle' as const };
  }

  return { background: C.orangeSoft, color: C.brown, icon: 'info' as const };
}

export default function LotBidScreen() {
  const params = useLocalSearchParams<{ id?: string; auctionId?: string }>();
  const { session } = useAuth();
  const isGuest = !session?.token || !session.userId;
  const itemId = Number(params.id);
  const initialAuctionId = Number(params.auctionId);

  const [auction, setAuction] = useState<AuctionDetailResponse | null>(null);
  const [lot, setLot] = useState<LotDetailResponse | null>(null);
  const [live, setLive] = useState<LiveBidStatusResponse | null>(null);
  const [result, setResult] = useState<BidResultResponse | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);
  const [attendee, setAttendee] = useState<AttendeeRegistrationResponse | null>(null);
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [winnerOverlay, setWinnerOverlay] = useState<{ result: BidResultResponse; nextItemId: number | null } | null>(null);
  // Countdown local: se decrementa cada 1s y se sincroniza con el server cada 12s
  const [localSeconds, setLocalSeconds] = useState<number | null>(null);
  const liveRef = useRef<LiveBidStatusResponse | null>(null);
  const noticeRef = useRef<typeof notice>(null);
  const settledLotRef = useRef<number | null>(null);
  const autoAdvanceSourceLotRef = useRef<number | null>(null);

  const auctionId = auction?.id ?? initialAuctionId;
  const catalogAuctionId = auction?.id ?? lot?.auction?.id ?? initialAuctionId;
  const attendeeId = attendee?.attendeeId ?? null;
  const paymentBalance = useMemo(
    () => paymentMethods.reduce((sum, method) => sum + (method.availableBalance ?? 0), 0),
    [paymentMethods]
  );
  const compatiblePaymentMethods = useMemo(() => {
    const auctionCurrency = (auction?.currency ?? 'ARS').trim().toUpperCase();
    const currentAuctionId = auction?.id ?? initialAuctionId;

    return paymentMethods.filter((method) => {
      if (method.type === 'card') {
        if (auctionCurrency === 'ARS') {
          return true;
        }
        return method.internationalCard === true;
      }

      if ((method.currency ?? '').trim().toUpperCase() !== auctionCurrency) {
        return false;
      }

      if (method.type === 'check' && typeof method.auctionId === 'number' && currentAuctionId > 0) {
        return method.auctionId === currentAuctionId;
      }

      return true;
    });
  }, [auction?.currency, auction?.id, initialAuctionId, paymentMethods]);
  const verifiedPaymentMethods = useMemo(
    () => compatiblePaymentMethods.filter((method) => (method.status ?? '').trim().toLowerCase() === 'verificado'),
    [compatiblePaymentMethods]
  );
  const hasPaymentMethods = compatiblePaymentMethods.length > 0;
  const hasVerifiedPaymentMethods = verifiedPaymentMethods.length > 0;
  const lotAuctionedStatus = normalizeStatus(live?.auctioned ?? lot?.auctioned);
  const isLiveAuction = normalizeStatus(auction?.status) === 'en_vivo' && lotAuctionedStatus !== 'si';
  const isUpcomingAuction = normalizeStatus(auction?.status) === 'proxima';
  const isEndedAuction = normalizeStatus(auction?.status) === 'finalizada' || lotAuctionedStatus === 'si';
  const isActiveLot = live?.activeLot === true;
  const canBid = !isGuest && !isEndedAuction && !isUpcomingAuction && isActiveLot && attendee?.canBid === true && attendeeId != null;
  const canSeePrices = !isGuest;
  const observerReason = attendee?.canBid === false ? attendee.readOnlyReason?.trim() ?? null : null;
  const observerNeedsPaymentMethod = (observerReason ?? '').toLowerCase().includes('medio de pago');
  const timerLabel = !isEndedAuction && !isUpcomingAuction && !isActiveLot
    ? 'En espera'
    : formatCountdown(
        localSeconds ?? live?.secondsRemaining,
        isEndedAuction || (!isUpcomingAuction && isActiveLot && (localSeconds ?? live?.secondsRemaining ?? 0) <= 0)
      );
  const currentOffer = live?.currentOffer ?? lot?.currentOffer ?? lot?.basePrice ?? 0;
  const minimumBid = live?.minimumNextBid ?? Math.max(currentOffer + Math.round(currentOffer * 0.01), currentOffer + 1);
  const maximumBid = live?.maximumNextBid ?? null;
  const lotImage = lot?.image ?? lot?.gallery?.[0];
  const quickSuggestions = useMemo(() => {
    const suggestionFive = Math.max(minimumBid, currentOffer + Math.round((lot?.basePrice ?? currentOffer) * 0.05));
    const suggestions = [minimumBid, suggestionFive];

    if (typeof maximumBid === 'number' && maximumBid > 0) {
      suggestions.push(maximumBid);
    }

    return Array.from(new Set(suggestions.filter((value) => Number.isFinite(value) && value > 0)));
  }, [currentOffer, lot?.basePrice, maximumBid, minimumBid]);

  useEffect(() => {
    noticeRef.current = notice;
  }, [notice]);

  // Countdown local suave: sincroniza con el servidor y decrementa cada 1s
  useEffect(() => {
    if (live?.secondsRemaining == null || !isActiveLot || isEndedAuction) {
      setLocalSeconds(null);
      return;
    }
    // Sincroniza con el valor del servidor
    setLocalSeconds(live.secondsRemaining);
  }, [live?.secondsRemaining, isActiveLot, isEndedAuction]);

  useEffect(() => {
    if (localSeconds == null || localSeconds <= 0 || isEndedAuction) return;
    const timer = setInterval(() => {
      setLocalSeconds((prev) => (prev != null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [localSeconds == null, isEndedAuction]); // solo re-monta cuando cambia el "activo" state

  useEffect(() => {
    if (!session?.userId || !auction?.id) {
      return;
    }

    const cachedAttendee = getCachedAuctionAttendeeRegistration(auction.id, session.userId);
    if (cachedAttendee) {
      setAttendee(cachedAttendee);
    }
  }, [auction?.id, session?.userId]);

  useEffect(() => {
    settledLotRef.current = null;
    autoAdvanceSourceLotRef.current = null;
  }, [lot?.itemId]);

  const updateLiveStatus = useCallback(
    async (auctionIdValue: number, itemIdValue: number) => {
      const nextLive = await getLiveBidStatus(auctionIdValue, itemIdValue);
      const previous = liveRef.current;
      liveRef.current = nextLive;
      setLive(nextLive);
      // Sincroniza el countdown local con el valor del servidor
      if (nextLive.secondsRemaining != null && nextLive.activeLot) {
        setLocalSeconds(nextLive.secondsRemaining);
      }

      if (
        previous &&
        previous.currentOffer !== nextLive.currentOffer &&
        nextLive.lastBidder &&
        !(noticeRef.current?.kind === 'success' && noticeRef.current.text.includes(formatCurrency(previous.currentOffer, auction?.currency)))
      ) {
        setNotice({
          kind: 'info',
          text: `${nextLive.lastBidder} pujó ${formatCurrency(nextLive.currentOffer, auction?.currency)}.`,
        });
      }
    },
    [auction?.currency]
  );

  const findNextActiveCatalogItem = useCallback(async () => {
    if (!auction?.catalog.items?.length || !lot) {
      return null;
    }

    for (const item of auction.catalog.items) {
      if (item.itemId === lot.itemId) {
        continue;
      }

      try {
        const candidateStatus = await getLiveBidStatus(auction.id, item.itemId);
        if (candidateStatus.activeLot) {
          return item.itemId;
        }
      } catch {
        // Ignore lookup failures while checking the next active lot.
      }
    }

    return null;
  }, [auction, lot]);

  const loadClosedLotResult = useCallback(async () => {
    if (isGuest || !session?.token || !auction || !lot) {
      return null;
    }

    try {
      const bidResult = await getBidResult(auction.id, lot.itemId, session.token);
      setResult(bidResult);
      return bidResult;
    } catch {
      setResult(null);
      return null;
    }
  }, [auction, isGuest, lot, session?.token]);

  const loadRoom = useCallback(async () => {
    if (!Number.isFinite(itemId) || itemId <= 0 || !Number.isFinite(auctionId) || auctionId <= 0) {
      setError('No encontramos el lote o la subasta.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setNotice(null);
      setLive(null);
      setResult(null);
      setAmount('');
      setAttendee(null);

      const [nextAuction, nextLot] = await Promise.all([
        getAuctionDetail(auctionId),
        getLotDetail(auctionId, itemId),
      ]);

      setAuction(nextAuction);
      setLot(nextLot);
      const nextMethods = isGuest ? [] : await listUserPaymentMethods(session.userId!, session.token!);
      const nextAuctionCurrency = (nextAuction.currency ?? 'ARS').trim().toUpperCase();
      const nextCompatibleMethods = nextMethods.filter((method) => {
        if (method.type === 'card') {
          if (nextAuctionCurrency === 'ARS') {
            return true;
          }
          return method.internationalCard === true;
        }

        if ((method.currency ?? '').trim().toUpperCase() !== nextAuctionCurrency) {
          return false;
        }

        if (method.type === 'check' && typeof method.auctionId === 'number' && nextAuction.id > 0) {
          return method.auctionId === nextAuction.id;
        }

        return true;
      });
      setPaymentMethods(nextMethods);
      setSelectedPaymentMethodId((current) => {
        if (current && nextCompatibleMethods.some((method) => method.id === current)) {
          return current;
        }
        return nextCompatibleMethods.find((method) => (method.status ?? '').trim().toLowerCase() === 'verificado')?.id ?? null;
      });

      const normalizedAuctionStatus = normalizeStatus(nextAuction.status);

      if (normalizedAuctionStatus === 'en_vivo') {
        try {
          const nextLive = await getLiveBidStatus(nextAuction.id, nextLot.itemId);
          liveRef.current = nextLive;
          setLive(nextLive);

          if (normalizeStatus(nextLive.auctioned) === 'si' && !isGuest) {
            try {
              const bidResult = await getBidResult(nextAuction.id, nextLot.itemId, session?.token ?? '');
              setResult(bidResult);
            } catch {
              setResult(null);
            }
          } else {
            setResult(null);
          }
        } catch {
          setLive(null);
          setResult(null);
        }
      } else if (normalizedAuctionStatus === 'finalizada' && !isGuest) {
        try {
          const bidResult = await getBidResult(nextAuction.id, nextLot.itemId, session?.token ?? '');
          setResult(bidResult);
        } catch {
          setResult(null);
        }
      } else {
        setLive(null);
        setResult(null);
      }

      setAmount(formatAmountInput(nextLot.currentOffer ?? nextLot.basePrice ?? 0));
    } catch (loadError) {
      setAuction(null);
      setLot(null);
      setLive(null);
      setResult(null);
      setAttendee(null);
      setPaymentMethods([]);
      setError(getApiErrorMessage(loadError, 'No pudimos cargar la sala de puja.'));
    } finally {
      setIsLoading(false);
    }
  }, [auctionId, itemId, isGuest, session?.token, session?.userId, updateLiveStatus]);

  const registerAuctionEntry = useCallback(async (options?: { force?: boolean }) => {
    if (isGuest || !session?.token || !session.userId || !auction || !lot) {
      return;
    }

    if (normalizeStatus(auction.status) !== 'en_vivo') {
      return;
    }

    if (!options?.force && attendee) {
      return;
    }

    if (!selectedPaymentMethodId) {
      setNotice({
        kind: 'info',
        text: 'Elegí un medio de pago verificado antes de entrar a la subasta.',
      });
      return;
    }

    if (!options?.force) {
      const cachedAttendee = getCachedAuctionAttendeeRegistration(auction.id, session.userId);
      if (cachedAttendee) {
        setAttendee(cachedAttendee);
        return;
      }
    }

    setIsRegistering(true);

    try {
      const nextAttendee = await ensureAuctionAttendeeRegistration({
        auctionId: auction.id,
        userId: session.userId,
        token: session.token,
        paymentMethodId: Number(selectedPaymentMethodId),
      });
      setAttendee(nextAttendee);
      setSelectedPaymentMethodId(
        nextAttendee.paymentMethodId != null ? String(nextAttendee.paymentMethodId) : selectedPaymentMethodId
      );

      if (nextAttendee.canBid === true && nextAttendee.attendeeId != null) {
        setNotice({
          kind: 'success',
          text:
            nextAttendee.bidderNumber != null
              ? `Ya podés pujar. Tu número de postor es ${nextAttendee.bidderNumber}.`
              : 'Ya podés pujar en esta sala.',
        });
      } else if (nextAttendee.readOnlyReason) {
        setNotice({
          kind: 'info',
          text: nextAttendee.readOnlyReason,
        });
      }
    } catch (registerError) {
      setNotice({
        kind: 'error',
        text: getApiErrorMessage(registerError, 'No pudimos registrarte en la sala.'),
      });
    } finally {
      setIsRegistering(false);
    }
  }, [attendee, auction, isGuest, lot, selectedPaymentMethodId, session?.token, session?.userId]);

  useFocusEffect(
    useCallback(() => {
      void loadRoom();
    }, [loadRoom])
  );

  useEffect(() => {
    if (!session?.token || !auction || !lot) {
      return;
    }

    if (!isLiveAuction) {
      return;
    }

    const interval = setInterval(() => {
      void updateLiveStatus(auction.id, lot.itemId);
    }, 12000);

    return () => clearInterval(interval);
  }, [auction, isLiveAuction, lot, session?.token, updateLiveStatus]);

  useEffect(() => {
    if (!auction || !lot || !isUpcomingAuction) {
      return;
    }

    const interval = setInterval(() => {
      void loadRoom();
    }, 15000);

    return () => clearInterval(interval);
  }, [auction, isUpcomingAuction, loadRoom, lot]);

  useEffect(() => {
    if (!auction || !lot || !live) {
      return;
    }

    if (normalizeStatus(live.auctioned) !== 'si') {
      return;
    }

    if (settledLotRef.current === lot.itemId) {
      return;
    }

    settledLotRef.current = lot.itemId;

    void (async () => {
      const bidResult = await loadClosedLotResult();
      const currentUserWon =
        bidResult != null &&
        attendee?.bidderNumber != null &&
        bidResult.winner.bidderNumber === attendee.bidderNumber;

      if (currentUserWon) {
        setNotice({
          kind: 'success',
          text: `Ganaste ${lot.lotCode} con ${formatCurrency(bidResult.winningBid, auction.currency)}.`,
        });
        // Dispara check de multas despues de 3s para que el backend procese
        if (!isGuest && session?.userId && session?.token) {
          const { userId, token } = session;
          setTimeout(() => {
            void getPendingFine(userId, token).catch(() => null);
          }, 3000);
        }
      } else if (bidResult) {
        setNotice({
          kind: 'info',
          text: `${lot.lotCode} finalizó. Ganó ${bidResult.winner.name ?? 'el mejor postor'} con ${formatCurrency(bidResult.winningBid, auction.currency)}.`,
        });
      }

      if (normalizeStatus(auction.status) !== 'en_vivo') {
        return;
      }

      if (currentUserWon && bidResult) {
        const nextItemId = normalizeStatus(auction.status) === 'en_vivo'
          ? await findNextActiveCatalogItem()
          : null;
        router.replace({
          pathname: '/lot/[id]/won',
          params: {
            id: String(lot.itemId),
            auctionId: String(auction.id),
            nextItemId: nextItemId != null ? String(nextItemId) : '',
          },
        });
        return;
      }

      const nextItemId = await findNextActiveCatalogItem();
      if (nextItemId == null || autoAdvanceSourceLotRef.current === lot.itemId) {
        return;
      }

      autoAdvanceSourceLotRef.current = lot.itemId;
      setTimeout(() => {
        router.replace({
          pathname: '/lot/[id]/room',
          params: { id: String(nextItemId), auctionId: String(auction.id) },
        });
      }, 1600);
    })();
  }, [attendee?.bidderNumber, auction, findNextActiveCatalogItem, live, loadClosedLotResult, lot]);

  const handleEnterRoom = async () => {
    if (isGuest || !session?.token || !auction) {
      return;
    }

    setAttendee(null);
    await registerAuctionEntry({ force: true });
  };

  const handleSubmitBid = async () => {
    if (!canBid || !session?.token || !auction || !lot || !attendeeId) {
      return;
    }
    const paymentMethodId = Number(selectedPaymentMethodId ?? attendee?.paymentMethodId ?? 0);
    if (!paymentMethodId) {
      setNotice({ kind: 'error', text: 'Elegí un medio de pago antes de pujar.' });
      return;
    }

    const nextAmount = parseAmount(amount);
    if (nextAmount <= 0) {
      setNotice({ kind: 'error', text: 'Ingresá un monto válido.' });
      return;
    }

    setIsSubmitting(true);
    setNotice(null);

    try {
      const response = await placeBid(auction.id, lot.itemId, session.token, {
        attendeeId,
        paymentMethodId,
        amount: nextAmount,
      });

      setAmount(formatAmountInput(response.newMinimum));
      setNotice({
        kind: 'success',
        text: `Puja registrada: ${formatCurrency(response.amount, auction.currency)}.`,
      });
      await updateLiveStatus(auction.id, lot.itemId);
    } catch (bidError) {
      setNotice({
        kind: 'error',
        text: getApiErrorMessage(bidError, 'No pudimos registrar la puja.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSuggestion = (value: number) => {
    setAmount(formatAmountInput(value));
  };

  const handleGoToCatalog = useCallback(() => {
    if (!Number.isFinite(catalogAuctionId) || catalogAuctionId <= 0) {
      return;
    }

    router.replace(`/auction/${catalogAuctionId}`);
  }, [catalogAuctionId]);

  const handleLeaveRoom = useCallback(async () => {
    if (!auction || !session?.token || !session.userId || isLeaving) {
      return;
    }

    try {
      setIsLeaving(true);
      await leaveAuctionRoom(auction.id, session.token);
      clearAuctionAttendeeRegistration(auction.id, session.userId);
      setAttendee(null);
      router.replace(`/auction/${auction.id}`);
    } catch (leaveError) {
      setNotice({
        kind: 'error',
        text: getApiErrorMessage(leaveError, 'No pudimos salir de la sala.'),
      });
    } finally {
      setIsLeaving(false);
    }
  }, [auction, isLeaving, session?.token, session?.userId]);

  const handleOpenWinnerMessages = useCallback(() => {
    setWinnerOverlay(null);
    router.push('/notifications');
  }, []);

  const handleOpenWinnerPayment = useCallback(() => {
    if (!winnerOverlay) {
      return;
    }

    setWinnerOverlay(null);
    router.push(`/won-items/${winnerOverlay.result.itemId}/payment`);
  }, [winnerOverlay]);

  const handleReturnToAuction = useCallback(() => {
    const nextItemId = winnerOverlay?.nextItemId;
    setWinnerOverlay(null);

    if (nextItemId == null || !auction) {
      return;
    }

    router.replace({
      pathname: '/lot/[id]/room',
      params: { id: String(nextItemId), auctionId: String(auction.id) },
    });
  }, [auction, winnerOverlay]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator color={C.brown} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !auction || !lot) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Feather name="alert-triangle" size={26} color={C.red} />
          <Text style={styles.errorTitle}>No pudimos abrir la sala</Text>
          <Text style={styles.errorText}>{error ?? 'Volvé a intentar en unos segundos.'}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleGoToCatalog}>
            <Text style={styles.primaryButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const noticeStyle = notice ? mapNoticeType(notice.kind) : null;
  const winnerTotalToPay = winnerOverlay?.result.totalToPay ?? 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.hero}>
            {lotImage ? (
              <Image source={{ uri: lotImage }} style={styles.heroImage} />
            ) : (
              <View style={[styles.heroImage, styles.imagePlaceholder]}>
                <Feather name="image" size={28} color="#D6DFEC" />
                <Text style={styles.imagePlaceholderText}>Sin foto</Text>
              </View>
            )}
            <View style={styles.heroOverlay} />

            <View style={styles.topRow}>
              <TouchableOpacity style={styles.backButton} onPress={handleGoToCatalog}>
                <Feather name="arrow-left" size={22} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.badgesRow}>
                {isLiveAuction ? (
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                ) : null}
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{normalizeStatus(auction.category).toUpperCase()}</Text>
                </View>
              </View>
            </View>

            {attendee?.attendeeId != null || attendee?.accessMode === 'observer' ? (
              <TouchableOpacity
                style={[styles.leaveRoomButton, isLeaving && styles.leaveRoomButtonDisabled]}
                onPress={handleLeaveRoom}
                disabled={isLeaving}
              >
                <Text style={styles.leaveRoomButtonText}>{isLeaving ? 'Saliendo...' : 'Salir de la sala'}</Text>
              </TouchableOpacity>
            ) : null}

            {notice ? (
              <View style={[styles.noticeCard, { backgroundColor: noticeStyle?.background ?? C.white }]}>
                <Feather name={noticeStyle?.icon ?? 'info'} size={16} color={noticeStyle?.color ?? C.brown} />
                <Text style={[styles.noticeText, { color: noticeStyle?.color ?? C.textDark }]} numberOfLines={2}>
                  {notice.text}
                </Text>
                <TouchableOpacity onPress={() => setNotice(null)}>
                  <Feather name="x" size={16} color={noticeStyle?.color ?? C.textMid} />
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.heroCopy}>
              <Text style={styles.lotCategory}>{normalizeStatus(lot.category)}</Text>
              <Text style={styles.lotTitle}>{lot.title}</Text>
              <Text style={styles.lotMeta}>
                {auction.auctioneer?.name ?? 'Rematador'} · {lot.lotCode} · {formatDateLabel(auction.date)}
              </Text>
            </View>
          </View>

          <View style={styles.catalogStrip}>
            <View style={styles.catalogStripHeader}>
              <Feather name="book-open" size={14} color={C.textMid} />
              <Text style={styles.catalogStripTitle}>CATÁLOGO DE LOTES</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailRow}>
              {auction.catalog.items.map((item) => {
                const active = item.itemId === lot.itemId;

                return (
                  <TouchableOpacity
                    key={item.itemId}
                    onPress={() => {
                      if (active) return; // Si ya esta en este lote, no hacer nada
                      
                      router.replace({
                        pathname: '/lot/[id]/room',
                        params: { id: String(item.itemId), auctionId: String(auction.id) },
                      })
                    }}
                    activeOpacity={0.82}
                    style={[styles.thumbnailWrap, active && styles.thumbnailWrapActive]}
                  >
                    {item.thumbnailUrl ? (
                      <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
                    ) : (
                      <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                        <Feather name="image" size={18} color="#AAB9CD" />
                      </View>
                    )}
                    <Text style={styles.thumbnailLabel}>{item.lotCode}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusMeta}>
              <Feather name="users" size={13} color={C.orange} />
              <Text style={styles.statusMetaText}>{live?.totalBids ?? 0} ofertas</Text>
              <Text style={styles.statusMetaSub}>última: {live?.lastBidder ?? '—'}</Text>
            </View>
            <View style={[styles.timerPill, isEndedAuction && styles.timerPillEnded]}>
              <Feather name="clock" size={13} color={isEndedAuction ? C.green : '#FFD9B5'} />
              <Text style={[styles.timerText, isEndedAuction && styles.timerTextEnded]}>
                {timerLabel}
              </Text>
            </View>
          </View>

          <View style={styles.bidCard}>
            <Text style={styles.bidCardLabel}>OFERTA ACTUAL</Text>
            <Text style={styles.bidCardAmount}>{canSeePrices ? formatCurrency(currentOffer, auction?.currency) : 'Precio reservado'}</Text>

            {isGuest ? (
              <View style={styles.observerCard}>
                <Feather name="eye" size={18} color={C.orange} />
                <Text style={styles.observerTitle}>Modo observador</Text>
                <Text style={styles.observerText}>
                  Estás viendo la subasta en tiempo real. Iniciá sesión para pujar.
                </Text>
              </View>
            ) : isUpcomingAuction ? (
              <View style={styles.observerCard}>
                <Feather name="clock" size={18} color={C.orange} />
                <Text style={styles.observerTitle}>La subasta comienza pronto</Text>
                <Text style={styles.observerText}>Podrás pujar cuando el lote quede habilitado.</Text>
              </View>
            ) : !isEndedAuction && attendee?.canBid === true && !isActiveLot ? (
              <View style={styles.observerCard}>
                <Feather name="clock" size={18} color={C.orange} />
                <Text style={styles.observerTitle}>Esperando turno del lote</Text>
                <Text style={styles.observerText}>Este lote todavía no está habilitado. La subasta avanza automáticamente al siguiente lote cuando vence el minuto sin nuevas pujas.</Text>
              </View>
            ) : isEndedAuction ? (
              <View style={styles.observerCard}>
                <Feather name="check-circle" size={18} color={C.green} />
                <Text style={styles.observerTitle}>Puja terminada</Text>
                <Text style={styles.observerText}>
                  {result
                    ? `Ganó ${result.winner.name ?? 'el mejor postor'} con ${formatCurrency(result.winningBid, auction?.currency)}.`
                    : 'El lote ya fue adjudicado o está cerrado.'}
                </Text>
              </View>
            ) : isRegistering && !attendee ? (
              <View style={styles.observerCard}>
                <ActivityIndicator size="small" color={C.orange} />
                <Text style={styles.observerTitle}>Validando acceso</Text>
                <Text style={styles.observerText}>Estamos confirmando si podés pujar o si entrás como observador.</Text>
              </View>
            ) : observerReason ? (
              <View style={styles.observerCard}>
                <Feather name={observerNeedsPaymentMethod ? 'credit-card' : 'eye'} size={18} color={C.orange} />
                <Text style={styles.observerTitle}>Modo observador</Text>
                <Text style={styles.observerText}>{observerReason}</Text>
                {observerNeedsPaymentMethod ? (
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/payment-methods/new')}>
                    <Text style={styles.secondaryButtonText}>Agregar medio de pago</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : !attendee ? (
              <View style={styles.observerCard}>
                <Feather name="user-check" size={18} color={C.orange} />
                <Text style={styles.observerTitle}>Entrar a la sala</Text>
                <Text style={styles.observerText}>
                  Antes de ingresar, elegí con qué medio verificado vas a operar en esta subasta.
                </Text>
                <View style={styles.paymentMethodPicker}>
                  {hasPaymentMethods ? (
                    compatiblePaymentMethods.map((method) => {
                      const status = (method.status ?? '').trim().toLowerCase();
                      const selected = selectedPaymentMethodId === method.id;
                      const disabled = status !== 'verificado';
                      return (
                        <TouchableOpacity
                          key={method.id}
                          style={[
                            styles.paymentMethodOption,
                            selected && styles.paymentMethodOptionSelected,
                            disabled && styles.paymentMethodOptionDisabled,
                          ]}
                          disabled={disabled}
                          onPress={() => setSelectedPaymentMethodId(method.id)}
                        >
                          <View style={styles.paymentMethodOptionHeader}>
                            <Text style={styles.paymentMethodOptionTitle}>{method.title}</Text>
                            <Text style={[
                              styles.paymentMethodStatusBadge,
                              status === 'verificado'
                                ? styles.paymentMethodStatusVerified
                                : status === 'rechazado'
                                  ? styles.paymentMethodStatusRejected
                                  : styles.paymentMethodStatusPending,
                            ]}>
                              {status === 'verificado' ? 'VERIFICADO' : status === 'rechazado' ? 'RECHAZADO' : 'PENDIENTE'}
                            </Text>
                          </View>
                          <Text style={styles.paymentMethodOptionSubtitle}>{method.subtitle}</Text>
                          {method.reviewNote ? <Text style={styles.paymentMethodOptionNote}>{method.reviewNote}</Text> : null}
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <Text style={styles.observerText}>
                      {paymentMethods.length === 0
                        ? 'Todavía no cargaste medios de pago.'
                        : 'No tenés medios compatibles con la moneda de esta subasta.'}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={hasVerifiedPaymentMethods ? () => void handleEnterRoom() : () => router.push('/payment-methods/new')}
                  disabled={isRegistering}
                >
                  <Text style={styles.secondaryButtonText}>
                    {isRegistering ? 'Verificando...' : hasVerifiedPaymentMethods ? 'Entrar con el medio elegido' : 'Agregar medio de pago'}
                  </Text>
                </TouchableOpacity>
                {!hasVerifiedPaymentMethods ? (
                  <TouchableOpacity style={styles.secondaryButtonGhost} onPress={() => router.push('/payment-methods/new')}>
                    <Text style={styles.secondaryButtonGhostText}>Cargar nuevo medio</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : !canBid ? (
              <View style={styles.observerCard}>
                <Feather name="user-check" size={18} color={C.orange} />
                <Text style={styles.observerTitle}>Modo observador</Text>
                <Text style={styles.observerText}>
                  {hasPaymentMethods
                    ? paymentBalance > 0
                      ? 'Todavía no pudimos habilitar la puja con el medio elegido. Reintentá después de la revisión o seleccioná otro verificado.'
                      : 'Tu acceso está en revisión o el medio elegido no tiene saldo/límite disponible para este lote.'
                    : 'Podés seguir la subasta en tiempo real aunque todavía no tengas acceso para pujar.'}
                </Text>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={
                    hasPaymentMethods
                      ? () => void handleEnterRoom()
                      : () => router.push('/payment-methods/new')
                  }
                  disabled={isRegistering}
                >
                  <Text style={styles.secondaryButtonText}>
                    {hasPaymentMethods
                      ? isRegistering
                        ? 'Verificando...'
                        : 'Reintentar acceso'
                      : 'Agregar medio de pago'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.inputRow}>
                  <Feather name="dollar-sign" size={15} color={C.orange} />
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="Ingresá tu oferta..."
                    placeholderTextColor="#9EABC0"
                    keyboardType="numeric"
                    style={styles.amountInput}
                  />
                </View>

                <View style={styles.quickRow}>
                  {quickSuggestions.map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion}
                      style={styles.quickChip}
                      onPress={() => handleQuickSuggestion(suggestion)}
                    >
                      <Text style={styles.quickChipText}>
                        {suggestion === maximumBid ? 'Máx' : formatCurrency(suggestion, auction?.currency)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.bidHint}>
                  {maximumBid
                    ? `Mínimo: ${canSeePrices ? formatCurrency(minimumBid, auction?.currency) : '--'}. Máximo: ${canSeePrices ? formatCurrency(maximumBid, auction?.currency) : '--'}.`
                    : `Esta subasta ${normalizeStatus(auction.category)} no tiene límites porcentuales de puja. La oferta solo debe superar la actual.`}
                </Text>

                <TouchableOpacity
                  style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
                  onPress={handleSubmitBid}
                  disabled={isSubmitting}
                >
                  <Text style={styles.primaryButtonText}>{isSubmitting ? 'ENVIANDO...' : 'PUJAR AHORA'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>

        <Modal visible={winnerOverlay != null} transparent animationType="fade" onRequestClose={handleReturnToAuction}>
          <View style={styles.overlayBackdrop}>
            <View style={styles.winnerModal}>
              <View style={styles.winnerHero}>
                <View style={styles.winnerHeroIcon}>
                  <Feather name="award" size={30} color="#16A34A" />
                </View>
                <Text style={styles.winnerHeroTitle}>Felicitaciones</Text>
                <Text style={styles.winnerHeroSubtitle}>Ganaste la subasta</Text>
              </View>

              <View style={styles.winnerSummaryCard}>
                <Text style={styles.winnerLotCode}>{winnerOverlay?.result.lotCode}</Text>
                <Text style={styles.winnerLotTitle} numberOfLines={2}>
                  {winnerOverlay?.result.title ?? lot.title}
                </Text>
                <Text style={styles.winnerAuctionName} numberOfLines={1}>
                  {winnerOverlay?.result.auctionName ?? auction.name}
                </Text>
              </View>

              <View style={styles.winnerBidCard}>
                <Text style={styles.winnerBidLabel}>Tu oferta ganadora</Text>
                <Text style={styles.winnerBidAmount}>{formatCurrency(winnerOverlay?.result.winningBid, auction.currency)}</Text>
              </View>

              <View style={styles.winnerBreakdownCard}>
                <Text style={styles.winnerBreakdownTitle}>Estimación de pago total</Text>
                <View style={styles.winnerBreakdownRow}>
                  <Text style={styles.winnerBreakdownLabel}>Puja ganadora</Text>
                  <Text style={styles.winnerBreakdownValue}>{formatCurrency(winnerOverlay?.result.winningBid, auction.currency)}</Text>
                </View>
                <View style={styles.winnerBreakdownRow}>
                  <Text style={styles.winnerBreakdownLabel}>
                    Comisión ({Math.round(winnerOverlay?.result.commissionPercentage ?? 0)}%)
                  </Text>
                  <Text style={styles.winnerBreakdownValue}>{formatCurrency(winnerOverlay?.result.commissionAmount, auction.currency)}</Text>
                </View>
                <View style={styles.winnerBreakdownRow}>
                  <Text style={styles.winnerBreakdownLabel}>Envío estimado</Text>
                  <Text style={styles.winnerBreakdownValue}>{formatCurrency(winnerTotalToPay - (winnerOverlay?.result.winningBid ?? 0) - (winnerOverlay?.result.commissionAmount ?? 0), auction.currency)}</Text>
                </View>
                <View style={styles.winnerBreakdownDivider} />
                <View style={styles.winnerBreakdownRow}>
                  <Text style={styles.winnerBreakdownTotalLabel}>Total estimado</Text>
                  <Text style={styles.winnerBreakdownTotalValue}>{formatCurrency(winnerTotalToPay, auction.currency)}</Text>
                </View>
              </View>

              <View style={styles.winnerStepsCard}>
                <Text style={styles.winnerStepsTitle}>Próximos pasos</Text>
                <Text style={styles.winnerStepText}>1. Revisá el mensaje privado con los detalles del pago.</Text>
                <Text style={styles.winnerStepText}>2. Confirmá el pago con el medio seleccionado.</Text>
                <Text style={styles.winnerStepText}>3. Elegí entre envío a domicilio o retiro personal.</Text>
              </View>

              <TouchableOpacity style={styles.winnerPrimaryButton} onPress={handleOpenWinnerMessages}>
                <Feather name="mail" size={16} color="#FFFFFF" />
                <Text style={styles.winnerPrimaryButtonText}>Ver mensaje privado</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.winnerSecondaryButton} onPress={handleOpenWinnerPayment}>
                <Feather name="credit-card" size={16} color={C.brown} />
                <Text style={styles.winnerSecondaryButtonText}>Ir a pagar ahora</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.winnerReturnButton} onPress={handleReturnToAuction}>
                <Text style={styles.winnerReturnButtonText}>Volver a la subasta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#182238' },
  container: { flex: 1, backgroundColor: '#182238' },
  scrollContent: { paddingBottom: 26, backgroundColor: '#182238' },
  hero: {
    height: 330,
    position: 'relative',
    backgroundColor: C.brownDeep,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    backgroundColor: '#D9E2EF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imagePlaceholderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 18, 13, 0.46)',
  },
  topRow: {
    paddingTop: 18,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveRoomButton: {
    alignSelf: 'flex-end',
    marginTop: 10,
    marginRight: 14,
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  leaveRoomButtonDisabled: {
    opacity: 0.6,
  },
  leaveRoomButtonText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '700',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveBadge: {
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
  categoryBadge: {
    backgroundColor: 'rgba(0,0,0,0.34)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  categoryBadgeText: {
    color: '#FFB65D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  noticeCard: {
    marginTop: 12,
    marginHorizontal: 14,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  heroCopy: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 18,
  },
  lotCategory: {
    color: '#FFB65D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  lotTitle: {
    color: C.white,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 29,
    marginBottom: 8,
  },
  lotMeta: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 12,
  },
  catalogStrip: {
    backgroundColor: '#182238',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
  },
  catalogStripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  catalogStripTitle: {
    color: '#32415D',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  thumbnailRow: {
    gap: 10,
    paddingRight: 14,
  },
  thumbnailWrap: {
    width: 66,
    alignItems: 'center',
    gap: 6,
    padding: 2,
    borderRadius: 12,
  },
  thumbnailWrapActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#263149',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailLabel: {
    color: '#FFB65D',
    fontSize: 9,
    fontWeight: '700',
  },
  statusRow: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#182238',
  },
  statusMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  statusMetaText: {
    color: '#B7C4DB',
    fontSize: 12,
    fontWeight: '700',
  },
  statusMetaSub: {
    color: '#8392AB',
    fontSize: 12,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#C63E49',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  timerPillEnded: {
    backgroundColor: '#E9F7ED',
  },
  timerText: {
    color: '#FFD7DB',
    fontSize: 11,
    fontWeight: '800',
  },
  timerTextEnded: {
    color: C.green,
  },
  bidCard: {
    backgroundColor: '#233148',
    borderRadius: 26,
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 20,
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 22,
    minHeight: 330,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  bidCardLabel: {
    color: '#8EA1BE',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  bidCardAmount: {
    color: C.white,
    fontSize: 38,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  observerCard: {
    backgroundColor: '#24314A',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 8,
  },
  observerTitle: {
    color: C.white,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  observerText: {
    color: '#B7C4DB',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  paymentMethodPicker: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  paymentMethodOption: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: '#1B2538',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
  },
  paymentMethodOptionSelected: {
    borderColor: '#FFB65D',
    backgroundColor: '#2A344A',
  },
  paymentMethodOptionDisabled: {
    opacity: 0.7,
  },
  paymentMethodOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  paymentMethodOptionTitle: {
    color: C.white,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  paymentMethodOptionSubtitle: {
    color: '#B7C4DB',
    fontSize: 11,
  },
  paymentMethodOptionNote: {
    color: '#8FA1BD',
    fontSize: 11,
    lineHeight: 16,
  },
  paymentMethodStatusBadge: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  paymentMethodStatusVerified: {
    color: '#0F9F4B',
    backgroundColor: '#ECFDF3',
  },
  paymentMethodStatusPending: {
    color: '#FFB65D',
    backgroundColor: 'rgba(255, 182, 93, 0.14)',
  },
  paymentMethodStatusRejected: {
    color: '#FF7B7B',
    backgroundColor: 'rgba(255, 123, 123, 0.12)',
  },
  secondaryButton: {
    marginTop: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFB65D',
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#FFB65D',
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryButtonGhost: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  secondaryButtonGhostText: {
    color: '#B7C4DB',
    fontSize: 12,
    fontWeight: '700',
  },
  inputRow: {
    backgroundColor: '#233148',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  amountInput: {
    flex: 1,
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  quickChip: {
    flex: 1,
    backgroundColor: '#31425D',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChipText: {
    color: '#D7E2F4',
    fontSize: 11,
    fontWeight: '700',
  },
  bidHint: {
    color: '#AEBED6',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: C.brown,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  overlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(12, 18, 31, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 28,
  },
  winnerModal: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    gap: 14,
  },
  winnerHero: {
    backgroundColor: '#0DB35B',
    borderRadius: 22,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
  },
  winnerHeroIcon: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  winnerHeroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  winnerHeroSubtitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  winnerSummaryCard: {
    borderRadius: 18,
    backgroundColor: '#F8FAFD',
    borderWidth: 1,
    borderColor: '#E7EDF6',
    padding: 14,
    gap: 4,
  },
  winnerLotCode: {
    color: '#9AA8BC',
    fontSize: 11,
    fontWeight: '700',
  },
  winnerLotTitle: {
    color: '#25344C',
    fontSize: 21,
    fontWeight: '800',
    lineHeight: 26,
  },
  winnerAuctionName: {
    color: '#7E8FA8',
    fontSize: 13,
  },
  winnerBidCard: {
    borderRadius: 18,
    backgroundColor: '#FFF9EC',
    borderWidth: 1,
    borderColor: '#F7DB95',
    padding: 16,
  },
  winnerBidLabel: {
    color: '#D97706',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  winnerBidAmount: {
    color: '#653728',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 6,
  },
  winnerBreakdownCard: {
    borderRadius: 18,
    backgroundColor: '#F8FAFD',
    borderWidth: 1,
    borderColor: '#E7EDF6',
    padding: 16,
    gap: 8,
  },
  winnerBreakdownTitle: {
    color: '#66758C',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  winnerBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  winnerBreakdownLabel: {
    color: '#51637E',
    fontSize: 14,
    flex: 1,
  },
  winnerBreakdownValue: {
    color: '#25344C',
    fontSize: 14,
    fontWeight: '700',
  },
  winnerBreakdownDivider: {
    height: 1,
    backgroundColor: '#E0E8F3',
    marginTop: 2,
  },
  winnerBreakdownTotalLabel: {
    color: '#25344C',
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  winnerBreakdownTotalValue: {
    color: '#653728',
    fontSize: 18,
    fontWeight: '900',
  },
  winnerStepsCard: {
    borderRadius: 18,
    backgroundColor: '#EEF5FF',
    borderWidth: 1,
    borderColor: '#D5E5FF',
    padding: 16,
    gap: 6,
  },
  winnerStepsTitle: {
    color: '#274C8E',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  winnerStepText: {
    color: '#345A9D',
    fontSize: 14,
    lineHeight: 20,
  },
  winnerPrimaryButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: C.brown,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
  },
  winnerPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  winnerSecondaryButton: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1.25,
    borderColor: C.brown,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
  },
  winnerSecondaryButtonText: {
    color: C.brown,
    fontSize: 16,
    fontWeight: '800',
  },
  winnerReturnButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  winnerReturnButtonText: {
    color: '#718198',
    fontSize: 15,
    fontWeight: '600',
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
});
