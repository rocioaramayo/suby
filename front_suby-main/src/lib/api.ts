import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const DEFAULT_API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

function getExpoDevelopmentHost() {
  const hostUri = Constants.expoConfig?.hostUri;

  if (!hostUri) {
    return null;
  }

  const [host] = hostUri.split(':');
  return host || null;
}

function normalizeApiBaseUrl(rawUrl: string) {
  const trimmedUrl = rawUrl.replace(/\/$/, '');
  const expoDevelopmentHost = Device.isDevice ? getExpoDevelopmentHost() : null;
  // When the app runs on a physical device from Expo CLI, use Metro's LAN host
  // so a localhost API on the same machine still resolves correctly.
  const resolvedUrl = expoDevelopmentHost
    ? trimmedUrl
        .replace('://localhost', `://${expoDevelopmentHost}`)
        .replace('://127.0.0.1', `://${expoDevelopmentHost}`)
    : trimmedUrl;

  if (Platform.OS !== 'android') {
    return resolvedUrl;
  }

  if (Device.isDevice) {
    return resolvedUrl;
  }

  return resolvedUrl
    .replace('://localhost', '://10.0.2.2')
    .replace('://127.0.0.1', '://10.0.2.2');
}

export const API_BASE_URL = normalizeApiBaseUrl(DEFAULT_API_BASE_URL);

function buildFallbackApiUrls(primaryUrl: string) {
  const candidates = [primaryUrl];

  if (Platform.OS === 'web') {
    if (primaryUrl.includes('127.0.0.1')) {
      candidates.push(primaryUrl.replace('127.0.0.1', 'localhost'));
    } else if (primaryUrl.includes('localhost')) {
      candidates.push(primaryUrl.replace('localhost', '127.0.0.1'));
    }
  }

  return Array.from(new Set(candidates));
}

export function resolveApiAssetUrl(rawUrl?: string | null) {
  if (!rawUrl?.trim()) {
    return undefined;
  }

  try {
    return new URL(rawUrl, `${API_BASE_URL}/`).toString();
  } catch {
    return rawUrl;
  }
}

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export class ApiError extends Error {
  status: number;
  data: JsonValue | null;

  constructor(message: string, status: number, data: JsonValue | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export class NetworkError extends Error {
  url: string;

  constructor(url: string, message: string) {
    super(`No se pudo conectar con la API en ${url}. ${message}`);
    this.name = 'NetworkError';
    this.url = url;
  }
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (
      error.status === 413 ||
      error.message.toLowerCase().includes('maximum upload size exceeded') ||
      error.message.toLowerCase().includes('payload too large')
    ) {
      return 'Los archivos seleccionados pesan demasiado. Probá con fotos más livianas o documentos más chicos.';
    }

    return error.message;
  }

  if (__DEV__ && error instanceof Error) {
    return error.message;
  }

  return fallback;
}

interface LoginResponse {
  token?: string;
  userId?: number;
  email?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  membershipTier?: string;
  declaredGuarantee?: number;
  requiresPasswordChange: boolean;
  raw: JsonValue | null;
}

export interface UserProfileResponse {
  id: number;
  name: string;
  email: string;
  category: string;
  verified: boolean;
  accountStatus: string;
  declaredGuarantee: number;
  auctionsWon: number;
  distinctPaymentTypes: number;
}

export interface UserStatsResponse {
  successRate: number;
  totalBids: number;
  totalAuctionsParticipated: number;
  auctionsWon: number;
  categoryProgress: {
    currentCategory: string;
    nextCategory: string;
    auctionsWon: number;
    auctionsRequired: number;
    paymentTypesRegistered: number;
    paymentTypesRequired: number;
  };
}

export interface UserBidHistoryItem {
  bidId: number;
  itemId?: number;
  auctionId?: number;
  auctionName: string;
  lotCode: string;
  itemTitle: string;
  amount: number;
  winner: boolean;
  date: string;
}

export interface UserBidHistoryResponse {
  bids: UserBidHistoryItem[];
  total: number;
}

export interface WonBidTimelineItem {
  bidNumber: number;
  bidderLabel: string;
  amount: number;
  timestamp: string;
}

export interface WonBidDetailResponse {
  item: {
    itemId: number;
    lotCode: string;
    title: string;
    description?: string;
    ownerAtSale?: string;
    photos?: string[];
  };
  auction: {
    id: number;
    name: string;
    date?: string;
    location?: string;
    auctioneer?: string;
  };
  result: {
    userBid: number;
    winningBid: number;
    won: boolean;
    subyCommissionPct: number;
    subyCommissionAmount: number;
    totalPaid: number;
  };
  bidTimeline: WonBidTimelineItem[];
}

export interface SearchLotResult {
  itemId: number;
  lotCode: string;
  title: string;
  auctionId?: number;
  category?: string;
  auctioned?: string;
}

export interface SearchAuctionResult {
  id: number;
  name: string;
  status: string;
  date: string;
}

export interface AuctionListItem {
  id: number;
  name: string;
  category: string;
  date: string;
  endTime?: string;
  status: string;
  currency?: string;
  auctioneer?: string;
  totalLots: number;
  soldLots: number;
  activeLots: number;
  thumbnailUrl?: string;
  
}

export interface AuctionListResponse {
  auctions: AuctionListItem[];
  total: number;
  page: number;
  perPage: number;
}

export interface AuctionCatalogItem {
  itemId: number;
  lotCode: string;
  title: string;
  attribution?: string;
  owner?: string;
  itemCategory?: string;
  auctioned?: string;
  basePrice?: number;
  currency?: string;
  thumbnailUrl?: string;
}

export interface AuctionDetailResponse {
  id: number;
  name: string;
  date: string;
  hour?: string;
  endTime?: string;
  status: string;
  category: string;
  currency?: string;
  location?: string;
  auctioneer?: {
    id?: number;
    name?: string;
    license?: string;
  };
  catalog: {
    id?: number;
    description?: string;
    items: AuctionCatalogItem[];
  };
}

export interface LotDetailResponse {
  itemId: number;
  lotCode: string;
  title: string;
  category: string;
  basePrice?: number;
  currentOffer?: number;
  currency?: string;
  owner?: string;
  artist?: string;
  period?: string;
  auctioned?: string;
  description?: string;
  catalogDescription?: string;
  history?: string;
  condition?: string;
  image?: string;
  gallery?: string[];
  auction?: {
    id?: number;
    name?: string;
    date?: string;
    auctioneer?: string;
    location?: string;
  };
}

interface VerifyCodeResponse {
  token?: string;
  userId?: number;
  raw: JsonValue | null;
}

interface RegisterInput {
  nombre: string;
  apellido: string;
  email: string;
  pais: string;
  domicilio: string;
  documento: string;
  frontalUri: string;
  frontalName?: string;
  frontalType?: string;
  backUri: string;
  backName?: string;
  backType?: string;
}

interface PasswordChangeInput {
  userId: number;
  token: string;
  password: string;
  passwordConfirmation: string;
}

interface PasswordResetConfirmInput {
  email: string;
  code: string;
  password: string;
  passwordConfirmation: string;
}

export type PaymentMethodType = 'card' | 'bank' | 'check';

export type CountryOption = {
  id: number;
  name: string;
  shortName?: string;
};

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  title: string;
  subtitle: string;
  status?: string;
  currency?: string;
  internationalCard?: boolean;
  auctionId?: number;
  reviewNote?: string;
  availableBalance?: number;
}

export interface HomeFeaturedLot {
  id: string;
  itemId?: number;
  auctionId?: number;
  lotCode: string;
  title: string;
  subtitle: string;
  category: string;
  badge: string;
  basePrice: number;
  image?: string;
  currency?: string;
}

export interface HomeAuction {
  id: string;
  auctionId?: number;
  title: string;
  subtitle: string;
  auctioneer?: string;
  date?: string;
  time?: string;
  status?: string;
  category?: string;
  currency?: string;
  lotCount?: number;
  location?: string;
  currentBid?: number;
  image?: string;
}

export interface HomeDashboard {
  displayName?: string;
  membershipTier?: string;
  declaredGuarantee?: number;
  featuredLots: HomeFeaturedLot[];
  upcomingAuctions: HomeAuction[];
  liveAuctions: HomeAuction[];
  raw: JsonValue | null;
}

