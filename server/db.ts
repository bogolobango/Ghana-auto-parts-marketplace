import { eq, and, desc, asc, sql, or, gte, lte, inArray } from "drizzle-orm";
import { buildTsQuery, expandForLike } from "./search-synonyms";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  InsertUser, users, vendors, InsertVendor, products, InsertProduct,
  categories, cartItems, orders, orderItems, reviews, notifications, otpCodes, waitlist,
  wishlists, rateLimits,
  type Vendor, type Product, type Category, type Order
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  const dbUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  if (!_db && dbUrl) {
    try {
      const pool = new Pool({
        connectionString: dbUrl,
        ssl: process.env.SUPABASE_DATABASE_URL ? { rejectUnauthorized: false } : undefined,
        max: 10,                  // up to 10 concurrent connections
        idleTimeoutMillis: 30000, // release idle connections after 30 s
        connectionTimeoutMillis: 5000,
      });
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── User Helpers ───
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod", "phone"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    (values as any)[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function setUserPasswordHash(openId: string, passwordHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ passwordHash }).where(eq(users.openId, openId));
}

export async function getUserByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── OTP Helpers ───
export async function createOtp(phone: string, code: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await db.insert(otpCodes).values({ phone, code, expiresAt });
}

export async function getValidOtp(phone: string, code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const now = new Date();
  const result = await db.select().from(otpCodes)
    .where(and(
      eq(otpCodes.phone, phone),
      eq(otpCodes.code, code),
      eq(otpCodes.used, false),
      gte(otpCodes.expiresAt, now),
    ))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function markOtpUsed(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, id));
}

// ─── Category Helpers ───
export async function getCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).orderBy(asc(categories.name));
}

export async function createCategory(data: { name: string; slug: string; icon?: string; parentId?: number }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(categories).values(data);
}

// ─── Vendor Helpers ───
export async function createVendor(data: InsertVendor) {
  const db = await getDb();
  if (!db) return;
  const [result] = await db.insert(vendors).values(data).returning({ id: vendors.id });
  return result;
}

export async function getVendorByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(vendors).where(eq(vendors.userId, userId)).limit(1);
  return result[0];
}

export async function getVendorById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1);
  return result[0];
}

export async function getApprovedVendors() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vendors).where(eq(vendors.status, "approved")).orderBy(desc(vendors.createdAt));
}

export async function getAllVendors() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vendors).orderBy(desc(vendors.createdAt));
}

export async function updateVendorStatus(id: number, status: "pending" | "approved" | "rejected" | "suspended") {
  const db = await getDb();
  if (!db) return;
  await db.update(vendors).set({ status }).where(eq(vendors.id, id));
}

export async function updateVendor(id: number, data: Partial<InsertVendor>) {
  const db = await getDb();
  if (!db) return;
  await db.update(vendors).set(data).where(eq(vendors.id, id));
}

// ─── Product Helpers ───
export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) return;
  const [result] = await db.insert(products).values(data).returning({ id: products.id });
  return result;
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result[0];
}

export async function incrementProductViews(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`UPDATE products SET views = views + 1 WHERE id = ${id}`);
}

export async function updateProduct(id: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) return;
  await db.update(products).set(data).where(eq(products.id, id));
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(products).where(eq(products.id, id));
}

export async function getVendorProducts(vendorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(eq(products.vendorId, vendorId)).orderBy(desc(products.createdAt));
}

// ── Stored tsvector column (maintained by DB trigger, GIN-indexed) ────────────
// Use the persisted search_vector column for all FTS queries — this hits the
// GIN index instead of computing to_tsvector() from scratch on every row.
const toTsQuery = (q: string) => sql.raw(`to_tsquery('english', '${q.replace(/'/g, "''")}')`);
const tsRank = (q: string) => sql`ts_rank_cd(products.search_vector, ${toTsQuery(q)})`;
const tsMatch = (q: string) => sql`products.search_vector @@ ${toTsQuery(q)}`;

