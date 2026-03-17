import "dotenv/config";
import express from "express";
import helmet from "helmet";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { logger } from "../server/logger";
import uploadRoutes from "../server/upload-routes";

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

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

app.get("/api/sitemap.xml", async (_req, res) => {
  try {
    const { getDb } = await import("../server/db");
    const { products, vendors } = await import("../drizzle/schema");
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
      const activeProducts = await db.select({ id: products.id })
        .from(products).where(eq(products.status, "active")).limit(5000);
      activeProducts.forEach(p => {
        urls.push({ loc: `/products/${p.id}`, priority: "0.8", changefreq: "weekly" });
      });

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

app.get("/api/robots.txt", (_req, res) => {
  res.set("Content-Type", "text/plain");
  res.send(`User-agent: *
Allow: /
Sitemap: https://v0-voom-ghana-marketplace.vercel.app/sitemap.xml
`);
});

app.post("/api/paystack/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const { validateWebhookSignature } = await import("../server/paystack");
    const { updateOrderPaymentStatus, getOrderByPaymentReference, createNotification } = await import("../server/db");

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

app.use("/api/upload", uploadRoutes);

registerOAuthRoutes(app);

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

export default app;
