const BASE = "/api/nokos";

async function apiGet(path: string) {
  const res = await fetch(`${BASE}${path}`);
  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || json.message || "API error");
  }

  return json;
}

async function apiPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || json.message || "API error");
  }

  return json;
}

export async function getNokosBalance() {
  const r = await apiGet("/balance");
  return r.data as Record<string, unknown>;
}

export async function getNokosServices() {
  const r = await apiGet("/services");
  return r.data as unknown;
}

export async function getNokosCountries() {
  const r = await apiGet("/countries");
  return r.data as unknown;
}

export async function getNokosPrices(
  service: string,
  country: string,
  server?: string,
) {
  const params = new URLSearchParams({ service, country });

  if (server) {
    params.set("server", server);
  }

  const r = await apiGet(`/prices?${params.toString()}`);
  return r.data as unknown;
}

export async function placeNokosOrder(
  service: string,
  country: string,
  server: string,
  operator?: string,
) {
  const r = await apiPost("/order", {
    service,
    country,
    server,
    ...(operator ? { operator } : {}),
  });

  return r.data as Record<string, unknown>;
}

export async function getNokosOtp(activationId: string) {
  const r = await apiGet(`/otp/${encodeURIComponent(activationId)}`);
  return r.data as Record<string, unknown>;
}

export async function cancelNokosOrder(activationId: string) {
  const r = await apiPost(`/cancel/${encodeURIComponent(activationId)}`, {});
  return r.data as Record<string, unknown>;
}

export async function createNokosDeposit(amount: number) {
  const r = await apiPost("/create-deposit", {
    amount: String(amount),
  });

  return r.data as Record<string, unknown>;
}

export async function checkNokosDeposit(transactionId: string) {
  const r = await apiGet(
    `/check-deposit?transaction_id=${encodeURIComponent(transactionId)}`,
  );

  return r.data as Record<string, unknown>;
}

export async function syncNokosBalance() {
  const r = await apiPost("/sync-balance", {});
  return r.data as Record<string, unknown>;
}

// ─── Extractor helpers ─────────────────────────────────────────

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const cleaned = value
      .replace(/[^\d.,-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function unwrapData(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;

  const obj = data as Record<string, unknown>;

  if (obj.data !== undefined) return unwrapData(obj.data);
  if (obj.result !== undefined) return unwrapData(obj.result);
  if (obj.response !== undefined) return unwrapData(obj.response);

  return data;
}

function findDeepValue(source: unknown, keys: string[]): unknown {
  if (!source || typeof source !== "object") return undefined;

  const obj = source as Record<string, unknown>;

  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      return obj[key];
    }
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const found = findDeepValue(value, keys);

      if (found !== undefined && found !== null && found !== "") {
        return found;
      }
    }
  }

  return undefined;
}

function readIdrPrice(entry: Record<string, unknown>): number {
  const directIdr = toNumber(
    entry.price_idr ??
      entry.priceIdr ??
      entry.harga_idr ??
      entry.hargaIdr ??
      entry.cost_idr ??
      entry.costIdr ??
      entry.idr ??
      entry.priceIDR ??
      entry.harga ??
      entry.price_rupiah ??
      entry.rupiah,
  );

  if (directIdr > 0) return Math.ceil(directIdr);

  const formatted = String(
    entry.priceFormatted ??
      entry.formatted_price ??
      entry.formattedPrice ??
      entry.price_text ??
      entry.priceText ??
      entry.display_price ??
      entry.displayPrice ??
      entry.label_price ??
      "",
  );

  if (formatted.includes("Rp") || formatted.toLowerCase().includes("idr")) {
    const parsed = toNumber(formatted);
    if (parsed > 0) return Math.ceil(parsed);
  }

  const rawCost = toNumber(entry.cost ?? entry.price ?? entry.amount);

  if (rawCost >= 100) return Math.ceil(rawCost);

  const fallbackUsdtToIdr = 17708;
  return Math.ceil(rawCost * fallbackUsdtToIdr);
}

export function extractBalance(data: Record<string, unknown>): number {
  const inner = unwrapData(data) as Record<string, unknown>;

  return toNumber(
    inner.balance ??
      inner.saldo ??
      inner.amount ??
      inner.wallet ??
      inner.total ??
      0,
  );
}

