/* All calls go through our API server proxy to avoid CORS issues */

import { getSettings } from "./firestore";

const API_BASE = "/api/payment/qris";

export interface QrisResponse {
  success?: boolean;
  status?: boolean;
  data?: {
    depositId?: string;
    uniqueCode?: number;
    amount?: number;
    totalAmount?: number;
    balance?: number;
    getAmount?: number;
    qrImage?: string;
    qrString?: string;
    status?: string;
    expiredAt?: string;
    message?: string;
  };
  message?: string;
}

async function getApiKey(): Promise<string> {
  try {
    const settings = (await getSettings()) as Record<string, unknown>;
    return String(settings?.qrisApiKey || "").trim();
  } catch (err) {
    console.error("GET QRIS API KEY ERROR:", err);
    return "";
  }
}

export async function createQrisPayment(amount: number): Promise<QrisResponse> {
  try {
    const apiKey = await getApiKey();

    console.log("CREATE QRIS REQUEST:", {
      amount,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey.length,
      url: `${API_BASE}/create`,
    });

    const res = await fetch(`${API_BASE}/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-qris-api-key": apiKey } : {}),
      },
      body: JSON.stringify({ amount }),
    });

    console.log("CREATE QRIS HTTP STATUS:", res.status);

    const data = (await res.json()) as QrisResponse;

    console.log("CREATE QRIS RESPONSE:", data);

    return data;
  } catch (err) {
    console.error("CREATE QRIS ERROR:", err);

    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Gagal membuat QRIS. Coba lagi.",
    };
  }
}

export type DepositStatus =
  | "success"
  | "paid"
  | "completed"
  | "berhasil"
  | "sukses"
  | "settlement"
  | "already"
  | "pending"
  | "failed"
  | "expired"
  | "cancelled";

function normalizeDepositStatus(data: Record<string, unknown>): DepositStatus {
  const rawStatus =
    (data?.data as Record<string, unknown> | undefined)?.status ??
    (data?.data as Record<string, unknown> | undefined)?.paymentStatus ??
    (data?.data as Record<string, unknown> | undefined)?.depositStatus ??
    data?.statusText ??
    data?.paymentStatus ??
    data?.depositStatus ??
    data?.message ??
    "pending";

  const status = String(rawStatus).toLowerCase().trim();

  if (
    [
      "success",
      "paid",
      "completed",
      "berhasil",
      "sukses",
      "settlement",
      "settled",
      "already",
    ].includes(status)
  ) {
    return status === "settled" ? "settlement" : (status as DepositStatus);
  }

  if (
    ["failed", "fail", "error", "expired", "cancelled", "canceled"].includes(
      status,
    )
  ) {
    return status === "fail" || status === "error"
      ? "failed"
      : status === "canceled"
        ? "cancelled"
        : (status as DepositStatus);
  }

  return "pending";
}

export function isDepositSuccess(status?: string): boolean {
  return [
    "success",
    "paid",
    "completed",
    "berhasil",
    "sukses",
    "settlement",
    "already",
  ].includes(String(status || "").toLowerCase().trim());
}

export async function checkDepositStatus(
  depositId: string,
): Promise<{ ok: boolean; status?: DepositStatus; raw?: unknown }> {
  try {
    const apiKey = await getApiKey();

    const res = await fetch(`${API_BASE}/status/${depositId}`, {
      headers: apiKey ? { "x-qris-api-key": apiKey } : {},
    });

    const data = await res.json();
    const status = normalizeDepositStatus(data as Record<string, unknown>);

    return {
      ok:
        (data as Record<string, unknown>)?.status === true ||
        (data as Record<string, unknown>)?.success === true ||
        res.ok,
      status,
      raw: data,
    };
  } catch (err) {
    console.error("CHECK QRIS STATUS ERROR:", err);
    return { ok: false };
  }
}