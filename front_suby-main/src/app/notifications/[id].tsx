import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/auth-context';
import { useNotifications } from '@/context/notifications-context';
import { acceptProductProposal, rejectProductProposal, NotificationDetail, resolveApiAssetUrl } from '@/lib/api';
import { useFocusEffect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  card: '#FFFFFF',
  brown: '#653728',
  brownDeep: '#653728',
  text: '#25344C',
  muted: '#8FA1BD',
  soft: '#62748E',
  border: '#E4EBF4',
  green: '#16A34A',
  greenSoft: '#ECFDF3',
  red: '#FF4D4F',
  redSoft: '#FFF1F2',
  orange: '#F27A1A',
  orangeSoft: '#FFF7ED',
  blueSoft: '#EEF5FF',
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getString(data: NotificationDetail['data'] | undefined, key: string) {
  const value = data?.[key];
  return typeof value === 'string' ? value : undefined;
}

function getFlowKind(detail: NotificationDetail | null) {
  return getString(detail?.data, 'flow_kind');
}

function getLines(data: NotificationDetail['data'] | undefined, key: string) {
  const raw = getString(data, key);
  if (!raw) {
    return [];
  }

  return raw
    .split('|')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getPresentation(type: string) {
  switch (type) {
    case 'bien_aceptado':
      return {
        label: 'APROBADO',
        icon: 'check-circle' as const,
        pillBg: '#ECFDF3',
        pillColor: C.green,
      };
    case 'bien_rechazado':
      return {
        label: 'RECHAZADO',
        icon: 'x-circle' as const,
        pillBg: '#FFF1F2',
        pillColor: C.red,
      };
    case 'propuesta_precio':
      return {
        label: 'PROPUESTA',
        icon: 'message-circle' as const,
        pillBg: '#EEF5FF',
        pillColor: '#2563EB',
      };
    case 'ganador_subasta':
      return {
        label: 'SUBASTA GANADA',
        icon: 'award' as const,
        pillBg: '#ECFDF3',
        pillColor: C.green,
      };
    case 'bien_vendido':
      return {
        label: 'BIEN VENDIDO',
        icon: 'dollar-sign' as const,
        pillBg: '#ECFEFF',
        pillColor: '#0F766E',
      };
    case 'pago_pendiente':
      return {
        label: 'PAGO PENDIENTE',
        icon: 'credit-card' as const,
        pillBg: '#EEF5FF',
        pillColor: '#2563EB',
      };
    case 'pago_confirmado':
      return {
        label: 'PAGO CONFIRMADO',
        icon: 'check-circle' as const,
        pillBg: '#ECFDF3',
        pillColor: C.green,
      };
    case 'aviso_general':
      return {
        label: 'AVISO',
        icon: 'tool' as const,
        pillBg: '#FFF7ED',
        pillColor: C.orange,
      };
    case 'diferencia_saldo':
      return {
        label: 'DIFERENCIA PENDIENTE',
        icon: 'alert-triangle' as const,
        pillBg: '#FFF8E6',
        pillColor: '#D97706',
      };
    default:
      return {
        label: 'MENSAJE',
        icon: 'mail' as const,
        pillBg: '#FFF7ED',
        pillColor: C.orange,
      };
  }
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) {
    return null;
  }

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function ProductCard({
  detail,
  token,
  minimalPlaceholder = false,
}: {
  detail: NotificationDetail;
  token?: string | null;
  minimalPlaceholder?: boolean;
}) {
  const imageUri = resolveApiAssetUrl(getString(detail.data, 'image_url'));
  const productCode = getString(detail.data, 'product_code') ?? 'PRODUCTO';
  const productName = getString(detail.data, 'product_name') ?? detail.title;
  const reviewer = getString(detail.data, 'reviewed_by');

  return (
    <View style={styles.productCard}>
      {imageUri ? (
        <Image
          source={
            token
              ? { uri: imageUri, headers: { Authorization: `Bearer ${token}` } }
              : { uri: imageUri }
          }
          style={styles.productImage}
        />
      ) : (
        <View
          style={[
            styles.productImage,
            styles.productPlaceholder,
            minimalPlaceholder && styles.productPlaceholderMinimal,
          ]}
        >
          {minimalPlaceholder ? null : <Feather name="image" size={18} color={C.muted} />}
        </View>
      )}

      <View style={styles.productCopy}>
        <Text style={styles.productCode}>{productCode}</Text>
        <Text style={styles.productTitle}>{productName}</Text>
        {reviewer ? <Text style={styles.productSubtitle}>Inspeccionado por {reviewer}</Text> : null}
      </View>
    </View>
  );
}

function ApprovedContent({ detail }: { detail: NotificationDetail }) {
  const { session } = useAuth();
  const summary =
    getString(detail.data, 'summary') ??
    'Tu artículo superó la inspección. Revisá la propuesta comercial y los próximos pasos.';
  const days = getString(detail.data, 'days');
  const hours = getString(detail.data, 'hours');
  const location = getString(detail.data, 'location');
  const address = getString(detail.data, 'address');
  const basePrice = getString(detail.data, 'base_price');
  const commission = getString(detail.data, 'commission_pct');
  const netAmount = getString(detail.data, 'net_amount');
  const currency = getString(detail.data, 'currency');

  return (
    <>
      <ProductCard detail={detail} token={session?.token} />

      <View style={styles.infoCard}>
        <Text style={styles.bodyText}>{summary}</Text>
      </View>

      {(days || hours || location || address) ? (
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Datos de inspección / entrega</Text>
          <DetailRow label="Horarios disponibles" value={hours} />
          <DetailRow label="Días" value={days} />
          <DetailRow label="Lugar" value={location} />
          <DetailRow label="Dirección" value={address} />
        </View>
      ) : null}

      {(basePrice || commission || netAmount) ? (
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Condiciones económicas</Text>
          <DetailRow label="Moneda" value={currency} />
          <DetailRow label="Valor base propuesto" value={basePrice} />
          <DetailRow label="Comisión Suby" value={commission} />
          <DetailRow label="Neto estimado" value={netAmount} />
        </View>
      ) : null}

      <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
        <Text style={styles.primaryButtonText}>
          {getString(detail.data, 'cta_label') ?? 'Volver a mensajes'}
        </Text>
      </TouchableOpacity>
    </>
  );
}

function SubmissionReceivedContent({ detail }: { detail: NotificationDetail }) {
  const { session } = useAuth();
  const summary =
    getString(detail.data, 'summary') ??
    'Tu solicitud fue recibida. Revisa los datos enviados y aguarda la evaluacion del equipo.';
  const hours = getString(detail.data, 'hours');
  const days = getString(detail.data, 'days');
  const location = getString(detail.data, 'location');
  const address = getString(detail.data, 'address');
  const hasDeliveryData = Boolean(hours || days || location || address);
  const inspectionSummary =
    getString(detail.data, 'inspection_summary') ??
    (hasDeliveryData
      ? 'Tu articulo necesita ser evaluado. Abajo encontraras los datos del deposito asignado.'
      : 'El equipo te informara proximamente el lugar de entrega.');

  return (
    <>
      <ProductCard detail={detail} token={session?.token} />

      <View style={styles.infoCard}>
        <Text style={styles.bodyText}>{summary}</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Instrucciones de envio</Text>
        <Text style={styles.bodyText}>{inspectionSummary}</Text>
        {hasDeliveryData ? (
          <>
            <DetailRow label="Horarios disponibles" value={hours} />
            <DetailRow label="Dias" value={days} />
            <DetailRow label="Lugar" value={location} />
            <DetailRow label="Direccion" value={address} />
          </>
        ) : null}
      </View>
    </>
  );
}

function ProposedContent({
  detail,
  onAccept,
  onReject,
  isActionLoading,
}: {
  detail: NotificationDetail;
  onAccept: () => void;
  onReject: () => void;
  isActionLoading: boolean;
}) {
  const { session } = useAuth();
  const summary =
    getString(detail.data, 'summary') ??
    'El equipo propuso un valor base para tu artículo. Podés aceptarlo o rechazarlo desde acá.';
  const basePrice = getString(detail.data, 'base_price');
  const commission = getString(detail.data, 'commission_pct');
  const netAmount = getString(detail.data, 'net_amount');
  const currency = getString(detail.data, 'currency');

  return (
    <>
      <ProductCard detail={detail} token={session?.token} />

      <View style={styles.infoCard}>
        <Text style={styles.bodyText}>{summary}</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Propuesta comercial</Text>
        <DetailRow label="Moneda" value={currency} />
        <DetailRow label="Valor base" value={basePrice} />
        <DetailRow label="Comisión" value={commission} />
        <DetailRow label="Neto estimado" value={netAmount} />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, isActionLoading && styles.primaryButtonDisabled]}
        onPress={onAccept}
        disabled={isActionLoading}
      >
        {isActionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Aceptar propuesta</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryButton, isActionLoading && styles.secondaryButtonDisabled]}
        onPress={onReject}
        disabled={isActionLoading}
      >
        <Text style={styles.secondaryButtonText}>Rechazar propuesta</Text>
      </TouchableOpacity>
    </>
  );
}