export function extractServices(
  data: unknown,
): Array<{ id: string; name: string }> {
  const inner = unwrapData(data);

  if (Array.isArray(inner)) {
    return inner
      .map((s: Record<string, unknown>) => ({
        id: String(s.code ?? s.id ?? s.service ?? s.short_name ?? ""),
        name: String(s.name ?? s.title ?? s.service_name ?? s.code ?? ""),
      }))
      .filter((s) => s.id && s.name);
  }

  if (inner && typeof inner === "object") {
    const obj = inner as Record<string, unknown>;
    const nested = obj.services ?? obj.items ?? obj.list ?? null;

    if (nested !== null) return extractServices(nested);

    const values = Object.values(obj);

    if (
      values.length > 0 &&
      typeof values[0] === "object" &&
      values[0] !== null
    ) {
      return values
        .map((s) => {
          const item = s as Record<string, unknown>;

          return {
            id: String(item.code ?? item.id ?? item.service ?? ""),
            name: String(item.name ?? item.title ?? item.code ?? ""),
          };
        })
        .filter((s) => s.id && s.name);
    }
  }

  return [];
}

export function extractCountries(
  data: unknown,
): Array<{ id: string; name: string }> {
  const inner = unwrapData(data);

  if (Array.isArray(inner)) {
    return inner
      .map((c: Record<string, unknown>) => ({
        id: String(c.id ?? c.code ?? c.country ?? ""),
        name: String(c.name ?? c.title ?? c.country_name ?? ""),
      }))
      .filter((c) => c.id && c.name);
  }

  if (inner && typeof inner === "object") {
    const obj = inner as Record<string, unknown>;
    const nested = obj.countries ?? obj.items ?? obj.list ?? null;

    if (nested !== null) return extractCountries(nested);

    return Object.entries(obj)
      .map(([id, val]) => ({
        id,
        name:
          typeof val === "string"
            ? val
            : val && typeof val === "object"
              ? String((val as Record<string, unknown>).name ?? id)
              : String(val),
      }))
      .filter(
        (c) =>
          c.id &&
          c.name &&
          !["success", "error", "message", "status"].includes(c.id),
      );
  }

  return [];
}

export interface PriceInfo {
  server: string;
  serverLabel: string;
  cost: number;
  count: number;
  markup: number;
}