export type ProductWithVendor = Product & { vendorWhatsapp?: string | null; vendorName?: string };

async function enrichWithVendorData(items: Product[], dbConn: ReturnType<typeof drizzle>): Promise<ProductWithVendor[]> {
  if (items.length === 0) return items;
  const vendorIds = Array.from(new Set(items.map(p => p.vendorId)));
  const vendorRows = await dbConn
    .select({ id: vendors.id, whatsapp: vendors.whatsapp, businessName: vendors.businessName })
    .from(vendors)
    .where(inArray(vendors.id, vendorIds));
  const vendorMap = new Map(vendorRows.map(v => [v.id, v]));
  return items.map(p => ({
    ...p,
    vendorWhatsapp: vendorMap.get(p.vendorId)?.whatsapp ?? undefined,
    vendorName: vendorMap.get(p.vendorId)?.businessName ?? undefined,
  }));
}

export async function searchProducts(filters: {
  search?: string;
  categoryId?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  yearFrom?: number;
  yearTo?: number;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  vendorId?: number;
  sortBy?: "newest" | "price_asc" | "price_desc" | "popular";
  limit?: number;
  offset?: number;
}): Promise<{ products: ProductWithVendor[]; total: number; suggestions: string[] }> {
  const db = await getDb();
  if (!db) return { products: [], total: 0, suggestions: [] };

  const limit  = filters.limit  || 20;
  const offset = filters.offset || 0;

  // ── Build base filter conditions (non-search) ────────────────────────────
  const baseConditions: ReturnType<typeof eq>[] = [eq(products.status, "active") as any];
  if (filters.categoryId) baseConditions.push(eq(products.categoryId, filters.categoryId) as any);
  if (filters.vehicleMake) baseConditions.push(eq(products.vehicleMake, filters.vehicleMake) as any);
  if (filters.vehicleModel) baseConditions.push(eq(products.vehicleModel, filters.vehicleModel) as any);
  if (filters.condition)   baseConditions.push(eq(products.condition, filters.condition as any) as any);
  if (filters.minPrice)    baseConditions.push(sql`${products.price} >= ${filters.minPrice}::numeric` as any);
  if (filters.maxPrice)    baseConditions.push(sql`${products.price} <= ${filters.maxPrice}::numeric` as any);
  if (filters.vendorId)    baseConditions.push(eq(products.vendorId, filters.vendorId) as any);

  // Helper: build ORDER BY from sortBy param (used for non-FTS queries)
  function buildOrderBy(sortBy?: string) {
    if (sortBy === "price_asc")  return [asc(products.price)];
    if (sortBy === "price_desc") return [desc(products.price)];
    if (sortBy === "popular")    return [sql`${products.views} DESC`, desc(products.createdAt)];
    return [desc(products.createdAt)]; // "newest" is default
  }

  // ── No search term → standard filtered query ─────────────────────────────
  if (!filters.search) {
    const where = and(...baseConditions);
    const orderBy = buildOrderBy(filters.sortBy);
    const [items, countResult] = await Promise.all([
      db.select().from(products).where(where).orderBy(...orderBy as any).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(products).where(where),
    ]);
    return { products: await enrichWithVendorData(items, db), total: Number(countResult[0]?.count || 0), suggestions: [] };
  }

  // ── FTS path — uses persisted search_vector GIN index ────────────────────
  const tsQuery = buildTsQuery(filters.search);

  if (tsQuery) {
    try {
      const matchSql = tsMatch(tsQuery);
      const rankSql  = tsRank(tsQuery);
      const allConditions = [...baseConditions, matchSql as any];
      const where = and(...allConditions);

      const [items, countResult] = await Promise.all([
        db.select().from(products).where(where)
          .orderBy(sql`${rankSql} DESC`, sql`${products.views} DESC`, desc(products.createdAt))
          .limit(limit).offset(offset),
        db.select({ count: sql<number>`count(*)` }).from(products).where(where),
      ]);

      const total = Number(countResult[0]?.count || 0);
      if (total > 0) return { products: await enrichWithVendorData(items, db), total, suggestions: [] };
    } catch (err) {
      console.warn("[Search] FTS failed, falling back:", err);
    }
  }

  // ── Trigram / fuzzy fallback ─────────────────────────────────────────────
  // Used when FTS returns 0 or tsQuery is null (very short/weird input)
  const expanded = expandForLike(filters.search);
  const likeConditions = expanded.map(term =>
    or(
      sql`${products.name} ILIKE ${"%" + term + "%"}`,
      sql`${products.brand} ILIKE ${"%" + term + "%"}`,
      sql`${products.description} ILIKE ${"%" + term + "%"}`,
      sql`${products.vehicleMake} ILIKE ${"%" + term + "%"}`,
      sql`${products.vehicleModel} ILIKE ${"%" + term + "%"}`,
    )
  );
  const fuzzyConditions = [...baseConditions, or(...likeConditions) as any];
  const fuzzyWhere = and(...fuzzyConditions);

  const [items, countResult] = await Promise.all([
    db.select().from(products).where(fuzzyWhere)
      .orderBy(sql`${products.views} DESC`, desc(products.createdAt))
      .limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(products).where(fuzzyWhere),
  ]);

  const total = Number(countResult[0]?.count || 0);

  // ── "Did you mean" suggestions via pg_trgm ───────────────────────────────
  let suggestions: string[] = [];
  if (total === 0) {
    try {
      const raw = filters.search.replace(/'/g, "''");
      const trgmResult = await db.execute(sql`
        SELECT name FROM products
        WHERE status = 'active'
          AND similarity(lower(name), lower(${filters.search})) > 0.15
        ORDER BY similarity(lower(name), lower(${filters.search})) DESC
        LIMIT 5
      `);
      suggestions = (trgmResult.rows as any[]).map((r) => r.name as string);
    } catch {}
  }

  return { products: await enrichWithVendorData(items, db), total, suggestions };
}

// ── Lightweight autocomplete suggest ─────────────────────────────────────────
export async function suggestProducts(query: string): Promise<{
  type: "product" | "brand" | "make" | "category";
  label: string;
  id?: number;
}[]> {
  const db = await getDb();
  if (!db || query.trim().length < 2) return [];

  const tsQuery = buildTsQuery(query);
  const pattern = "%" + query.replace(/[%_]/g, "\\$&") + "%";

  const results: { type: "product" | "brand" | "make" | "category"; label: string; id?: number }[] = [];

  // 1. Matching product names via FTS (hits GIN index on search_vector)
  try {
    if (tsQuery) {
      const rows = await db.select({ id: products.id, name: products.name })
        .from(products)
        .where(and(eq(products.status, "active"), tsMatch(tsQuery) as any))
        .orderBy(sql`${tsRank(tsQuery)} DESC`, sql`${products.views} DESC`)
        .limit(5);
      rows.forEach(r => results.push({ type: "product", label: r.name, id: r.id }));
    }
  } catch {}

  // ILIKE fallback for products if FTS returned nothing
  if (results.length === 0) {
    const rows = await db.select({ id: products.id, name: products.name })
      .from(products)
      .where(and(eq(products.status, "active"), sql`${products.name} ILIKE ${pattern}` as any))
      .orderBy(sql`${products.views} DESC`)
      .limit(5);
    rows.forEach(r => results.push({ type: "product", label: r.name, id: r.id }));
  }

  // 2. Distinct matching brands
  try {
    const rows = await db.execute(sql`
      SELECT DISTINCT brand FROM products
      WHERE status = 'active' AND brand ILIKE ${pattern} AND brand IS NOT NULL
      ORDER BY brand LIMIT 3
    `);
    (rows.rows as any[]).forEach(r => {
      if (r.brand) results.push({ type: "brand", label: r.brand as string });
    });
  } catch {}

  // 3. Distinct matching vehicle makes
  try {
    const rows = await db.execute(sql`
      SELECT DISTINCT "vehicleMake" FROM products
      WHERE status = 'active' AND "vehicleMake" ILIKE ${pattern} AND "vehicleMake" IS NOT NULL
      ORDER BY "vehicleMake" LIMIT 3
    `);
    (rows.rows as any[]).forEach(r => {
      if (r.vehicleMake) results.push({ type: "make", label: r.vehicleMake as string });
    });
  } catch {}

  return results;
}

const hasRealImage = sql`${products.images}::text LIKE '%/images/parts/specific/%'`;

export async function getFeaturedProducts(limit = 8) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products)
    .where(and(eq(products.status, "active"), eq(products.featured, true), hasRealImage))
    .orderBy(desc(products.createdAt)).limit(limit);
}

