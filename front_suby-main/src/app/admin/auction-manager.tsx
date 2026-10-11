import { useAuth } from '@/context/auth-context';
import {
  approveAdminPaymentMethod,
  approveAdminUserRequest,
  assignAdminProductInsurance,
  createAdminAuction,
  createAdminProductInsurance,
  getApiErrorMessage,
  listAdminInsuranceCompanies,
  listAdminPaymentMethods,
  listAdminProductInsuranceOptions,
  listAdminReviewQueue,
  listAdminSubastadores,
  listAdminSubyInventory,
  listAdminUserRequests,
  listAdminUsers,
  listAuctions,
  login,
  proposeAdminProduct,
  rejectAdminPaymentMethod,
  rejectAdminProduct,
  rejectAdminUserRequest,
  updateAdminUserCategory,
  type AdminInsuranceCompanyOption,
  type AdminInsuranceOption,
  type AdminManagedUserItem,
  type AdminPaymentMethodItem,
  type AdminProductInsuranceOptionsResponse,
  type AdminProductReviewItem,
  type AdminUserRequestItem,
} from '@/lib/api';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

const C = {
  bg: '#F6F8FC',
  brown: '#6F3F2B',
  green: '#0F9F4B',
  greenSoft: '#ECFDF3',
  blueSoft: '#EEF5FF',
  red: '#FF3B30',
  redSoft: '#FFF1F2',
  orange: '#FF7A1A',
  orangeSoft: '#FFF3E9',
  textDark: '#24324A',
  textMid: '#607494',
  textLight: '#8EA1BE',
  border: '#E6ECF4',
  white: '#FFFFFF',
};

const AUCTION_CATEGORIES = [
  { value: 'comun', label: 'Común' },
  { value: 'especial', label: 'Especial' },
  { value: 'plata', label: 'Plata' },
  { value: 'oro', label: 'Oro' },
  { value: 'platino', label: 'Platino' },
] as const;

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const WEEKDAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function buildDateString(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getAutoAuctionHour(minutesAhead = 5) {
  const nextDate = new Date();
  nextDate.setMinutes(nextDate.getMinutes() + minutesAhead);
  nextDate.setSeconds(0, 0);
  return nextDate.toTimeString().slice(0, 8);
}

function isSelectableAuctionDate(year: number, month: number, day: number) {
  const candidate = new Date(year, month - 1, day);
  candidate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return candidate.getTime() >= today.getTime();
}

function getStartOfMonthOffset(year: number, month: number) {
  return (new Date(year, month - 1, 1).getDay() + 6) % 7;
}

function normalizeAuctionCategory(value?: string | null) {
  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized === 'general') return 'comun';
  if (normalized === 'arte' || normalized === 'artistica' || normalized === 'artística') return 'especial';
  if (AUCTION_CATEGORIES.some((option) => option.value === normalized)) return normalized;
  return 'oro';
}

function formatCurrency(value: number, currency?: string) {
  const normalizedCurrency = (currency ?? 'ARS').trim().toUpperCase();
  const symbol = normalizedCurrency === 'USD' ? 'US$' : normalizedCurrency === 'ARS' ? 'ARS $' : '$ ';
  return `${symbol} ${Math.round(value).toLocaleString('es-AR')}`;
}

function formatDateTime(value?: string) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function normalizeStatus(status?: string | null) {
  return (status ?? '').trim().toLowerCase();
}

function getStatusConfig(status: string) {
  const normalized = normalizeStatus(status);

  if (normalized === 'aceptado') {
    return {
      label: 'APROBADO',
      badgeStyle: styles.badgeAccepted,
      badgeTextStyle: styles.badgeTextAccepted,
      borderStyle: styles.cardAccepted,
      toneStyle: styles.toneAccepted,
      hint: 'Listo para publicar subasta',
    };
  }

  if (normalized === 'rechazado') {
    return {
      label: 'RECHAZADO',
      badgeStyle: styles.badgeRejected,
      badgeTextStyle: styles.badgeTextRejected,
      borderStyle: styles.cardRejected,
      toneStyle: styles.toneRejected,
      hint: 'No habilitado para publicar',
    };
  }

  if (normalized === 'propuesto') {
    return {
      label: 'PROPUESTO',
      badgeStyle: styles.badgeProposed,
      badgeTextStyle: styles.badgeTextProposed,
      borderStyle: styles.cardProposed,
      toneStyle: styles.toneProposed,
      hint: 'Esperando respuesta del dueño',
    };
  }

  return {
    label: 'PENDIENTE',
    badgeStyle: styles.badgePending,
    badgeTextStyle: styles.badgeTextPending,
    borderStyle: styles.cardPending,
    toneStyle: styles.tonePending,
    hint: 'Aún no fue evaluado',
  };
}

