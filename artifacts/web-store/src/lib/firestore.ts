import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, setDoc, runTransaction,
  onSnapshot, type Unsubscribe, increment,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  User,
  Product,
  Panel,
  Transaction,
  ResellerPackage,
  ManualOrder,
  UserProductData,
  UserPanelData,
  Nokos,
  NokosOrder,
  NokosDeposit,
  NokosWallet,
  ApkMod,
  BroadcastSetting,
} from "../types";

export const COLLECTIONS = {
  USERS: "users",
  PRODUCTS: "products",
  PANELS: "panels",
  TRANSACTIONS: "transactions",
  RESELLER_PACKAGES: "reseller_packages",
  MANUAL_ORDERS: "manual_orders",
  USER_PRODUCT_DATA: "user_product_data",
  USER_PANEL_DATA: "user_panel_data",
  SETTINGS: "settings",
  NOKOS: "nokos_products",
  NOKOS_ORDERS: "nokos_orders",
  NOKOS_DEPOSITS: "nokos_deposits",
  NOKOS_WALLETS: "nokos_wallets",
  APK_MODS: "apk_mods",
};

// ── Users ──────────────────────────────────────────────────────
export async function createUserProfile(uid: string, data: Partial<User>) {
  await setDoc(doc(db, COLLECTIONS.USERS, uid), {
    ...data,
    role: "user",
    createdAt: serverTimestamp(),
    totalTransactions: 0,
  }, { merge: true });
}

export async function getUserProfile(uid: string) {
  const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } as User : null;
}

export async function updateUserProfile(uid: string, data: Partial<User>) {
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), data as Record<string, unknown>);
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, COLLECTIONS.USERS));
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as User[];
}

export function subscribeUsers(cb: (users: User[]) => void): Unsubscribe {
  return onSnapshot(collection(db, COLLECTIONS.USERS), snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })) as User[]);
  });
}