export async function getLatestProducts(limit = 12) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products)
    .where(and(eq(products.status, "active"), hasRealImage))
    .orderBy(desc(products.createdAt)).limit(limit);
}

export async function getProductsByCategory(categoryId: number, limit = 12) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products)
    .where(and(eq(products.status, "active"), eq(products.categoryId, categoryId), hasRealImage))
    .orderBy(desc(products.createdAt)).limit(limit);
}

export async function getDistinctMakes() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.selectDistinct({ make: products.vehicleMake }).from(products)
    .where(and(eq(products.status, "active"), sql`${products.vehicleMake} IS NOT NULL`))
    .orderBy(asc(products.vehicleMake));
  return result.map(r => r.make).filter(Boolean) as string[];
}

export async function getDistinctModels(make: string) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.selectDistinct({ model: products.vehicleModel }).from(products)
    .where(and(eq(products.status, "active"), eq(products.vehicleMake, make), sql`${products.vehicleModel} IS NOT NULL`))
    .orderBy(asc(products.vehicleModel));
  return result.map(r => r.model).filter(Boolean) as string[];
}

// ─── Cart Helpers ───
export async function getCartItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const items = await db.select().from(cartItems).where(eq(cartItems.userId, userId));
  if (items.length === 0) return [];
  const productIds = items.map(i => i.productId);
  const prods = await db.select().from(products).where(inArray(products.id, productIds));
  const prodMap = new Map(prods.map(p => [p.id, p]));
  return items.map(item => ({ ...item, product: prodMap.get(item.productId) }));
}

