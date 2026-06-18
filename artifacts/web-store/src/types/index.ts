export interface User {
  id: string;
  uid?: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: "user" | "reseller" | "admin";
  resellerExpiry?: string | null;
  totalTransactions: number;
  createdAt?: unknown;
}

// ─── Product ────────────────────────────────────────────────
export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  resellerPrice: number;
  description: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  previewImages?: string[];
  price: number;
  resellerPrice?: number;
  rating?: number;
  ratingCount?: number;
  available?: boolean;
  benefits?: string[];
  variants: ProductVariant[];
  createdAt?: unknown;
}

// ─── Panel ──────────────────────────────────────────────────
export interface PanelVariant {
  id: string;
  name: string;
  price: number;
  resellerPrice: number;
  description: string;
  duration: string;
  isActive: boolean;
}

export interface Panel {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  available?: boolean;
  variants: PanelVariant[];
  createdAt?: unknown;
}

// ─── Reseller Package ────────────────────────────────────────
export interface ResellerPackage {
  id: string;
  name: string;
  price: number;
  duration: number;
  durationType: "days" | "months" | "permanent";
  benefits: string[];
  productDiscount: number;
  panelDiscount: number;
  active?: boolean;
  createdAt?: unknown;
}

// ─── Transaction ─────────────────────────────────────────────
export type PaymentStatus = "pending" | "paid" | "failed" | "expired";
export type OrderStatus =
  | "pending_payment"
  | "waiting_admin"
  | "processing"
  | "done"
  | "cancelled"
  | "rejected";

export interface Transaction {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  type: "product" | "panel" | "reseller_upgrade";

  productId?: string;
  productName?: string;
  variantId?: string;
  variantName?: string;

  panelId?: string;
  panelName?: string;
  panelVariantId?: string;
  panelVariantName?: string;

  resellerPackageId?: string;
  resellerPackageName?: string;
  resellerActiveUntil?: string | null;

  amount: number;
  method: "qris";
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;

  qrisDepositId?: string;
  qrisImage?: string;

  manualOrderId?: string;
  buyerNote?: string;
  note?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

// ─── Manual Order ─────────────────────────────────────────────
export interface DeliveredField {
  key: string;
  value: string;
}

export interface ManualOrder {
  id: string;
  transactionId: string;
  userId: string;
  userEmail: string;
  userName: string;
  buyerWhatsapp?: string;
  type: "product" | "panel";

  productId?: string;
  productName?: string;
  variantId?: string;
  variantName?: string;

  panelId?: string;
  panelName?: string;
  panelVariantId?: string;
  panelVariantName?: string;

  amount: number;
  buyerNote?: string;

  status: "waiting" | "processing" | "done" | "rejected";
  adminNote?: string;
  deliveredFields?: DeliveredField[];

  createdAt?: unknown;
  updatedAt?: unknown;
}

// ─── User Product Data (delivered accounts) ──────────────────
export interface UserProductData {
  id: string;
  userId: string;
  transactionId: string;
  manualOrderId: string;
  productId: string;
  productName: string;
  variantName: string;
  fields: DeliveredField[];
  isActive: boolean;
  expiresAt?: string;
  note?: string;
  deliveredAt?: unknown;
}

// ─── User Panel Data (delivered panel credentials) ───────────
export interface UserPanelData {
  id: string;
  userId: string;
  transactionId: string;
  manualOrderId: string;
  panelId: string;
  panelName: string;
  variantName: string;
  fields: DeliveredField[];
  isActive: boolean;
  expiresAt?: string;
  loginUrl?: string;
  note?: string;
  deliveredAt?: unknown;
}

export interface NokosProvider {
  id: string;
  name: string;
  price: number;
  available: boolean;
}

export interface NokosCountry {
  id: string;
  name: string;
  providers: NokosProvider[];
}

export interface Nokos {
  id: string;
  name: string;
  available: boolean;
  countries: NokosCountry[];
  createdAt?: unknown;
}

// ─── Nokos Orders & Deposits (realtime dari API nokos.co.id) ─────
export interface NokosOrder {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  serviceId: string;
  serviceName: string;
  countryId: string;
  countryName: string;
  operatorId: string;
  operatorName: string;
  price: number;
  nokosOrderId: string;
  phone: string;
  otp: string | null;
  status: "waiting_otp" | "done" | "cancelled" | "timeout";
  expiresAt?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface NokosDeposit {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  transactionId?: string;
  qrisUrl?: string;
  expiresAt?: string;
  status: "pending" | "paid" | "expired" | "failed";
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface NokosWallet {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  balance: number;
  totalTopup: number;
  totalSpent: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ApkMod {
  id: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  version: string;
  size: string;
  downloadUrl: string;
  rating: number;
  available: boolean;
  features: string[];
  createdAt?: unknown;
}

export interface BroadcastSetting {
  enabled: boolean;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "danger";
  updatedAt?: unknown;
}