// ── Products ───────────────────────────────────────────────────
export async function getProducts() {
  const q = query(collection(db, COLLECTIONS.PRODUCTS), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[];
}

export async function getProduct(id: string) {
  const snap = await getDoc(doc(db, COLLECTIONS.PRODUCTS, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } as Product : null;
}

export async function createProduct(data: Omit<Product, "id">) {
  const ref = await addDoc(collection(db, COLLECTIONS.PRODUCTS), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProduct(id: string, data: Partial<Product>) {
  await updateDoc(doc(db, COLLECTIONS.PRODUCTS, id), data as Record<string, unknown>);
}

export async function deleteProduct(id: string) {
  await deleteDoc(doc(db, COLLECTIONS.PRODUCTS, id));
}

export function subscribeProducts(cb: (products: Product[]) => void): Unsubscribe {
  const q = query(collection(db, COLLECTIONS.PRODUCTS), orderBy("createdAt", "desc"));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[]);
  });
}

// ── Panels ─────────────────────────────────────────────────────
export async function getPanels() {
  const snap = await getDocs(collection(db, COLLECTIONS.PANELS));
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Panel[];
}

export async function createPanel(data: Omit<Panel, "id">) {
  const ref = await addDoc(collection(db, COLLECTIONS.PANELS), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePanel(id: string, data: Partial<Panel>) {
  await updateDoc(doc(db, COLLECTIONS.PANELS, id), data as Record<string, unknown>);
}

export async function deletePanel(id: string) {
  await deleteDoc(doc(db, COLLECTIONS.PANELS, id));
}

export function subscribePanels(cb: (panels: Panel[]) => void): Unsubscribe {
  return onSnapshot(collection(db, COLLECTIONS.PANELS), snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Panel[]);
  });
}

// ── Transactions ───────────────────────────────────────────────
export async function createTransaction(data: Omit<Transaction, "id">) {
  const ref = await addDoc(collection(db, COLLECTIONS.TRANSACTIONS), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getTransaction(id: string) {
  const snap = await getDoc(doc(db, COLLECTIONS.TRANSACTIONS, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } as Transaction : null;
}

export async function getUserTransactions(uid: string) {
  const q = query(
    collection(db, COLLECTIONS.TRANSACTIONS),
    where("userId", "==", uid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Transaction[];
}

export async function getAllTransactions() {
  const q = query(collection(db, COLLECTIONS.TRANSACTIONS), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Transaction[];
}

export async function updateTransaction(id: string, data: Partial<Transaction>) {
  if (!id) throw new Error("Transaction ID kosong.");

  const ref = doc(db, COLLECTIONS.TRANSACTIONS, id);
  const snap = await getDoc(ref);

  if (!snap.exists()) throw new Error(`Transaction tidak ditemukan: ${id}`);

  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>);
}

export async function getRecentPendingTransaction(
  uid: string,
  type: "product" | "panel" | "reseller_upgrade",
  opts?: {
    variantId?: string;
    productId?: string;
    panelVariantId?: string;
    panelId?: string;
    resellerPackageId?: string;
  },
): Promise<Transaction | null> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const q = query(
    collection(db, COLLECTIONS.TRANSACTIONS),
    where("userId", "==", uid),
    where("paymentStatus", "==", "pending"),
    where("type", "==", type),
  );

  const snap = await getDocs(q);

  for (const d of snap.docs) {
    const tx = { id: d.id, ...d.data() } as Transaction;
    const createdAt = tx.createdAt as { seconds?: number } | undefined;

    if (createdAt?.seconds && new Date(createdAt.seconds * 1000) < tenMinutesAgo) continue;
    if (opts?.productId && tx.productId !== opts.productId) continue;
    if (opts?.variantId && tx.variantId !== opts.variantId) continue;
    if (opts?.panelId && tx.panelId !== opts.panelId) continue;
    if (opts?.panelVariantId && tx.panelVariantId !== opts.panelVariantId) continue;
    if (opts?.resellerPackageId && tx.resellerPackageId !== opts.resellerPackageId) continue;

    return tx;
  }

  return null;
}

export function subscribeUserTransactions(uid: string, cb: (txs: Transaction[]) => void): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.TRANSACTIONS),
    where("userId", "==", uid),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Transaction[]);
  });
}

export function subscribeAllTransactions(cb: (txs: Transaction[]) => void): Unsubscribe {
  const q = query(collection(db, COLLECTIONS.TRANSACTIONS), orderBy("createdAt", "desc"));

  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Transaction[]);
  });
}

// ── Reseller Packages ──────────────────────────────────────────
export async function getResellerPackages() {
  const snap = await getDocs(collection(db, COLLECTIONS.RESELLER_PACKAGES));
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as ResellerPackage[];
}

export async function createResellerPackage(data: Omit<ResellerPackage, "id">) {
  const ref = await addDoc(collection(db, COLLECTIONS.RESELLER_PACKAGES), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateResellerPackage(id: string, data: Partial<ResellerPackage>) {
  await updateDoc(doc(db, COLLECTIONS.RESELLER_PACKAGES, id), data as Record<string, unknown>);
}

export async function deleteResellerPackage(id: string) {
  await deleteDoc(doc(db, COLLECTIONS.RESELLER_PACKAGES, id));
}

export function subscribeResellerPackages(cb: (pkgs: ResellerPackage[]) => void): Unsubscribe {
  return onSnapshot(collection(db, COLLECTIONS.RESELLER_PACKAGES), snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ResellerPackage[]);
  });
}

// ── Upgrade to Reseller ────────────────────────────────────────
export async function upgradeUserToReseller(uid: string, pkg: ResellerPackage): Promise<string | null> {
  let expiry: string | null = null;

  if (pkg.durationType !== "permanent") {
    const now = new Date();

    if (pkg.durationType === "days") {
      now.setDate(now.getDate() + pkg.duration);
    } else {
      now.setMonth(now.getMonth() + pkg.duration);
    }

    expiry = now.toISOString();
  }

  await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
    role: "reseller",
    resellerExpiry: expiry,
  });

  return expiry;
}