export function extractPrices(
  data: unknown,
  service: string,
  country: string,
): PriceInfo[] {
  const results: PriceInfo[] = [];
  const root =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};

  const markup = toNumber(root.markup ?? root.fee ?? root.percent ?? 0);

  function detectServer(obj: Record<string, unknown>): {
    server: string;
    serverLabel: string;
  } {
    const rawServer = String(
      obj.server ??
        obj.provider ??
        obj.type ??
        obj.name ??
        obj.server_name ??
        obj.serverName ??
        "",
    ).toLowerCase();

    if (
      rawServer.includes("s1") ||
      rawServer.includes("express") ||
      rawServer.includes("server 1")
    ) {
      return {
        server: "s1",
        serverLabel: "Server Express (s1)",
      };
    }

    return {
      server: "s2",
      serverLabel: "Server Plus (s2)",
    };
  }

  function pushEntry(
    entry: Record<string, unknown>,
    fallbackServer: string,
    fallbackLabel: string,
  ) {
    const cost = readIdrPrice(entry);
    const count = toNumber(
      entry.count ??
        entry.stock ??
        entry.available ??
        entry.qty ??
        entry.quantity ??
        0,
    );

    if (cost <= 0) return;

    results.push({
      server: fallbackServer,
      serverLabel: fallbackLabel,
      cost,
      count,
      markup,
    });
  }

  function dig(d: unknown, srv: string, srvLabel: string) {
    if (!d || typeof d !== "object") return;

    if (Array.isArray(d)) {
      d.forEach((item) => {
        if (!item || typeof item !== "object") return;

        const obj = item as Record<string, unknown>;
        const detected = detectServer(obj);

        const itemCountry = String(
          obj.country ??
            obj.country_id ??
            obj.countryId ??
            obj.country_code ??
            "",
        );

        const itemService = String(
          obj.service ??
            obj.service_id ??
            obj.serviceId ??
            obj.code ??
            "",
        );

        const sameCountry =
          !itemCountry ||
          itemCountry === String(country) ||
          itemCountry === String(Number(country));

        const sameService =
          !itemService ||
          itemService === String(service) ||
          itemService.toLowerCase() === String(service).toLowerCase();

        if (sameCountry && sameService) {
          pushEntry(obj, detected.server || srv, detected.serverLabel || srvLabel);
        } else {
          dig(obj, detected.server || srv, detected.serverLabel || srvLabel);
        }
      });

      return;
    }

    const obj = d as Record<string, unknown>;
    const detected = detectServer(obj);
    const currentServer = detected.server || srv;
    const currentLabel = detected.serverLabel || srvLabel;

    const byCountry =
      obj[country] ??
      obj[String(Number(country))] ??
      obj[String(country).toLowerCase()] ??
      null;

    if (byCountry && typeof byCountry === "object") {
      const countryObj = byCountry as Record<string, unknown>;

      const svcEntry =
        countryObj[service] ??
        countryObj[String(service).toLowerCase()] ??
        countryObj[String(service).toUpperCase()] ??
        null;

      if (svcEntry && typeof svcEntry === "object") {
        pushEntry(svcEntry as Record<string, unknown>, currentServer, currentLabel);
        return;
      }
    }

    const directService =
      obj[service] ??
      obj[String(service).toLowerCase()] ??
      obj[String(service).toUpperCase()] ??
      null;

    if (directService && typeof directService === "object") {
      pushEntry(directService as Record<string, unknown>, currentServer, currentLabel);
      return;
    }

    const hasPrice =
      obj.price !== undefined ||
      obj.cost !== undefined ||
      obj.amount !== undefined ||
      obj.harga !== undefined ||
      obj.price_idr !== undefined ||
      obj.priceIdr !== undefined;

    if (hasPrice) {
      pushEntry(obj, currentServer, currentLabel);
      return;
    }

    const nested =
      obj.data ??
      obj.prices ??
      obj.items ??
      obj.list ??
      obj.result ??
      obj.response ??
      null;

    if (nested) {
      dig(nested, currentServer, currentLabel);
    }
  }

  const inner =
    root.data ?? root.prices ?? root.items ?? root.result ?? root.response ?? root;

  dig(inner, "s2", "Server Plus (s2)");

  const unique = new Map<string, PriceInfo>();

  for (const item of results) {
    unique.set(item.server, item);
  }

  return Array.from(unique.values());
}

export function extractNokosPriceFromDocs(
  data: unknown,
  service: string,
  country: string,
  server: "s1" | "s2",
): PriceInfo | null {
  const root = unwrapData(data);

  if (!root || typeof root !== "object") return null;

  const obj = root as Record<string, unknown>;

  const countryData =
    obj[country] ??
    obj[String(Number(country))] ??
    obj[String(country).toLowerCase()];

  if (!countryData || typeof countryData !== "object") return null;

  const countryObj = countryData as Record<string, unknown>;

  const serviceData =
    countryObj[service] ??
    countryObj[String(service).toLowerCase()] ??
    countryObj[String(service).toUpperCase()];

  if (!serviceData || typeof serviceData !== "object") return null;

  const entry = serviceData as Record<string, unknown>;

  const cost = readIdrPrice(entry);

  const count = toNumber(
    entry.count ??
      entry.stock ??
      entry.available ??
      entry.qty ??
      entry.quantity ??
      0,
  );

  if (cost <= 0) return null;

  return {
    server,
    serverLabel: server === "s2" ? "Server Plus (s2)" : "Server Express (s1)",
    cost,
    count,
    markup: 0,
  };
}

