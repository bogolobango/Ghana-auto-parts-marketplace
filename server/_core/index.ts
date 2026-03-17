import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import helmet from "helmet";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { logger } from "../logger";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: false, // Let Vite handle CSP in dev
    crossOriginEmbedderPolicy: false, // Allow image loading from external CDNs
  }));

  // Body parser with reasonable size limit (base64 images ~7MB raw = ~10MB encoded)
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // CSRF protection: require custom header on state-changing API requests
  app.use("/api/trpc", (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
      const csrfHeader = req.headers["x-trpc-source"];
      if (!csrfHeader) {
        res.status(403).json({ error: "Missing CSRF header" });
        return;
      }
    }
    next();
  });

  // Request logging (non-static routes only)
  app.use("/api", (req, _res, next) => {
    logger.debug("API request", { method: req.method, path: req.path });
    next();
  });

  // Dynamic sitemap for SEO
  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const { getDb } = await import("../db");
      const { products, categories, vendors } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      const baseUrl = "https://v0-voom-ghana-marketplace.vercel.app";

      let urls = [
        { loc: "/", priority: "1.0", changefreq: "daily" },
        { loc: "/products", priority: "0.9", changefreq: "daily" },
        { loc: "/vendors", priority: "0.8", changefreq: "weekly" },
        { loc: "/categories", priority: "0.7", changefreq: "weekly" },
        { loc: "/vendor/register", priority: "0.6", changefreq: "monthly" },
      ];

      if (db) {
        // Add product pages
        const activeProducts = await db.select({ id: products.id, updatedAt: products.updatedAt })
          .from(products).where(eq(products.status, "active")).limit(5000);
        activeProducts.forEach(p => {
          urls.push({ loc: `/products/${p.id}`, priority: "0.8", changefreq: "weekly" });
        });

        // Add vendor pages
        const approvedVendors = await db.select({ id: vendors.id })
          .from(vendors).where(eq(vendors.status, "approved"));
        approvedVendors.forEach(v => {
          urls.push({ loc: `/vendors/${v.id}`, priority: "0.7", changefreq: "weekly" });
        });
      }

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${baseUrl}${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

      res.set("Content-Type", "application/xml");
      res.send(xml);
    } catch (error) {
      res.status(500).send("Error generating sitemap");
    }
  });

  // Paystack webhook (needs raw body for signature verification)
  app.post("/api/paystack/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    try {
      const { validateWebhookSignature } = await import("../paystack");
      const { updateOrderPaymentStatus, getOrderByPaymentReference, createNotification, getOrderById } = await import("../db");

      const signature = req.headers["x-paystack-signature"] as string;
      const body = req.body.toString();

      if (!signature || !validateWebhookSignature(body, signature)) {
        res.status(401).json({ error: "Invalid signature" });
        return;
      }

      const event = JSON.parse(body);
      if (event.event === "charge.success") {
        const { reference } = event.data;
        const order = await getOrderByPaymentReference(reference);
        if (order) {
          await updateOrderPaymentStatus(order.id, "paid", reference);
          // Notify buyer
          await createNotification({
            userId: order.userId,
            title: "Payment Confirmed",
            message: `Payment for order ${order.orderNumber} has been confirmed. Amount: GH₵${order.totalAmount}`,
            type: "order",
            link: "/orders",
          });
        }
      }

      res.status(200).json({ received: true });
    } catch (error) {
      logger.error("Paystack webhook error", { error: String(error) });
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    logger.info("Server started", { port, env: process.env.NODE_ENV || "development" });
  });
}

startServer().catch((err) => {
  logger.error("Server failed to start", { error: String(err) });
  process.exit(1);
});