export interface UploadUserProductAsset {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

export interface UploadUserProductInput {
  userId: number;
  token: string;
  category: string;
  name: string;
  condition: string;
  originProvenance: string;
  fullDescription: string;
  ownershipDeclaration: boolean;
  photos: UploadUserProductAsset[];
  originDocs?: UploadUserProductAsset[];
  receivingAccountId?: number;
  depositId?: number;
  preferredCurrency?: 'ARS' | 'USD';
  acceptsUsd?: boolean;
  isArt?: boolean;
  artist?: string;
  creationDate?: string;
  historicalContext?: string;
}

export interface UploadUserProductResponse {
  message: string;
  status?: string;
  raw: JsonValue | null;
}

export interface OwnerProductDeposit {
  id: number;
  name: string;
  address?: string;
}

export interface OwnerProductItem {
  productId: number;
  name: string;
  category: string;
  dateRegistered?: string;
  inspectionStatus: string;
  available?: string;
  insurancePolicy?: string;
  insurancePhone?: string;
  deposit?: OwnerProductDeposit;
  estimatedValue?: number;
  catalogDescription?: string;
  thumbnailUrl?: string;
}

export interface OwnerProductsResponse {
  products: OwnerProductItem[];
  total: number;
  accepted: number;
}

export interface AdminProductReviewItem {
  productId: number;
  ownerId: number;
  ownerName: string;
  title: string;
  category: string;
  inspectionStatus: string;
  photoCount: number;
  estimatedValue: number;
  publishedBasePrice?: number;
  proposedBasePrice?: number;
  proposalMessageId?: number;
  thumbnailUrl?: string;
  requestDate?: string;
  auctionId?: number;
  canCreateAuction: boolean;
  preferredCurrency?: 'ARS' | 'USD';
  acceptsUsd?: string;
  currency?: string;
}

export interface AdminProductReviewResponse {
  products: AdminProductReviewItem[];
  total: number;
  accepted: number;
  proposed: number;
  pending: number;
  rejected: number;
}

export interface AdminInsuranceOption {
  insurancePolicy: string;
  company: string;
  combinedPolicy: boolean;
  amount: number;
  insurerPhone?: string;
  assignedProducts: number;
  currentForProduct: boolean;
}

export interface AdminProductInsuranceOptionsResponse {
  productId: number;
  ownerId: number;
  ownerName: string;
  currentInsurancePolicy?: string;
  options: AdminInsuranceOption[];
}

export interface AdminAuctionCreationResponse {
  auctionId: number;
  catalogId: number;
  productId: number;
  productIds?: number[];
  itemId: number;
  itemIds?: number[];
  lotCount?: number;
  message: string;
}

export interface AdminSubastadorOption {
  id: number;
  name: string;
  license?: string;
}

export interface AdminInsuranceCompanyOption {
  company: string;
}

export interface AdminUserRequestItem {
  requestId: number;
  name: string;
  surname?: string;
  email: string;
  document?: string;
  country?: string;
  legalAddress?: string;
  status: string;
  requestedAt?: string;
  rejectionReason?: string;
}

export interface AdminUserRequestListResponse {
  requests: AdminUserRequestItem[];
  total: number;
  pending: number;
  rejected: number;
  processed: number;
}

export interface AdminManagedUserItem {
  userId: number;
  name: string;
  email?: string;
  document?: string;
  category: string;
  admitted?: string;
  declaredGuarantee?: number;
}

export interface AdminManagedUserListResponse {
  users: AdminManagedUserItem[];
  total: number;
}

export interface AdminPaymentMethodItem {
  paymentMethodId: number;
  userId: number;
  userName: string;
  userEmail?: string;
  type: PaymentMethodType;
  label: string;
  status: string;
  currency?: string;
  declaredAmount?: number;
  approvedAmount?: number;
  auctionId?: number;
  auctionLabel?: string;
  reviewReason?: string;
}

export interface AdminPaymentMethodListResponse {
  paymentMethods: AdminPaymentMethodItem[];
}

export interface CreateAuctionLotInput {
  productId: number;
  basePrice?: number;
}

export interface CreateAuctionInput {
  productId: number;
  productIds?: number[];
  lots?: CreateAuctionLotInput[];
  auctionId?: number;
  auctionDate?: string;
  auctionHour?: string;
  location?: string;
  category?: string;
  description?: string;
  subastadorId?: number;
  depositId?: number;
  basePrice?: number;
  commission?: number;
  currency?: string;
}

export interface RejectProductInput {
  rejectionReasons?: string[];
  returnCost?: number;
}

export interface NotificationListItem {
  id: number;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  thumbnailUrl?: string;
}

export interface NotificationDetail extends NotificationListItem {
  data: Record<string, JsonValue> | null;
}

export interface NotificationsResponse {
  notifications: NotificationListItem[];
  unreadCount: number;
}

export interface AttendeeRegistrationResponse {
  attendeeId: number | null;
  bidderNumber: number | null;
  auctionId: number;
  clientId: number;
  paymentMethodId?: number | null;
  accessMode?: string;
  canBid?: boolean;
  readOnlyReason?: string | null;
}

export interface BidResponse {
  bidId: number;
  amount: number;
  itemId: number;
  winner: string;
  newMinimum: number;
  newMaximum?: number | null;
}

export interface LiveBidStatusResponse {
  itemId: number;
  lotCode: string;
  currentOffer: number;
  totalBids: number;
  lastBidder?: string;
  secondsRemaining: number;
  minimumNextBid: number;
  maximumNextBid?: number | null;
  activeLot?: boolean;
  auctioned: string;
}

export interface BidResultResponse {
  itemId: number;
  lotCode: string;
  title: string;
  winningBid: number;
  winner: {
    bidderNumber: number;
    name?: string;
  };
  commissionPercentage: number;
  commissionAmount: number;
  totalToPay: number;
  totalBids: number;
  auctionId: number;
  auctionName: string;
  auctioneer?: string;
  currency?: string;
  auctionedAt: string;
}

export interface WonItemPaymentDetail {
  itemId: number;
  lotCode: string;
  title: string;
  auctionName?: string;
  auctioneer?: string;
  currency?: string;
  winningBid: number;
  commission: number;
  shippingAmount: number;
  pickupAmount: number;
  totalToPay: number;
  estimatedPaymentDate?: string;
  pickupAvailable?: boolean;
  shippingAddress?: string;
  paymentMethods: PaymentMethod[];
}

export type PaymentMethodCreateInput =
  | {
      type: 'card';
      cardNumber: string;
      cardHolder: string;
      expiry: string;
      cvv: string;
      currency?: 'ARS' | 'USD';
      country?: string;
    }
  | {
      type: 'bank';
      bankName: string;
      country: string;
      accountHolder: string;
      accountNumber: string;
      cbuIban: string;
      reservedAmount: number;
      isForeignBank: boolean;
      currency?: 'ARS' | 'USD';
    }
  | {
      type: 'check';
      bankName: string;
      checkNumber: string;
      amount: number;
      issueDate: string;
      holderName: string;
      auctionId?: number;
      currency?: 'ARS' | 'USD';
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getNestedValue(obj: unknown, path: string[]): unknown {
  return path.reduce<unknown>((acc, key) => (isRecord(acc) ? acc[key] : undefined), obj);
}

function findFirstString(obj: unknown, paths: string[][]): string | undefined {
  for (const path of paths) {
    const value = getNestedValue(obj, path);
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

function findFirstNumber(obj: unknown, paths: string[][]): number | undefined {
  for (const path of paths) {
    const value = getNestedValue(obj, path);
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

function findFirstNumberArray(obj: unknown, paths: string[][]): number[] | undefined {
  for (const path of paths) {
    const value = getNestedValue(obj, path);
    if (!Array.isArray(value)) {
      continue;
    }

    const parsed = value
      .map((entry) => {
        if (typeof entry === 'number') {
          return entry;
        }

        if (typeof entry === 'string') {
          const numberValue = Number(entry);
          return Number.isNaN(numberValue) ? null : numberValue;
        }

        return null;
      })
      .filter((entry): entry is number => typeof entry === 'number');

    if (parsed.length > 0) {
      return parsed;
    }
  }

  return undefined;
}

function findFirstBoolean(obj: unknown, paths: string[][]): boolean | undefined {
  for (const path of paths) {
    const value = getNestedValue(obj, path);

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }

    if (typeof value === 'number') {
      if (value === 1) return true;
      if (value === 0) return false;
    }
  }

  return undefined;
}

function parseLotCodeId(lotCode?: string) {
  if (!lotCode) {
    return undefined;
  }

  const match = lotCode.match(/(\d+)$/);
  if (!match) {
    return undefined;
  }

  const parsed = Number(match[1]);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function collectStringsRecursively(value: unknown, depth = 0): string[] {
  if (depth > 4) {
    return [];
  }

  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStringsRecursively(item, depth + 1));
  }

  if (!isRecord(value)) {
    return [];
  }

  return Object.values(value).flatMap((item) => collectStringsRecursively(item, depth + 1));
}

function inferRequiresPasswordChange(data: unknown): boolean {
  const explicitFlag =
    findFirstBoolean(data, [
      ['mustChangePassword'],
      ['must_change_password'],
      ['requiresPasswordChange'],
      ['requires_password_change'],
      ['requirePasswordChange'],
      ['forcePasswordChange'],
      ['force_password_change'],
      ['firstLogin'],
      ['first_login'],
      ['isFirstLogin'],
      ['temporaryPassword'],
      ['temporary_password'],
      ['passwordTemporary'],
      ['password_temporary'],
      ['user', 'mustChangePassword'],
      ['user', 'must_change_password'],
      ['user', 'requiresPasswordChange'],
      ['user', 'requires_password_change'],
      ['user', 'firstLogin'],
      ['user', 'first_login'],
      ['user', 'isFirstLogin'],
      ['user', 'temporaryPassword'],
      ['user', 'temporary_password'],
      ['message', 'mustChangePassword'],
      ['message', 'must_change_password'],
      ['message', 'requiresPasswordChange'],
      ['message', 'requires_password_change'],
      ['message', 'firstLogin'],
      ['message', 'first_login'],
      ['data', 'mustChangePassword'],
      ['data', 'must_change_password'],
      ['data', 'requiresPasswordChange'],
      ['data', 'requires_password_change'],
      ['data', 'firstLogin'],
      ['data', 'first_login'],
      ['data', 'isFirstLogin'],
      ['data', 'temporaryPassword'],
      ['data', 'temporary_password'],
      ['data', 'user', 'mustChangePassword'],
      ['data', 'user', 'must_change_password'],
      ['data', 'user', 'requiresPasswordChange'],
      ['data', 'user', 'requires_password_change'],
      ['data', 'user', 'firstLogin'],
      ['data', 'user', 'first_login'],
    ]) ?? false;

  if (explicitFlag) {
    return true;
  }

  const normalizedTexts = collectStringsRecursively(data).map((value) => value.trim().toLowerCase());

  return normalizedTexts.some((value) => {
    const mentionsTemporaryPassword =
      value.includes('contraseña temporal') ||
      value.includes('password temporary') ||
      value.includes('temporary password');
    const mentionsForcedChange =
      value.includes('cambiar contraseña') ||
      value.includes('cambiar la contraseña') ||
      value.includes('change password') ||
      value.includes('must change password') ||
      value.includes('requires password change');
    const mentionsFirstLogin =
      value.includes('primer login') ||
      value.includes('primer ingreso') ||
      value.includes('first login') ||
      value.includes('first access');

    return mentionsTemporaryPassword || mentionsForcedChange || mentionsFirstLogin;
  });
}

function getMessageFromData(data: unknown): string | undefined {
  return findFirstString(data, [
    ['message', 'message'],
    ['message'],
    ['error'],
    ['details'],
    ['message', 'error'],
    ['data', 'message'],
    ['data', 'error'],
  ]);
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = globalThis.atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractToken(data: unknown): string | undefined {
  return findFirstString(data, [
    ['token'],
    ['accessToken'],
    ['jwt'],
    ['resetToken'],
    ['passwordResetToken'],
    ['authToken'],
    ['message', 'token'],
    ['message', 'resetToken'],
    ['message', 'passwordResetToken'],
    ['data', 'token'],
    ['data', 'accessToken'],
    ['data', 'jwt'],
    ['data', 'resetToken'],
    ['data', 'passwordResetToken'],
  ]);
}

function extractUserId(data: unknown, token?: string): number | undefined {
  const directUserId = findFirstNumber(data, [
    ['userId'],
    ['user_id'],
    ['id'],
    ['message', 'userId'],
    ['message', 'user_id'],
    ['message', 'id'],
    ['user', 'id'],
    ['message', 'user', 'id'],
    ['data', 'userId'],
    ['data', 'user_id'],
    ['data', 'id'],
    ['data', 'user', 'id'],
  ]);

  if (directUserId) {
    return directUserId;
  }

  if (!token) {
    return undefined;
  }

  const payload = decodeJwtPayload(token);
  return findFirstNumber(payload, [['userId'], ['id'], ['uid']]);
}

function extractDisplayName(data: unknown, token?: string): { displayName?: string; firstName?: string; lastName?: string } {
  const firstName =
    findFirstString(data, [
      ['firstName'],
      ['first_name'],
      ['name'],
      ['user', 'firstName'],
      ['user', 'first_name'],
      ['user', 'name'],
      ['data', 'firstName'],
      ['data', 'first_name'],
      ['data', 'name'],
      ['data', 'user', 'firstName'],
      ['data', 'user', 'first_name'],
      ['data', 'user', 'name'],
    ]) ??
    (token ? findFirstString(decodeJwtPayload(token), [['firstName'], ['first_name'], ['given_name'], ['name']]) : undefined);

  const lastName =
    findFirstString(data, [
      ['lastName'],
      ['last_name'],
      ['surname'],
      ['apellido'],
      ['user', 'lastName'],
      ['user', 'last_name'],
      ['user', 'surname'],
      ['user', 'apellido'],
      ['data', 'lastName'],
      ['data', 'last_name'],
      ['data', 'surname'],
      ['data', 'apellido'],
      ['data', 'user', 'lastName'],
      ['data', 'user', 'last_name'],
      ['data', 'user', 'surname'],
      ['data', 'user', 'apellido'],
    ]) ??
    (token ? findFirstString(decodeJwtPayload(token), [['lastName'], ['last_name'], ['family_name'], ['surname']]) : undefined);

  const directDisplayName =
    findFirstString(data, [
      ['displayName'],
      ['display_name'],
      ['fullName'],
      ['full_name'],
      ['user', 'displayName'],
      ['user', 'display_name'],
      ['user', 'fullName'],
      ['user', 'full_name'],
      ['data', 'displayName'],
      ['data', 'display_name'],
      ['data', 'fullName'],
      ['data', 'full_name'],
      ['data', 'user', 'displayName'],
      ['data', 'user', 'display_name'],
      ['data', 'user', 'fullName'],
      ['data', 'user', 'full_name'],
    ]) ??
    (token ? findFirstString(decodeJwtPayload(token), [['displayName'], ['display_name'], ['name']]) : undefined);

  const combinedName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const displayName = directDisplayName ?? (combinedName.length > 0 ? combinedName : undefined);

  return {
    displayName,
    firstName,
    lastName,
  };
}

function extractMembershipTier(data: unknown, token?: string): string | undefined {
  return (
    findFirstString(data, [
      ['membershipTier'],
      ['membership_tier'],
      ['tier'],
      ['level'],
      ['category'],
      ['user', 'membershipTier'],
      ['user', 'membership_tier'],
      ['user', 'tier'],
      ['user', 'level'],
      ['user', 'category'],
      ['data', 'membershipTier'],
      ['data', 'membership_tier'],
      ['data', 'tier'],
      ['data', 'level'],
      ['data', 'category'],
      ['data', 'user', 'membershipTier'],
      ['data', 'user', 'membership_tier'],
      ['data', 'user', 'tier'],
      ['data', 'user', 'level'],
      ['data', 'user', 'category'],
    ]) ??
    (token
      ? findFirstString(decodeJwtPayload(token), [['membershipTier'], ['membership_tier'], ['tier'], ['level'], ['category']])
      : undefined)
  );
}

function extractDeclaredGuarantee(data: unknown, token?: string): number | undefined {
  return (
    findFirstNumber(data, [
      ['declaredGuarantee'],
      ['declared_guarantee'],
      ['guaranteeDeclared'],
      ['guarantee_declared'],
      ['guarantee'],
      ['warranty'],
      ['user', 'declaredGuarantee'],
      ['user', 'declared_guarantee'],
      ['user', 'guaranteeDeclared'],
      ['user', 'guarantee_declared'],
      ['user', 'guarantee'],
      ['data', 'declaredGuarantee'],
      ['data', 'declared_guarantee'],
      ['data', 'guaranteeDeclared'],
      ['data', 'guarantee_declared'],
      ['data', 'guarantee'],
      ['data', 'user', 'declaredGuarantee'],
      ['data', 'user', 'declared_guarantee'],
      ['data', 'user', 'guaranteeDeclared'],
      ['data', 'user', 'guarantee_declared'],
      ['data', 'user', 'guarantee'],
    ]) ??
    (token
      ? findFirstNumber(decodeJwtPayload(token), [
          ['declaredGuarantee'],
          ['declared_guarantee'],
          ['guaranteeDeclared'],
          ['guarantee_declared'],
          ['guarantee'],
        ])
      : undefined)
  );
}

function getHomeMessage(data: unknown) {
  const candidates = [
    getNestedValue(data, ['message']),
    getNestedValue(data, ['data']),
    data,
  ];

  return candidates.find((candidate) => isRecord(candidate)) ?? data;
}

function getNotificationsMessage(data: unknown) {
  const messageCandidate = getNestedValue(data, ['message']);
  return isRecord(messageCandidate) ? messageCandidate : data;
}

function mapUserBidHistoryItem(item: unknown): UserBidHistoryItem {
  const lotCode = findFirstString(item, [['lot_code'], ['lotCode'], ['code']]) ?? 'LOT';
  const winnerValue = findFirstString(item, [['winner'], ['is_winner'], ['status']]) ?? '';
  const winnerFlag = findFirstBoolean(item, [['winner'], ['is_winner']]);

  return {
    bidId: findFirstNumber(item, [['bid_id'], ['bidId'], ['id']]) ?? 0,
    itemId: findFirstNumber(item, [['item_id'], ['itemId']]) ?? parseLotCodeId(lotCode),
    auctionId: findFirstNumber(item, [['auction_id'], ['auctionId']]),
    auctionName: findFirstString(item, [['auction_name'], ['auctionName'], ['auction']]) ?? 'Subasta',
    lotCode,
    itemTitle: findFirstString(item, [['item_title'], ['itemTitle'], ['title']]) ?? 'Lote',
    amount: findFirstNumber(item, [['amount'], ['bid_amount'], ['importe']]) ?? 0,
    winner:
      winnerFlag ??
      ['si', 'yes', 'true', 'won', 'ganado'].includes(winnerValue.trim().toLowerCase()),
    date: findFirstString(item, [['date'], ['auction_date'], ['created_at'], ['createdAt']]) ?? '',
  };
}

function mapAdminProductReviewItem(item: unknown): AdminProductReviewItem {
  return {
    productId: findFirstNumber(item, [['product_id'], ['productId']]) ?? 0,
    ownerId: findFirstNumber(item, [['owner_id'], ['ownerId']]) ?? 0,
    ownerName: findFirstString(item, [['owner_name'], ['ownerName']]) ?? 'Usuario',
    title: findFirstString(item, [['title']]) ?? 'Bien',
    category: findFirstString(item, [['category']]) ?? 'general',
    inspectionStatus: findFirstString(item, [['inspection_status'], ['inspectionStatus']]) ?? 'pendiente',
    photoCount: findFirstNumber(item, [['photo_count'], ['photoCount']]) ?? 0,
    estimatedValue: findFirstNumber(item, [['estimated_value'], ['estimatedValue']]) ?? 0,
    publishedBasePrice: findFirstNumber(item, [['published_base_price'], ['publishedBasePrice']]),
    proposedBasePrice: findFirstNumber(item, [['proposed_base_price'], ['proposedBasePrice']]),
    proposalMessageId: findFirstNumber(item, [['proposal_message_id'], ['proposalMessageId']]),
    thumbnailUrl: findFirstString(item, [['thumbnail_url'], ['thumbnailUrl']]),
    requestDate: findFirstString(item, [['request_date'], ['requestDate']]),
    auctionId: findFirstNumber(item, [['auction_id'], ['auctionId']]),
    canCreateAuction: findFirstBoolean(item, [['can_create_auction'], ['canCreateAuction']]) ?? false,
    preferredCurrency: findFirstString(item, [['preferred_currency'], ['preferredCurrency']]) as 'ARS' | 'USD' | undefined,
    acceptsUsd: findFirstString(item, [['accepts_usd'], ['acceptsUsd']]),
    currency: findFirstString(item, [['currency']]),
  };
}

function mapAdminUserRequestItem(item: unknown): AdminUserRequestItem {
  return {
    requestId: findFirstNumber(item, [['request_id'], ['requestId'], ['id']]) ?? 0,
    name: findFirstString(item, [['name'], ['nombre']]) ?? 'Usuario',
    surname: findFirstString(item, [['surname'], ['apellido']]),
    email: findFirstString(item, [['email']]) ?? '',
    document: findFirstString(item, [['document'], ['documento']]),
    country: findFirstString(item, [['country'], ['pais']]),
    legalAddress: findFirstString(item, [['legal_address'], ['legalAddress'], ['direccionLegal']]),
    status: findFirstString(item, [['status'], ['estado']]) ?? 'pendiente',
    requestedAt: findFirstString(item, [['requested_at'], ['requestedAt'], ['fechaSolicitud']]),
    rejectionReason: findFirstString(item, [['rejection_reason'], ['rejectionReason'], ['motivoRechazo']]),
  };
}

function mapAdminManagedUserItem(item: unknown): AdminManagedUserItem {
  return {
    userId: findFirstNumber(item, [['user_id'], ['userId'], ['id']]) ?? 0,
    name: findFirstString(item, [['name'], ['nombre']]) ?? 'Usuario',
    email: findFirstString(item, [['email']]),
    document: findFirstString(item, [['document'], ['documento']]),
    category: findFirstString(item, [['category'], ['categoria']]) ?? 'comun',
    admitted: findFirstString(item, [['admitted'], ['admitido']]),
    declaredGuarantee: findFirstNumber(item, [['declared_guarantee'], ['declaredGuarantee']]),
  };
}

function mapAdminInsuranceOption(item: unknown): AdminInsuranceOption {
  return {
    insurancePolicy: findFirstString(item, [['insurance_policy'], ['insurancePolicy']]) ?? '',
    company: findFirstString(item, [['company'], ['compania']]) ?? 'Aseguradora',
    combinedPolicy:
      findFirstBoolean(item, [['combined_policy'], ['combinedPolicy']]) ??
      (findFirstString(item, [['combined_flag'], ['polizaCombinada']]) ?? '').trim().toLowerCase() === 'si',
    amount: findFirstNumber(item, [['amount'], ['importe']]) ?? 0,
    insurerPhone: findFirstString(item, [['insurer_phone'], ['insurerPhone'], ['insurance_phone'], ['insurancePhone']]),
    assignedProducts: findFirstNumber(item, [['assigned_products'], ['assignedProducts']]) ?? 0,
    currentForProduct: findFirstBoolean(item, [['current_for_product'], ['currentForProduct']]) ?? false,
  };
}

function mapAdminPaymentMethodItem(item: unknown): AdminPaymentMethodItem {
  return {
    paymentMethodId: findFirstNumber(item, [['payment_method_id'], ['paymentMethodId'], ['id']]) ?? 0,
    userId: findFirstNumber(item, [['user_id'], ['userId']]) ?? 0,
    userName: findFirstString(item, [['user_name'], ['userName'], ['name']]) ?? 'Usuario',
    userEmail: findFirstString(item, [['user_email'], ['userEmail'], ['email']]),
    type: toPaymentMethodType(findFirstString(item, [['type']]) ?? 'check'),
    label: findFirstString(item, [['label']]) ?? 'Medio de pago',
    status: findFirstString(item, [['status'], ['estado']]) ?? 'pendiente',
    currency: findFirstString(item, [['currency'], ['moneda']]),
    declaredAmount: findFirstNumber(item, [['declared_amount'], ['declaredAmount'], ['available_amount']]),
    approvedAmount: findFirstNumber(item, [['approved_amount'], ['approvedAmount'], ['available_balance']]),
    auctionId: findFirstNumber(item, [['auction_id'], ['auctionId']]),
    auctionLabel: findFirstString(item, [['auction_label'], ['auctionLabel']]),
    reviewReason: findFirstString(item, [['review_reason'], ['reviewReason'], ['note']]),
  };
}

function getSearchMessage(data: unknown) {
  const messageCandidate = getNestedValue(data, ['message']);
  return isRecord(messageCandidate) ? messageCandidate : data;
}

function mapSearchLotResult(item: unknown): SearchLotResult {
  return {
    itemId: findFirstNumber(item, [['item_id'], ['itemId'], ['id']]) ?? 0,
    lotCode: findFirstString(item, [['lot_code'], ['lotCode'], ['code']]) ?? 'LOT',
    title: findFirstString(item, [['title'], ['item_title'], ['name']]) ?? 'Lote',
    auctionId: findFirstNumber(item, [['auction_id'], ['auctionId']]),
    category: findFirstString(item, [['category'], ['item_category'], ['itemCategory']]),
    auctioned: findFirstString(item, [['auctioned']]),
  };
}

function mapSearchAuctionResult(item: unknown): SearchAuctionResult {
  return {
    id: findFirstNumber(item, [['id'], ['auction_id']]) ?? 0,
    name: findFirstString(item, [['name'], ['auction_name'], ['title']]) ?? 'Subasta',
    status: normalizeAuctionStatus(findFirstString(item, [['status']]) ?? 'proxima'),
    date: findFirstString(item, [['date'], ['auction_date']]) ?? '',
  };
}

function mapAuctionListItem(item: unknown): AuctionListItem {
  return {
    id: findFirstNumber(item, [['id'], ['auction_id']]) ?? 0,
    name: findFirstString(item, [['name'], ['auction_name'], ['title']]) ?? 'Subasta',
    category: findFirstString(item, [['category'], ['type']]) ?? '',
    date: findFirstString(item, [['date'], ['auction_date']]) ?? '',
    endTime: findFirstString(item, [['end_time'], ['endTime'], ['time']]),
    status: normalizeAuctionStatus(findFirstString(item, [['status']]) ?? 'proxima'),
    currency: findFirstString(item, [['currency'], ['moneda']]),
    auctioneer: findFirstString(item, [['auctioneer'], ['auctioneer_name']]),
    totalLots: findFirstNumber(item, [['total_lots'], ['totalLots']]) ?? 0,
    soldLots: findFirstNumber(item, [['sold_lots'], ['soldLots']]) ?? 0,
    activeLots: findFirstNumber(item, [['active_lots'], ['activeLots']]) ?? 0,
    thumbnailUrl: resolveApiAssetUrl(
      findFirstString(item, [['thumbnail_url'], ['thumbnailUrl'], ['image']])
    ),
  };
}

function mapAuctionCatalogItem(item: unknown): AuctionCatalogItem {
  return {
    itemId: findFirstNumber(item, [['item_id'], ['itemId'], ['id']]) ?? 0,
    lotCode: findFirstString(item, [['lot_code'], ['lotCode'], ['code']]) ?? 'LOT',
    title: findFirstString(item, [['title'], ['item_title'], ['name']]) ?? 'Lote',
    attribution: findFirstString(item, [['attribution'], ['artist']]),
    owner: findFirstString(item, [['owner']]),
    itemCategory: findFirstString(item, [['category'], ['item_category'], ['itemCategory']]),
    auctioned: findFirstString(item, [['auctioned']]),
    basePrice: findFirstNumber(item, [['base_price'], ['basePrice'], ['price']]),
    currency: findFirstString(item, [['currency'], ['moneda']]),
    thumbnailUrl: resolveApiAssetUrl(
      findFirstString(item, [['thumbnail_url'], ['thumbnailUrl'], ['image']])
    ),
  };
}

function mapStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry;
      }

      if (isRecord(entry)) {
        return resolveApiAssetUrl(
          findFirstString(entry, [['url'], ['image'], ['thumbnail_url'], ['thumbnailUrl'], ['src']])
        ) ?? '';
      }

      return '';
    })
    .filter((entry): entry is string => Boolean(entry));
}

function mapAuctionDetail(item: unknown): AuctionDetailResponse {
  const catalog = getNestedValue(item, ['catalog']);
  const auctioneer = getNestedValue(item, ['auctioneer']);
  const catalogItems = pickFirstArray(catalog, [['items']]).map(mapAuctionCatalogItem);

  return {
    id: findFirstNumber(item, [['id'], ['auction_id']]) ?? 0,
    name: findFirstString(item, [['name'], ['auction_name'], ['title']]) ?? 'Subasta',
    date: findFirstString(item, [['date'], ['auction_date']]) ?? '',
    hour: findFirstString(item, [['hour'], ['auction_hour']]),
    endTime: findFirstString(item, [['end_time'], ['endTime']]),
    status: findFirstString(item, [['status']]) ?? 'proxima',
    category: findFirstString(item, [['category'], ['type']]) ?? '',
    currency: findFirstString(item, [['currency'], ['moneda']]),
    location: findFirstString(item, [['location']]),
    auctioneer: isRecord(auctioneer)
      ? {
          id: findFirstNumber(auctioneer, [['id'], ['auctioneer_id']]),
          name: findFirstString(auctioneer, [['name'], ['auctioneer_name']]),
          license: findFirstString(auctioneer, [['license'], ['matricula']]),
        }
      : undefined,
    catalog: {
      id: findFirstNumber(catalog, [['id'], ['catalog_id']]),
      description: findFirstString(catalog, [['description'], ['catalog_description']]),
      items: catalogItems,
    },
  };
}

export function normalizeAuctionStatus(status?: string) {
  const normalized = (status ?? '').trim().toLowerCase();

  if (
    normalized === 'finalizada' ||
    normalized === 'cerrada' ||
    normalized === 'terminada' ||
    normalized === 'closed' ||
    normalized === 'ended' ||
    normalized === 'completed'
  ) {
    return 'finalizada';
  }

  if (normalized === 'en vivo' || normalized === 'live' || normalized === 'open' || normalized === 'activa') {
    return 'en_vivo';
  }

  if (normalized === 'próxima' || normalized === 'proxima' || normalized === 'upcoming') {
    return 'proxima';
  }

  return normalized || 'proxima';
}

function mapAttendeeRegistration(item: unknown): AttendeeRegistrationResponse {
  const attendeeId = findFirstNumber(item, [['attendee_id'], ['attendeeId'], ['id']]) ?? null;
  const bidderNumber = findFirstNumber(item, [['bidder_number'], ['bidderNumber']]) ?? null;
  const paymentMethodId = findFirstNumber(item, [['payment_method_id'], ['paymentMethodId']]) ?? null;
  const accessMode = findFirstString(item, [['access_mode'], ['accessMode']]);
  const canBid = findFirstBoolean(item, [['can_bid'], ['canBid']]);
  const readOnlyReason = findFirstString(item, [['read_only_reason'], ['readOnlyReason']]) ?? null;

  return {
    attendeeId,
    bidderNumber,
    auctionId: findFirstNumber(item, [['auction_id'], ['auctionId']]) ?? 0,
    clientId: findFirstNumber(item, [['client_id'], ['clientId']]) ?? 0,
    paymentMethodId,
    accessMode: accessMode ?? (attendeeId != null ? 'bidder' : undefined),
    canBid: canBid ?? (attendeeId != null),
    readOnlyReason,
  };
}

function mapBidResponse(item: unknown): BidResponse {
  return {
    bidId: findFirstNumber(item, [['bid_id'], ['bidId'], ['id']]) ?? 0,
    amount: findFirstNumber(item, [['amount']]) ?? 0,
    itemId: findFirstNumber(item, [['item_id'], ['itemId']]) ?? 0,
    winner: findFirstString(item, [['winner']]) ?? 'no',
    newMinimum: findFirstNumber(item, [['new_minimum'], ['newMinimum']]) ?? 0,
    newMaximum: findFirstNumber(item, [['new_maximum'], ['newMaximum']]),
  };
}

function mapLiveBidStatus(item: unknown): LiveBidStatusResponse {
  return {
    itemId: findFirstNumber(item, [['item_id'], ['itemId']]) ?? 0,
    lotCode: findFirstString(item, [['lot_code'], ['lotCode']]) ?? 'LOT',
    currentOffer: findFirstNumber(item, [['current_offer'], ['currentOffer']]) ?? 0,
    totalBids: findFirstNumber(item, [['total_bids'], ['totalBids']]) ?? 0,
    lastBidder: findFirstString(item, [['last_bidder'], ['lastBidder']]),
    secondsRemaining: findFirstNumber(item, [['seconds_remaining'], ['secondsRemaining']]) ?? 0,
    minimumNextBid: findFirstNumber(item, [['minimum_next_bid'], ['minimumNextBid']]) ?? 0,
    maximumNextBid: findFirstNumber(item, [['maximum_next_bid'], ['maximumNextBid']]),
    activeLot: findFirstBoolean(item, [['active_lot'], ['activeLot']]) ?? false,
    auctioned: findFirstString(item, [['auctioned']]) ?? 'no',
  };
}

function mapBidResult(item: unknown): BidResultResponse {
  const winner = getNestedValue(item, ['winner']);

  return {
    itemId: findFirstNumber(item, [['item_id'], ['itemId']]) ?? 0,
    lotCode: findFirstString(item, [['lot_code'], ['lotCode']]) ?? 'LOT',
    title: findFirstString(item, [['title']]) ?? 'Lote',
    winningBid: findFirstNumber(item, [['winning_bid'], ['winningBid']]) ?? 0,
    winner: isRecord(winner)
      ? {
          bidderNumber: findFirstNumber(winner, [['bidder_number'], ['bidderNumber']]) ?? 0,
          name: findFirstString(winner, [['name']]),
        }
      : { bidderNumber: 0 },
    commissionPercentage: findFirstNumber(item, [['commission_percentage'], ['commissionPercentage']]) ?? 0,
    commissionAmount: findFirstNumber(item, [['commission_amount'], ['commissionAmount']]) ?? 0,
    totalToPay: findFirstNumber(item, [['total_to_pay'], ['totalToPay']]) ?? 0,
    totalBids: findFirstNumber(item, [['total_bids'], ['totalBids']]) ?? 0,
    auctionId: findFirstNumber(item, [['auction_id'], ['auctionId']]) ?? 0,
    auctionName: findFirstString(item, [['auction_name'], ['auctionName']]) ?? 'Subasta',
    auctioneer: findFirstString(item, [['auctioneer']]),
    currency: findFirstString(item, [['currency'], ['moneda']]),
    auctionedAt: findFirstString(item, [['auctioned_at'], ['auctionedAt']]) ?? '',
  };
}

function mapNotificationListItem(item: unknown): NotificationListItem {
  return {
    id: findFirstNumber(item, [['id'], ['notification_id']]) ?? 0,
    type: findFirstString(item, [['type']]) ?? 'general',
    title: findFirstString(item, [['title']]) ?? 'Notificacion',
    body: findFirstString(item, [['body'], ['message'], ['description']]) ?? '',
    read: findFirstBoolean(item, [['read'], ['is_read']]) ?? false,
    createdAt: findFirstString(item, [['created_at'], ['createdAt'], ['date']]) ?? '',
  };
}

function toJsonRecord(value: unknown): Record<string, JsonValue> | null {
  if (!isRecord(value)) {
    return null;
  }

  return value as Record<string, JsonValue>;
}

function pickFirstArray(source: unknown, paths: string[][]): unknown[] {
  for (const path of paths) {
    const value = getNestedValue(source, path);
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function normalizeHomeCategory(value?: string) {
  if (!value) {
    return 'GENERAL';
  }

  return value.trim().toUpperCase();
}

function mapHomeFeaturedLot(item: unknown): HomeFeaturedLot {
  return {
    id:
      findFirstString(item, [['item_id'], ['id'], ['lot_code'], ['title']]) ??
      String(findFirstNumber(item, [['item_id'], ['id'], ['auction_id']]) ?? Date.now()),
    itemId: findFirstNumber(item, [['item_id'], ['id']]),
    auctionId: findFirstNumber(item, [['auction_id']]),
    lotCode: findFirstString(item, [['lot_code'], ['lotCode'], ['code']]) ?? 'LOT',
    title: findFirstString(item, [['auction_name'], ['auctionName'], ['name']]) ?? 'Subasta destacada',
    subtitle: findFirstString(item, [['title'], ['item_title'], ['description']]) ?? 'Lote destacado',
    category: normalizeHomeCategory(findFirstString(item, [['category'], ['type']])),
    badge: normalizeHomeCategory(findFirstString(item, [['category'], ['type']])),
    basePrice: findFirstNumber(item, [['base_price'], ['basePrice'], ['price']]) ?? 0,
    image: resolveApiAssetUrl(findFirstString(item, [['image'], ['thumbnail_url'], ['thumbnailUrl']])),
    currency: findFirstString(item, [['currency'], ['moneda']]),
  };
}

function mapHomeAuction(item: unknown): HomeAuction {
  const auctionId = findFirstNumber(item, [['auction_id'], ['id']]);
  return {
    id: String(auctionId ?? findFirstString(item, [['name'], ['auction_name']]) ?? Date.now()),
    auctionId,
    title: findFirstString(item, [['auction_name'], ['name']]) ?? 'Subasta',
    subtitle:
      findFirstString(item, [['lot_code'], ['title'], ['description'], ['location']]) ??
      'Subasta disponible',
    auctioneer: findFirstString(item, [['auctioneer'], ['auctioneer_name'], ['auctioneerName']]),
    date: findFirstString(item, [['auction_date'], ['date']]),
    time: findFirstString(item, [['auction_time'], ['time'], ['hour']]),
    status: findFirstString(item, [['status']]),
    category: normalizeHomeCategory(findFirstString(item, [['category'], ['type']])),
    currency: findFirstString(item, [['currency']]),
    lotCount: findFirstNumber(item, [['lot_count'], ['lotCount']]),
    location: findFirstString(item, [['location']]),
    currentBid: findFirstNumber(item, [['current_bid'], ['currentBid'], ['bid_amount'], ['price']]),
    image: resolveApiAssetUrl(findFirstString(item, [['image'], ['thumbnail_url'], ['thumbnailUrl']])),
  };
}

function getFileName(uri: string, fallback: string) {
  const parts = uri.split('/');
  const rawName = parts[parts.length - 1];
  return rawName && rawName.includes('.') ? rawName : fallback;
}

function ensureAuth(userId: number | undefined, token: string | undefined) {
  if (!userId || !token) {
    throw new Error('Tu sesion no tiene userId/token. Inicia sesion nuevamente para gestionar medios de pago.');
  }
}

function toPaymentMethodType(rawType: unknown): PaymentMethodType {
  const normalized = typeof rawType === 'string' ? rawType.toLowerCase() : '';

  if (normalized.includes('tarjeta') || normalized.includes('card')) {
    return 'card';
  }

  if (
    normalized.includes('banco') ||
    normalized.includes('bank') ||
    normalized.includes('cuenta') ||
    normalized.includes('account')
  ) {
    return 'bank';
  }

  return 'check';
}

function inferPaymentMethodTypeFromShape(item: unknown): PaymentMethodType | null {
  const nestedCandidates = [
    item,
    getNestedValue(item, ['data']),
    getNestedValue(item, ['paymentMethod']),
    getNestedValue(item, ['payment_method']),
    getNestedValue(item, ['details']),
  ];

  for (const candidate of nestedCandidates) {
    if (!candidate || typeof candidate !== 'object') {
      continue;
    }

    const hasCardFields =
      findFirstString(candidate, [['card_number'], ['cardNumber'], ['masked_number'], ['maskedNumber']]) ||
      findFirstString(candidate, [['card_holder'], ['cardHolder']]);

    if (hasCardFields) {
      return 'card';
    }

    const hasBankFields =
      findFirstString(candidate, [['account_holder'], ['accountHolder'], ['bank_holder']]) ||
      findFirstString(candidate, [['account_number'], ['accountNumber'], ['cbu_iban'], ['cbuIban'], ['iban']]) ||
      findFirstString(candidate, [['bank_name'], ['issuer_bank'], ['issuerBank']]);

    if (hasBankFields) {
      return 'bank';
    }

    const hasCheckFields =
      findFirstString(candidate, [['certified_amount'], ['check_number'], ['checkNumber']]) ||
      findFirstString(candidate, [['issuer_bank'], ['issuerBank']]);

    if (hasCheckFields) {
      return 'check';
    }
  }

  return null;
}

function getPaymentMethodId(item: unknown): string {
  const nestedCandidates = [
    item,
    getNestedValue(item, ['data']),
    getNestedValue(item, ['paymentMethod']),
    getNestedValue(item, ['payment_method']),
    getNestedValue(item, ['details']),
  ];

  for (const candidate of nestedCandidates) {
    const maybeId = findFirstNumber(candidate, [
      ['id'],
      ['paymentMethodId'],
      ['payment_method_id'],
    ]);

    if (typeof maybeId === 'number') {
      return String(maybeId);
    }
  }

  for (const candidate of nestedCandidates) {
    const maybeStringId = findFirstString(candidate, [
      ['id'],
      ['paymentMethodId'],
      ['payment_method_id'],
    ]);

    if (maybeStringId) {
      return maybeStringId;
    }
  }
  
  return `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function looksLikePaymentMethod(item: unknown) {
  if (!isRecord(item)) {
    return false;
  }

  const hasId = findFirstNumber(item, [['id']]) !== undefined || findFirstString(item, [['id']]) !== undefined;

  if (!hasId) {
    return false;
  }

  const hasDistinguishingField = Boolean(
    findFirstString(item, [
      ['type'],
      ['methodType'],
      ['method_type'],
      ['paymentType'],
      ['payment_type'],
      ['card_number'],
      ['account_number'],
      ['check_number'],
      ['card_holder'],
      ['cardHolder'],
      ['account_holder'],
      ['accountHolder'],
      ['bank_name'],
      ['bankName'],
      ['label'],
      ['title'],
    ])
  );

  return hasId || hasDistinguishingField;
}

function collectArraysRecursively(value: unknown, depth = 0): unknown[][] {
  if (depth > 4) {
    return [];
  }

  if (Array.isArray(value)) {
    return [value];
  }

  if (!isRecord(value)) {
    return [];
  }

  const arrays: unknown[][] = [];
  for (const key of Object.keys(value)) {
    arrays.push(...collectArraysRecursively(value[key], depth + 1));
  }

  return arrays;
}

function getPaymentMethodsArray(data: unknown): unknown[] {
  const directCandidates: unknown[] = [
    data,
    getNestedValue(data, ['data']),
    getNestedValue(data, ['message']),
    getNestedValue(data, ['paymentMethods']),
    getNestedValue(data, ['payment_methods']),
    getNestedValue(data, ['methods']),
    getNestedValue(data, ['items']),
    getNestedValue(data, ['results']),
    getNestedValue(data, ['content']),
    getNestedValue(data, ['message', 'payment_methods']),
    getNestedValue(data, ['message', 'paymentMethods']),
    getNestedValue(data, ['message', 'methods']),
    getNestedValue(data, ['message', 'items']),
    getNestedValue(data, ['data', 'paymentMethods']),
    getNestedValue(data, ['data', 'payment_methods']),
    getNestedValue(data, ['data', 'items']),
    getNestedValue(data, ['data', 'results']),
    getNestedValue(data, ['data', 'content']),
  ];

  for (const candidate of directCandidates) {
    if (Array.isArray(candidate) && candidate.some(looksLikePaymentMethod)) {
      return candidate;
    }
  }

  const recursiveArrays = collectArraysRecursively(data);
  const firstPaymentArray = recursiveArrays.find((arr) => arr.some(looksLikePaymentMethod));

  if (firstPaymentArray) {
    return firstPaymentArray;
  }

  return [];
}

function getCountriesArray(data: unknown): unknown[] {
  const directCandidates = [
    getNestedValue(data, ['countries']),
    getNestedValue(data, ['message', 'countries']),
    getNestedValue(data, ['data', 'countries']),
  ];

  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function mapCountryOption(item: unknown): CountryOption {
  return {
    id: findFirstNumber(item, [['id'], ['numero']]) ?? 0,
    name: findFirstString(item, [['name'], ['nombre']]) ?? 'Pais',
    shortName: findFirstString(item, [['short_name'], ['shortName'], ['nombreCorto']]) ?? undefined,
  };
}

function mapPaymentMethod(item: unknown): PaymentMethod {
  console.log(item)
  const sources = [
    item,
    getNestedValue(item, ['data']),
    getNestedValue(item, ['paymentMethod']),
    getNestedValue(item, ['payment_method']),
    getNestedValue(item, ['details']),
  
  ];

  const fromSourcesString = (paths: string[][]) => {
    for (const source of sources) {
      const value = findFirstString(source, paths);
      if (value) {
        return value;
      }
    }
    return undefined;
  };

  const fromSourcesNumber = (paths: string[][]) => {
    for (const source of sources) {
      const value = findFirstNumber(source, paths);
      if (typeof value === 'number') {
        return value;
      }
    }
    return undefined;
  };

  const explicitType = fromSourcesString([['type'], ['methodType'], ['method_type'], ['paymentType'], ['payment_type']]);
  const inferredType = inferPaymentMethodTypeFromShape(item);
  const type = explicitType ? toPaymentMethodType(explicitType) : inferredType ?? 'check';

  const displayLabel =
    fromSourcesString([['label'], ['display_label'], ['displayLabel'], ['description'], ['detail']]) ?? '';
  const availableBalance =
    fromSourcesNumber([['available_balance'], ['availableBalance'], ['available_funds'], ['availableFunds']]) ??
    undefined;
  const status = fromSourcesString([['status'], ['estado']]) ?? undefined;
  const currency = fromSourcesString([['currency'], ['moneda']]) ?? undefined;
  const internationalCard =
    findFirstBoolean(item, [['international_card'], ['internationalCard']]) ??
    findFirstString(item, [['international_card'], ['internationalCard']]) === 'si';
  const auctionId = fromSourcesNumber([['auction_id'], ['auctionId']]) ?? undefined;
  const reviewNote = fromSourcesString([['review_note'], ['reviewNote'], ['review_reason'], ['reviewReason']]) ?? undefined;

  if (displayLabel) {
    return {
        id: getPaymentMethodId(item),
        type,
        title: displayLabel,
        status,
        currency,
        internationalCard,
        auctionId,
        reviewNote,
        availableBalance,
        subtitle:
          typeof availableBalance === 'number' && availableBalance > 0
            ? `Fondos reservados: ${currency === 'ARS' ? 'ARS $' : currency === 'USD' ? 'USD $' : currency || ''} ${Math.floor(availableBalance)}`
            : type === 'card'
              ? 'Tarjeta registrada'
              : 'Medio de pago'
      };
  }

  if (type === 'card') {
    const holder =
      fromSourcesString([['card_holder'], ['cardHolder'], ['holder'], ['name'], ['title']]) ?? 'Tarjeta';
    const cardNumber =
      fromSourcesString([['card_number'], ['cardNumber'], ['number'], ['masked_number'], ['maskedNumber']]) ??
      '';
    const digits = cardNumber.replace(/\D/g, '');
    const last4 = digits.slice(-4);

    return {
      id: getPaymentMethodId(item),
      type,
      title: holder.toUpperCase(),
      status,
      currency,
      internationalCard,
      auctionId,
      reviewNote,
      availableBalance,
      subtitle: last4 ? `Tarjeta terminada en ${last4}` : 'Tarjeta registrada',
    };
  }

  if (type === 'bank') {
    const holder =
      fromSourcesString([['account_holder'], ['accountHolder'], ['holder'], ['bank_holder'], ['title']]) ??
      'Cuenta bancaria';
    const funds =
      fromSourcesNumber([['available_funds'], ['availableFunds'], ['funds'], ['amount'], ['reserved_funds']]) ??
      0;

    return {
      id: getPaymentMethodId(item),
      type,
      title: holder.toUpperCase(),
      status,
      currency,
      internationalCard,
      auctionId,
      reviewNote,
      availableBalance,
      subtitle: `Fondos reservados: ${currency === 'ARS' ? 'ARS $' : currency === 'USD' ? 'USD $' : currency || ''}  ${Math.floor(funds)}`,
    };
  }

  const bankName =
    fromSourcesString([['issuer_bank'], ['issuerBank'], ['bank'], ['bank_name'], ['title']]) ?? 'Cheque';
  const amount =
    fromSourcesNumber([['certified_amount'], ['certifiedAmount'], ['amount'], ['reserved_funds']]) ?? 0;

  return {
    id: getPaymentMethodId(item),
    type,
    title: bankName.toUpperCase(),
    status,
    currency,
    internationalCard,
    auctionId,
    reviewNote,
    availableBalance,
    subtitle: `Fondos reservados: ${currency === 'ARS' ? 'ARS $' : currency === 'USD' ? 'USD $' : currency || ''}  ${Math.floor(amount)}`,
  };
}

function mapWonItemPaymentDetail(item: unknown): WonItemPaymentDetail {
  return {
    itemId: findFirstNumber(item, [['item_id'], ['itemId']]) ?? 0,
    lotCode: findFirstString(item, [['lot_code'], ['lotCode']]) ?? 'LOT-000',
    title: findFirstString(item, [['title'], ['item_title'], ['itemTitle']]) ?? 'Articulo',
    auctionName: findFirstString(item, [['auction_name'], ['auctionName']]),
    auctioneer: findFirstString(item, [['auctioneer']]),
    currency: findFirstString(item, [['currency']]) ?? 'ARS',
    winningBid: findFirstNumber(item, [['winning_bid'], ['winningBid']]) ?? 0,
    commission: findFirstNumber(item, [['commission']]) ?? 0,
    shippingAmount: findFirstNumber(item, [['shipping_amount'], ['shippingAmount']]) ?? 0,
    pickupAmount: findFirstNumber(item, [['pickup_amount'], ['pickupAmount']]) ?? 0,
    totalToPay: findFirstNumber(item, [['total_to_pay'], ['totalToPay']]) ?? 0,
    estimatedPaymentDate: findFirstString(item, [['estimated_payment_date'], ['estimatedPaymentDate']]),
    pickupAvailable: findFirstBoolean(item, [['pickup_available'], ['pickupAvailable']]) ?? false,
    shippingAddress: findFirstString(item, [['shipping_address'], ['shippingAddress']]),
    paymentMethods: getPaymentMethodsArray(item).map(mapPaymentMethod),
  };
}

function mapOwnerProductItem(item: unknown): OwnerProductItem {
  const depositRaw = getNestedValue(item, ['deposit']);
  const deposit = isRecord(depositRaw)
    ? {
        id: findFirstNumber(depositRaw, [['id']]) ?? 0,
        name: findFirstString(depositRaw, [['name']]) ?? 'Depósito',
        address: findFirstString(depositRaw, [['address']]),
      }
    : undefined;

  return {
    productId: findFirstNumber(item, [['product_id'], ['productId']]) ?? 0,
    name: findFirstString(item, [['name']]) ?? 'Artículo',
    category: findFirstString(item, [['category']]) ?? 'general',
    dateRegistered: findFirstString(item, [['date_registered'], ['dateRegistered']]),
    inspectionStatus: findFirstString(item, [['inspection_status'], ['inspectionStatus']]) ?? 'en_inspeccion',
    available: findFirstString(item, [['available']]),
    insurancePolicy: findFirstString(item, [['insurance_policy'], ['insurancePolicy']]),
    insurancePhone: findFirstString(item, [['insurance_phone'], ['insurancePhone']]),
    deposit,
    estimatedValue: findFirstNumber(item, [['estimated_value'], ['estimatedValue']]),
    catalogDescription: findFirstString(item, [['catalog_description'], ['catalogDescription']]),
    thumbnailUrl: resolveApiAssetUrl(findFirstString(item, [['thumbnail_url'], ['thumbnailUrl']])),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const candidateUrls = buildFallbackApiUrls(API_BASE_URL).map((baseUrl) => `${baseUrl}${path}`);
  let response: Response | null = null;
  let lastError: unknown = null;
  let targetUrl = candidateUrls[0];

  for (const candidateUrl of candidateUrls) {
    console.log(`[api] ${init?.method ?? 'GET'} ${candidateUrl}`);
    targetUrl = candidateUrl;

    try {
      response = await fetch(candidateUrl, init);
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!response) {
    const message = lastError instanceof Error ? lastError.message : 'Error de red desconocido';
    throw new NetworkError(targetUrl, message);
  }

  const text = await response.text();
  let data: JsonValue | null = null;

  if (text) {
    try {
      data = JSON.parse(text) as JsonValue;
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      getMessageFromData(data) ?? `La solicitud falló con estado ${response.status}.`,
      response.status,
      data
    );
  }

  return data as T;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const data = await request<JsonValue>('/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const token = extractToken(data);
  const identity = extractDisplayName(data, token);

  if (__DEV__) {
    console.log('[login] raw response', data);
  }

  return {
    token,
    userId: extractUserId(data, token),
    email:
      findFirstString(data, [
        ['email'],
        ['user', 'email'],
        ['message', 'user', 'email'],
        ['data', 'email'],
        ['data', 'user', 'email'],
      ]) ?? email,
    displayName: identity.displayName,
    firstName: identity.firstName,
    lastName: identity.lastName,
    membershipTier: extractMembershipTier(data, token),
    declaredGuarantee: extractDeclaredGuarantee(data, token),
    requiresPasswordChange: inferRequiresPasswordChange(data),
    raw: data,
  };
}

export async function getUserProfile(userId: number, token: string): Promise<UserProfileResponse> {
  ensureAuth(userId, token);

  const data = await request<JsonValue>(`/users/${userId}/profile`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const message = getNestedValue(data, ['message']) ?? data;

  return {
    id: findFirstNumber(message, [['id'], ['identificador']]) ?? userId,
    name: findFirstString(message, [['name'], ['nombre']]) ?? '',
    email: findFirstString(message, [['email']]) ?? '',
    category: findFirstString(message, [['category'], ['categoria']]) ?? 'comun',
    verified: findFirstBoolean(message, [['verified'], ['admitted'], ['admitido']]) ?? false,
    accountStatus: findFirstString(message, [['account_status'], ['accountStatus'], ['estadoApp']]) ?? '',
    declaredGuarantee: findFirstNumber(message, [['declared_guarantee'], ['declaredGuarantee']]) ?? 0,
    auctionsWon: findFirstNumber(message, [['auctions_won'], ['auctionsWon']]) ?? 0,
    distinctPaymentTypes:
      findFirstNumber(message, [['distinct_payment_types'], ['distinctPaymentTypes']]) ?? 0,
  };
}

export async function getUserStats(userId: number, token: string): Promise<UserStatsResponse> {
  ensureAuth(userId, token);

  const data = await request<JsonValue>(`/users/${userId}/stats`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const message = getNestedValue(data, ['message']) ?? data;
  const categoryProgress =
    getNestedValue(message, ['categoryProgress']) ??
    getNestedValue(message, ['category_progress']) ??
    message;

  return {
    successRate: findFirstNumber(message, [['successRate'], ['success_rate']]) ?? 0,
    totalBids: findFirstNumber(message, [['totalBids'], ['total_bids']]) ?? 0,
    totalAuctionsParticipated:
      findFirstNumber(message, [['totalAuctionsParticipated'], ['total_auctions_participated']]) ?? 0,
    auctionsWon: findFirstNumber(message, [['auctionsWon'], ['auctions_won']]) ?? 0,
    categoryProgress: {
      currentCategory:
        findFirstString(categoryProgress, [['currentCategory'], ['current_category']]) ?? 'comun',
      nextCategory: findFirstString(categoryProgress, [['nextCategory'], ['next_category']]) ?? 'especial',
      auctionsWon: findFirstNumber(categoryProgress, [['auctionsWon'], ['auctions_won']]) ?? 0,
      auctionsRequired:
        findFirstNumber(categoryProgress, [['auctionsRequired'], ['auctions_required']]) ?? 0,
      paymentTypesRegistered:
        findFirstNumber(categoryProgress, [['paymentTypesRegistered'], ['payment_types_registered']]) ?? 0,
      paymentTypesRequired:
        findFirstNumber(categoryProgress, [['paymentTypesRequired'], ['payment_types_required']]) ?? 0,
    },
  };
}

export async function listUserBidHistory(userId: number, token: string): Promise<UserBidHistoryResponse> {
  ensureAuth(userId, token);

  const data = await request<JsonValue>(`/users/${userId}/bids`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const message = getNestedValue(data, ['message']) ?? data;
  const bids = pickFirstArray(message, [['bids'], ['items'], ['content']]).map(mapUserBidHistoryItem);

  return {
    bids,
    total: findFirstNumber(message, [['total'], ['count']]) ?? bids.length,
  };
}

export async function getWonBidDetail(userId: number, itemId: number, token: string): Promise<WonBidDetailResponse> {
  ensureAuth(userId, token);

  const data = await request<JsonValue>(`/users/${userId}/bids/${itemId}/won-detail`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const message = getNestedValue(data, ['message']) ?? data;
  const item = getNestedValue(message, ['item']);
  const auction = getNestedValue(message, ['auction']);
  const result = getNestedValue(message, ['result']);
  const bidTimeline = pickFirstArray(message, [['bidTimeline'], ['bid_timeline']]).map((entry) => ({
    bidNumber: findFirstNumber(entry, [['bidNumber'], ['bid_number']]) ?? 0,
    bidderLabel: findFirstString(entry, [['bidderLabel'], ['bidder_label']]) ?? 'Postor',
    amount: findFirstNumber(entry, [['amount']]) ?? 0,
    timestamp: findFirstString(entry, [['timestamp']]) ?? '',
  }));

  return {
    item: {
      itemId: findFirstNumber(item, [['itemId'], ['item_id'], ['id']]) ?? itemId,
      lotCode: findFirstString(item, [['lotCode'], ['lot_code']]) ?? `LOT-${itemId}`,
      title: findFirstString(item, [['title']]) ?? 'Lote',
      description: findFirstString(item, [['description']]),
      ownerAtSale: findFirstString(item, [['ownerAtSale'], ['owner_at_sale']]),
      photos: mapStringArray(getNestedValue(item, ['photos'])),
    },
    auction: {
      id: findFirstNumber(auction, [['id']]) ?? 0,
      name: findFirstString(auction, [['name']]) ?? 'Subasta',
      date: findFirstString(auction, [['date']]),
      location: findFirstString(auction, [['location']]),
      auctioneer: findFirstString(auction, [['auctioneer']]),
    },
    result: {
      userBid: findFirstNumber(result, [['userBid'], ['user_bid']]) ?? 0,
      winningBid: findFirstNumber(result, [['winningBid'], ['winning_bid']]) ?? 0,
      won: findFirstBoolean(result, [['won']]) ?? false,
      subyCommissionPct: findFirstNumber(result, [['subyCommissionPct'], ['suby_commission_pct']]) ?? 0,
      subyCommissionAmount: findFirstNumber(result, [['subyCommissionAmount'], ['suby_commission_amount']]) ?? 0,
      totalPaid: findFirstNumber(result, [['totalPaid'], ['total_paid']]) ?? 0,
    },
    bidTimeline,
  };
}

export async function listAdminReviewQueue(token: string): Promise<AdminProductReviewResponse> {
  if (!token) {
    throw new Error('Tu sesion no tiene token. Inicia sesion nuevamente para revisar productos.');
  }

  const data = await request<JsonValue>('/admin/products/review-queue', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const message = getNestedValue(data, ['message']) ?? data;
  const products = pickFirstArray(message, [['products']]).map(mapAdminProductReviewItem);

  return {
    products,
    total: findFirstNumber(message, [['total']]) ?? products.length,
    accepted: findFirstNumber(message, [['accepted']]) ?? 0,
    proposed: findFirstNumber(message, [['proposed']]) ?? 0,
    pending: findFirstNumber(message, [['pending']]) ?? 0,
    rejected: findFirstNumber(message, [['rejected']]) ?? 0,
  };
}

export async function listAdminSubyInventory(token: string): Promise<AdminProductReviewItem[]> {
  if (!token) {
    throw new Error('Tu sesion no tiene token. Inicia sesion nuevamente.');
  }

  const data = await request<JsonValue>('/admin/products/suby-inventory', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const message = getNestedValue(data, ['message']) ?? data;
  return pickFirstArray(message, [['products']]).map(mapAdminProductReviewItem);
}

export async function listAdminProductInsuranceOptions(productId: number, token: string): Promise<AdminProductInsuranceOptionsResponse> {
  if (!token) {
    throw new Error('Tu sesion no tiene token. Inicia sesion nuevamente para cargar pólizas.');
  }

  const data = await request<JsonValue>(`/admin/products/${productId}/insurance-options`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const message = getNestedValue(data, ['message']) ?? data;
  return {
    productId: findFirstNumber(message, [['product_id'], ['productId']]) ?? productId,
    ownerId: findFirstNumber(message, [['owner_id'], ['ownerId']]) ?? 0,
    ownerName: findFirstString(message, [['owner_name'], ['ownerName']]) ?? 'Usuario',
    currentInsurancePolicy: findFirstString(message, [['current_insurance_policy'], ['currentInsurancePolicy']]),
    options: pickFirstArray(message, [['options'], ['items'], ['content']]).map(mapAdminInsuranceOption),
  };
}

export async function listAdminSubastadores(token: string): Promise<AdminSubastadorOption[]> {
  if (!token) {
    throw new Error('Tu sesion no tiene token. Inicia sesion nuevamente para cargar subastadores.');
  }

  const data = await request<JsonValue>('/admin/subastadores', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const message = getNestedValue(data, ['message']) ?? data;
  const items = Array.isArray(message) ? message : pickFirstArray(message, [['subastadores'], ['items'], ['content']]);
  return items.map((item) => ({
    id: findFirstNumber(item, [['id'], ['identificador']]) ?? 0,
    name: findFirstString(item, [['name'], ['nombre']]) ?? 'Subastador',
    license: findFirstString(item, [['license'], ['matricula']]),
  }));
}

export async function listAdminInsuranceCompanies(token: string): Promise<AdminInsuranceCompanyOption[]> {
  if (!token) {
    throw new Error('Tu sesion no tiene token. Inicia sesion nuevamente para cargar compañías.');
  }

  const data = await request<JsonValue>('/admin/insurance-companies', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const message = getNestedValue(data, ['message']) ?? data;
  const items = Array.isArray(message) ? message : pickFirstArray(message, [['companies'], ['items'], ['content']]);
  return items.map((item) => ({
    company: findFirstString(item, [['company'], ['compania']]) ?? '',
  })).filter((item) => item.company.trim().length > 0);
}

export async function listAdminUserRequests(token: string): Promise<AdminUserRequestListResponse> {
  if (!token) {
    throw new Error('Tu sesion no tiene token. Inicia sesion nuevamente para cargar solicitudes.');
  }

  const data = await request<JsonValue>('/admin/users/requests', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const message = getNestedValue(data, ['message']) ?? data;
  const requests = pickFirstArray(message, [['requests'], ['items'], ['content']]).map(mapAdminUserRequestItem);

  return {
    requests,
    total: findFirstNumber(message, [['total']]) ?? requests.length,
    pending: findFirstNumber(message, [['pending']]) ?? 0,
    rejected: findFirstNumber(message, [['rejected']]) ?? 0,
    processed: findFirstNumber(message, [['processed']]) ?? 0,
  };
}

export async function listAdminUsers(token: string): Promise<AdminManagedUserListResponse> {
  if (!token) {
    throw new Error('Tu sesion no tiene token. Inicia sesion nuevamente para cargar usuarios.');
  }

  const data = await request<JsonValue>('/admin/users', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const message = getNestedValue(data, ['message']) ?? data;
  const users = pickFirstArray(message, [['users'], ['items'], ['content']]).map(mapAdminManagedUserItem);

  return {
    users,
    total: findFirstNumber(message, [['total']]) ?? users.length,
  };
}

export async function listAdminPaymentMethods(token: string): Promise<AdminPaymentMethodListResponse> {
  if (!token) {
    throw new Error('Tu sesion no tiene token. Inicia sesion nuevamente para cargar medios de pago.');
  }

  const data = await request<JsonValue>('/admin/payment-methods/review-queue', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const message = getNestedValue(data, ['message']) ?? data;
  const paymentMethods = pickFirstArray(message, [['payment_methods'], ['paymentMethods'], ['items'], ['content']])
    .map(mapAdminPaymentMethodItem);

  return { paymentMethods };
}

export async function approveAdminPaymentMethod(token: string, paymentMethodId: number, approvedAmount?: number) {
  if (!token) {
    throw new Error('Tu sesion no tiene token. Inicia sesion nuevamente para aprobar medios de pago.');
  }

  return request<JsonValue>(`/admin/payment-methods/${paymentMethodId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      approved_amount: approvedAmount,
    }),
  });
}