export async function addToCart(userId: number, productId: number, quantity: number) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(cartItems)
    .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId))).limit(1);
  if (existing.length > 0) {
    await db.update(cartItems).set({ quantity: existing[0].quantity + quantity })
      .where(eq(cartItems.id, existing[0].id));
  } else {
    await db.insert(cartItems).values({ userId, productId, quantity });
  }
}

export async function updateCartItem(id: number, quantity: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, id));
}

export async function removeCartItem(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(cartItems).where(eq(cartItems.id, id));
}

export async function clearCart(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(cartItems).where(eq(cartItems.userId, userId));
}

// ─── Order Helpers ───
export async function createOrder(data: {
  orderNumber: string; userId: number; vendorId: number; totalAmount: string;
  shippingAddress?: string; shippingCity?: string; shippingRegion?: string;
  buyerPhone?: string; buyerName?: string; notes?: string;
  paymentMethod?: "pay_on_delivery" | "mobile_money" | "card";
  items: { productId: number; productName: string; quantity: number; unitPrice: string; totalPrice: string }[];
}) {
  const db = await getDb();
  if (!db) return;
  const { items, ...orderData } = data;
  const [result] = await db.insert(orders).values(orderData).returning({ id: orders.id });
  if (result && items.length > 0) {
    await db.insert(orderItems).values(items.map(item => ({ ...item, orderId: result.id })));
  }
  return result;
}

export async function getUserOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
}

