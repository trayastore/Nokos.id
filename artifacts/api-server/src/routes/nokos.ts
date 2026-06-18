import { Router, type Request, type Response, type IRouter } from "express";
import crypto from "crypto";
import { nokosGet, nokosPost } from "../lib/nokos";

const router: IRouter = Router();

// GET /api/nokos/balance
router.get("/balance", async (_req: Request, res: Response) => {
  try {
    const data = await nokosGet("getBalance");
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Internal Server Error",
    });
  }
});

// GET /api/nokos/services
router.get("/services", async (_req: Request, res: Response) => {
  try {
    const data = await nokosGet("getServices");
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Internal Server Error",
    });
  }
});

// GET /api/nokos/countries
router.get("/countries", async (_req: Request, res: Response) => {
  try {
    const data = await nokosGet("getCountries");
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Internal Server Error",
    });
  }
});

// GET /api/nokos/prices?service=wa&country=6&server=s2
router.get("/prices", async (req: Request, res: Response) => {
  try {
    const { service, country, server } = req.query as Record<string, string>;

    if (!service || !country) {
      res.status(400).json({
        success: false,
        error: "Parameter 'service' dan 'country' wajib diisi",
      });
      return;
    }

    const params: Record<string, string> = {
      service: String(service),
      country: String(country),
    };

    if (server) {
      params.server = String(server);
    }

    const data = await nokosGet("getPrices", params);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Internal Server Error",
    });
  }
});

// GET /api/nokos/availability?service=wa&country=6&server=s2
router.get("/availability", async (req: Request, res: Response) => {
  try {
    const { service, country, server } = req.query as Record<string, string>;

    if (!service) {
      res.status(400).json({
        success: false,
        error: "Parameter 'service' wajib diisi",
      });
      return;
    }

    const params: Record<string, string> = {
      service: String(service),
    };

    if (country) {
      params.country = String(country);
    }

    if (server) {
      params.server = String(server);
    }

    const data = await nokosGet("getAvailability", params);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Internal Server Error",
    });
  }
});

// POST /api/nokos/order
router.post("/order", async (req: Request, res: Response) => {
  try {
    const { service, country, operator, server } =
      req.body as Record<string, string>;

    if (!service || !country) {
      res.status(400).json({
        success: false,
        error: "Parameter 'service' dan 'country' wajib diisi",
      });
      return;
    }

    const body: Record<string, string> = {
      service: String(service),
      country: String(country),
      server: server ? String(server) : "s2",
      operator: operator ? String(operator) : "any",
    };

    console.log("NOKOS ORDER PAYLOAD:", body);

    const data = await nokosPost("getNumber", body);

    console.log("NOKOS ORDER RESPONSE:", JSON.stringify(data, null, 2));

    const rawText = JSON.stringify(data);

    const hasActivationId =
      rawText.includes("ACCESS_NUMBER") ||
      rawText.includes("activation_id") ||
      rawText.includes("activationId") ||
      rawText.includes("order_id") ||
      rawText.includes("orderId");

    const errorMessage =
      typeof data === "string"
        ? data
        : data && typeof data === "object"
          ? String(
              (data as Record<string, unknown>).error ??
                (data as Record<string, unknown>).message ??
                (data as Record<string, unknown>).msg ??
                (data as Record<string, unknown>).status ??
                "",
            )
          : "";

    if (!hasActivationId) {
      res.status(400).json({
        success: false,
        error:
          errorMessage && errorMessage !== "true"
            ? `Order gagal: ${errorMessage}`
            : "Order gagal: negara/server/operator ini tidak tersedia atau stok kosong",
        data,
      });
      return;
    }

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("NOKOS ORDER ERROR:", err);

    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Internal Server Error",
    });
  }
});

// GET /api/nokos/status/:activationId
router.get("/status/:activationId", async (req: Request, res: Response) => {
  try {
    const data = await nokosGet("getStatus", {
      id: String(req.params.activationId),
    });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Internal Server Error",
    });
  }
});

// GET /api/nokos/otp/:activationId
router.get("/otp/:activationId", async (req: Request, res: Response) => {
  try {
    const data = await nokosGet("getStatus", {
      id: String(req.params.activationId),
    });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Internal Server Error",
    });
  }
});

// POST /api/nokos/cancel/:activationId
router.post("/cancel/:activationId", async (req: Request, res: Response) => {
  try {
    const data = await nokosPost("cancelActivation", {
      id: String(req.params.activationId),
    });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Internal Server Error",
    });
  }
});

// POST /api/nokos/set-status/:activationId
router.post("/set-status/:activationId", async (req: Request, res: Response) => {
  try {
    const { status } = req.body as Record<string, string>;

    if (!status) {
      res.status(400).json({
        success: false,
        error: "Parameter 'status' wajib diisi",
      });
      return;
    }

    const data = await nokosPost("setStatus", {
      id: String(req.params.activationId),
      status: String(status),
    });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Internal Server Error",
    });
  }
});

// POST /api/nokos/create-deposit
router.post("/create-deposit", async (req: Request, res: Response) => {
  try {
    const { amount } = req.body as Record<string, string>;

    if (!amount) {
      res.status(400).json({
        success: false,
        error: "Parameter 'amount' wajib diisi",
      });
      return;
    }

    const data = await nokosPost("createDeposit", {
      amount: String(amount),
    });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Internal Server Error",
    });
  }
});

// GET /api/nokos/check-deposit?transaction_id=DPS-...
router.get("/check-deposit", async (req: Request, res: Response) => {
  try {
    const { transaction_id } = req.query as Record<string, string>;

    if (!transaction_id) {
      res.status(400).json({
        success: false,
        error: "Parameter 'transaction_id' wajib diisi",
      });
      return;
    }

    const data = await nokosGet("checkDeposit", {
      transaction_id: String(transaction_id),
    });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Internal Server Error",
    });
  }
});

// GET /api/nokos/history?limit=20&offset=0&status=
router.get("/history", async (req: Request, res: Response) => {
  try {
    const { limit, offset, status } = req.query as Record<string, string>;

    const params: Record<string, string> = {
      limit: limit || "20",
      offset: offset || "0",
    };

    if (status) {
      params.status = String(status);
    }

    const data = await nokosGet("getHistory", params);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Internal Server Error",
    });
  }
});

// POST /api/nokos/sync-balance
router.post("/sync-balance", async (_req: Request, res: Response) => {
  try {
    const data = await nokosGet("getBalance");

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Internal Server Error",
    });
  }
});

// POST /api/nokos/webhook
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const secret = process.env.NOKOS_WEBHOOK_SECRET;

    if (!secret) {
      res.status(500).json({
        success: false,
        error: "NOKOS_WEBHOOK_SECRET belum diatur",
      });
      return;
    }

    const signature = req.header("X-Webhook-Signature");

    if (!signature) {
      res.status(401).json({
        success: false,
        error: "Missing X-Webhook-Signature",
      });
      return;
    }

    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;

    if (!rawBody) {
      res.status(500).json({
        success: false,
        error: "Raw body tidak tersedia. Cek app.ts",
      });
      return;
    }

    const expectedHash = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const expectedSignature = `sha256=${expectedHash}`;

    const isValid =
      signature.length === expectedSignature.length &&
      crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );

    if (!isValid) {
      res.status(401).json({
        success: false,
        error: "Invalid webhook signature",
      });
      return;
    }

    console.log("NOKOS WEBHOOK VALID:", req.body);

    res.json({
      success: true,
      message: "Webhook received",
      data: req.body,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Internal Server Error",
    });
  }
});

export default router;