export async function rejectAdminPaymentMethod(token: string, paymentMethodId: number, reason?: string) {
  if (!token) {
    throw new Error('Tu sesion no tiene token. Inicia sesion nuevamente para rechazar medios de pago.');
  }

  return request<JsonValue>(`/admin/payment-methods/${paymentMethodId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });
}

export async function approveAdminUserRequest(token: string, requestId: number, category: string) {
  if (!token) {
    throw new Error('Tu sesion no tiene token. Inicia sesion nuevamente para aprobar solicitudes.');
  }

  return request<JsonValue>(`/admin/users/requests/${requestId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ category }),
  });
}

export async function rejectAdminUserRequest(token: string, requestId: number, reason?: string) {
  if (!token) {
    throw new Error('Tu sesion no tiene token. Inicia sesion nuevamente para rechazar solicitudes.');
  }

  return request<JsonValue>(`/admin/users/requests/${requestId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });
}

export async function updateAdminUserCategory(token: string, userId: number, category: string) {
  if (!token) {
    throw new Error('Tu sesion no tiene token. Inicia sesion nuevamente para actualizar categorías.');
  }

  return request<JsonValue>(`/admin/users/${userId}/category`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ category }),
  });
}

export async function proposeAdminProduct(
  productId: number,
  token: string,
  input: { basePrice?: number; commissionPct?: number; currency?: 'ARS' | 'USD'; note?: string } = {}
) {
  if (!token) {
    throw new Error('Tu sesion no tiene token. Inicia sesion nuevamente para proponer bienes.');
  }

  return request<JsonValue>(`/admin/products/${productId}/propose`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      base_price: input.basePrice,
      commission_pct: input.commissionPct,
      currency: input.currency,
      note: input.note,
    }),
  });
}

export async function acceptAdminProduct(productId: number, token: string) {
  if (!token) {
    throw new Error('Tu sesion no tiene token. Inicia sesion nuevamente para aprobar bienes.');
  }

  return request<JsonValue>(`/admin/products/${productId}/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function assignAdminProductInsurance(productId: number, token: string, insurancePolicy: string) {
  if (!token) {
    throw new Error('Tu sesion no tiene token. Inicia sesion nuevamente para asignar pólizas.');
  }

  return request<JsonValue>(`/admin/products/${productId}/insurance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      insurance_policy: insurancePolicy,
    }),
  });
}

export async function createAdminProductInsurance(
  productId: number,
  token: string,
  input: {
    insurancePolicy?: string;
    company: string;
    combinedPolicy: boolean;
    amount: number;
    insurerPhone?: string;
  }
) {
  if (!token) {
    throw new Error('Tu sesion no tiene token. Inicia sesion nuevamente para crear pólizas.');
  }

  return request<JsonValue>(`/admin/products/${productId}/insurance/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      insurance_policy: input.insurancePolicy,
      company: input.company,
      combined_policy: input.combinedPolicy,
      amount: input.amount,
      insurer_phone: input.insurerPhone,
    }),
  });
}

