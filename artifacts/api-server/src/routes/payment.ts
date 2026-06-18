import { Router, type IRouter } from "express";

const router: IRouter = Router();

const RAMASHOP_BASE = "https://ramashop.my.id/api/public";

function getApiKey(reqHeader?: string): string {
  return (
    reqHeader?.trim() ||
    process.env["RAMASHOP_API_KEY"] ||
    process.env["VITE_RAMASHOP_API_KEY"] ||
    ""
  );
}

function pickString(data: unknown, keys: string[]): string {
  if (!data || typeof data !== "object") return "";

  const obj = data as Record<string, unknown>;

  for (const key of keys) {
    const value = obj[key];

    if (value !== undefined && value !== null && value !== "") {
      return String(value);
    }
  }

  return "";
}

function classifyError(
  status: number,
  body: unknown,
  resolvedKey?: string,
): { userMsg: string; logMsg: string } {
  const raw =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  const msg = String(raw["message"] || raw["error"] || raw["msg"] || "");

  if (!resolvedKey) {
    return {
      userMsg: "API Key QRIS belum dikonfigurasi. Set di Admin → Pengaturan.",
      logMsg: "Missing API key",
    };
  }

  if (status === 401 || status === 403) {
    return {
      userMsg:
        "API Key tidak valid atau tidak memiliki akses. Periksa Admin → Pengaturan.",
      logMsg: `Auth error ${status}: ${msg}`,
    };
  }

  if (
    status === 402 ||
    msg.toLowerCase().includes("balance") ||
    msg.toLowerCase().includes("saldo")
  ) {
    return {
      userMsg: "Saldo RamaShop tidak cukup. Hubungi admin untuk top-up.",
      logMsg: `Insufficient balance: ${msg}`,
    };
  }

  if (status === 404) {
    return {
      userMsg: "Endpoint QRIS tidak ditemukan. Hubungi admin.",
      logMsg: "404 endpoint not found",
    };
  }

  if (status === 422 || status === 400) {
    return {
      userMsg: msg || "Parameter tidak valid. Coba lagi.",
      logMsg: `Validation error ${status}: ${msg}`,
    };
  }

  if (status >= 500) {
    return {
      userMsg:
        msg || "Server pembayaran sedang gangguan. Coba lagi nanti.",
      logMsg: `Upstream 5xx ${status}: ${msg}`,
    };
  }

  return {
    userMsg: msg || "Gagal membuat QRIS. Coba lagi.",
    logMsg: `HTTP ${status}: ${msg}`,
  };
}

async function readResponse(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!text) {
    return {
      success: false,
      message: "Response kosong dari server pembayaran.",
    };
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return {
        success: false,
        message: `JSON tidak valid: ${text.slice(0, 160)}`,
      };
    }
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      message: text.slice(0, 160),
    };
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 20000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function normalizeCreateResponse(data: unknown): Record<string, unknown> {
  const root =
    typeof data === "object" && data !== null
      ? (data as Record<string, unknown>)
      : {};

  const inner =
    root["data"] && typeof root["data"] === "object"
      ? (root["data"] as Record<string, unknown>)
      : root;

  const depositId = pickString(inner, [
    "depositId",
    "deposit_id",
    "id",
    "transaction_id",
    "transactionId",
    "trx_id",
    "trxId",
  ]);

  const qrImage = pickString(inner, [
    "qrImage",
    "qr_image",
    "qr_url",
    "qrUrl",
    "qris_url",
    "qrisUrl",
    "image",
    "image_url",
  ]);

  const qrString = pickString(inner, [
    "qrString",
    "qr_string",
    "qris_string",
    "qrisString",
    "qris",
    "qr",
  ]);

  const expiredAt = pickString(inner, [
    "expiredAt",
    "expired_at",
    "expiresAt",
    "expires_at",
    "timeout",
  ]);

  return {
    ...root,
    success: root["success"] !== false,
    data: {
      ...inner,
      depositId,
      deposit_id: depositId,
      qrImage,
      qr_image: qrImage,
      qrString,
      qr_string: qrString,
      expiredAt,
      expired_at: expiredAt,
    },
  };
}