// ── Manual Orders ──────────────────────────────────────────────
export async function createManualOrder(data: Omit<ManualOrder, "id">) {
  const ref = await addDoc(collection(db, COLLECTIONS.MANUAL_ORDERS), {
    ...data,
    status: "waiting",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getManualOrders() {
  const q = query(collection(db, COLLECTIONS.MANUAL_ORDERS), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as ManualOrder[];
}

export async function updateManualOrder(id: string, data: Partial<ManualOrder>) {
  if (!id) throw new Error("Manual Order ID kosong.");

  const ref = doc(db, COLLECTIONS.MANUAL_ORDERS, id);
  const snap = await getDoc(ref);

  if (!snap.exists()) throw new Error(`Manual Order tidak ditemukan: ${id}`);

  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>);
}

export function subscribeManualOrders(cb: (orders: ManualOrder[]) => void): Unsubscribe {
  const q = query(collection(db, COLLECTIONS.MANUAL_ORDERS), orderBy("createdAt", "desc"));

  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ManualOrder[]);
  });
}

export function subscribeUserManualOrders(uid: string, cb: (orders: ManualOrder[]) => void): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.MANUAL_ORDERS),
    where("userId", "==", uid),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ManualOrder[]);
  });
}

// ── User Product Data ──────────────────────────────────────────
export async function createUserProductData(data: Omit<UserProductData, "id">) {
  const ref = await addDoc(collection(db, COLLECTIONS.USER_PRODUCT_DATA), {
    ...data,
    deliveredAt: serverTimestamp(),
  });
  return ref.id;
}

export function subscribeUserProductData(uid: string, cb: (items: UserProductData[]) => void): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.USER_PRODUCT_DATA),
    where("userId", "==", uid),
  );

  return onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() })) as UserProductData[];

    items.sort((a, b) => {
      const aS = (a.deliveredAt as { seconds?: number })?.seconds ?? 0;
      const bS = (b.deliveredAt as { seconds?: number })?.seconds ?? 0;
      return bS - aS;
    });

    cb(items);
  }, () => cb([]));
}

export async function updateUserProductData(id: string, data: Partial<UserProductData>) {
  await updateDoc(doc(db, COLLECTIONS.USER_PRODUCT_DATA, id), data as Record<string, unknown>);
}

export async function getUserProductDataByTx(transactionId: string): Promise<UserProductData | null> {
  const q = query(
    collection(db, COLLECTIONS.USER_PRODUCT_DATA),
    where("transactionId", "==", transactionId),
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  return { id: snap.docs[0].id, ...snap.docs[0].data() } as UserProductData;
}

// ── User Panel Data ────────────────────────────────────────────
export async function createUserPanelData(data: Omit<UserPanelData, "id">) {
  const ref = await addDoc(collection(db, COLLECTIONS.USER_PANEL_DATA), {
    ...data,
    deliveredAt: serverTimestamp(),
  });
  return ref.id;
}

export function subscribeUserPanelData(uid: string, cb: (items: UserPanelData[]) => void): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.USER_PANEL_DATA),
    where("userId", "==", uid),
  );

  return onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() })) as UserPanelData[];

    items.sort((a, b) => {
      const aS = (a.deliveredAt as { seconds?: number })?.seconds ?? 0;
      const bS = (b.deliveredAt as { seconds?: number })?.seconds ?? 0;
      return bS - aS;
    });

    cb(items);
  }, () => cb([]));
}

export async function updateUserPanelData(id: string, data: Partial<UserPanelData>) {
  await updateDoc(doc(db, COLLECTIONS.USER_PANEL_DATA, id), data as Record<string, unknown>);
}