export async function getVendorOrders(vendorId: number) {
  const db = await getDb();
  if (!db) return [];
  const vendorOrders = await db.select().from(orders).where(eq(orders.vendorId, vendorId)).orderBy(desc(orders.createdAt));
  if (vendorOrders.length === 0) return [];
  const orderIds = vendorOrders.map((o) => o.id);
  const items = await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));
  return vendorOrders.map((o) => ({
    ...o,
    items: items.filter((i) => i.orderId === o.id),
  }));
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return undefined;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  return { ...order, items };
}

export async function updateOrderStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set({ status: status as any }).where(eq(orders.id, id));
}

export async function updateOrderPaymentReference(id: number, reference: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set({ paymentReference: reference }).where(eq(orders.id, id));
}

export async function updateOrderPaymentStatus(id: number, paymentStatus: "unpaid" | "paid" | "refunded", paymentReference?: string) {
  const db = await getDb();
  if (!db) return;
  const updates: { paymentStatus: typeof paymentStatus; paymentReference?: string } = { paymentStatus };
  if (paymentReference) updates.paymentReference = paymentReference;
  await db.update(orders).set(updates).where(eq(orders.id, id));
}

export async function getOrderByPaymentReference(reference: string) {
  const db = await getDb();
  if (!db) return undefined;
  const [order] = await db.select().from(orders).where(eq(orders.paymentReference, reference)).limit(1);
  return order;
}

export async function getAllOrders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).orderBy(desc(orders.createdAt));
}

// ─── Notification Helpers ───
export async function createNotification(data: { userId: number; title: string; message: string; type?: string; link?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data as any);
}

export async function getUserNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
}

// ─── Review Helpers ───
export async function createReview(data: { userId: number; vendorId: number; productId?: number; rating: number; comment?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(reviews).values(data);
}

export async function getVendorReviews(vendorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviews).where(eq(reviews.vendorId, vendorId)).orderBy(desc(reviews.createdAt));
}

export async function getProductReviews(productId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviews).where(eq(reviews.productId, productId)).orderBy(desc(reviews.createdAt));
}

export async function getProductStats(productId: number) {
  const db = await getDb();
  if (!db) return { avgRating: 0, reviewCount: 0 };
  const [row] = await db
    .select({
      avgRating: sql<number>`coalesce(avg(${reviews.rating}), 0)`,
      reviewCount: sql<number>`count(*)`,
    })
    .from(reviews)
    .where(eq(reviews.productId, productId));
  return {
    avgRating: Number(row?.avgRating ?? 0),
    reviewCount: Number(row?.reviewCount ?? 0),
  };
}

export async function getVendorProductCount(vendorId: number) {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(eq(products.vendorId, vendorId));
  return Number(row?.count ?? 0);
}

// ─── Public Stats (single round-trip) ───
export async function getPublicStats() {
  const db = await getDb();
  if (!db) return { totalProducts: 0, totalVendors: 0, totalCategories: 0 };
  const result = await db.execute(sql`
    SELECT
      (SELECT count(*) FROM products  WHERE status = 'active') AS "totalProducts",
      (SELECT count(*) FROM vendors   WHERE status = 'approved') AS "totalVendors",
      (SELECT count(*) FROM categories) AS "totalCategories"
  `);
  const r = (result.rows?.[0] ?? (result as any)[0] ?? {}) as any;
  return {
    totalProducts:   Number(r.totalProducts   || 0),
    totalVendors:    Number(r.totalVendors    || 0),
    totalCategories: Number(r.totalCategories || 0),
  };
}