export function extractOrderResult(data: Record<string, unknown>): {
  activationId: string;
  phone: string;
  price: number;
  expiresAt: string;
} {
  const root = unwrapData(data) as Record<string, unknown>;

  const rawString = JSON.stringify(root);

  const accessMatch = rawString.match(/ACCESS_NUMBER[:|](\d+)[:|](\d+)/i);

  const activationIdRaw =
    findDeepValue(root, [
      "activation_id",
      "activationId",
      "activationID",
      "activation",
      "activationid",
      "order_id",
      "orderId",
      "orderID",
      "orderid",
      "id",
      "sid",
      "request_id",
      "requestId",
      "requestID",
      "requestid",
      "transaction_id",
      "transactionId",
      "transactionID",
      "transactionid",
      "activationIdNumber",
    ]) ??
    accessMatch?.[1] ??
    "";

  const phoneRaw =
    findDeepValue(root, [
      "phone",
      "number",
      "phone_number",
      "phoneNumber",
      "phonenumber",
      "msisdn",
      "nomor",
      "no",
      "tel",
      "mobile",
    ]) ??
    accessMatch?.[2] ??
    "";

  const priceRaw = findDeepValue(root, [
    "price_idr",
    "priceIdr",
    "harga_idr",
    "hargaIdr",
    "cost_idr",
    "costIdr",
    "idr",
    "priceIDR",
    "harga",
    "price_rupiah",
    "rupiah",
    "cost",
    "price",
    "amount",
  ]);

  const price =
    priceRaw !== undefined
      ? readIdrPrice({ price: priceRaw })
      : readIdrPrice(root);

  const expiresAtRaw =
    findDeepValue(root, [
      "expires_at",
      "expiresAt",
      "expired_at",
      "expiredAt",
      "expire_at",
      "expireAt",
      "expire_time",
      "expireTime",
      "expired_time",
      "expiredTime",
      "timeout",
      "end_time",
      "endTime",
      "valid_until",
      "validUntil",
      "cancel_at",
      "cancelAt",
    ]) ?? "";

  return {
    activationId: String(activationIdRaw || ""),
    phone: String(phoneRaw || ""),
    price,
    expiresAt: String(expiresAtRaw || ""),
  };
}

export function extractOtp(data: Record<string, unknown>): {
  otp: string | null;
  status: string;
  sms: string | null;
} {
  const inner = unwrapData(data) as Record<string, unknown>;

  const rawString = JSON.stringify(inner);

  const status = String(
    findDeepValue(inner, [
      "status",
      "sms_status",
      "smsStatus",
      "smsstatus",
      "state",
    ]) ?? "",
  ).toLowerCase();

  const smsRaw =
    findDeepValue(inner, [
      "sms",
      "message",
      "text",
      "full_sms",
      "fullSms",
      "fullsms",
      "code_text",
      "codeText",
      "codetext",
    ]) ?? null;

  const sms = smsRaw ? String(smsRaw) : null;

  const directOtp = String(
    findDeepValue(inner, ["code", "otp", "sms_code", "smsCode", "pin"]) ?? "",
  );

  const otpFromSms = sms?.match(/\b\d{4,8}\b/)?.[0] ?? null;
  const otpFromRaw = rawString.match(/\b\d{4,8}\b/)?.[0] ?? null;

  const otp = directOtp || otpFromSms || otpFromRaw || null;

  return {
    otp,
    status: status || "waiting",
    sms,
  };
}

export function extractDepositResult(data: Record<string, unknown>): {
  transactionId: string;
  qrisUrl: string;
  amount: number;
  expiresAt: string;
  bonusPercent: number;
  bonusAmount: number;
} {
  const inner = unwrapData(data) as Record<string, unknown>;

  return {
    transactionId: String(
      findDeepValue(inner, [
        "transaction_id",
        "transactionId",
        "transactionID",
        "id",
        "deposit_id",
        "depositId",
      ]) ?? "",
    ),
    qrisUrl: String(
      findDeepValue(inner, [
        "qris_url",
        "qrisUrl",
        "qr_url",
        "qrUrl",
        "qrImage",
        "qr_image",
      ]) ?? "",
    ),
    amount: toNumber(
      findDeepValue(inner, ["amount", "nominal", "total"]) ?? 0,
    ),
    expiresAt: String(
      findDeepValue(inner, [
        "expires_at",
        "expiresAt",
        "expired_at",
        "expiredAt",
      ]) ?? "",
    ),
    bonusPercent: toNumber(
      findDeepValue(inner, ["bonus_percent", "bonusPercent"]) ?? 0,
    ),
    bonusAmount: toNumber(
      findDeepValue(inner, ["bonus_amount", "bonusAmount"]) ?? 0,
    ),
  };
}

export function extractDepositStatus(data: Record<string, unknown>): {
  transactionId: string;
  status: string;
  paidAt: string | null;
} {
  const inner = unwrapData(data) as Record<string, unknown>;

  const paidAt = findDeepValue(inner, ["paid_at", "paidAt"]);

  return {
    transactionId: String(
      findDeepValue(inner, [
        "transaction_id",
        "transactionId",
        "transactionID",
        "id",
        "deposit_id",
        "depositId",
      ]) ?? "",
    ),
    status: String(findDeepValue(inner, ["status"]) ?? "pending"),
    paidAt: paidAt ? String(paidAt) : null,
  };
}