export async function getUserPanelDataByTx(transactionId: string): Promise<UserPanelData | null> {
  const q = query(
    collection(db, COLLECTIONS.USER_PANEL_DATA),
    where("transactionId", "==", transactionId),
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  return { id: snap.docs[0].id, ...snap.docs[0].data() } as UserPanelData;
}

// ── Settings ───────────────────────────────────────────────────
export async function getSettings() {
  const snap = await getDoc(doc(db, COLLECTIONS.SETTINGS, "global"));
  return snap.exists() ? snap.data() : { qrisApiKey: "" };
}

export async function updateSettings(data: Record<string, unknown>) {
  await setDoc(doc(db, COLLECTIONS.SETTINGS, "global"), data, { merge: true });
}

// ── Broadcast Settings ─────────────────────────────────────────
export type BroadcastTarget = "broadcast_home" | "broadcast_nokos";

export function subscribeBroadcast(
  id: BroadcastTarget,
  cb: (broadcast: BroadcastSetting | null) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, COLLECTIONS.SETTINGS, id),
    snap => {
      cb(
        snap.exists()
          ? ({ ...snap.data() } as BroadcastSetting)
          : null
      );
    },
    err => {
      console.error("subscribeBroadcast error:", err);
      cb(null);
    }
  );
}

export async function updateBroadcast(
  id: BroadcastTarget,
  data: Omit<BroadcastSetting, "updatedAt">
): Promise<void> {
  await setDoc(
    doc(db, COLLECTIONS.SETTINGS, id),
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// ── Nokos ──────────────────────────────────────────────────────
export async function getNokos() {
  const q = query(
    collection(db, COLLECTIONS.NOKOS),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);

  return snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
  })) as Nokos[];
}

export async function getNokosById(id: string) {
  const snap = await getDoc(
    doc(db, COLLECTIONS.NOKOS, id)
  );

  return snap.exists()
    ? ({ id: snap.id, ...snap.data() } as Nokos)
    : null;
}

export async function createNokos(data: Omit<Nokos, "id">) {
  const ref = await addDoc(
    collection(db, COLLECTIONS.NOKOS),
    {
      ...data,
      createdAt: serverTimestamp(),
    }
  );

  return ref.id;
}

export async function updateNokos(id: string, data: Partial<Nokos>) {
  await updateDoc(
    doc(db, COLLECTIONS.NOKOS, id),
    data as Record<string, unknown>
  );
}

export async function deleteNokos(id: string) {
  await deleteDoc(
    doc(db, COLLECTIONS.NOKOS, id)
  );
}

export function subscribeNokos(cb: (items: Nokos[]) => void): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.NOKOS),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, snap => {
    cb(
      snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as Nokos[]
    );
  });
}

// ── Nokos Orders ───────────────────────────────────────────────
export async function createNokosOrder(data: Omit<NokosOrder, "id">) {
  const ref = await addDoc(collection(db, COLLECTIONS.NOKOS_ORDERS), {
    ...data,
    refunded: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateNokosOrder(id: string, data: Partial<NokosOrder>) {
  await updateDoc(doc(db, COLLECTIONS.NOKOS_ORDERS, id), {
    ...(data as Record<string, unknown>),
    updatedAt: serverTimestamp(),
  });
}

export async function getNokosOrder(id: string) {
  const snap = await getDoc(doc(db, COLLECTIONS.NOKOS_ORDERS, id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as NokosOrder) : null;
}

export async function getUserNokosOrders(userId: string) {
  const q = query(
    collection(db, COLLECTIONS.NOKOS_ORDERS),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as NokosOrder[];
}

export function subscribeUserNokosOrders(
  userId: string,
  cb: (orders: NokosOrder[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.NOKOS_ORDERS),
    where("userId", "==", userId)
  );

  return onSnapshot(
    q,
    snap => {
      const items = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as NokosOrder[];

      items.sort((a, b) => {
        const aS = (a.createdAt as { seconds?: number })?.seconds ?? 0;
        const bS = (b.createdAt as { seconds?: number })?.seconds ?? 0;
        return bS - aS;
      });

      cb(items);
    },
    err => {
      console.error("subscribeUserNokosOrders error:", err);
      cb([]);
    }
  );
}

export function subscribeAllNokosOrders(cb: (orders: NokosOrder[]) => void): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.NOKOS_ORDERS),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })) as NokosOrder[]);
  });
}