function RejectedContent({ detail }: { detail: NotificationDetail }) {
  const { session } = useAuth();
  const summary =
    getString(detail.data, 'summary') ??
    'Tu artículo no superó la inspección. Abajo podés ver los motivos del rechazo.';
  const reasons = getLines(detail.data, 'rejection_reasons');
  const returnCost = getString(detail.data, 'return_cost');

  return (
    <>
      <ProductCard detail={detail} token={session?.token} />

      <View style={styles.infoCard}>
        <Text style={styles.bodyText}>{summary}</Text>
      </View>

      <View style={[styles.infoCard, styles.rejectionCard]}>
        <Text style={styles.sectionTitle}>Causas del rechazo</Text>
        {reasons.length > 0 ? (
          reasons.map((reason) => (
            <View key={reason} style={styles.reasonRow}>
              <Feather name="x-circle" size={16} color={C.red} />
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.bodyText}>No se informaron motivos adicionales.</Text>
        )}

        {returnCost ? (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Costo de devolución</Text>
            <Text style={styles.totalValue}>{returnCost}</Text>
          </View>
        ) : null}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
        <Text style={styles.primaryButtonText}>
          {getString(detail.data, 'cta_label') ?? 'Volver a mensajes'}
        </Text>
      </TouchableOpacity>
    </>
  );
}

function GenericContent({ detail }: { detail: NotificationDetail }) {
  const { session } = useAuth();
  const hasProductContext = Boolean(getString(detail.data, 'product_name') || getString(detail.data, 'product_id'));

  return (
    <>
      {hasProductContext ? <ProductCard detail={detail} token={session?.token} /> : null}
      <View style={styles.infoCard}>
        <Text style={styles.bodyText}>{getString(detail.data, 'summary') ?? detail.body}</Text>
      </View>
    </>
  );
}

function PaymentContent({ detail }: { detail: NotificationDetail }) {
  const { session } = useAuth();
  const itemId = getString(detail.data, 'item_id');
  const lotCode = getString(detail.data, 'lot_code');
  const itemTitle = getString(detail.data, 'item_title') ?? detail.title;
  const auctionName = getString(detail.data, 'auction_name');
  const winningBid = getString(detail.data, 'winning_bid');
  const commissionAmount = getString(detail.data, 'commission_amount');
  const shippingAmount = getString(detail.data, 'shipping_amount');
  const totalToPay = getString(detail.data, 'total_to_pay');
  const pickupSelected = getString(detail.data, 'pickup_selected') === 'si';
  const ctaLabel = getString(detail.data, 'cta_label') ?? 'Ir a pagar';
  const showPaymentButton = detail.type !== 'pago_confirmado';

  return (
    <>
      <View style={styles.productCard}>
        {resolveApiAssetUrl(getString(detail.data, 'image_url')) ? (
          <Image
            source={
              session?.token
                ? {
                    uri: resolveApiAssetUrl(getString(detail.data, 'image_url'))!,
                    headers: { Authorization: `Bearer ${session.token}` },
                  }
                : { uri: resolveApiAssetUrl(getString(detail.data, 'image_url'))! }
            }
            style={styles.productImage}
          />
        ) : (
          <View style={[styles.productImage, styles.productPlaceholder]}>
            <Feather name="image" size={18} color={C.muted} />
          </View>
        )}

        <View style={styles.productCopy}>
          <Text style={styles.productCode}>{lotCode ?? 'LOT-000'}</Text>
          <Text style={styles.productTitle}>{itemTitle}</Text>
          {auctionName ? <Text style={styles.productSubtitle}>{auctionName}</Text> : null}
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.bodyText}>{detail.body}</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Desglose de pago</Text>
        <DetailRow label="Puja ganadora" value={winningBid} />
        <DetailRow label="Comision Suby" value={commissionAmount} />
        <DetailRow label={pickupSelected ? 'Retiro personal' : 'Envio estimado'} value={pickupSelected ? 'Sin cargo' : shippingAmount} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total a pagar</Text>
          <Text style={styles.totalValue}>{totalToPay}</Text>
        </View>
      </View>

      {pickupSelected ? (
        <View style={[styles.infoCard, styles.rejectionCard]}>
          <Text style={styles.sectionTitle}>Retiro personal</Text>
          <Text style={styles.bodyText}>
            Al retirar personalmente el articulo, pierde la cobertura del seguro.
          </Text>
        </View>
      ) : null}

      {itemId && showPaymentButton ? (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push(`/won-items/${itemId}/payment` as never)}
        >
          <Text style={styles.primaryButtonText}>{ctaLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </>
  );
}

function OwnerSaleContent({ detail }: { detail: NotificationDetail }) {
  const { session } = useAuth();
  const summary =
    getString(detail.data, 'summary') ??
    'Tu bien fue vendido. Abajo podés revisar el importe, la comisión y la cuenta destino seleccionada.';
  const saleAmount = getString(detail.data, 'sale_amount');
  const commissionPct = getString(detail.data, 'commission_pct');
  const commissionAmount = getString(detail.data, 'commission_amount');
  const netAmount = getString(detail.data, 'net_amount');
  const currency = getString(detail.data, 'currency');
  const destinationAccountLabel = getString(detail.data, 'destination_account_label');
  const destinationAccountMissing = getString(detail.data, 'destination_account_missing') === 'si';
  const buyerName = getString(detail.data, 'buyer_name');
  const ctaLabel = getString(detail.data, 'cta_label') ?? (destinationAccountMissing ? 'Agregar cuenta' : 'Ver mensajes');
  const ctaTarget = getString(detail.data, 'cta_target') ?? (destinationAccountMissing ? '/payment-methods/new' : '/notifications');

  return (
    <>
      <ProductCard detail={detail} token={session?.token} />

      <View style={styles.infoCard}>
        <Text style={styles.bodyText}>{summary}</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Venta registrada</Text>
        <DetailRow label="Moneda" value={currency} />
        <DetailRow label="Importe bruto" value={saleAmount} />
        <DetailRow label="Comisión" value={commissionPct ? `${commissionPct}%` : undefined} />
        <DetailRow label="Comisión aplicada" value={commissionAmount} />
        <DetailRow label="Neto a recibir" value={netAmount} />
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Cuenta destino</Text>
        {destinationAccountMissing ? (
          <Text style={styles.bodyText}>
            No encontramos una cuenta destino verificada compatible con esta moneda. Configurá una cuenta para que podamos enviar la transferencia.
          </Text>
        ) : (
          <DetailRow label="Cuenta seleccionada" value={destinationAccountLabel} />
        )}
        {buyerName ? <DetailRow label="Comprador" value={buyerName} /> : null}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={() => router.push(ctaTarget as never)}>
        <Text style={styles.primaryButtonText}>{ctaLabel}</Text>
      </TouchableOpacity>
    </>
  );
}

function DifferenceContent({ detail }: { detail: NotificationDetail }) {
  const winningBid = getString(detail.data, 'winning_bid');
  const availableBalance = getString(detail.data, 'available_balance');
  const differenceAmount = getString(detail.data, 'difference_amount');
  const itemTitle = getString(detail.data, 'item_title') ?? detail.title;
  const auctionName = getString(detail.data, 'auction_name');
  const deadlineHours = getString(detail.data, 'deadline_hours') ?? '72';
  const ctaLabel = getString(detail.data, 'cta_label') ?? 'Pagar diferencia';

  return (
    <>
      {/* Contexto del bien */}
      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>{itemTitle}</Text>
        {auctionName ? <Text style={styles.bodyText}>{auctionName}</Text> : null}
      </View>

      {/* Alerta */}
      <View style={[styles.infoCard, { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }]}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <Feather name="alert-triangle" size={18} color="#D97706" />
          <Text style={[styles.bodyText, { color: '#92400E', flex: 1 }]}>
            Ganaste este bien por un monto mayor a tu saldo disponible declarado.
            Tenés {deadlineHours} hs para abonar la diferencia o tu cuenta será bloqueada.
          </Text>
        </View>
      </View>

      {/* Desglose */}
      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Desglose de la diferencia</Text>
        <DetailRow label="Puja ganadora" value={winningBid} />
        <DetailRow label="Saldo disponible declarado" value={availableBalance} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Diferencia a pagar</Text>
          <Text style={[styles.totalValue, { color: '#D97706' }]}>{differenceAmount}</Text>
        </View>
      </View>

      {/* Notas */}
      <View style={styles.infoCard}>
        <Text style={[styles.bodyText, { color: C.soft, fontSize: 13, lineHeight: 20 }]}>
          Este pago es independiente de la multa y del precio del bien ganado.
          Una vez abonado, tu cuenta quedará rehabilitada automáticamente.
        </Text>
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.push('/differences/payment' as never)}
      >
        <Text style={styles.primaryButtonText}>{ctaLabel}</Text>
      </TouchableOpacity>
    </>
  );
}

export default function NotificationDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session } = useAuth();
  const { getNotificationDetail, markAsRead, refreshNotifications } = useNotifications();
  const [detail, setDetail] = useState<NotificationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadDetail() {
        if (!id) {
          if (isActive) {
            setError('No encontramos ese mensaje.');
            setIsLoading(false);
          }
          return;
        }

        try {
          if (isActive) {
            setIsLoading(true);
            setError(null);
          }

          const nextDetail = await getNotificationDetail(Number(id));
          if (!nextDetail.read) {
            await markAsRead(nextDetail.id);
          }

          if (isActive) {
            setDetail({ ...nextDetail, read: true });
          }
        } catch (loadError) {
          if (isActive) {
            setError(loadError instanceof Error ? loadError.message : 'No pudimos cargar el detalle.');
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      }

      void loadDetail();
      return () => {
        isActive = false;
      };
    }, [id, getNotificationDetail, markAsRead])
  );

  const presentation = useMemo(
    () => getPresentation(detail?.type ?? ''),
    [detail?.type]
  );

  const handleAcceptProposal = useCallback(async () => {
    if (!detail || !session?.token || !session.userId) return;

    try {
      setIsActionLoading(true);
      const message = await acceptProductProposal(session.userId, detail.id, session.token);
      await refreshNotifications();
      Alert.alert('Propuesta aceptada', message);
      setDetail((current) => (current ? { ...current, type: 'aviso_general' } as NotificationDetail : current));
    } catch (actionError) {
      Alert.alert('No pudimos aceptar la propuesta', actionError instanceof Error ? actionError.message : 'Intentá nuevamente.');
    } finally {
      setIsActionLoading(false);
    }
  }, [detail, refreshNotifications, session?.token, session?.userId]);

  const handleRejectProposal = useCallback(async () => {
    if (!detail || !session?.token || !session.userId) return;

    try {
      setIsActionLoading(true);
      const message = await rejectProductProposal(session.userId, detail.id, session.token);
      await refreshNotifications();
      Alert.alert('Propuesta rechazada', message);
      setDetail((current) => (current ? { ...current, type: 'aviso_general' } as NotificationDetail : current));
    } catch (actionError) {
      Alert.alert('No pudimos rechazar la propuesta', actionError instanceof Error ? actionError.message : 'Intentá nuevamente.');
    } finally {
      setIsActionLoading(false);
    }
  }, [detail, refreshNotifications, session?.token, session?.userId]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator color={C.brown} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !detail) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>No pudimos abrir el mensaje</Text>
          <Text style={styles.errorText}>{error ?? 'Intenta de nuevo en unos segundos.'}</Text>
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerBody}>
            <View style={[styles.statusPill, { backgroundColor: presentation.pillBg }]}>
              <Feather name={presentation.icon} size={14} color={presentation.pillColor} />
              <Text style={[styles.statusPillText, { color: presentation.pillColor }]}>{presentation.label}</Text>
            </View>

            <Text style={styles.headerTitle}>{detail.title}</Text>
          </View>
        </View>

        <View style={styles.dateRow}>
          <Feather name="mail" size={16} color={C.muted} />
          <Text style={styles.dateText}>{formatDate(detail.createdAt)}</Text>
        </View>

        <View style={styles.content}>
          {getFlowKind(detail) === 'submission_received' ? (
            <SubmissionReceivedContent detail={detail} />
          ) : detail.type === 'bien_aceptado' ? (
            <ApprovedContent detail={detail} />
          ) : detail.type === 'propuesta_precio' ? (
            <ProposedContent
              detail={detail}
              onAccept={handleAcceptProposal}
              onReject={handleRejectProposal}
              isActionLoading={isActionLoading}
            />
          ) : detail.type === 'bien_rechazado' ? (
            <RejectedContent detail={detail} />
          ) : detail.type === 'bien_vendido' ? (
            <OwnerSaleContent detail={detail} />
          ) : detail.type === 'pago_pendiente' || detail.type === 'ganador_subasta' || detail.type === 'pago_confirmado' ? (
            <PaymentContent detail={detail} />
          ) : detail.type === 'diferencia_saldo' ? (
            <DifferenceContent detail={detail} />
          ) : (
            <GenericContent detail={detail} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingBottom: 32 },
  header: {
    backgroundColor: C.brown,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,.12)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: 20,
    top: 18,
  },
  headerBody: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
    paddingTop: 4,
    paddingHorizontal: 48,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 34,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  dateText: {
    color: C.muted,
    fontSize: 14,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 16,
  },
  productCard: {
    backgroundColor: C.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  productImage: {
    width: 92,
    height: 92,
    borderRadius: 18,
    backgroundColor: '#EEF3F8',
  },
  productPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productPlaceholderMinimal: {
    backgroundColor: '#EDF3FA',
  },
  productCopy: {
    flex: 1,
  },
  productCode: {
    color: C.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  productTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  productSubtitle: {
    color: C.soft,
    fontSize: 14,
  },
  infoCard: {
    backgroundColor: C.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    gap: 14,
  },
  rejectionCard: {
    borderColor: '#FFD8DA',
  },
  sectionTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: '800',
  },
  bodyText: {
    color: C.text,
    fontSize: 15,
    lineHeight: 28,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
  },
  detailLabel: {
    color: C.soft,
    fontSize: 14,
    flex: 1,
  },
  detailValue: {
    color: C.text,
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    textAlign: 'right',
  },
  reasonRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  reasonText: {
    flex: 1,
    color: C.text,
    fontSize: 15,
    lineHeight: 24,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: C.soft,
    fontSize: 15,
  },
  totalValue: {
    color: C.brownDeep,
    fontSize: 16,
    fontWeight: '900',
  },
  primaryButton: {
    backgroundColor: C.brown,
    minHeight: 62,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  secondaryButtonDisabled: {
    opacity: 0.6,
  },
  secondaryButtonText: {
    color: C.brown,
    fontSize: 16,
    fontWeight: '800',
  },
  centerState: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  errorTitle: {
    color: C.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorText: {
    color: C.soft,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
});