router.post("/payment/qris/create", async (req, res) => {
  const apiKey = getApiKey(req.headers["x-qris-api-key"] as string | undefined);

  if (!apiKey) {
    res.status(400).json({
      success: false,
      message:
        "API Key QRIS belum dikonfigurasi. Set di Admin → Pengaturan.",
    });
    return;
  }

  const rawAmount = Number((req.body as { amount?: number | string }).amount);
  const amount = Math.round(rawAmount);

  if (!Number.isFinite(amount) || amount < 100) {
    res.status(400).json({
      success: false,
      message: "Jumlah minimal Rp 100.",
    });
    return;
  }

  try {
    console.log("QRIS CREATE REQUEST:", {
      amount,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey.length,
    });

    const jsonPayload = JSON.stringify({
      amount,
      method: "qris",
    });

    const upstream = await fetchWithTimeout(
      `${RAMASHOP_BASE}/deposit/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
          Authorization: `Bearer ${apiKey}`,
        },
        body: jsonPayload,
      },
    );

    const data = await readResponse(upstream);

    console.log("RAMASHOP CREATE RESPONSE:", {
      status: upstream.status,
      data,
    });

    if (!upstream.ok) {
      const { userMsg, logMsg } = classifyError(upstream.status, data, apiKey);

      console.error("RamaShop create deposit failed:", {
        status: upstream.status,
        logMsg,
        body: data,
      });

      res.status(upstream.status >= 500 ? 502 : upstream.status).json({
        success: false,
        message: userMsg,
        upstreamStatus: upstream.status,
      });
      return;
    }

    const normalized = normalizeCreateResponse(data);
    const normalizedData = normalized.data as Record<string, unknown>;

    const depositId = pickString(normalizedData, ["depositId", "deposit_id"]);
    const qrImage = pickString(normalizedData, ["qrImage", "qr_image"]);
    const qrString = pickString(normalizedData, ["qrString", "qr_string"]);

    if (!depositId || (!qrImage && !qrString)) {
      console.error("RamaShop create deposit invalid data:", normalized);

      res.status(502).json({
        success: false,
        message:
          "QRIS berhasil dibuat server, tapi data QR tidak lengkap. Coba lagi.",
        raw: normalized,
      });
      return;
    }

    res.status(200).json(normalized);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    console.error("RamaShop create deposit network error:", err);

    const isTimeout =
      msg.toLowerCase().includes("abort") ||
      msg.toLowerCase().includes("timeout") ||
      msg.toLowerCase().includes("etimedout");

    res.status(502).json({
      success: false,
      message: isTimeout
        ? "Koneksi ke server pembayaran timeout. Coba lagi."
        : "Gagal menghubungi server pembayaran. Periksa koneksi.",
    });
  }
});

router.get("/payment/qris/status/:depositId", async (req, res) => {
  const apiKey = getApiKey(req.headers["x-qris-api-key"] as string | undefined);

  if (!apiKey) {
    res.status(400).json({
      success: false,
      message: "API Key QRIS belum dikonfigurasi.",
    });
    return;
  }

  const { depositId } = req.params;

  if (!depositId || depositId.trim() === "") {
    res.status(400).json({
      success: false,
      message: "depositId wajib diisi.",
    });
    return;
  }

  try {
    const upstream = await fetchWithTimeout(
      `${RAMASHOP_BASE}/deposit/status/${encodeURIComponent(depositId)}`,
      {
        method: "GET",
        headers: {
          "X-API-Key": apiKey,
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    const data = await readResponse(upstream);

    console.log("RAMASHOP STATUS RESPONSE:", {
      depositId,
      status: upstream.status,
      data,
    });

    if (!upstream.ok) {
      const { userMsg, logMsg } = classifyError(upstream.status, data, apiKey);

      console.error("RamaShop status check failed:", {
        status: upstream.status,
        logMsg,
        depositId,
        body: data,
      });

      res.status(upstream.status >= 500 ? 502 : upstream.status).json({
        success: false,
        message: userMsg,
      });
      return;
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("RamaShop check status network error:", err);

    res.status(502).json({
      success: false,
      message: "Gagal cek status pembayaran.",
    });
  }
});

export default router;