// ── Nokos Deposits ─────────────────────────────────────────────
export async function createNokosDeposit(data: Omit<NokosDeposit, "id">) {
  const ref = await addDoc(collection(db, COLLECTIONS.NOKOS_DEPOSITS), {
    ...data,
    walletCredited: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function updateNokosDeposit(id: string, data: Partial<NokosDeposit>) {
  await updateDoc(doc(db, COLLECTIONS.NOKOS_DEPOSITS, id), {
    ...(data as Record<string, unknown>),
    updatedAt: serverTimestamp(),
  });
}

export async function getNokosDeposit(id: string) {
  const snap = await getDoc(doc(db, COLLECTIONS.NOKOS_DEPOSITS, id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as NokosDeposit) : null;
}

export function subscribeNokosDeposits(cb: (deposits: NokosDeposit[]) => void): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.NOKOS_DEPOSITS),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })) as NokosDeposit[]);
  });
}

export function subscribeUserNokosDeposits(
  userId: string,
  cb: (deposits: NokosDeposit[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.NOKOS_DEPOSITS),
    where("userId", "==", userId)
  );

  return onSnapshot(
    q,
    snap => {
      const items = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as NokosDeposit[];

      items.sort((a, b) => {
        const aS = (a.createdAt as { seconds?: number })?.seconds ?? 0;
        const bS = (b.createdAt as { seconds?: number })?.seconds ?? 0;
        return bS - aS;
      });

      cb(items);
    },
    err => {
      console.error("subscribeUserNokosDeposits error:", err);
      cb([]);
    }
  );
}

// ── Nokos Wallets ──────────────────────────────────────────────
// One wallet per user — doc ID = userId

function walletRef(userId: string) {
  return doc(db, COLLECTIONS.NOKOS_WALLETS, userId);
}

export async function getOrCreateWallet(
  userId: string,
  userEmail: string,
  userName: string
): Promise<NokosWallet> {
  const ref = walletRef(userId);
  const snap = await getDoc(ref);

  if (snap.exists()) return { id: snap.id, ...snap.data() } as NokosWallet;

  const initial: Omit<NokosWallet, "id"> = {
    userId,
    userEmail,
    userName,
    balance: 0,
    totalTopup: 0,
    totalSpent: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, initial);

  return {
    id: userId,
    ...initial,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function subscribeWallet(
  userId: string,
  cb: (wallet: NokosWallet | null) => void
): Unsubscribe {
  return onSnapshot(walletRef(userId), snap => {
    cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as NokosWallet) : null);
  });
}

export function subscribeAllWallets(cb: (wallets: NokosWallet[]) => void): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.NOKOS_WALLETS),
    orderBy("balance", "desc")
  );

  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })) as NokosWallet[]);
  });
}