export async function rejectAdminProduct(productId: number, token: string, input: RejectProductInput = {}) {
  if (!token) {
    throw new Error('Tu sesion no tiene token. Inicia sesion nuevamente para rechazar bienes.');
  }

  return request<JsonValue>(`/admin/products/${productId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      rejection_reasons: input.rejectionReasons ?? [],
      return_cost: input.returnCost,
    }),
  });
}

export async function createAdminAuction(token: string, input: CreateAuctionInput): Promise<AdminAuctionCreationResponse> {
  if (!token) {
    throw new Error('Tu sesion no tiene token. Inicia sesion nuevamente para crear subastas.');
  }

  const data = await request<JsonValue>('/admin/auctions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      product_id: input.productId,
      product_ids: input.productIds,
      lots: input.lots?.map((lot) => ({
        product_id: lot.productId,
        base_price: lot.basePrice,
      })),
      auction_date: input.auctionDate,
      auction_hour: input.auctionHour,
      location: input.location,
      category: input.category,
      description: input.description,
      subastador_id: input.subastadorId,
      deposit_id: input.depositId,
      base_price: input.basePrice,
      commission: input.commission,
      currency: input.currency,
    }),
  });

  const message = getNestedValue(data, ['message']) ?? data;
  return {
    auctionId: findFirstNumber(message, [['auction_id'], ['auctionId']]) ?? 0,
    catalogId: findFirstNumber(message, [['catalog_id'], ['catalogId']]) ?? 0,
    productId: findFirstNumber(message, [['product_id'], ['productId']]) ?? input.productId,
    productIds: findFirstNumberArray(message, [['product_ids'], ['productIds']]),
    itemId: findFirstNumber(message, [['item_id'], ['itemId']]) ?? 0,
    itemIds: findFirstNumberArray(message, [['item_ids'], ['itemIds']]),
    lotCount: findFirstNumber(message, [['lot_count'], ['lotCount']]),
    message: findFirstString(message, [['message']]) ?? 'La subasta fue creada correctamente.',
  };
}

export async function acceptProductProposal(userId: number, notificationId: number, token: string) {
  ensureAuth(userId, token);

  const data = await request<JsonValue>(`/users/${userId}/notifications/${notificationId}/proposal/accept`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return findFirstString(data, [['message']]) ?? 'Propuesta aceptada.';
}

export async function rejectProductProposal(userId: number, notificationId: number, token: string) {
  ensureAuth(userId, token);

  const data = await request<JsonValue>(`/users/${userId}/notifications/${notificationId}/proposal/reject`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return findFirstString(data, [['message']]) ?? 'Propuesta rechazada.';
}

export async function logout(token: string) {
  if (!token) {
    throw new Error('Tu sesion no tiene token. Inicia sesion nuevamente para cerrar la sesion.');
  }

  return request<JsonValue>('/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getHomeDashboard(token: string): Promise<HomeDashboard> {
  const data = await request<JsonValue>('/home', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const message = getHomeMessage(data);
  const featuredLots = pickFirstArray(message, [['featured_lots'], ['featuredLots']]).map(mapHomeFeaturedLot);
  const upcomingAuctions = pickFirstArray(message, [['upcoming_auctions'], ['upcomingAuctions']]).map(mapHomeAuction);
  const liveAuctions = pickFirstArray(message, [['live_auctions'], ['liveAuctions']]).map(mapHomeAuction);

  return {
    displayName: extractDisplayName(message, token).displayName,
    membershipTier: extractMembershipTier(message, token),
    declaredGuarantee: extractDeclaredGuarantee(message, token),
    featuredLots,
    upcomingAuctions,
    liveAuctions,
    raw: data,
  };
}

export async function searchCatalogLots(query: string): Promise<SearchLotResult[]> {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    return [];
  }

  const data = await request<JsonValue>(`/search?q=${encodeURIComponent(normalizedQuery)}&type=lots`, {
    method: 'GET',
  });

  const message = getSearchMessage(data);
  return pickFirstArray(message, [['lots']]).map(mapSearchLotResult);
}

export async function searchAuctionSessions(query: string): Promise<SearchAuctionResult[]> {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    return [];
  }

  const data = await request<JsonValue>(`/search?q=${encodeURIComponent(normalizedQuery)}&type=auctions`, {
    method: 'GET',
  });

  const message = getSearchMessage(data);
  return pickFirstArray(message, [['auctions']]).map(mapSearchAuctionResult);
}

export async function searchLots(query: string): Promise<SearchLotResult[]> {
  return searchCatalogLots(query);
}

export async function listAuctions({
  search,
  status,
  page = 1,
  perPage = 50,
}: {
  search?: string;
  status?: string;
  page?: number;
  perPage?: number;
} = {}): Promise<AuctionListResponse> {
  const params = new URLSearchParams();

  if (search?.trim()) {
    params.set('search', search.trim());
  }

  if (status?.trim()) {
    params.set('status', status.trim());
  }

  params.set('page', String(page));
  params.set('per_page', String(perPage));

  const query = params.toString();
  const data = await request<JsonValue>(`/auctions${query ? `?${query}` : ''}`, {
    method: 'GET',
  });

  const message = getNestedValue(data, ['message']) ?? data;
  const auctions = pickFirstArray(message, [['auctions'], ['items'], ['content']]).map(mapAuctionListItem);

  return {
    auctions,
    total: findFirstNumber(message, [['total'], ['count']]) ?? auctions.length,
    page: findFirstNumber(message, [['page']]) ?? page,
    perPage: findFirstNumber(message, [['per_page'], ['perPage']]) ?? perPage,
  };
}

export async function getLotDetail(auctionId: number, itemId: number): Promise<LotDetailResponse> {
  const data = await request<JsonValue>(`/auctions/${auctionId}/items/${itemId}`, {
    method: 'GET',
  });

  const message = getNestedValue(data, ['message']) ?? data;
  const auctionMessage = getNestedValue(message, ['auction']);
  const galleryCandidates = [
    mapStringArray(getNestedValue(message, ['gallery'])),
    mapStringArray(getNestedValue(message, ['images'])),
    mapStringArray(getNestedValue(message, ['photos'])),
  ];
  const gallery = galleryCandidates.find((candidate) => candidate.length > 0) ?? [];

  return {
    itemId: findFirstNumber(message, [['item_id'], ['itemId'], ['id']]) ?? itemId,
    lotCode: findFirstString(message, [['lot_code'], ['lotCode'], ['code']]) ?? `LOT-${itemId}`,
    title: findFirstString(message, [['title'], ['item_title'], ['name']]) ?? 'Lote',
    category: findFirstString(message, [['category'], ['type']]) ?? 'general',
    basePrice: findFirstNumber(message, [['base_price'], ['basePrice'], ['price']]),
    currentOffer: findFirstNumber(message, [['current_offer'], ['currentOffer']]),
    currency: findFirstString(message, [['currency'], ['moneda']]),
    owner: findFirstString(message, [['owner'], ['current_owner']]),
    artist: findFirstString(message, [['artist'], ['author'], ['creator']]),
    period: findFirstString(message, [['period'], ['era'], ['year']]),
    auctioned: findFirstString(message, [['auctioned'], ['status']]),
    description: findFirstString(message, [['description'], ['full_description'], ['item_description']]),
    catalogDescription: findFirstString(message, [['catalog_description'], ['catalogDescription'], ['description']]),
    history: findFirstString(message, [['history'], ['provenance'], ['provenance_text']]),
    condition: findFirstString(message, [['condition'], ['conservation_state'], ['state'], ['conservation']]),
    image: resolveApiAssetUrl(
      findFirstString(message, [['image'], ['thumbnail_url'], ['thumbnailUrl'], ['main_image']])
    ),
    gallery: gallery.length > 0 ? gallery.map((entry) => resolveApiAssetUrl(entry) ?? entry) : undefined,
    auction: isRecord(auctionMessage)
      ? {
          id: findFirstNumber(auctionMessage, [['id'], ['auction_id']]),
          name: findFirstString(auctionMessage, [['name'], ['auction_name']]),
          date: findFirstString(auctionMessage, [['date'], ['auction_date']]),
          auctioneer: findFirstString(auctionMessage, [['auctioneer'], ['auctioneer_name']]),
          location: findFirstString(auctionMessage, [['location']]),
        }
      : undefined,
  };
}

export async function getAuctionDetail(auctionId: number): Promise<AuctionDetailResponse> {
  const data = await request<JsonValue>(`/auctions/${auctionId}`, {
    method: 'GET',
  });

  const message = getNestedValue(data, ['message']) ?? data;
  return mapAuctionDetail(message);
}

export async function registerAuctionAttendee(
  auctionId: number,
  token: string,
  paymentMethodId: number
): Promise<AttendeeRegistrationResponse> {
  if (!token) {
    throw new Error('Tu sesion no tiene token. Inicia sesion nuevamente para entrar a la puja.');
  }

  const data = await request<JsonValue>(`/auctions/${auctionId}/attendees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      payment_method_id: paymentMethodId,
    }),
  });

  const message = getNestedValue(data, ['message']) ?? data;
  return mapAttendeeRegistration(message);
}