// ─── Admin Stats (single round-trip) ───
export async function getAdminStats() {
  const db = await getDb();
  if (!db) return { totalVendors: 0, totalProducts: 0, totalOrders: 0, totalUsers: 0, pendingVendors: 0, totalRevenue: "0" };
  const result = await db.execute(sql`
    SELECT
      (SELECT count(*) FROM vendors)                             AS "totalVendors",
      (SELECT count(*) FROM vendors WHERE status = 'pending')    AS "pendingVendors",
      (SELECT count(*) FROM products)                            AS "totalProducts",
      (SELECT count(*) FROM orders)                              AS "totalOrders",
      (SELECT count(*) FROM users)                               AS "totalUsers",
      (SELECT COALESCE(SUM("totalAmount"), 0) FROM orders)       AS "totalRevenue"
  `);
  const r = (result.rows?.[0] ?? (result as any)[0] ?? {}) as any;
  return {
    totalVendors:   Number(r.totalVendors   || 0),
    pendingVendors: Number(r.pendingVendors  || 0),
    totalProducts:  Number(r.totalProducts  || 0),
    totalOrders:    Number(r.totalOrders    || 0),
    totalUsers:     Number(r.totalUsers     || 0),
    totalRevenue:   String(r.totalRevenue   || "0"),
  };
}

// ─── Waitlist Helpers ───
export async function createWaitlistEntry(data: { phone: string; email?: string; productId?: number }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(waitlist).values(data);
}

export async function getWaitlistCount() {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(waitlist);
  return Number(row?.count || 0);
}

export async function getWaitlistEntries(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(waitlist).orderBy(desc(waitlist.createdAt)).limit(limit);
}

// ─── Wishlist ───
export async function addToWishlist(userId: number, productId: number) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(wishlists).where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId))).limit(1);
  if (existing.length === 0) {
    await db.insert(wishlists).values({ userId, productId });
  }
}

export async function removeFromWishlist(userId: number, productId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(wishlists).where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)));
}

export async function getWishlist(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ productId: wishlists.productId }).from(wishlists).where(eq(wishlists.userId, userId)).orderBy(desc(wishlists.createdAt));
  if (rows.length === 0) return [];
  const ids = rows.map(r => r.productId);
  const prods = await db.select().from(products).where(inArray(products.id, ids));
  return enrichWithVendorData(prods, db);
}

export async function isWishlisted(userId: number, productId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ id: wishlists.id }).from(wishlists).where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId))).limit(1);
  return rows.length > 0;
}

export async function getWishlistProductIds(userId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ productId: wishlists.productId }).from(wishlists).where(eq(wishlists.userId, userId));
  return rows.map(r => r.productId);
}

// ─── DB-backed Rate Limiter ───
export async function checkRateLimitDB(key: string, windowMs: number, maxRequests: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  const result = await db.execute(sql`
    INSERT INTO rate_limits (key, count, "resetAt")
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT (key) DO UPDATE
      SET count = CASE WHEN rate_limits."resetAt" < NOW() THEN 1 ELSE rate_limits.count + 1 END,
          "resetAt" = CASE WHEN rate_limits."resetAt" < NOW() THEN ${resetAt} ELSE rate_limits."resetAt" END
    RETURNING count, "resetAt"
  `);
  const row = (result.rows?.[0] ?? (result as any)[0] ?? {}) as any;
  const count = Number(row.count || 0);
  const expiry = new Date(row.resetAt || now);
  if (count > maxRequests && expiry > now) {
    const retryAfterSec = Math.ceil((expiry.getTime() - now.getTime()) / 1000);
    throw new Error(`Too many requests. Please try again in ${retryAfterSec} seconds.`);
  }
}

// ─── Vendor verified toggle ───
export async function setVendorVerified(vendorId: number, verified: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(vendors).set({ verified }).where(eq(vendors.id, vendorId));
}

// ─── Related products (same category, different vendor) ───
export async function getRelatedProducts(productId: number, categoryId: number, vendorId: number, limit = 8) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(products).where(
    and(
      eq(products.status, "active") as any,
      eq(products.categoryId, categoryId) as any,
      sql`${products.vendorId} != ${vendorId}`,
      sql`${products.id} != ${productId}`
    )
  ).orderBy(desc(products.views), desc(products.createdAt)).limit(limit);
  return enrichWithVendorData(rows, db);
}