export async function finalizeNokosDepositPaid(depositId: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const depositRef = doc(db, COLLECTIONS.NOKOS_DEPOSITS, depositId);
    const depositSnap = await tx.get(depositRef);

    if (!depositSnap.exists()) throw new Error("Deposit tidak ditemukan");

    const deposit = depositSnap.data() as NokosDeposit & {
      walletCredited?: boolean;
      bonusAmount?: number;
    };

    if (deposit.status === "paid" && deposit.walletCredited === true) return;

    const userId = deposit.userId;
    const amount = Number(deposit.amount || 0);
    const bonusAmount = Number(deposit.bonusAmount || 0);
    const creditAmount = amount + bonusAmount;

    if (!userId) throw new Error("User ID deposit kosong");
    if (!creditAmount || creditAmount <= 0) throw new Error("Jumlah deposit tidak valid");

    const wallet = walletRef(userId);
    const walletSnap = await tx.get(wallet);

    if (walletSnap.exists()) {
      tx.update(wallet, {
        balance: increment(creditAmount),
        totalTopup: increment(creditAmount),
        updatedAt: serverTimestamp(),
      });
    } else {
      tx.set(wallet, {
        userId,
        userEmail: deposit.userEmail || "",
        userName: deposit.userName || "",
        balance: creditAmount,
        totalTopup: creditAmount,
        totalSpent: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    tx.update(depositRef, {
      status: "paid",
      walletCredited: true,
      paidAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function repairPaidNokosDeposits(userId: string): Promise<void> {
  const q = query(
    collection(db, COLLECTIONS.NOKOS_DEPOSITS),
    where("userId", "==", userId),
    where("status", "==", "paid")
  );

  const snap = await getDocs(q);

  for (const d of snap.docs) {
    const data = d.data() as NokosDeposit & { walletCredited?: boolean };

    if (data.walletCredited === true) continue;

    await finalizeNokosDepositPaid(d.id);
  }

  await syncWalletFromHistory(userId);
}

export async function creditWallet(userId: string, amount: number): Promise<void> {
  await runTransaction(db, async (tx) => {
    const ref = walletRef(userId);
    const snap = await tx.get(ref);

    if (snap.exists()) {
      tx.update(ref, {
        balance: increment(amount),
        totalTopup: increment(amount),
        updatedAt: serverTimestamp(),
      });
    } else {
      tx.set(ref, {
        userId,
        balance: amount,
        totalTopup: amount,
        totalSpent: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  });
}

export async function deductWallet(userId: string, amount: number): Promise<void> {
  await runTransaction(db, async (tx) => {
    const ref = walletRef(userId);
    const snap = await tx.get(ref);

    if (!snap.exists()) throw new Error("Wallet tidak ditemukan");

    const data = snap.data() as NokosWallet;
    const balance = Number(data.balance || 0);

    if (balance < amount) throw new Error("Saldo wallet tidak cukup");

    tx.update(ref, {
      balance: balance - amount,
      totalSpent: Number(data.totalSpent || 0) + amount,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function refundWallet(userId: string, amount: number): Promise<void> {
  await runTransaction(db, async (tx) => {
    const ref = walletRef(userId);
    const snap = await tx.get(ref);

    if (!snap.exists()) throw new Error("Wallet tidak ditemukan");

    const data = snap.data() as NokosWallet;

    tx.update(ref, {
      balance: Number(data.balance || 0) + amount,
      totalSpent: Math.max(0, Number(data.totalSpent || 0) - amount),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function refundNokosOrder(
  orderId: string,
  status: "cancelled" | "timeout" | "failed" = "cancelled"
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const orderRef = doc(db, COLLECTIONS.NOKOS_ORDERS, orderId);
    const orderSnap = await tx.get(orderRef);

    if (!orderSnap.exists()) throw new Error("Order tidak ditemukan");

    const order = orderSnap.data() as NokosOrder & {
      refunded?: boolean;
    };

    if (order.refunded === true) return;

    const userId = order.userId;
    const amount = Number(order.price || 0);

    if (!userId || amount <= 0) throw new Error("Data refund tidak valid");

    const wallet = walletRef(userId);
    const walletSnap = await tx.get(wallet);

    if (!walletSnap.exists()) throw new Error("Wallet tidak ditemukan");

    const walletData = walletSnap.data() as NokosWallet;

    tx.update(wallet, {
      balance: Number(walletData.balance || 0) + amount,
      totalSpent: Math.max(0, Number(walletData.totalSpent || 0) - amount),
      updatedAt: serverTimestamp(),
    });

    tx.update(orderRef, {
      status,
      refunded: true,
      refundedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function syncWalletFromHistory(userId: string): Promise<void> {
  const depositsQ = query(
    collection(db, COLLECTIONS.NOKOS_DEPOSITS),
    where("userId", "==", userId)
  );

  const ordersQ = query(
    collection(db, COLLECTIONS.NOKOS_ORDERS),
    where("userId", "==", userId)
  );

  const [depositSnap, orderSnap] = await Promise.all([
    getDocs(depositsQ),
    getDocs(ordersQ),
  ]);

  let totalTopup = 0;
  let totalSpent = 0;
  let adminAdjustment = 0;

  depositSnap.docs.forEach((d) => {
    const data = d.data() as NokosDeposit & {
      bonusAmount?: number;
      type?: string;
      adjustmentAmount?: number;
    };

    if (data.status === "paid") {
      totalTopup += Number(data.amount || 0) + Number(data.bonusAmount || 0);
    }

    if (data.status === "admin_adjusted") {
      adminAdjustment += Number(data.adjustmentAmount || data.amount || 0);
    }
  });

  orderSnap.docs.forEach((d) => {
    const data = d.data() as NokosOrder & { refunded?: boolean };
    const status = String(data.status || "").toLowerCase();

    if (
      status !== "cancelled" &&
      status !== "canceled" &&
      status !== "failed" &&
      status !== "timeout" &&
      status !== "dibatalkan" &&
      data.refunded !== true
    ) {
      totalSpent += Number(data.price || 0);
    }
  });

  await setDoc(
    walletRef(userId),
    {
      userId,
      balance: Math.max(0, totalTopup + adminAdjustment - totalSpent),
      totalTopup,
      totalSpent,
      adminAdjustment,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function adminAdjustWallet(
  userId: string,
  delta: number,
  userEmail: string,
  userName: string
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const ref = walletRef(userId);
    const snap = await tx.get(ref);

    const safeDelta = Number(delta || 0);

    if (!safeDelta) {
      throw new Error("Jumlah saldo tidak valid");
    }

    if (snap.exists()) {
      const data = snap.data() as NokosWallet;
      const currentBalance = Number(data.balance || 0);
      const newBalance = Math.max(0, currentBalance + safeDelta);

      tx.update(ref, {
        balance: newBalance,
        updatedAt: serverTimestamp(),
      });
    } else {
      tx.set(ref, {
        userId,
        userEmail,
        userName,
        balance: Math.max(0, safeDelta),
        totalTopup: 0,
        totalSpent: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const historyRef = doc(collection(db, COLLECTIONS.NOKOS_DEPOSITS));

    tx.set(historyRef, {
      userId,
      userEmail,
      userName,
      amount: safeDelta,
      adjustmentAmount: safeDelta,
      bonusAmount: 0,
      transactionId: `ADMIN-${Date.now()}`,
      qrisUrl: "",
      expiresAt: "",
      status: "admin_adjusted",
      type: "admin_adjustment",
      walletCredited: true,
      note:
        safeDelta > 0
          ? "Saldo ditambahkan oleh admin"
          : "Saldo dikurangi oleh admin",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      paidAt: serverTimestamp(),
    });
  });
}

// ── APK Mods ───────────────────────────────────────────────────
export async function getApkMods() {
  const q = query(collection(db, COLLECTIONS.APK_MODS), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as ApkMod[];
}

export async function getApkMod(id: string) {
  const snap = await getDoc(doc(db, COLLECTIONS.APK_MODS, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } as ApkMod : null;
}

export async function createApkMod(data: Omit<ApkMod, "id">) {
  const ref = await addDoc(collection(db, COLLECTIONS.APK_MODS), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateApkMod(id: string, data: Partial<ApkMod>) {
  await updateDoc(doc(db, COLLECTIONS.APK_MODS, id), data as Record<string, unknown>);
}

export async function deleteApkMod(id: string) {
  await deleteDoc(doc(db, COLLECTIONS.APK_MODS, id));
}

export function subscribeApkMods(cb: (items: ApkMod[]) => void): Unsubscribe {
  const q = query(collection(db, COLLECTIONS.APK_MODS), orderBy("createdAt", "desc"));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ApkMod[]);
  });
}