export async function getLiveBidStatus(auctionId: number, itemId: number): Promise<LiveBidStatusResponse> {
  const data = await request<JsonValue>(`/auctions/${auctionId}/items/${itemId}/bids/live`, {
    method: 'GET',
  });

  const message = getNestedValue(data, ['message']) ?? data;
  return mapLiveBidStatus(message);
}

export async function leaveAuctionRoom(auctionId: number, token: string): Promise<void> {
  if (!token) {
    throw new Error('Tu sesion no tiene token. Inicia sesion nuevamente para salir de la sala.');
  }

  await request<JsonValue>(`/auctions/${auctionId}/leave`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function placeBid(
  auctionId: number,
  itemId: number,
  token: string,
  input: { attendeeId: number; paymentMethodId: number; amount: number }
): Promise<BidResponse> {
  if (!token) {
    throw new Error('Tu sesion no tiene token. Inicia sesion nuevamente para pujar.');
  }

  const data = await request<JsonValue>(`/auctions/${auctionId}/items/${itemId}/bids`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      attendee_id: input.attendeeId,
      payment_method_id: input.paymentMethodId,
      amount: input.amount,
    }),
  });

  const message = getNestedValue(data, ['message']) ?? data;
  return mapBidResponse(message);
}

export async function getBidResult(auctionId: number, itemId: number, token: string): Promise<BidResultResponse> {
  if (!token) {
    throw new Error('Tu sesion no tiene token. Inicia sesion nuevamente para ver el resultado.');
  }

  const data = await request<JsonValue>(`/auctions/${auctionId}/items/${itemId}/bids/result`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const message = getNestedValue(data, ['message']) ?? data;
  return mapBidResult(message);
}

export async function listUserNotifications(
  userId: number,
  token: string,
  unreadOnly = false
): Promise<NotificationsResponse> {
  ensureAuth(userId, token);

  const query = unreadOnly ? '?unread_only=true' : '';
  const data = await request<JsonValue>(`/users/${userId}/notifications${query}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const message = getNotificationsMessage(data);
  const notifications = pickFirstArray(message, [['notifications']]).map(mapNotificationListItem);
  const unreadCount = findFirstNumber(message, [['unread_count'], ['unreadCount']]) ?? 0;

  return {
    notifications,
    unreadCount,
  };
}

export async function getUserNotification(
  userId: number,
  notificationId: number,
  token: string
): Promise<NotificationDetail> {
  ensureAuth(userId, token);

  const data = await request<JsonValue>(`/users/${userId}/notifications/${notificationId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const message = getNotificationsMessage(data);
  const baseNotification = mapNotificationListItem(message);

  return {
    ...baseNotification,
    data: toJsonRecord(getNestedValue(message, ['data'])),
  };
}

export async function getWonItemPaymentDetail(
  userId: number,
  itemId: number,
  token: string
): Promise<WonItemPaymentDetail> {
  ensureAuth(userId, token);

  const data = await request<JsonValue>(`/users/${userId}/won-items/${itemId}/payment`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const message = getNestedValue(data, ['message']) ?? data;
  return mapWonItemPaymentDetail(message);
}

export async function listOwnerProducts(
  userId: number,
  token: string
): Promise<OwnerProductsResponse> {
  ensureAuth(userId, token);

  const data = await request<JsonValue>(`/users/${userId}/products`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const message = getNestedValue(data, ['message']) ?? data;
  const productsRaw = getNestedValue(message, ['products']);
  const products = Array.isArray(productsRaw) ? productsRaw.map(mapOwnerProductItem) : [];

  return {
    products,
    total: findFirstNumber(message, [['total']]) ?? products.length,
    accepted: findFirstNumber(message, [['accepted']]) ?? products.filter((item) => item.inspectionStatus === 'aceptado').length,
  };
}

export async function confirmWonItemPayment(
  userId: number,
  itemId: number,
  token: string,
  input: { paymentMethodId: number; retiroPresencial: boolean }
): Promise<string> {
  ensureAuth(userId, token);

  const data = await request<JsonValue>(`/users/${userId}/won-items/${itemId}/payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      payment_method_id: input.paymentMethodId,
      retiro_presencial: input.retiroPresencial,
    }),
  });

  return findFirstString(data, [['message']]) ?? 'Pago confirmado.';
}

export async function markUserNotificationAsRead(userId: number, notificationId: number, token: string) {
  ensureAuth(userId, token);

  return request<JsonValue>(`/users/${userId}/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function requestPasswordReset(email: string) {
  const data = await request<JsonValue>('/auth/password/forgot', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  const token = extractToken(data);

  return {
    token,
    userId: extractUserId(data, token),
    raw: data,
  };
}

export async function verifyPasswordResetCode(email: string, code: string): Promise<VerifyCodeResponse> {
  const data = await request<JsonValue>('/auth/password/verify-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, code }),
  });

  const token = extractToken(data);

  return {
    token,
    userId: extractUserId(data, token),
    raw: data,
  };
}

export async function registerOnboarding(input: RegisterInput) {
  const formData = new FormData();
  const frontalName = input.frontalName ?? getFileName(input.frontalUri, 'frontal.jpg');
  const backName = input.backName ?? getFileName(input.backUri, 'back.jpg');
  const frontalType = input.frontalType ?? 'image/jpeg';
  const backType = input.backType ?? 'image/jpeg';
  const debugPayload = {
    name: input.nombre,
    surname: input.apellido,
    email: input.email,
    country: input.pais,
    legalAddress: input.domicilio,
    document: input.documento,
    frontalName,
    frontalType,
    backName,
    backType,
  };

  formData.append('name', input.nombre);
  formData.append('surname', input.apellido);
  formData.append('email', input.email);
  formData.append('country', input.pais);
  formData.append('legalAddress', input.domicilio);
  formData.append('document', input.documento);

  if (__DEV__) {
    console.log('[registerOnboarding] payload', debugPayload);
  }

  if (Platform.OS === 'web') {
    const frontalResponse = await fetch(input.frontalUri);
    const backResponse = await fetch(input.backUri);
    const frontalBlob = await frontalResponse.blob();
    const backBlob = await backResponse.blob();

    formData.append('frontal', frontalBlob, frontalName);
    formData.append('back', backBlob, backName);

    return request<JsonValue>('/auth/onboarding', {
      method: 'POST',
      body: formData,
    });
  }

  formData.append('frontal', {
    uri: input.frontalUri,
    name: frontalName,
    type: frontalType,
  } as never);
  formData.append('back', {
    uri: input.backUri,
    name: backName,
    type: backType,
  } as never);

  return new Promise<JsonValue>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/auth/onboarding`);
    xhr.responseType = 'text';
    xhr.timeout = 20000;

    const handleResponse = () => {
      if (xhr.readyState !== XMLHttpRequest.DONE) {
        return;
      }

      const responseText = xhr.responseText ?? '';
      let data: JsonValue | null = null;

      if (responseText) {
        try {
          data = JSON.parse(responseText) as JsonValue;
        } catch {
          data = responseText;
        }
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
        return;
      }

      reject(
        new ApiError(
          getMessageFromData(data) ?? `La solicitud falló con estado ${xhr.status}.`,
          xhr.status,
          data
        )
      );
    };

    xhr.onreadystatechange = handleResponse;
    xhr.onload = handleResponse;

    xhr.onerror = () => {
      reject(new Error('No se pudo completar la subida de archivos.'));
    };

    xhr.ontimeout = () => {
      reject(
        new Error(
          'La solicitud tardó demasiado en responder. Si el backend la procesó igual, al reintentar puede aparecer como ya enviada.'
        )
      );
    };

    xhr.onabort = () => {
      reject(new Error('La subida fue cancelada antes de completarse.'));
    };

    xhr.send(formData);
  });
}

export async function uploadUserProduct(input: UploadUserProductInput): Promise<UploadUserProductResponse> {
  ensureAuth(input.userId, input.token);

  const formData = new FormData();
  formData.append('category', input.category);
  formData.append('name', input.name);
  formData.append('condition', input.condition);
  formData.append('origin_provenance', input.originProvenance);
  formData.append('full_description', input.fullDescription);
  formData.append('ownership_declaration', String(input.ownershipDeclaration));

  if (typeof input.isArt === 'boolean') {
    formData.append('is_art', String(input.isArt));
  }

  if (input.artist?.trim()) {
    formData.append('artist', input.artist.trim());
  }

  if (input.creationDate?.trim()) {
    formData.append('creation_date', input.creationDate.trim());
  }

  if (input.historicalContext?.trim()) {
    formData.append('historical_context', input.historicalContext.trim());
  }

  if (typeof input.receivingAccountId === 'number' && !Number.isNaN(input.receivingAccountId)) {
    formData.append('receiving_account_id', String(input.receivingAccountId));
  }

  if (typeof input.depositId === 'number' && !Number.isNaN(input.depositId)) {
    formData.append('deposit_id', String(input.depositId));
  }

  if (input.preferredCurrency) {
    formData.append('preferred_currency', input.preferredCurrency);
  }

  if (typeof input.acceptsUsd === 'boolean') {
    formData.append('accepts_usd', String(input.acceptsUsd));
  }

  if (Platform.OS === 'web') {
    for (const [index, photo] of input.photos.entries()) {
      const response = await fetch(photo.uri);
      const blob = await response.blob();
      const name = photo.fileName ?? getFileName(photo.uri, `photo-${index + 1}.jpg`);
      formData.append('photos[]', blob, name);
    }

    for (const [index, doc] of (input.originDocs ?? []).entries()) {
      const response = await fetch(doc.uri);
      const blob = await response.blob();
      const name = doc.fileName ?? getFileName(doc.uri, `origin-doc-${index + 1}`);
      formData.append('origin_docs[]', blob, name);
    }

    const data = await request<JsonValue>(`/users/${input.userId}/products`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.token}`,
      },
      body: formData,
    });

    return {
      message: getMessageFromData(data) ?? 'Tu artículo fue enviado para revisión.',
      status: findFirstString(data, [['status'], ['data', 'status']]),
      raw: data,
    };
  }

  for (const [index, photo] of input.photos.entries()) {
    formData.append('photos[]', {
      uri: photo.uri,
      name: photo.fileName ?? getFileName(photo.uri, `photo-${index + 1}.jpg`),
      type: photo.mimeType ?? 'image/jpeg',
    } as never);
  }

  for (const [index, doc] of (input.originDocs ?? []).entries()) {
    formData.append('origin_docs[]', {
      uri: doc.uri,
      name: doc.fileName ?? getFileName(doc.uri, `origin-doc-${index + 1}`),
      type: doc.mimeType ?? 'application/octet-stream',
    } as never);
  }

  return new Promise<UploadUserProductResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/users/${input.userId}/products`);
    xhr.setRequestHeader('Authorization', `Bearer ${input.token}`);
    xhr.responseType = 'text';
    xhr.timeout = 30000;

    const handleResponse = () => {
      if (xhr.readyState !== XMLHttpRequest.DONE) {
        return;
      }

      const responseText = xhr.responseText ?? '';
      let data: JsonValue | null = null;

      if (responseText) {
        try {
          data = JSON.parse(responseText) as JsonValue;
        } catch {
          data = responseText;
        }
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          message: getMessageFromData(data) ?? 'Tu artículo fue enviado para revisión.',
          status: findFirstString(data, [['status'], ['data', 'status']]),
          raw: data,
        });
        return;
      }

      reject(
        new ApiError(
          getMessageFromData(data) ?? `La solicitud falló con estado ${xhr.status}.`,
          xhr.status,
          data
        )
      );
    };

    xhr.onreadystatechange = handleResponse;
    xhr.onload = handleResponse;

    xhr.onerror = () => {
      reject(new Error('No se pudo completar la carga del bien.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('La carga tardó demasiado en responder. Inténtalo nuevamente.'));
    };

    xhr.onabort = () => {
      reject(new Error('La carga fue cancelada antes de completarse.'));
    };

    xhr.send(formData);
  });
}

// ── Fines ──────────────────────────────────────────────────────────────────

export interface FineData {
  id: number;
  amount: number;
  percentage: number;
  auctionTitle?: string;
  lotCode?: string;
  auctioneerName?: string;
  winningBid?: number;
}

export interface FinePaymentMethod {
  id: number;
  label: string;
  title: string;
  subtitle: string;
  last4?: string;
  brand?: string;
}

function mapFineData(data: unknown): FineData | null {
  const message = getNestedValue(data, ['message']) ?? data;

  const id = findFirstNumber(message, [['id'], ['fine_id'], ['fineId']]);
  if (!id) {
    return null;
  }

  return {
    id,
    amount: findFirstNumber(message, [['amount'], ['monto']]) ?? 0,
    percentage: findFirstNumber(message, [['percentage'], ['porcentaje']]) ?? 10,
    auctionTitle: findFirstString(message, [['auction_title'], ['auctionTitle'], ['auction_name'], ['auctionName']]),
    lotCode: findFirstString(message, [['lot_code'], ['lotCode']]),
    auctioneerName: findFirstString(message, [['auctioneer_name'], ['auctioneerName'], ['auctioneer']]),
    winningBid: findFirstNumber(message, [['winning_bid'], ['winningBid']]),
  };
}

function mapFinePaymentMethod(item: unknown): FinePaymentMethod {
  
  const rawId = findFirstNumber(item, [
    ['id'],
    ['payment_method_id'],
    ['paymentMethodId'],
  ]);

 
  const base = mapPaymentMethod(item);
  const parsedId = parseInt(base.id, 10);
  const id = rawId ?? (!Number.isNaN(parsedId) ? parsedId : 0);

  if (__DEV__) {
    console.log('[mapFinePaymentMethod] item id resolved:', id, '| rawId:', rawId, '| base.id:', base.id);
  }

  return {
    id,
    label: base.title,
    title: base.title,
    subtitle: base.subtitle,
    last4: findFirstString(item, [['last4'], ['last_4']]),
    brand: findFirstString(item, [['brand'], ['card_brand'], ['cardBrand']]),
  };
}

function getFinePaymentMethodsArray(data: unknown): unknown[] {
  
  return getPaymentMethodsArray(data);
}

export async function getPendingFine(userId: number, token: string): Promise<FineData | null> {
  ensureAuth(userId, token);

  let data: JsonValue;
  try {
    data = await request<JsonValue>(`/users/${userId}/fines`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }

  if (__DEV__) {
    console.log('[getPendingFine] raw response', data);
  }

  return mapFineData(data);
}

export async function getFinePaymentMethods(userId: number, token: string): Promise<FinePaymentMethod[]> {
  ensureAuth(userId, token);

  const data = await request<JsonValue>(`/users/${userId}/payment-methods`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (__DEV__) {
    console.log('[getFinePaymentMethods] raw response', data);
  }

  const extracted = getFinePaymentMethodsArray(data);

  if (__DEV__) {
    console.log('[getFinePaymentMethods] extracted array length:', extracted.length, extracted);
  }

  return extracted.map(mapFinePaymentMethod);
}

export async function payFine(
  userId: number,
  fineId: number,
  payment_method_id: number,
  token: string
): Promise<void> {
  ensureAuth(userId, token);

  const data = await request<JsonValue>(`/users/${userId}/fines/${fineId}/pay`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ payment_method_id }),
  });

  if (__DEV__) {
    console.log('[payFine] raw response', data);
  }
}

// ── End Fines ───────────────────────────────────────────────────────────────

// ── Differences ─────────────────────────────────────────────────────────────

export interface DifferenceData {
  id: number;
  winningBid: number;
  availableBalance: number;
  differenceAmount: number;
  itemTitle?: string;
  lotCode?: string;
  status: string;
}

function mapDifferenceData(data: unknown): DifferenceData | null {
  const message = getNestedValue(data, ['message']) ?? data;

  const id = findFirstNumber(message, [['id'], ['difference_id'], ['differenceId']]);
  if (!id) {
    return null;
  }

  return {
    id,
    winningBid: findFirstNumber(message, [['winning_bid'], ['winningBid']]) ?? 0,
    availableBalance: findFirstNumber(message, [['available_balance'], ['availableBalance']]) ?? 0,
    differenceAmount: findFirstNumber(message, [['difference_amount'], ['differenceAmount']]) ?? 0,
    itemTitle: findFirstString(message, [['item_title'], ['itemTitle']]),
    lotCode: findFirstString(message, [['lot_code'], ['lotCode']]),
    status: findFirstString(message, [['status'], ['estado']]) ?? 'pendiente',
  };
}

export async function getPendingDifference(userId: number, token: string): Promise<DifferenceData | null> {
  ensureAuth(userId, token);

  let data: JsonValue;
  try {
    data = await request<JsonValue>(`/users/${userId}/differences`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }

  if (__DEV__) {
    console.log('[getPendingDifference] raw response', data);
  }

  return mapDifferenceData(data);
}

export async function getDifferencePaymentMethods(userId: number, token: string): Promise<FinePaymentMethod[]> {
  ensureAuth(userId, token);

  const data = await request<JsonValue>(`/users/${userId}/payment-methods`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (__DEV__) {
    console.log('[getDifferencePaymentMethods] raw response', data);
  }

  return getPaymentMethodsArray(data).map(mapFinePaymentMethod);
}

export async function payDifference(
  userId: number,
  differenceId: number,
  payment_method_id: number,
  token: string
): Promise<void> {
  ensureAuth(userId, token);

  const data = await request<JsonValue>(`/users/${userId}/differences/${differenceId}/pay`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ payment_method_id }),
  });

  if (__DEV__) {
    console.log('[payDifference] raw response', data);
  }
}

// ── End Differences ──────────────────────────────────────────────────────────


export async function changePassword(input: PasswordChangeInput) {
  return request<JsonValue>(`/users/${input.userId}/password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${input.token}`,
    },
    body: JSON.stringify({
      password: input.password,
      passwordConfirmation: input.passwordConfirmation,
    }),
  });
}

export async function resetPassword(input: PasswordResetConfirmInput) {
  return request<JsonValue>('/auth/password/reset', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: input.email,
      code: input.code,
      password: input.password,
      passwordConfirmation: input.passwordConfirmation,
    }),
  });
}

export async function listUserPaymentMethods(userId: number, token: string): Promise<PaymentMethod[]> {
  ensureAuth(userId, token);

  const data = await request<JsonValue>(`/users/${userId}/payment-methods`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return getPaymentMethodsArray(data).map(mapPaymentMethod);
}

export async function listCountries(): Promise<CountryOption[]> {
  const data = await request<JsonValue>('/countries', {
    method: 'GET',
  });

  return getCountriesArray(data).map(mapCountryOption).filter((country) => country.id > 0 && country.name.trim().length > 0);
}

export async function createUserPaymentMethod(
  userId: number,
  token: string,
  input: PaymentMethodCreateInput
) {
  ensureAuth(userId, token);

  if (input.type === 'bank') {
    const body: Record<string, JsonValue> = {
      type: 'cuenta_bancaria',
      bank_name: input.bankName,
      country: input.country,
      account_number: input.accountNumber,
      cbu_iban: input.cbuIban,
      account_holder: input.accountHolder,
      reserved_amount: input.reservedAmount,
      is_foreign_bank: input.isForeignBank,
      currency: input.currency ?? (input.isForeignBank ? 'USD' : 'ARS'),
    };

    return request<JsonValue>(`/users/${userId}/payment-methods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  }

  if (input.type === 'check') {
    const body: Record<string, JsonValue> = {
      type: 'cheque',
      bank_name: input.bankName,
      check_number: input.checkNumber,
      amount: input.amount,
      issue_date: input.issueDate,
      holder_name: input.holderName,
      currency: input.currency ?? 'ARS',
    };
    if (typeof input.auctionId === 'number') {
      body.auction_id = input.auctionId;
    }

    return request<JsonValue>(`/users/${userId}/payment-methods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  }

  const cardPayloadVariants: Record<string, JsonValue>[] = [
    {
      type: 'tarjeta',
      card_number: input.cardNumber,
      card_holder: input.cardHolder,
      expiry: input.expiry,
      cvv: input.cvv,
      currency: input.currency ?? 'ARS',
    },
    {
      type: 'card',
      card_number: input.cardNumber,
      card_holder: input.cardHolder,
      expiry: input.expiry,
      cvc: input.cvv,
      currency: input.currency ?? 'ARS',
    },
    {
      type: 'tarjeta',
      number: input.cardNumber,
      holder: input.cardHolder,
      expiration_date: input.expiry,
      cvc: input.cvv,
      currency: input.currency ?? 'ARS',
    },
  ];

  if (input.country) {
    for (const body of cardPayloadVariants) {
      body.country = input.country;
    }
  }

  let lastError: unknown = null;

  for (const body of cardPayloadVariants) {
    try {
      return await request<JsonValue>(`/users/${userId}/payment-methods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      lastError = error;
      if (!(error instanceof ApiError) || (error.status !== 400 && error.status !== 422)) {
        throw error;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error('No se pudo crear el medio de pago.');
}

export async function deleteUserPaymentMethod(userId: number, paymentMethodId: string, token: string) {
  ensureAuth(userId, token);

  try {
    return await request<JsonValue>(`/users/${userId}/payment-methods/${paymentMethodId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 405)) {
      throw error;
    }

    return request<JsonValue>(`/users/${userId}/payment-methods/${paymentMethodId}/delete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function isNetworkError(error: unknown) {
  if (error instanceof NetworkError) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('no se pudo conectar con la api') ||
    message.includes('network request failed') ||
    message.includes('failed to fetch')
  );
}

export function isSuspendedError(error: unknown) {
  if (!(error instanceof ApiError)) {
    return false;
  }

  const message = `${error.message} ${JSON.stringify(error.data ?? '')}`.toLowerCase();
  return message.includes('suspend') || message.includes('blocked') || message.includes('bloque');
}

export function isInvalidCredentialsError(error: unknown) {
  if (!(error instanceof ApiError)) {
    return false;
  }

  if (isSuspendedError(error)) {
    return false;
  }

  if (error.status === 401) {
    return true;
  }

  const message = `${error.message} ${JSON.stringify(error.data ?? '')}`.toLowerCase();
  return (
    (error.status === 400 || error.status === 403) &&
    (message.includes('credencial') ||
      message.includes('incorrect') ||
      message.includes('invalid') ||
      message.includes('unauthorized') ||
      message.includes('contrase') ||
      message.includes('password'))
  );
}

export function isDuplicateOnboardingError(error: unknown) {
  if (!(error instanceof ApiError)) {
    return false;
  }

  const message = `${error.message} ${JSON.stringify(error.data ?? '')}`.toLowerCase();
  return (
    error.status === 409 ||
    (message.includes('solicitud') && (message.includes('existe') || message.includes('duplic'))) ||
    (message.includes('mail') && message.includes('solicitud'))
  );
}

export function isUnknownOnboardingResultError(error: unknown) {
  if (error instanceof ApiError) {
    return error.status === 0;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('estado 0') || message.includes('timed out') || message.includes('demasiado en responder');
  }

  return false;
}

export function isAlreadyApprovedError(error: unknown): boolean {
    if (!isDuplicateOnboardingError(error)) return false;

   
    const anyError = error as Record<string, any>;
    if (anyError?.responseBody?.code === 'ACCOUNT_APPROVED') return true;
    if (anyError?.body?.code === 'ACCOUNT_APPROVED') return true;
    if (anyError?.data?.code === 'ACCOUNT_APPROVED') return true;

   
    if (error instanceof Error && error.message?.toLowerCase().includes('aprobada')) return true;

    return false;
}