function ProductCard({
  item,
  selected,
  onSelect,
  onAccept,
  onReject,
  onToggleLot,
  lotSelected,
  primaryActionLabel = 'Aprobar',
  secondaryActionLabel = 'Rechazar',
}: {
  item: AdminProductReviewItem;
  selected: boolean;
  onSelect: () => void;
  onAccept: () => void;
  onReject: () => void;
  onToggleLot?: () => void;
  lotSelected?: boolean;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
}) {
  const status = normalizeStatus(item.inspectionStatus);
  const isAccepted = status === 'aceptado';
  const isRejected = status === 'rechazado';
  const isPending = !isAccepted && !isRejected;
  const statusConfig = getStatusConfig(item.inspectionStatus);
  const canCreate = item.canCreateAuction;
  const acceptsUsd = normalizeStatus(item.acceptsUsd) === 'si';
  const currencyHint = item.preferredCurrency
    ? `Prefiere ${item.preferredCurrency}${acceptsUsd ? ' · acepta USD' : ''}`
    : acceptsUsd
      ? 'Acepta propuestas en USD'
      : 'Sin preferencia de moneda declarada';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        selected && styles.cardSelected,
        statusConfig.borderStyle,
      ]}
      activeOpacity={0.9}
      onPress={onSelect}
    >
      <View style={styles.cardTop}>
        {item.thumbnailUrl ? <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} /> : <View style={styles.thumbnailFallback} />}
        <View style={styles.cardBody}>
          <View style={styles.rowBetween}>
            <View style={styles.cardTitleBlock}>
              <Text style={styles.lotCode}>{item.category.toUpperCase()} · LOTE #{item.productId}</Text>
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            </View>
            <View style={[styles.badge, statusConfig.badgeStyle]}>
              <Text style={[styles.badgeText, statusConfig.badgeTextStyle]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>
          <Text style={styles.meta}>{item.ownerName}</Text>
          <Text style={styles.meta}>Fotos: {item.photoCount} · Valor estimado {formatCurrency(item.estimatedValue, item.currency ?? item.preferredCurrency)}</Text>
          <Text style={styles.meta}>Puja base {item.publishedBasePrice ? formatCurrency(item.publishedBasePrice, item.currency ?? item.preferredCurrency) : 'pendiente'}</Text>

          <View style={styles.cardFooterRow}>
            <Text style={[styles.statusHint, statusConfig.toneStyle]}>{statusConfig.hint}</Text>
            {canCreate ? <Text style={styles.createHint}>Listo para publicar</Text> : null}
          </View>
        </View>
      </View>

      {isPending ? (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionButton, styles.actionButtonAccept]} onPress={onAccept}>
            <Feather name="check" size={16} color="#fff" />
            <Text style={styles.actionText}>{primaryActionLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.actionButtonReject]} onPress={onReject}>
            <Feather name="x" size={16} color="#fff" />
            <Text style={styles.actionText}>{secondaryActionLabel}</Text>
          </TouchableOpacity>
        </View>
      ) : isAccepted && onToggleLot ? (
        <View style={styles.actionsRowSingle}>
          <TouchableOpacity
            style={[styles.lotToggleButton, lotSelected ? styles.lotToggleButtonActive : styles.lotToggleButtonIdle]}
            onPress={onToggleLot}
          >
            <Feather name={lotSelected ? 'check-square' : 'square'} size={16} color={lotSelected ? C.green : C.textMid} />
            <Text style={[styles.lotToggleText, lotSelected ? styles.lotToggleTextActive : styles.lotToggleTextIdle]}>
              {lotSelected ? 'Seleccionado' : 'Agregar a subasta'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function SectionPanel({
  title,
  count,
  accent,
  children,
  emptyText,
  alwaysShowChildren = false,
}: {
  title: string;
  count: number;
  accent: string;
  children: React.ReactNode;
  emptyText?: string;
  alwaysShowChildren?: boolean;
}) {
  return (
    <View style={styles.sectionPanel}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{count} registros</Text>
        </View>
        <View style={[styles.sectionPill, { backgroundColor: accent }]}>
          <Text style={styles.sectionPillText}>{count}</Text>
        </View>
      </View>
      {count > 0 || alwaysShowChildren ? children : <Text style={styles.emptyText}>{emptyText}</Text>}
    </View>
  );
}

function UserRequestCard({
  item,
  category,
  rejectReason,
  onCategoryChange,
  onRejectReasonChange,
  onApprove,
  onReject,
}: {
  item: AdminUserRequestItem;
  category: string;
  rejectReason: string;
  onCategoryChange: (value: string) => void;
  onRejectReasonChange: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const status = normalizeStatus(item.status);
  const isPending = status === 'pendiente';
  const isRejected = status === 'rechazado';
  const isProcessed = status === 'procesado';

  return (
    <View style={[styles.card, isRejected ? styles.cardRejected : isProcessed ? styles.cardAccepted : styles.cardPending]}>
      <View style={styles.rowBetween}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.title}>{item.name} {item.surname ?? ''}</Text>
          <Text style={styles.meta}>{item.email}</Text>
          <Text style={styles.meta}>Documento: {item.document ?? 'No informado'} · País: {item.country ?? 'No informado'}</Text>
          <Text style={styles.meta}>Dirección: {item.legalAddress ?? 'No informada'}</Text>
          <Text style={styles.meta}>Solicitud: {formatDateTime(item.requestedAt)}</Text>
        </View>
        <View style={[styles.badge, isRejected ? styles.badgeRejected : isProcessed ? styles.badgeAccepted : styles.badgePending]}>
          <Text style={[styles.badgeText, isRejected ? styles.badgeTextRejected : isProcessed ? styles.badgeTextAccepted : styles.badgeTextPending]}>
            {(item.status || 'pendiente').toUpperCase()}
          </Text>
        </View>
      </View>

      {item.rejectionReason ? <Text style={styles.panelNote}>Motivo: {item.rejectionReason}</Text> : null}

      {isPending ? (
        <>
          <Text style={styles.formLabel}>Categoría a asignar</Text>
          <View style={styles.optionWrap}>
            {AUCTION_CATEGORIES.map((option) => (
              <TouchableOpacity
                key={`${item.requestId}-${option.value}`}
                style={[styles.optionButton, category === option.value && styles.optionButtonSelected]}
                onPress={() => onCategoryChange(option.value)}
              >
                <Text style={[styles.optionButtonText, category === option.value && styles.optionButtonTextSelected]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.formLabel}>Motivo de rechazo</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={rejectReason}
            onChangeText={onRejectReasonChange}
            placeholder="Opcional para rechazar la solicitud"
            multiline
          />

          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionButton, styles.actionButtonAccept]} onPress={onApprove}>
              <Feather name="check" size={16} color="#fff" />
              <Text style={styles.actionText}>Aprobar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.actionButtonReject]} onPress={onReject}>
              <Feather name="x" size={16} color="#fff" />
              <Text style={styles.actionText}>Rechazar</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : null}
    </View>
  );
}

function ManagedUserCard({
  item,
  category,
  onCategoryChange,
  onSave,
}: {
  item: AdminManagedUserItem;
  category: string;
  onCategoryChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.title}>{item.name}</Text>
          <Text style={styles.meta}>{item.email ?? 'Sin email'}</Text>
          <Text style={styles.meta}>Documento: {item.document ?? 'No informado'}</Text>
          <Text style={styles.meta}>
            Cuenta: {(item.admitted ?? 'no').toUpperCase()} · Garantía {formatCurrency(item.declaredGuarantee ?? 0)}
          </Text>
        </View>
        <View style={[styles.badge, styles.badgeAccepted]}>
          <Text style={[styles.badgeText, styles.badgeTextAccepted]}>
            {(item.category || 'comun').toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.formLabel}>Categoría manual</Text>
      <View style={styles.optionWrap}>
        {AUCTION_CATEGORIES.map((option) => (
          <TouchableOpacity
            key={`${item.userId}-${option.value}`}
            style={[styles.optionButton, category === option.value && styles.optionButtonSelected]}
            onPress={() => onCategoryChange(option.value)}
          >
            <Text style={[styles.optionButtonText, category === option.value && styles.optionButtonTextSelected]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={onSave}>
        <Text style={styles.primaryButtonText}>Guardar categoría</Text>
      </TouchableOpacity>
    </View>
  );
}

interface SelectedAuctionLot {
  productId: number;
  title: string;
  estimatedValue: number;
  basePrice: string;
}

type AdminPanelTab = 'goods' | 'users';
type AdminUsersSubtab = 'requests' | 'paymentMethods';
type UserRequestFilter = 'all' | 'pendiente' | 'procesado' | 'rechazado';
type PaymentMethodFilter = 'all' | 'pendiente' | 'verificado' | 'rechazado';

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AuctionManagerScreen() {
  const { width } = useWindowDimensions();
  const { session, setSession } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminPanelTab>('goods');
  const [activeUsersSubtab, setActiveUsersSubtab] = useState<AdminUsersSubtab>('requests');
  const [userRequestFilter, setUserRequestFilter] = useState<UserRequestFilter>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethodFilter>('all');
  const [adminEmail, setAdminEmail] = useState('admin@suby.com');
  const [adminPassword, setAdminPassword] = useState('12345678');
  const [products, setProducts] = useState<AdminProductReviewItem[]>([]);
  const [subyProducts, setSubyProducts] = useState<AdminProductReviewItem[]>([]);
  const [userRequests, setUserRequests] = useState<AdminUserRequestItem[]>([]);
  const [managedUsers, setManagedUsers] = useState<AdminManagedUserItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<AdminPaymentMethodItem[]>([]);
  const [selectedLots, setSelectedLots] = useState<SelectedAuctionLot[]>([]);
  const [userRequestCategories, setUserRequestCategories] = useState<Record<number, string>>({});
  const [managedUserCategories, setManagedUserCategories] = useState<Record<number, string>>({});
  const [userRejectReasons, setUserRejectReasons] = useState<Record<number, string>>({});
  const [paymentMethodLimits, setPaymentMethodLimits] = useState<Record<number, string>>({});
  const [paymentMethodRejectReasons, setPaymentMethodRejectReasons] = useState<Record<number, string>>({});
  const [proposalProductId, setProposalProductId] = useState<number | null>(null);
  const [proposalPrice, setProposalPrice] = useState('150000');
  const [proposalCurrency, setProposalCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [insuranceProductId, setInsuranceProductId] = useState<number | null>(null);
  const [insuranceOptionsState, setInsuranceOptionsState] = useState<AdminProductInsuranceOptionsResponse | null>(null);
  const [insuranceOptions, setInsuranceOptions] = useState<AdminInsuranceOption[]>([]);
  const [selectedExistingInsurancePolicy, setSelectedExistingInsurancePolicy] = useState('');
  const [newInsurancePolicyCode, setNewInsurancePolicyCode] = useState('');
  const [newInsuranceCompany, setNewInsuranceCompany] = useState('');
  const [insuranceCompanies, setInsuranceCompanies] = useState<AdminInsuranceCompanyOption[]>([]);
  const [newInsurancePhone, setNewInsurancePhone] = useState('');
  const [newInsuranceAmount, setNewInsuranceAmount] = useState('');
  const [newInsuranceCombined, setNewInsuranceCombined] = useState(true);
  const [isLoadingInsuranceOptions, setIsLoadingInsuranceOptions] = useState(false);
  const [auctionTargetId, setAuctionTargetId] = useState<number | null>(null);
  const [auctionOptions, setAuctionOptions] = useState<{ id: number; name: string; status: string }[]>([]);
  const [subastadorOptions, setSubastadorOptions] = useState<{ id: number; name: string; license?: string }[]>([]);
  const [subastadorId, setSubastadorId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [returnCost, setReturnCost] = useState('85');
  const [rejectionReasons, setRejectionReasons] = useState(
    'Autenticidad no verificable\nDocumentación insuficiente\nRestauraciones no declaradas\nValor base por debajo del mínimo requerido'
  );
  const [basePrice, setBasePrice] = useState('150000');
  const [commission, setCommission] = useState('12.5');
  const [auctionYear, setAuctionYear] = useState(() => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 14);
    return nextDate.getFullYear();
  });
  const [auctionMonth, setAuctionMonth] = useState(() => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 14);
    return nextDate.getMonth() + 1;
  });
  const [auctionDay, setAuctionDay] = useState(() => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 14);
    return nextDate.getDate();
  });
  const [auctionHour, setAuctionHour] = useState(() => getAutoAuctionHour(5));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [location, setLocation] = useState('Salón Principal');
  const [category, setCategory] = useState('oro');
  const [description, setDescription] = useState('Subasta de prueba desde el panel');
  const [currency, setCurrency] = useState('ARS');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const isDesktop = Platform.OS === 'web' && width >= 1180;
  const auctionDate = buildDateString(auctionYear, auctionMonth, auctionDay);
  const yearOptions = Array.from({ length: 6 }, (_, index) => new Date().getFullYear() + index);
  const monthOffset = getStartOfMonthOffset(auctionYear, auctionMonth);
  const daysInMonth = getDaysInMonth(auctionYear, auctionMonth);
  const calendarDays = Array.from({ length: monthOffset + daysInMonth }, (_, index) => {
    if (index < monthOffset) {
      return null;
    }

    return index - monthOffset + 1;
  });

  useEffect(() => {
    const maxDays = getDaysInMonth(auctionYear, auctionMonth);
    if (auctionDay > maxDays) {
      setAuctionDay(maxDays);
    }
  }, [auctionYear, auctionMonth, auctionDay]);

  const handleAdminLogin = async () => {
    const normalizedEmail = adminEmail.trim().toLowerCase();

    if (!normalizedEmail || !adminPassword) {
      setError('Ingresá tu email y contraseña de administrador.');
      return;
    }

    try {
      setIsAuthLoading(true);
      setError(null);
      const response = await login(normalizedEmail, adminPassword);

      if (!response.token) {
        setError('El backend no devolvió token de administrador.');
        return;
      }

      setSession({
        email: response.email ?? normalizedEmail,
        token: response.token,
        userId: response.userId,
        displayName: response.displayName,
        firstName: response.firstName,
        lastName: response.lastName,
        membershipTier: response.membershipTier,
        declaredGuarantee: response.declaredGuarantee,
      });
    } catch (authError) {
      Alert.alert('No se pudo iniciar sesión', getApiErrorMessage(authError, 'Verificá tus credenciales de administrador.'));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const load = useCallback(async () => {
    if (!session?.token) {
      setError('Necesitás iniciar sesión con una cuenta autorizada.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const [response, auctionsResponse, subastadoresResponse, userRequestsResponse, managedUsersResponse, paymentMethodsResponse, insuranceCompaniesResponse, subyInventoryResponse] = await Promise.all([
        listAdminReviewQueue(session.token),
        listAuctions({ page: 1, perPage: 50 }),
        listAdminSubastadores(session.token),
        listAdminUserRequests(session.token),
        listAdminUsers(session.token),
        listAdminPaymentMethods(session.token),
        listAdminInsuranceCompanies(session.token),
        listAdminSubyInventory(session.token),
      ]);
      setProducts(response.products);
      setSubyProducts(subyInventoryResponse);
      setUserRequests(userRequestsResponse.requests);
      setManagedUsers(managedUsersResponse.users);
      setPaymentMethods(paymentMethodsResponse.paymentMethods);
      setInsuranceCompanies(insuranceCompaniesResponse);
      setAuctionOptions(auctionsResponse.auctions.map((auction) => ({
        id: auction.id,
        name: auction.name,
        status: auction.status,
      })));
      setSubastadorOptions(subastadoresResponse);
      setUserRequestCategories(
        Object.fromEntries(userRequestsResponse.requests.map((request) => [request.requestId, 'comun']))
      );
      setUserRejectReasons(
        Object.fromEntries(userRequestsResponse.requests.map((request) => [request.requestId, request.rejectionReason ?? '']))
      );
      setManagedUserCategories(
        Object.fromEntries(managedUsersResponse.users.map((user) => [user.userId, user.category ?? 'comun']))
      );
      setPaymentMethodLimits(
        Object.fromEntries(
          paymentMethodsResponse.paymentMethods.map((item) => [
            item.paymentMethodId,
            String(Math.round(item.approvedAmount ?? item.declaredAmount ?? 0) || ''),
          ])
        )
      );
      setPaymentMethodRejectReasons(
        Object.fromEntries(paymentMethodsResponse.paymentMethods.map((item) => [item.paymentMethodId, item.reviewReason ?? '']))
      );
      const readyLots = response.products
        .filter((item) => item.canCreateAuction)
        .map<SelectedAuctionLot>((item) => ({
          productId: item.productId,
          title: item.title,
          estimatedValue: item.estimatedValue,
          basePrice: String(Math.round(item.publishedBasePrice ?? item.estimatedValue ?? 0) || Math.round(item.estimatedValue || 0) || 150000),
        }));

      setSelectedLots(readyLots);
      const firstPending = response.products.find((item) => normalizeStatus(item.inspectionStatus) === 'pendiente' || normalizeStatus(item.inspectionStatus) === 'en_revision');
      if (firstPending) {
        setProposalProductId(firstPending.productId);
        setProposalPrice(String(Math.round(firstPending.proposedBasePrice ?? firstPending.estimatedValue ?? 0) || 150000));
        setProposalCurrency('ARS');
      }
      const firstAccepted = response.products.find((item) => normalizeStatus(item.inspectionStatus) === 'aceptado');
      if (firstAccepted) {
        setInsuranceProductId((current) => current ?? firstAccepted.productId);
      } else {
        setInsuranceProductId(null);
      }
      const firstReady = readyLots[0];
      if (firstReady) {
        setBasePrice(firstReady.basePrice);
        const categorySeed = response.products.find((item) => item.productId === firstReady.productId);
        if (categorySeed) {
          setCategory(normalizeAuctionCategory(categorySeed.category));
        }
      }
      if (subastadoresResponse.length > 0) {
        setSubastadorId(subastadoresResponse[0].id);
      }
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'No pudimos cargar la cola de revisión.'));
      setProducts([]);
      setUserRequests([]);
      setManagedUsers([]);
      setPaymentMethods([]);
      setSelectedLots([]);
      setAuctionOptions([]);
      setSubastadorOptions([]);
      setInsuranceCompanies([]);
      setSubyProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [session?.token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const pendingProducts = products.filter((item) => {
    const status = normalizeStatus(item.inspectionStatus);
    return status !== 'aceptado' && status !== 'rechazado' && status !== 'propuesto';
  });
  const proposedProducts = products.filter((item) => normalizeStatus(item.inspectionStatus) === 'propuesto');
  const acceptedProducts = products.filter((item) => normalizeStatus(item.inspectionStatus) === 'aceptado');
  const rejectedProducts = products.filter((item) => normalizeStatus(item.inspectionStatus) === 'rechazado');
  const readyProducts = acceptedProducts.filter((item) => item.canCreateAuction);
  const selectedProposalProduct = pendingProducts.find((item) => item.productId === proposalProductId) ?? null;
  const pendingUserRequests = userRequests.filter((item) => normalizeStatus(item.status) === 'pendiente');
  const rejectedUserRequests = userRequests.filter((item) => normalizeStatus(item.status) === 'rechazado');
  const processedUserRequests = userRequests.filter((item) => normalizeStatus(item.status) === 'procesado');
  const pendingPaymentMethods = paymentMethods.filter((item) => normalizeStatus(item.status) === 'pendiente');
  const rejectedPaymentMethods = paymentMethods.filter((item) => normalizeStatus(item.status) === 'rechazado');
  const verifiedPaymentMethods = paymentMethods.filter((item) => normalizeStatus(item.status) === 'verificado');
  const filteredUserRequests = userRequests.filter((item) => {
    if (userRequestFilter === 'all') return true;
    return normalizeStatus(item.status) === userRequestFilter;
  });
  const filteredManagedUsers = managedUsers;
  const filteredPaymentMethods = paymentMethods.filter((item) => {
    if (paymentMethodFilter === 'all') return true;
    return normalizeStatus(item.status) === paymentMethodFilter;
  });

  const selectedLotIds = new Set(selectedLots.map((lot) => lot.productId));
  const selectedReadyProducts = acceptedProducts.filter((item) => selectedLotIds.has(item.productId) && item.canCreateAuction);
  const selectedLotCount = selectedReadyProducts.length;
  const selectedInsuranceProduct = acceptedProducts.find((item) => item.productId === insuranceProductId) ?? acceptedProducts[0] ?? null;

  useEffect(() => {
    const loadInsuranceOptions = async () => {
      if (!session?.token || !selectedInsuranceProduct) {
        setInsuranceOptionsState(null);
        setInsuranceOptions([]);
        setSelectedExistingInsurancePolicy('');
        return;
      }

      try {
        setIsLoadingInsuranceOptions(true);
        const response = await listAdminProductInsuranceOptions(selectedInsuranceProduct.productId, session.token);
        setInsuranceOptionsState(response);
        setInsuranceOptions(response.options);
        setSelectedExistingInsurancePolicy(response.currentInsurancePolicy ?? response.options[0]?.insurancePolicy ?? '');
      } catch (insuranceError) {
        setInsuranceOptionsState(null);
        setInsuranceOptions([]);
        setSelectedExistingInsurancePolicy('');
        setError(getApiErrorMessage(insuranceError, 'No pudimos cargar las pólizas válidas para este producto.'));
      } finally {
        setIsLoadingInsuranceOptions(false);
      }
    };

    void loadInsuranceOptions();
  }, [selectedInsuranceProduct?.productId, session?.token]);

  const toggleAuctionLot = (item: AdminProductReviewItem) => {
    if (!item.canCreateAuction) {
      return;
    }

    setSelectedLots((current) => {
      const exists = current.some((lot) => lot.productId === item.productId);
      if (exists) {
        return current.filter((lot) => lot.productId !== item.productId);
      }

      return [
        ...current,
        {
          productId: item.productId,
          title: item.title,
          estimatedValue: item.estimatedValue,
          basePrice: String(Math.round(item.publishedBasePrice ?? item.estimatedValue ?? 0) || Math.round(item.estimatedValue || 0) || 150000),
        },
      ];
    });
  };

  const removeSelectedLot = (productId: number) => {
    setSelectedLots((current) => current.filter((lot) => lot.productId !== productId));
  };

  const updateSelectedLotBasePrice = (productId: number, value: string) => {
    setSelectedLots((current) =>
      current.map((lot) => (lot.productId === productId ? { ...lot, basePrice: value } : lot))
    );
  };

  const handleReject = async (productId: number) => {
    if (!session?.token) return;
    try {
      setIsSaving(true);
      await rejectAdminProduct(productId, session.token, {
        rejectionReasons: rejectionReasons.split('\n').map((entry) => entry.trim()).filter(Boolean),
        returnCost: Number(returnCost) || 85,
      });
      await load();
    } catch (rejectError) {
      Alert.alert('No se pudo rechazar', getApiErrorMessage(rejectError, 'Intentá nuevamente.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprovePaymentMethod = async (paymentMethodId: number) => {
    if (!session?.token) return;
    const paymentMethod = paymentMethods.find((item) => item.paymentMethodId === paymentMethodId);
    const approvedAmount =
      paymentMethod?.type === 'card'
        ? Number(paymentMethodLimits[paymentMethodId] ?? paymentMethod?.approvedAmount ?? paymentMethod?.declaredAmount ?? 0)
        : undefined;

    if (paymentMethod?.type === 'card' && (!approvedAmount || approvedAmount <= 0)) {
      Alert.alert('Límite requerido', 'Definí el monto máximo habilitado para esta tarjeta antes de aprobarla.');
      return;
    }

    try {
      setIsSaving(true);
      await approveAdminPaymentMethod(session.token, paymentMethodId, approvedAmount);
      await load();
    } catch (approveError) {
      Alert.alert('No se pudo aprobar', getApiErrorMessage(approveError, 'Intentá nuevamente.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRejectPaymentMethod = async (paymentMethodId: number) => {
    if (!session?.token) return;
    try {
      setIsSaving(true);
      await rejectAdminPaymentMethod(session.token, paymentMethodId, paymentMethodRejectReasons[paymentMethodId] ?? '');
      await load();
    } catch (rejectError) {
      Alert.alert('No se pudo rechazar', getApiErrorMessage(rejectError, 'Intentá nuevamente.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePropose = async () => {
    if (!session?.token) return;
    if (!selectedProposalProduct) {
      Alert.alert('Seleccioná un bien pendiente', 'Elegí un producto pendiente antes de enviar la propuesta.');
      return;
    }

    try {
      setIsSaving(true);
      await proposeAdminProduct(selectedProposalProduct.productId, session.token, {
        basePrice: Number(proposalPrice) || selectedProposalProduct.estimatedValue,
        commissionPct: Number(commission) || 12.5,
        currency: proposalCurrency,
        note: 'Propuesta generada desde el panel de administración',
      });
      await load();
    } catch (proposalError) {
      Alert.alert('No se pudo enviar la propuesta', getApiErrorMessage(proposalError, 'Intentá nuevamente.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignInsurance = async () => {
    if (!session?.token) return;
    if (!selectedInsuranceProduct) {
      Alert.alert('Seleccioná un bien aprobado', 'Elegí un producto aprobado antes de asignar la póliza.');
      return;
    }
    if (!selectedExistingInsurancePolicy.trim()) {
      Alert.alert('Póliza requerida', 'Ingresá el número de póliza a asignar.');
      return;
    }

    try {
      setIsSaving(true);
      await assignAdminProductInsurance(selectedInsuranceProduct.productId, session.token, selectedExistingInsurancePolicy.trim());
      Alert.alert('Póliza asignada', `La póliza ${selectedExistingInsurancePolicy.trim()} quedó asociada al producto.`);
      await load();
    } catch (assignError) {
      Alert.alert('No se pudo asignar la póliza', getApiErrorMessage(assignError, 'Intentá nuevamente.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateInsurance = async () => {
    if (!session?.token || !selectedInsuranceProduct) return;

    if (!newInsuranceCompany.trim() || !newInsuranceAmount.trim()) {
      Alert.alert('Datos incompletos', 'Completá la compañía y el importe de la póliza.');
      return;
    }

    try {
      setIsSaving(true);
      await createAdminProductInsurance(selectedInsuranceProduct.productId, session.token, {
        insurancePolicy: newInsurancePolicyCode.trim() || undefined,
        company: newInsuranceCompany.trim(),
        combinedPolicy: newInsuranceCombined,
        amount: Number(newInsuranceAmount),
        insurerPhone: newInsurancePhone.trim() || undefined,
      });
      Alert.alert('Póliza creada', 'La nueva póliza quedó creada y asignada al producto.');
      setNewInsurancePolicyCode('');
      setNewInsuranceCompany('');
      setNewInsurancePhone('');
      setNewInsuranceAmount('');
      setNewInsuranceCombined(true);
      await load();
    } catch (createError) {
      Alert.alert('No se pudo crear la póliza', getApiErrorMessage(createError, 'Intentá nuevamente.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateAuction = async () => {
    if (!session?.token || selectedLots.length === 0) return;

    const scheduledAt = new Date(`${auctionDate}T${auctionHour}`);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      Alert.alert('Fecha inválida', 'Elegí una fecha y hora posteriores al momento actual para publicar la subasta.');
      return;
    }

    try {
      setIsSaving(true);
      const normalizedLots = selectedLots.map((lot) => ({
        productId: lot.productId,
        basePrice: Number(lot.basePrice) || lot.estimatedValue,
      }));
      const response = await createAdminAuction(session.token, {
        productId: selectedLots[0].productId,
        productIds: selectedLots.map((lot) => lot.productId),
        lots: normalizedLots,
        auctionId: auctionTargetId ?? undefined,
        auctionDate,
        auctionHour,
        location,
        category: normalizeAuctionCategory(category),
        description,
        subastadorId: subastadorId ?? undefined,
        basePrice: Number(basePrice) || selectedLots[0].estimatedValue,
        commission: Number(commission) || 12.5,
        currency,
      });
      Alert.alert('Subasta creada', `Subasta #${response.auctionId} creada con ${response.lotCount ?? selectedLots.length} lotes.`);
      await load();
    } catch (createError) {
      Alert.alert('No se pudo crear', getApiErrorMessage(createError, 'Intentá nuevamente.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveUserRequest = async (requestId: number) => {
    if (!session?.token) return;
    try {
      setIsSaving(true);
      await approveAdminUserRequest(session.token, requestId, userRequestCategories[requestId] ?? 'comun');
      await load();
      setActiveTab('users');
    } catch (approveError) {
      Alert.alert('No se pudo aprobar', getApiErrorMessage(approveError, 'Intentá nuevamente.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRejectUserRequest = async (requestId: number) => {
    if (!session?.token) return;
    try {
      setIsSaving(true);
      await rejectAdminUserRequest(session.token, requestId, userRejectReasons[requestId] ?? '');
      await load();
      setActiveTab('users');
    } catch (rejectError) {
      Alert.alert('No se pudo rechazar', getApiErrorMessage(rejectError, 'Intentá nuevamente.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateManagedUserCategory = async (userId: number) => {
    if (!session?.token) return;
    try {
      setIsSaving(true);
      await updateAdminUserCategory(session.token, userId, managedUserCategories[userId] ?? 'comun');
      await load();
      setActiveTab('users');
    } catch (updateError) {
      Alert.alert('No se pudo actualizar la categoría', getApiErrorMessage(updateError, 'Intentá nuevamente.'));
    } finally {
      setIsSaving(false);
    }
  };

  if (Platform.OS !== 'web') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Text style={styles.centerTitle}>Panel disponible solo en web</Text>
          <Text style={styles.centerText}>Esta sección no se muestra ni funciona en celular.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session?.token) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Text style={styles.centerTitle}>Acceso administrador</Text>
          <Text style={styles.centerText}>Ingresá con la cuenta administrativa para revisar bienes y publicar subastas.</Text>
          <View style={styles.loginCard}>
            <Text style={styles.formLabel}>Email</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              value={adminEmail}
              onChangeText={setAdminEmail}
            />
            <Text style={styles.formLabel}>Contraseña</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={adminPassword}
              onChangeText={setAdminPassword}
            />
            <TouchableOpacity style={[styles.primaryButton, isAuthLoading && styles.primaryButtonDisabled]} onPress={handleAdminLogin} disabled={isAuthLoading}>
              {isAuthLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Entrar al panel</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.pageShell}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Feather name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Gestión de Subastas</Text>
            <Text style={styles.headerSubtitle}>Panel de escritorio para aprobar, separar rechazados y publicar subastas</Text>
          </View>

          <View style={[styles.summaryCard, isDesktop ? styles.summaryCardDesktop : null]}>
            {activeTab === 'goods' ? (
              <>
                <Metric label="TOTAL" value={String(products.length)} />
                <Metric label="PENDIENTES" value={String(pendingProducts.length)} accent={C.orange} />
                <Metric label="PROPUESTAS" value={String(proposedProducts.length)} accent={'#2563EB'} />
                <Metric label="APROBADOS" value={String(acceptedProducts.length)} accent={C.green} />
                <Metric label="RECHAZADOS" value={String(rejectedProducts.length)} accent={C.red} />
                <Metric label="LISTOS" value={String(readyProducts.length)} accent={C.brown} />
              </>
            ) : (
              <>
                {activeUsersSubtab === 'requests' ? (
                  <>
                    <Metric label="TOTAL" value={String(userRequests.length)} />
                    <Metric label="PENDIENTES" value={String(pendingUserRequests.length)} accent={C.orange} />
                    <Metric label="RECHAZADAS" value={String(rejectedUserRequests.length)} accent={C.red} />
                    <Metric label="PROCESADAS" value={String(processedUserRequests.length)} accent={C.green} />
                  </>
                ) : (
                  <>
                    <Metric label="TOTAL" value={String(paymentMethods.length)} />
                    <Metric label="PENDIENTES" value={String(pendingPaymentMethods.length)} accent={'#2563EB'} />
                    <Metric label="VERIFICADOS" value={String(verifiedPaymentMethods.length)} accent={C.green} />
                    <Metric label="RECHAZADOS" value={String(rejectedPaymentMethods.length)} accent={C.red} />
                  </>
                )}
              </>
            )}
          </View>

          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'goods' && styles.tabButtonActive]}
              onPress={() => setActiveTab('goods')}
            >
              <Text style={[styles.tabButtonText, activeTab === 'goods' && styles.tabButtonTextActive]}>Bienes y subastas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'users' && styles.tabButtonActive]}
              onPress={() => setActiveTab('users')}
            >
              <Text style={[styles.tabButtonText, activeTab === 'users' && styles.tabButtonTextActive]}>Usuarios</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'users' ? (
            <>
              <View style={styles.subtabRow}>
                <TouchableOpacity
                  style={[styles.subtabButton, activeUsersSubtab === 'requests' && styles.subtabButtonActive]}
                  onPress={() => setActiveUsersSubtab('requests')}
                >
                  <Text style={[styles.subtabButtonText, activeUsersSubtab === 'requests' && styles.subtabButtonTextActive]}>
                    Solicitudes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.subtabButton, activeUsersSubtab === 'paymentMethods' && styles.subtabButtonActive]}
                  onPress={() => setActiveUsersSubtab('paymentMethods')}
                >
                  <Text style={[styles.subtabButtonText, activeUsersSubtab === 'paymentMethods' && styles.subtabButtonTextActive]}>
                    Medios de pago
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.filterRow}>
                {activeUsersSubtab === 'requests' ? (
                  <>
                    <FilterChip label="Todos" active={userRequestFilter === 'all'} onPress={() => setUserRequestFilter('all')} />
                    <FilterChip label="Pendientes" active={userRequestFilter === 'pendiente'} onPress={() => setUserRequestFilter('pendiente')} />
                    <FilterChip label="Procesadas" active={userRequestFilter === 'procesado'} onPress={() => setUserRequestFilter('procesado')} />
                    <FilterChip label="Rechazadas" active={userRequestFilter === 'rechazado'} onPress={() => setUserRequestFilter('rechazado')} />
                  </>
                ) : (
                  <>
                    <FilterChip label="Todos" active={paymentMethodFilter === 'all'} onPress={() => setPaymentMethodFilter('all')} />
                    <FilterChip label="Pendientes" active={paymentMethodFilter === 'pendiente'} onPress={() => setPaymentMethodFilter('pendiente')} />
                    <FilterChip label="Verificados" active={paymentMethodFilter === 'verificado'} onPress={() => setPaymentMethodFilter('verificado')} />
                    <FilterChip label="Rechazados" active={paymentMethodFilter === 'rechazado'} onPress={() => setPaymentMethodFilter('rechazado')} />
                  </>
                )}
              </View>
            </>
          ) : null}

          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={C.brown} />
              <Text style={styles.stateText}>Cargando cola de revisión...</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorCard}>
              <Feather name="alert-triangle" size={16} color={C.orange} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {activeTab === 'goods' ? (
          <View style={[styles.dashboardGrid, isDesktop ? styles.dashboardGridDesktop : null]}>
            <View style={styles.gridColumn}>
              <SectionPanel
                title="BIENES PENDIENTES"
                count={pendingProducts.length}
                accent={C.orangeSoft}
                emptyText="No hay bienes pendientes en este momento."
              >
                <View style={styles.listStack}>
                  {pendingProducts.map((item) => (
                    <ProductCard
                      key={item.productId}
                      item={item}
                      selected={proposalProductId === item.productId}
                      onSelect={() => {
                        setProposalProductId(item.productId);
                        setProposalPrice(String(Math.round(item.proposedBasePrice ?? item.estimatedValue ?? 0) || 150000));
                        setProposalCurrency(item.preferredCurrency ?? 'ARS');
                      }}
                      onAccept={() => {
                        setProposalProductId(item.productId);
                        setProposalPrice(String(Math.round(item.proposedBasePrice ?? item.estimatedValue ?? 0) || 150000));
                        setProposalCurrency(item.preferredCurrency ?? 'ARS');
                      }}
                      onReject={() => handleReject(item.productId)}
                      primaryActionLabel="Seleccionar"
                      secondaryActionLabel="Rechazar"
                    />
                  ))}
                </View>
              </SectionPanel>

              <SectionPanel
                title="PROPUESTAS ENVIADAS"
                count={proposedProducts.length}
                accent={'#2563EB'}
                emptyText="Aún no hay propuestas enviadas al dueño."
              >
                <View style={styles.listStack}>
                  {proposedProducts.map((item) => (
                    <ProductCard
                      key={item.productId}
                      item={item}
                      selected={false}
                      onSelect={() => undefined}
                      onAccept={() => undefined}
                      onReject={() => undefined}
                    />
                  ))}
                </View>
              </SectionPanel>

              <SectionPanel
                title="BIENES RECHAZADOS"
                count={rejectedProducts.length}
                accent={C.redSoft}
                emptyText="Todavía no hay bienes rechazados."
              >
                <View style={styles.listStack}>
                  {rejectedProducts.map((item) => (
                    <ProductCard
                      key={item.productId}
                      item={item}
                      selected={false}
                      onSelect={() => undefined}
                      onAccept={() => undefined}
                      onReject={() => handleReject(item.productId)}
                    />
                  ))}
                </View>
              </SectionPanel>

              <SectionPanel
                title="INVENTARIO SUBY"
                count={subyProducts.length}
                accent={'#EDE9FE'}
                emptyText="No hay productos en el inventario de Suby por el momento."
              >
                <View style={styles.listStack}>
                  {subyProducts.map((item) => (
                    <View key={item.productId} style={styles.subyProductCard}>
                      {item.thumbnailUrl ? (
                        <Image
                          source={{ uri: item.thumbnailUrl }}
                          style={styles.subyProductThumb}
                          resizeMode="cover"
                        />
                      ) : null}
                      <View style={styles.subyProductBody}>
                        <View style={styles.subyProductHeader}>
                          <Text style={styles.subyProductCategory}>
                            {(item.category ?? 'general').toUpperCase()} · LOTE #{item.auctionId ?? '—'}
                          </Text>
                          <View style={styles.subyBadge}>
                            <Text style={styles.subyBadgeText}>SUBY</Text>
                          </View>
                        </View>
                        <Text style={styles.subyProductTitle}>{item.title}</Text>
                        <Text style={styles.subyProductMeta}>
                          Fotos: {item.photoCount} · Valor:{' '}
                          {formatCurrency(item.publishedBasePrice ?? item.estimatedValue ?? 0, item.currency)}
                        </Text>
                        {item.auctionId ? (
                          <Text style={styles.subyProductMeta}>Subasta #{item.auctionId}</Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              </SectionPanel>
            </View>

            <View style={styles.gridColumn}>
              <SectionPanel
                title="BIENES APROBADOS"
                count={readyProducts.length}
                accent={C.greenSoft}
                emptyText="Todavía no hay bienes aprobados para publicar."
              >
                <View style={styles.listStack}>
                  {readyProducts.map((item) => (
                    <ProductCard
                      key={item.productId}
                      item={item}
                      selected={insuranceProductId === item.productId}
                      lotSelected={selectedLotIds.has(item.productId)}
                      onSelect={() => setInsuranceProductId(item.productId)}
                      onAccept={() => undefined}
                      onReject={() => undefined}
                      onToggleLot={() => toggleAuctionLot(item)}
                    />
                  ))}
                </View>
              </SectionPanel>

              <View style={styles.sidePanelStack}>
              <SectionPanel
                title="PROPONER VALOR BASE"
                count={selectedProposalProduct ? 1 : 0}
                accent={'#2563EB'}
                emptyText="Seleccioná un bien pendiente para enviar una propuesta."
                alwaysShowChildren
              >
                  <View style={styles.formCard}>
                    <Text style={styles.formLabel}>Bien seleccionado</Text>
                    <Text style={styles.formValue}>
                      {selectedProposalProduct ? `${selectedProposalProduct.title} (#${selectedProposalProduct.productId})` : 'Seleccioná un bien pendiente'}
                    </Text>
                    {selectedProposalProduct ? (
                      <Text style={styles.panelNote}>
                        Preferencia del dueÃ±o: {selectedProposalProduct.preferredCurrency ?? 'sin definir'}
                        {normalizeStatus(selectedProposalProduct.acceptsUsd) === 'si' ? ' · acepta USD' : ' · no acepta USD'}
                      </Text>
                    ) : null}

                    <Text style={styles.formLabel}>Valor base propuesto</Text>
                    <TextInput style={styles.input} value={proposalPrice} onChangeText={setProposalPrice} keyboardType="numeric" />
                    <Text style={styles.formLabel}>Moneda de la propuesta</Text>
                    <View style={styles.optionWrap}>
                      {(['ARS', 'USD'] as const).map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[styles.optionButton, proposalCurrency === option && styles.optionButtonSelected]}
                          onPress={() => setProposalCurrency(option)}
                        >
                          <Text style={[styles.optionButtonText, proposalCurrency === option && styles.optionButtonTextSelected]}>
                            {option}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.formLabel}>Mensaje para el dueño</Text>
                    <TextInput
                      style={[styles.input, styles.multilineInput]}
                      value={`Propuesta generada desde el panel para ${selectedProposalProduct?.title ?? 'el bien seleccionado'}.`}
                      editable={false}
                      multiline
                    />

                    <TouchableOpacity
                      style={[styles.primaryButton, (!selectedProposalProduct || isSaving) && styles.primaryButtonDisabled]}
                      onPress={handlePropose}
                      disabled={isSaving}
                    >
                      {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{selectedProposalProduct ? 'Enviar propuesta' : 'Seleccioná un bien'}</Text>}
                    </TouchableOpacity>
                  </View>
                </SectionPanel>

              <SectionPanel
                title="ASIGNAR PÓLIZA"
                count={selectedInsuranceProduct ? 1 : 0}
                accent={C.greenSoft}
                emptyText="Seleccioná un bien aprobado para asociarle una póliza."
                alwaysShowChildren
              >
                  <View style={styles.formCard}>
                    <Text style={styles.formLabel}>Bien aprobado</Text>
                    <Text style={styles.formValue}>
                      {selectedInsuranceProduct
                        ? `${selectedInsuranceProduct.title} (#${selectedInsuranceProduct.productId})`
                        : 'Seleccioná un bien aprobado'}
                    </Text>

                    <Text style={styles.formLabel}>Dueño beneficiario</Text>
                    <Text style={styles.formValue}>{insuranceOptionsState?.ownerName ?? selectedInsuranceProduct?.ownerName ?? 'Sin dueño'}</Text>

                    <Text style={styles.formLabel}>Pólizas existentes válidas</Text>
                    {isLoadingInsuranceOptions ? (
                      <View style={styles.inlineLoader}>
                        <ActivityIndicator color={C.brown} />
                        <Text style={styles.stateText}>Cargando pólizas del dueño…</Text>
                      </View>
                    ) : insuranceOptions.length > 0 ? (
                      <View style={styles.optionWrap}>
                        {insuranceOptions.map((option) => (
                          <TouchableOpacity
                            key={option.insurancePolicy}
                            style={[
                              styles.optionButton,
                              selectedExistingInsurancePolicy === option.insurancePolicy && styles.optionButtonSelected,
                            ]}
                            onPress={() => setSelectedExistingInsurancePolicy(option.insurancePolicy)}
                          >
                            <Text
                              style={[
                                styles.optionButtonText,
                                selectedExistingInsurancePolicy === option.insurancePolicy && styles.optionButtonTextSelected,
                              ]}
                            >
                              {option.insurancePolicy}
                            </Text>
                            <Text
                              style={[
                                styles.optionButtonText,
                                selectedExistingInsurancePolicy === option.insurancePolicy && styles.optionButtonTextSelected,
                              ]}
                            >
                              {option.company} · {option.combinedPolicy ? 'Combinada' : 'Individual'} · {formatCurrency(option.amount)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.panelNote}>No hay pólizas reutilizables para este dueño. Podés crear una nueva abajo.</Text>
                    )}

                    <TouchableOpacity
                      style={[styles.primaryButton, (!selectedExistingInsurancePolicy || !selectedInsuranceProduct || isSaving) && styles.primaryButtonDisabled]}
                      onPress={handleAssignInsurance}
                      disabled={!selectedExistingInsurancePolicy || !selectedInsuranceProduct || isSaving}
                    >
                      {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Asignar póliza existente</Text>}
                    </TouchableOpacity>

                    <Text style={styles.panelNote}>
                      Acá solo aparecen pólizas válidas para este dueño. Si una póliza no es combinada, no se puede reutilizar en otro producto.
                    </Text>

                    <Text style={styles.formLabel}>Crear nueva póliza</Text>
                    <TextInput
                      style={styles.input}
                      value={newInsurancePolicyCode}
                      onChangeText={setNewInsurancePolicyCode}
                      placeholder="Código opcional. Si queda vacío, se genera uno"
                      autoCapitalize="characters"
                    />
                    <Text style={styles.formLabel}>Compañía aseguradora</Text>
                    <TextInput
                      style={styles.input}
                      value={newInsuranceCompany}
                      onChangeText={setNewInsuranceCompany}
                      placeholder="Escribí la aseguradora que emitió la póliza"
                    />
                    {insuranceCompanies.length > 0 ? (
                      <>
                        <Text style={styles.formLabel}>Sugerencias ya usadas</Text>
                        <View style={styles.optionWrap}>
                          {insuranceCompanies.map((option) => (
                            <TouchableOpacity
                              key={option.company}
                              style={[styles.optionButton, newInsuranceCompany === option.company && styles.optionButtonSelected]}
                              onPress={() => setNewInsuranceCompany(option.company)}
                            >
                              <Text style={[styles.optionButtonText, newInsuranceCompany === option.company && styles.optionButtonTextSelected]}>
                                {option.company}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </>
                    ) : null}
                    <TextInput
                      style={styles.input}
                      value={newInsurancePhone}
                      onChangeText={setNewInsurancePhone}
                      placeholder="Teléfono de la aseguradora"
                    />
                    <TextInput
                      style={styles.input}
                      value={newInsuranceAmount}
                      onChangeText={setNewInsuranceAmount}
                      placeholder="Importe asegurado"
                      keyboardType="numeric"
                    />

                    <Text style={styles.formLabel}>Tipo de póliza</Text>
                    <View style={styles.optionWrap}>
                      <TouchableOpacity
                        style={[styles.optionButton, newInsuranceCombined && styles.optionButtonSelected]}
                        onPress={() => setNewInsuranceCombined(true)}
                      >
                        <Text style={[styles.optionButtonText, newInsuranceCombined && styles.optionButtonTextSelected]}>
                          Combinada
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.optionButton, !newInsuranceCombined && styles.optionButtonSelected]}
                        onPress={() => setNewInsuranceCombined(false)}
                      >
                        <Text style={[styles.optionButtonText, !newInsuranceCombined && styles.optionButtonTextSelected]}>
                          Individual
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={[styles.primaryButton, (!selectedInsuranceProduct || isSaving) && styles.primaryButtonDisabled]}
                      onPress={handleCreateInsurance}
                      disabled={!selectedInsuranceProduct || isSaving}
                    >
                      {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Crear y asignar póliza</Text>}
                    </TouchableOpacity>
                  </View>
                </SectionPanel>

              <SectionPanel
                title="PUBLICAR SUBASTA"
                count={selectedLotCount}
                accent={C.brown}
                emptyText="Seleccioná uno o más bienes aprobados para completar el formulario."
                alwaysShowChildren
              >
                  <View style={styles.formCard}>
                    <Text style={styles.formLabel}>Lotes seleccionados</Text>
                    {selectedLotCount > 0 ? (
                      <View style={styles.selectedLotList}>
                        {selectedLots.map((lot) => (
                          <View key={lot.productId} style={styles.selectedLotCard}>
                          <View style={styles.selectedLotHeader}>
                            <View>
                              <Text style={styles.selectedLotTitle}>{lot.title}</Text>
                              <Text style={styles.selectedLotMeta}>Lote #{lot.productId}</Text>
                            </View>
                            <TouchableOpacity onPress={() => removeSelectedLot(lot.productId)}>
                                <Text style={styles.removeLotText}>Quitar</Text>
                              </TouchableOpacity>
                          </View>
                            <Text style={styles.formLabel}>Precio base del lote</Text>
                            <TextInput
                              style={styles.input}
                              value={lot.basePrice}
                              onChangeText={(value) => updateSelectedLotBasePrice(lot.productId, value)}
                              keyboardType="numeric"
                            />
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.formValue}>Seleccioná uno o más bienes aprobados</Text>
                    )}

                    <Text style={styles.panelNote}>
                      No tenés que esperar aprobación del usuario: una vez que el bien está aceptado por el panel, podés incluirlo directo en una subasta.
                    </Text>

                    <Text style={styles.formLabel}>Precio base de referencia</Text>
                    <TextInput style={styles.input} value={basePrice} onChangeText={setBasePrice} keyboardType="numeric" />
                    <Text style={styles.panelNote}>
                      Este valor sólo sirve como referencia. Cada lote seleccionado puede tener su propio precio base.
                    </Text>

                    <Text style={styles.formLabel}>Comisión (%)</Text>
                    <TextInput style={styles.input} value={commission} onChangeText={setCommission} keyboardType="numeric" />

                    <Text style={styles.formLabel}>Subastador</Text>
                    <View style={styles.optionWrap}>
                      {subastadorOptions.map((option) => (
                        <TouchableOpacity
                          key={option.id}
                          style={[styles.optionButton, subastadorId === option.id && styles.optionButtonSelected]}
                          onPress={() => setSubastadorId(option.id)}
                        >
                          <Text style={[styles.optionButtonText, subastadorId === option.id && styles.optionButtonTextSelected]}>
                            {option.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.formLabel}>Subasta existente</Text>
                    <View style={styles.optionWrap}>
                      <TouchableOpacity
                        style={[styles.optionButton, auctionTargetId === null && styles.optionButtonSelected]}
                        onPress={() => setAuctionTargetId(null)}
                      >
                        <Text style={[styles.optionButtonText, auctionTargetId === null && styles.optionButtonTextSelected]}>
                          Nueva subasta
                        </Text>
                      </TouchableOpacity>
                      {auctionOptions.map((auction) => (
                        <TouchableOpacity
                          key={auction.id}
                          style={[styles.optionButton, auctionTargetId === auction.id && styles.optionButtonSelected]}
                          onPress={() => setAuctionTargetId(auction.id)}
                        >
                          <Text style={[styles.optionButtonText, auctionTargetId === auction.id && styles.optionButtonTextSelected]}>
                            {auction.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.formLabel}>Categoría</Text>
                    <View style={styles.optionWrap}>
                      {AUCTION_CATEGORIES.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[styles.optionButton, category === option.value && styles.optionButtonSelected]}
                          onPress={() => setCategory(option.value)}
                        >
                          <Text style={[styles.optionButtonText, category === option.value && styles.optionButtonTextSelected]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.formLabel}>Fecha</Text>
                    <TouchableOpacity
                      style={styles.dateField}
                      activeOpacity={0.85}
                      onPress={() => setShowDatePicker((current) => !current)}
                    >
                      <View>
                        <Text style={styles.dateFieldLabel}>Elegí fecha</Text>
                        <Text style={styles.dateFieldValue}>{auctionDate}</Text>
                      </View>
                      <Feather name={showDatePicker ? 'chevron-up' : 'chevron-down'} size={18} color={C.textMid} />
                    </TouchableOpacity>

                    {showDatePicker ? (
                      <View style={styles.calendarCard}>
                        <Text style={styles.calendarHint}>Elegí primero el año, después el mes y por último el día.</Text>

                        <Text style={styles.calendarSectionTitle}>Año</Text>
                        <View style={styles.optionWrap}>
                          {yearOptions.map((year) => (
                            <TouchableOpacity
                              key={year}
                              style={[styles.optionButton, auctionYear === year && styles.optionButtonSelected]}
                              onPress={() => setAuctionYear(year)}
                            >
                              <Text style={[styles.optionButtonText, auctionYear === year && styles.optionButtonTextSelected]}>
                                {year}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        <Text style={styles.calendarSectionTitle}>Mes</Text>
                        <View style={styles.optionWrap}>
                          {MONTH_LABELS.map((label, index) => {
                            const month = index + 1;
                            return (
                              <TouchableOpacity
                                key={label}
                                style={[styles.optionButton, auctionMonth === month && styles.optionButtonSelected]}
                                onPress={() => setAuctionMonth(month)}
                              >
                                <Text style={[styles.optionButtonText, auctionMonth === month && styles.optionButtonTextSelected]}>
                                  {label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        <Text style={styles.calendarSectionTitle}>Día</Text>
                        <View style={styles.weekdayRow}>
                          {WEEKDAY_LABELS.map((label) => (
                            <Text key={label} style={styles.weekdayLabel}>{label}</Text>
                          ))}
                        </View>
                        <View style={styles.calendarGrid}>
                          {calendarDays.map((day, index) => {
                            if (!day) {
                              return <View key={`empty-${index}`} style={styles.calendarDayEmpty} />;
                            }

                            const disabled = !isSelectableAuctionDate(auctionYear, auctionMonth, day);
                            const selected = auctionDay === day;

                            return (
                              <TouchableOpacity
                                key={day}
                                style={[
                                  styles.calendarDay,
                                  selected && styles.calendarDaySelected,
                                  disabled && styles.calendarDayDisabled,
                                ]}
                                onPress={() => {
                                  if (!disabled) {
                                    setAuctionDay(day);
                                    setShowDatePicker(false);
                                  }
                                }}
                                disabled={disabled}
                              >
                                <Text
                                  style={[
                                    styles.calendarDayText,
                                    selected && styles.calendarDayTextSelected,
                                    disabled && styles.calendarDayTextDisabled,
                                  ]}
                                >
                                  {day}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    ) : null}

                    <Text style={styles.formLabel}>Hora</Text>
                    <View style={styles.timeRow}>
                      <TextInput
                        style={[styles.input, styles.timeInput]}
                        value={auctionHour}
                        onChangeText={setAuctionHour}
                        placeholder="HH:MM:SS"
                      />
                      <TouchableOpacity style={styles.timeResetButton} onPress={() => setAuctionHour(getAutoAuctionHour(5))}>
                        <Feather name="clock" size={16} color={C.brown} />
                        <Text style={styles.timeResetText}>+5 min</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.timeHelper}>Por defecto arranca en ahora + 5 min, pero lo podés cambiar a mano.</Text>

                    <Text style={styles.formLabel}>Ubicación</Text>
                    <TextInput style={styles.input} value={location} onChangeText={setLocation} />

                    <Text style={styles.formLabel}>Descripción</Text>
                    <TextInput style={styles.input} value={description} onChangeText={setDescription} />

                    <Text style={styles.formLabel}>Moneda</Text>
                    <TextInput style={styles.input} value={currency} onChangeText={setCurrency} />

                    <TouchableOpacity
                      style={[styles.primaryButton, (selectedLotCount === 0 || isSaving) && styles.primaryButtonDisabled]}
                      onPress={handleCreateAuction}
                      disabled={selectedLotCount === 0 || isSaving}
                    >
                      {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{auctionTargetId ? 'Asignar a subasta' : 'Crear subasta'}</Text>}
                    </TouchableOpacity>
                  </View>
                </SectionPanel>

              <SectionPanel
                title="RECHAZO RÁPIDO"
                count={1}
                accent={C.redSoft}
                emptyText="Configurá las razones de rechazo."
                alwaysShowChildren
              >
                  <View style={styles.formCard}>
                    <Text style={styles.formLabel}>Costo devolución</Text>
                    <TextInput style={styles.input} value={returnCost} onChangeText={setReturnCost} keyboardType="numeric" />
                    <Text style={styles.formLabel}>Razones separadas por salto de línea</Text>
                    <TextInput
                      style={[styles.input, styles.multilineInput]}
                      value={rejectionReasons}
                      onChangeText={setRejectionReasons}
                      multiline
                    />
                  </View>
                </SectionPanel>
              </View>
            </View>
          </View>
          ) : activeUsersSubtab === 'requests' ? (
          <View style={[styles.dashboardGrid, isDesktop ? styles.dashboardGridDesktop : null]}>
            <View style={styles.gridColumn}>
              <SectionPanel
                title="SOLICITUDES DE USUARIOS"
                count={filteredUserRequests.length}
                accent={C.orangeSoft}
                emptyText="No hay solicitudes para el filtro seleccionado."
              >
                <View style={styles.listStack}>
                  {filteredUserRequests.map((item) => (
                    <UserRequestCard
                      key={item.requestId}
                      item={item}
                      category={userRequestCategories[item.requestId] ?? 'comun'}
                      rejectReason={userRejectReasons[item.requestId] ?? ''}
                      onCategoryChange={(value) => setUserRequestCategories((current) => ({ ...current, [item.requestId]: value }))}
                      onRejectReasonChange={(value) => setUserRejectReasons((current) => ({ ...current, [item.requestId]: value }))}
                      onApprove={() => void handleApproveUserRequest(item.requestId)}
                      onReject={() => void handleRejectUserRequest(item.requestId)}
                    />
                  ))}
                </View>
              </SectionPanel>

              <SectionPanel
                title="USUARIOS ACTUALES"
                count={filteredManagedUsers.length}
                accent={C.greenSoft}
                emptyText="No hay usuarios cliente cargados."
              >
                <View style={styles.listStack}>
                  {filteredManagedUsers.map((item) => (
                    <ManagedUserCard
                      key={item.userId}
                      item={item}
                      category={managedUserCategories[item.userId] ?? item.category ?? 'comun'}
                      onCategoryChange={(value) => setManagedUserCategories((current) => ({ ...current, [item.userId]: value }))}
                      onSave={() => void handleUpdateManagedUserCategory(item.userId)}
                    />
                  ))}
                </View>
              </SectionPanel>
            </View>
          </View>
          ) : (
          <View style={[styles.dashboardGrid, isDesktop ? styles.dashboardGridDesktop : null]}>
            <View style={styles.gridColumn}>
              <SectionPanel
                title="MEDIOS DE PAGO"
                count={filteredPaymentMethods.length}
                accent={'#DBEAFE'}
                emptyText="No hay medios de pago para el filtro seleccionado."
              >
                <View style={styles.listStack}>
                  {filteredPaymentMethods.map((item) => (
                    <View
                      key={item.paymentMethodId}
                      style={[
                        styles.card,
                        normalizeStatus(item.status) === 'verificado'
                          ? styles.cardAccepted
                          : normalizeStatus(item.status) === 'rechazado'
                            ? styles.cardRejected
                            : styles.cardPending,
                      ]}
                    >
                      <View style={styles.rowBetween}>
                        <View style={styles.cardTitleBlock}>
                          <Text style={styles.title}>{item.userName}</Text>
                          <Text style={styles.meta}>{item.userEmail ?? 'Sin email'}</Text>
                          <Text style={styles.meta}>{item.label}</Text>
                          <Text style={styles.meta}>
                            Tipo: {item.type} · Moneda: {item.currency ?? 'ARS'}
                            {typeof item.declaredAmount === 'number' ? ` · Declarado ${formatCurrency(item.declaredAmount)}` : ''}
                            {normalizeStatus(item.status) === 'verificado' && typeof item.approvedAmount === 'number'
                              ? ` · Habilitado ${formatCurrency(item.approvedAmount)}`
                              : ''}
                          </Text>
                          {item.auctionLabel ? <Text style={styles.meta}>{item.auctionLabel}</Text> : null}
                          {item.reviewReason ? <Text style={styles.panelNote}>{item.reviewReason}</Text> : null}
                        </View>
                        <View
                          style={[
                            styles.badge,
                            normalizeStatus(item.status) === 'verificado'
                              ? styles.badgeAccepted
                              : normalizeStatus(item.status) === 'rechazado'
                                ? styles.badgeRejected
                                : styles.badgeProposed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              normalizeStatus(item.status) === 'verificado'
                                ? styles.badgeTextAccepted
                                : normalizeStatus(item.status) === 'rechazado'
                                  ? styles.badgeTextRejected
                                  : styles.badgeTextProposed,
                            ]}
                          >
                            {(item.status || 'pendiente').toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      {normalizeStatus(item.status) === 'pendiente' ? (
                        <>
                          {item.type === 'card' ? (
                            <>
                              <Text style={styles.formLabel}>Límite máximo habilitado</Text>
                              <TextInput
                                style={styles.input}
                                value={paymentMethodLimits[item.paymentMethodId] ?? ''}
                                onChangeText={(value) => setPaymentMethodLimits((current) => ({ ...current, [item.paymentMethodId]: value }))}
                                keyboardType="numeric"
                                placeholder="Ej. 500000"
                              />
                            </>
                          ) : null}

                          <Text style={styles.formLabel}>Motivo de rechazo</Text>
                          <TextInput
                            style={[styles.input, styles.multilineInput]}
                            value={paymentMethodRejectReasons[item.paymentMethodId] ?? ''}
                            onChangeText={(value) => setPaymentMethodRejectReasons((current) => ({ ...current, [item.paymentMethodId]: value }))}
                            placeholder="Opcional"
                            multiline
                          />

                          <View style={styles.actionsRow}>
                            <TouchableOpacity style={[styles.actionButton, styles.actionButtonAccept]} onPress={() => void handleApprovePaymentMethod(item.paymentMethodId)}>
                              <Feather name="check" size={16} color="#fff" />
                              <Text style={styles.actionText}>{item.type === 'card' ? 'Aprobar límite' : 'Aprobar'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionButton, styles.actionButtonReject]} onPress={() => void handleRejectPaymentMethod(item.paymentMethodId)}>
                              <Feather name="x" size={16} color="#fff" />
                              <Text style={styles.actionText}>Rechazar</Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      ) : null}
                    </View>
                  ))}
                </View>
              </SectionPanel>
            </View>
          </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, accent ? { color: accent } : null]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingBottom: 30 },
  pageShell: { width: '100%', maxWidth: 1480, alignSelf: 'center' },
  header: {
    marginHorizontal: 18,
    marginTop: 8,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    backgroundColor: C.brown,
  },
  backButton: { alignSelf: 'flex-start', marginBottom: 8, padding: 4 },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '800', textAlign: 'center', marginTop: -10 },
  headerSubtitle: { color: 'rgba(255,255,255,0.72)', textAlign: 'center', marginTop: 6, fontSize: 14 },
  summaryCard: {
    marginTop: 18,
    marginHorizontal: 20,
    backgroundColor: C.white,
    borderRadius: 22,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  summaryCardDesktop: {
    marginHorizontal: 18,
  },
  metric: { flex: 1, alignItems: 'center', paddingVertical: 18, borderRightWidth: 1, borderRightColor: C.border },
  metricValue: { color: C.textDark, fontSize: 24, fontWeight: '800', marginBottom: 4 },
  metricLabel: { color: C.textLight, fontSize: 11, letterSpacing: 0.8 },
  stateCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: C.white, borderRadius: 18, padding: 18, alignItems: 'center', gap: 10 },
  stateText: { color: C.textMid },
  errorCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: '#FFF7ED', borderRadius: 18, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center' },
  errorText: { flex: 1, color: '#9A3412' },
  tabRow: { marginTop: 16, marginHorizontal: 20, flexDirection: 'row', gap: 12 },
  subtabRow: { marginTop: 14, marginHorizontal: 20, flexDirection: 'row', gap: 10 },
  tabButton: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabButtonActive: {
    backgroundColor: C.brown,
    borderColor: C.brown,
  },
  tabButtonText: {
    color: C.textMid,
    fontWeight: '800',
  },
  tabButtonTextActive: {
    color: '#fff',
  },
  subtabButton: {
    backgroundColor: '#EEF3FA',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  subtabButtonActive: {
    backgroundColor: C.white,
    borderColor: C.brown,
  },
  subtabButtonText: {
    color: C.textMid,
    fontWeight: '700',
  },
  subtabButtonTextActive: {
    color: C.brown,
    fontWeight: '800',
  },
  filterRow: {
    marginTop: 12,
    marginHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChip: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  filterChipActive: {
    backgroundColor: C.brown,
    borderColor: C.brown,
  },
  filterChipText: {
    color: C.textMid,
    fontSize: 13,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  dashboardGrid: { marginTop: 18, paddingHorizontal: 20, gap: 18 },
  dashboardGridDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  gridColumn: { flex: 1, gap: 18 },
  sidePanelStack: { gap: 18 },
  sectionPanel: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 22,
    padding: 18,
    shadowColor: '#16304D',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  sectionTitle: { color: C.textDark, fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  sectionSubtitle: { color: C.textLight, fontSize: 12, marginTop: 3 },
  sectionPill: { minWidth: 42, height: 32, paddingHorizontal: 10, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sectionPillText: { color: C.white, fontWeight: '900', fontSize: 13 },
  listStack: { gap: 12 },
  emptyText: { color: C.textLight, fontSize: 13, paddingVertical: 18 },
  subyProductCard: {
    backgroundColor: '#FAFAFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C4B5FD',
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 12,
  },
  subyProductThumb: { width: 60, height: 60, borderRadius: 12 },
  subyProductBody: { flex: 1, gap: 3 },
  subyProductHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subyProductCategory: { fontSize: 11, color: '#7C3AED', fontWeight: '700', letterSpacing: 0.3 },
  subyProductTitle: { fontSize: 15, fontWeight: '800', color: C.textDark },
  subyProductMeta: { fontSize: 12, color: C.textLight },
  subyBadge: {
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  subyBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  card: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 12,
  },
  cardSelected: { borderColor: C.brown },
  cardPending: {},
  cardAccepted: { borderColor: '#89E0A6' },
  cardProposed: { borderColor: '#9EC5FF' },
  cardRejected: { borderColor: '#F9A8A8' },
  cardTop: { flexDirection: 'row', gap: 12 },
  thumbnail: { width: 78, height: 78, borderRadius: 16 },
  thumbnailFallback: { width: 78, height: 78, borderRadius: 16, backgroundColor: '#E9EEF6' },
  cardBody: { flex: 1, gap: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitleBlock: { flex: 1, gap: 2 },
  lotCode: { color: C.textLight, fontSize: 11, fontWeight: '800', letterSpacing: 0.7 },
  title: { color: C.textDark, fontSize: 17, fontWeight: '800', lineHeight: 22 },
  meta: { color: C.textMid, fontSize: 12 },
  cardFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 2 },
  statusHint: { fontSize: 12, fontWeight: '700' },
  toneAccepted: { color: C.green },
  toneProposed: { color: '#2563EB' },
  toneRejected: { color: C.red },
  tonePending: { color: C.orange },
  createHint: { color: C.green, fontSize: 12, fontWeight: '700' },
  badge: { borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  badgeAccepted: { backgroundColor: C.greenSoft },
  badgeProposed: { backgroundColor: C.blueSoft },
  badgeRejected: { backgroundColor: C.redSoft },
  badgePending: { backgroundColor: C.orangeSoft },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  badgeTextAccepted: { color: C.green },
  badgeTextProposed: { color: '#2563EB' },
  badgeTextRejected: { color: C.red },
  badgeTextPending: { color: C.orange },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionButton: { flex: 1, borderRadius: 12, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  actionButtonAccept: { backgroundColor: C.green },
  actionButtonReject: { backgroundColor: C.red },
  actionText: { color: '#fff', fontWeight: '800' },
  actionsRowSingle: { flexDirection: 'row', marginTop: 12 },
  lotToggleButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  lotToggleButtonActive: {
    backgroundColor: C.greenSoft,
    borderColor: '#89E0A6',
  },
  lotToggleButtonIdle: {
    backgroundColor: '#FBFCFE',
    borderColor: C.border,
  },
  lotToggleText: { fontWeight: '800', fontSize: 13 },
  lotToggleTextActive: { color: C.green },
  lotToggleTextIdle: { color: C.textMid },
  acceptedCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  acceptedCardReady: { borderColor: '#89E0A6' },
  acceptedCardLocked: { borderColor: '#D8E2F0' },
  acceptedLeft: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  acceptedThumb: { width: 64, height: 64, borderRadius: 14 },
  acceptedThumbFallback: { width: 64, height: 64, borderRadius: 14, backgroundColor: '#E9EEF6' },
  acceptedCopy: { flex: 1, gap: 3 },
  acceptedTitle: { color: C.textDark, fontSize: 16, fontWeight: '800' },
  acceptedMeta: { color: C.textMid, fontSize: 12 },
  formCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 10,
  },
  dateField: {
    borderWidth: 1,
    borderColor: '#DDE6F2',
    backgroundColor: '#FBFCFE',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dateFieldLabel: {
    color: C.textLight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  dateFieldValue: {
    color: C.textDark,
    fontSize: 15,
    fontWeight: '800',
  },
  calendarCard: {
    backgroundColor: '#F8FAFD',
    borderWidth: 1,
    borderColor: '#DDE6F2',
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  calendarHint: {
    color: C.textMid,
    fontSize: 12,
    lineHeight: 18,
  },
  calendarSectionTitle: {
    color: C.textDark,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginTop: -2,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    color: C.textLight,
    fontSize: 11,
    fontWeight: '800',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  calendarDay: {
    width: '13.2%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDaySelected: {
    borderColor: C.brown,
    backgroundColor: C.brown,
  },
  calendarDayDisabled: {
    backgroundColor: '#F1F5FA',
    borderColor: '#E7EDF5',
  },
  calendarDayText: {
    color: C.textDark,
    fontSize: 13,
    fontWeight: '800',
  },
  calendarDayTextSelected: {
    color: '#fff',
  },
  calendarDayTextDisabled: {
    color: C.textLight,
  },
  calendarDayEmpty: {
    width: '13.2%',
    aspectRatio: 1,
  },
  autoTimeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#FFF5EF',
    borderWidth: 1,
    borderColor: '#F2C8B8',
  },
  autoTimeText: {
    flex: 1,
    color: C.brown,
    fontSize: 12,
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeInput: {
    flex: 1,
  },
  timeResetButton: {
    borderWidth: 1,
    borderColor: '#F2C8B8',
    backgroundColor: '#FFF5EF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeResetText: {
    color: C.brown,
    fontSize: 12,
    fontWeight: '800',
  },
  timeHelper: {
    color: C.textMid,
    fontSize: 12,
    lineHeight: 18,
    marginTop: -2,
  },
  panelNote: {
    color: C.textMid,
    fontSize: 12,
    lineHeight: 18,
    backgroundColor: '#F8FAFD',
    borderWidth: 1,
    borderColor: '#DDE6F2',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 2,
  },
  formRow: { flexDirection: 'row', gap: 12 },
  formHalf: { flex: 1 },
  formLabel: { color: C.textLight, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginTop: 4 },
  formValue: { color: C.textDark, fontSize: 14, fontWeight: '700' },
  inlineLoader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionButton: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FBFCFE',
  },
  optionButtonSelected: {
    borderColor: C.brown,
    backgroundColor: '#F8EFEB',
  },
  optionButtonText: {
    color: C.textMid,
    fontSize: 12,
    fontWeight: '800',
  },
  optionButtonTextSelected: {
    color: C.brown,
  },
  selectedLotList: { gap: 12 },
  selectedLotCard: {
    backgroundColor: '#FBFCFE',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  selectedLotHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  selectedLotTitle: { color: C.textDark, fontSize: 14, fontWeight: '800' },
  selectedLotMeta: { color: C.textLight, fontSize: 11, marginTop: 2 },
  removeLotText: { color: C.red, fontSize: 12, fontWeight: '800' },
  loginCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: C.textDark,
    backgroundColor: '#FBFCFE',
  },
  multilineInput: { minHeight: 110, textAlignVertical: 'top' },
  primaryButton: {
    marginTop: 6,
    backgroundColor: C.brown,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  centerState: { flex: 1, minHeight: 500, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  centerTitle: { color: C.textDark, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  centerText: { color: C.textMid, textAlign: 'center' },
});
