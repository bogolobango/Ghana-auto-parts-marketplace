import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { VEHICLE_MAKES } from "@shared/marketplace";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import { z } from "zod";
import { nanoid } from "nanoid";
import * as bcrypt from "bcryptjs";
import axios from "axios";
import * as db from "./db";
import * as paystack from "./paystack";
import { storagePut } from "./storage";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new Error("Forbidden: admin access required");
  }
  return next({ ctx });
});

const vendorProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const vendor = await db.getVendorByUserId(ctx.user.id);
  if (!vendor || vendor.status !== "approved") {
    throw new Error("Forbidden: approved vendor access required");
  }
  return next({ ctx: { ...ctx, vendor } });
});

export const appRouter = router({
  system: systemRouter,
  publicStats: publicProcedure.query(async () => {
    return db.getPublicStats();
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    signup: publicProcedure.input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(8),
    })).mutation(async ({ ctx, input }) => {
      const existing = await db.getUserByEmail(input.email);
      if (existing) throw new Error("Email is already registered");
      const openId = `local_${nanoid(16)}`;
      const passwordHash = await bcrypt.hash(input.password, 10);
      await db.upsertUser({ openId, email: input.email, name: input.name, loginMethod: "email", lastSignedIn: new Date() });
      await db.setUserPasswordHash(openId, passwordHash);
      const token = await sdk.createSessionToken(openId, { name: input.name });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      return { success: true } as const;
    }),
    login: publicProcedure.input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
    })).mutation(async ({ ctx, input }) => {
      await db.checkRateLimitDB(`login:${input.email}`, 300_000, 5);
      const user = await db.getUserByEmail(input.email);
      if (!user || !user.passwordHash) throw new Error("Invalid email or password");
      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) throw new Error("Invalid email or password");
      const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      return { success: true } as const;
    }),

    // ── WhatsApp / Phone OTP ─────────────────────────────────────────────
    requestOtp: publicProcedure.input(z.object({
      phone: z.string().min(7).max(20),
    })).mutation(async ({ input }) => {
      // Normalise: strip spaces, ensure + prefix
      const phone = input.phone.replace(/\s/g, "").replace(/^00/, "+");
      const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit

      await db.createOtp(phone, code);

      if (ENV.twilioAccountSid && ENV.twilioAuthToken && ENV.twilioVerifySid) {
        // Use Twilio Verify with WhatsApp channel
        try {
          await axios.post(
            `https://verify.twilio.com/v2/Services/${ENV.twilioVerifySid}/Verifications`,
            new URLSearchParams({ To: `whatsapp:${phone}`, Channel: "whatsapp" }),
            {
              auth: { username: ENV.twilioAccountSid, password: ENV.twilioAuthToken },
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
            }
          );
          return { success: true, dev: false } as const;
        } catch (err: any) {
          console.error("[OTP] Twilio Verify failed:", err?.response?.data ?? err);
        }
      }

      // Dev fallback — log code so developers can test
      console.log(`[OTP] Dev mode — code for ${phone}: ${code}`);
      return { success: true, dev: true, devCode: code } as const;
    }),

    verifyOtp: publicProcedure.input(z.object({
      phone: z.string().min(7).max(20),
      code: z.string().min(4).max(8),
      name: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const phone = input.phone.replace(/\s/g, "").replace(/^00/, "+");

      let verified = false;

      // Try Twilio Verify first
      if (ENV.twilioAccountSid && ENV.twilioAuthToken && ENV.twilioVerifySid) {
        try {
          const res = await axios.post<{ status: string }>(
            `https://verify.twilio.com/v2/Services/${ENV.twilioVerifySid}/VerificationCheck`,
            new URLSearchParams({ To: `whatsapp:${phone}`, Code: input.code }),
            {
              auth: { username: ENV.twilioAccountSid, password: ENV.twilioAuthToken },
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
            }
          );
          verified = res.data.status === "approved";
        } catch {}
      }

      // Fall back to local DB OTP
      if (!verified) {
        const otp = await db.getValidOtp(phone, input.code);
        if (otp) {
          await db.markOtpUsed(otp.id);
          verified = true;
        }
      }

      if (!verified) throw new Error("Invalid or expired code");

      // Upsert user
      let user = await db.getUserByPhone(phone);
      if (!user) {
        const openId = `whatsapp_${nanoid(16)}`;
        await db.upsertUser({
          openId,
          phone,
          name: input.name || null,
          loginMethod: "whatsapp",
          lastSignedIn: new Date(),
        });
        user = await db.getUserByPhone(phone);
      }

      if (!user) throw new Error("Failed to create user account");

      const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      return { success: true, isNewUser: !user.name } as const;
    }),
  }),

  // ─── Categories ───
  category: router({
    list: publicProcedure.query(async () => {
      return db.getCategories();
    }),
    create: adminProcedure.input(z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      icon: z.string().optional(),
      parentId: z.number().optional(),
    })).mutation(async ({ input }) => {
      await db.createCategory(input);
      return { success: true };
    }),
  }),

  // ─── Vendors ───
  vendor: router({
    register: protectedProcedure.input(z.object({
      businessName: z.string().min(1),
      description: z.string().optional(),
      phone: z.string().min(1),
      whatsapp: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      region: z.string().optional(),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const existing = await db.getVendorByUserId(ctx.user.id);
      if (existing) throw new Error("You already have a vendor profile");
      const result = await db.createVendor({ ...input, userId: ctx.user.id });
      return { success: true, vendorId: result?.id };
    }),
    me: protectedProcedure.query(async ({ ctx }) => {
      return db.getVendorByUserId(ctx.user.id);
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getVendorById(input.id);
    }),
    list: publicProcedure.query(async () => {
      return db.getApprovedVendors();
    }),
    update: protectedProcedure.input(z.object({
      businessName: z.string().optional(),
      description: z.string().optional(),
      phone: z.string().optional(),
      whatsapp: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      region: z.string().optional(),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      logoUrl: z.string().optional(),
      coverUrl: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const vendor = await db.getVendorByUserId(ctx.user.id);
      if (!vendor) throw new Error("Vendor profile not found");
      await db.updateVendor(vendor.id, input);
      return { success: true };
    }),
  }),

  // ─── Products ───
  product: router({
    create: vendorProcedure.input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      price: z.string().min(1),
      categoryId: z.number().optional(),
      sku: z.string().optional(),
      brand: z.string().optional(),
      condition: z.enum(["new", "used", "refurbished"]).optional(),
      vehicleMake: z.enum(VEHICLE_MAKES as [string, ...string[]]).optional(),
      vehicleModel: z.string().optional(),
      yearFrom: z.number().optional(),
      yearTo: z.number().optional(),
      quantity: z.number().optional(),
      minOrderQty: z.number().optional(),
      images: z.array(z.string()).optional(),
    })).mutation(async ({ ctx, input }) => {
      const result = await db.createProduct({ ...input, vendorId: ctx.vendor.id });
      return { success: true, productId: result?.id };
    }),
    update: vendorProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      price: z.string().optional(),
      categoryId: z.number().optional(),
      sku: z.string().optional(),
      brand: z.string().optional(),
      condition: z.enum(["new", "used", "refurbished"]).optional(),
      vehicleMake: z.enum(VEHICLE_MAKES as [string, ...string[]]).optional(),
      vehicleModel: z.string().optional(),
      yearFrom: z.number().optional(),
      yearTo: z.number().optional(),
      quantity: z.number().optional(),
      minOrderQty: z.number().optional(),
      images: z.array(z.string()).optional(),
      status: z.enum(["active", "inactive", "out_of_stock"]).optional(),
    })).mutation(async ({ ctx, input }) => {
      const product = await db.getProductById(input.id);
      if (!product || product.vendorId !== ctx.vendor.id) throw new Error("Product not found");
      const { id, ...data } = input;
      await db.updateProduct(id, data);
      return { success: true };
    }),
    delete: vendorProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const product = await db.getProductById(input.id);
      if (!product || product.vendorId !== ctx.vendor.id) throw new Error("Product not found");
      await db.deleteProduct(input.id);
      return { success: true };
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const product = await db.getProductById(input.id);
      if (!product) return null;
      // Increment views atomically in the background — don't block the response
      db.incrementProductViews(input.id).catch(() => {});
      const [vendor, stats, vendorProductCount] = await Promise.all([
        db.getVendorById(product.vendorId),
        db.getProductStats(input.id),
        db.getVendorProductCount(product.vendorId),
      ]);
      return { ...product, vendor, ...stats, vendorProductCount };
    }),
    reviews: publicProcedure.input(z.object({ productId: z.number() })).query(async ({ input }) => {
      return db.getProductReviews(input.productId);
    }),
    submitReview: protectedProcedure.input(z.object({
      productId: z.number(),
      vendorId: z.number(),
      rating: z.number().min(1).max(5),
      comment: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      await db.createReview({ ...input, userId: ctx.user.id });
      return { success: true };
    }),
    byVendor: publicProcedure.input(z.object({ vendorId: z.number(), limit: z.number().optional() })).query(async ({ input }) => {
      const all = await db.getVendorProducts(input.vendorId);
      return input.limit ? all.slice(0, input.limit) : all;
    }),
    myProducts: vendorProcedure.query(async ({ ctx }) => {
      return db.getVendorProducts(ctx.vendor.id);
    }),
    search: publicProcedure.input(z.object({
      search: z.string().optional(),
      categoryId: z.number().optional(),
      vehicleMake: z.string().optional(),
      vehicleModel: z.string().optional(),
      yearFrom: z.number().optional(),
      yearTo: z.number().optional(),
      condition: z.string().optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
      vendorId: z.number().optional(),
      sortBy: z.enum(["newest", "price_asc", "price_desc", "popular"]).optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    })).query(async ({ input }) => {
      return db.searchProducts(input);
    }),
    featured: publicProcedure.query(async () => {
      return db.getFeaturedProducts();
    }),
    latest: publicProcedure.query(async () => {
      return db.getLatestProducts();
    }),
    byCategory: publicProcedure.input(z.object({
      categoryId: z.number(),
      limit: z.number().optional(),
    })).query(async ({ input }) => {
      return db.getProductsByCategory(input.categoryId, input.limit ?? 12);
    }),
    suggest: publicProcedure.input(z.object({
      query: z.string().min(2).max(100),
    })).query(async ({ input }) => {
      return db.suggestProducts(input.query);
    }),
    makes: publicProcedure.query(async () => {
      return db.getDistinctMakes();
    }),
    models: publicProcedure.input(z.object({ make: z.string() })).query(async ({ input }) => {
      return db.getDistinctModels(input.make);
    }),
    related: publicProcedure.input(z.object({
      productId: z.number(),
      categoryId: z.number(),
      vendorId: z.number(),
      limit: z.number().optional(),
    })).query(async ({ input }) => {
      return db.getRelatedProducts(input.productId, input.categoryId, input.vendorId, input.limit ?? 8);
    }),
  }),

  // ─── Cart ───
  cart: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getCartItems(ctx.user.id);
    }),
    add: protectedProcedure.input(z.object({
      productId: z.number(),
      quantity: z.number().min(1).default(1),
    })).mutation(async ({ ctx, input }) => {
      await db.addToCart(ctx.user.id, input.productId, input.quantity);
      return { success: true };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      quantity: z.number().min(1),
    })).mutation(async ({ input }) => {
      await db.updateCartItem(input.id, input.quantity);
      return { success: true };
    }),
    remove: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.removeCartItem(input.id);
      return { success: true };
    }),
    clear: protectedProcedure.mutation(async ({ ctx }) => {
      await db.clearCart(ctx.user.id);
      return { success: true };
    }),
  }),

  // ─── Orders ───
  order: router({
    create: protectedProcedure.input(z.object({
      vendorId: z.number(),
      shippingAddress: z.string().optional(),
      shippingCity: z.string().optional(),
      shippingRegion: z.string().optional(),
      buyerPhone: z.string().optional(),
      buyerName: z.string().optional(),
      notes: z.string().optional(),
      paymentMethod: z.enum(["pay_on_delivery", "mobile_money", "card"]).optional(),
      items: z.array(z.object({
        productId: z.number(),
        productName: z.string(),
        quantity: z.number(),
        unitPrice: z.string(),
        totalPrice: z.string(),
      })),
    })).mutation(async ({ ctx, input }) => {
      const orderNumber = `VOM-${nanoid(8).toUpperCase()}`;
      const totalAmount = input.items.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0).toFixed(2);
      const { items, paymentMethod, ...rest } = input;
      const [result, vendorData] = await Promise.all([
        db.createOrder({
          orderNumber,
          userId: ctx.user.id,
          totalAmount,
          paymentMethod: paymentMethod || "pay_on_delivery",
          ...rest,
          items,
        }),
        db.getVendorById(input.vendorId),
      ]);
      // Clear cart after order
      await db.clearCart(ctx.user.id);
      // Notify vendor
      await db.createNotification({
        userId: input.vendorId,
        title: "New Order Received",
        message: `Order ${orderNumber} has been placed. Total: GH₵${totalAmount}`,
        type: "order",
        link: `/vendor/orders`,
      });
      return {
        success: true,
        orderNumber,
        orderId: result?.id,
        vendorWhatsapp: vendorData?.whatsapp ?? null,
        vendorName: vendorData?.businessName ?? "Vendor",
      };
    }),
    myOrders: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserOrders(ctx.user.id);
    }),
    vendorOrders: vendorProcedure.query(async ({ ctx }) => {
      return db.getVendorOrders(ctx.vendor.id);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getOrderById(input.id);
    }),
    updateStatus: vendorProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["confirmed", "processing", "shipped", "delivered", "cancelled"]),
    })).mutation(async ({ input }) => {
      await db.updateOrderStatus(input.id, input.status);
      const order = await db.getOrderById(input.id);
      if (order) {
        await db.createNotification({
          userId: order.userId,
          title: "Order Updated",
          message: `Your order ${order.orderNumber} status has been updated to: ${input.status}`,
          type: "order",
          link: `/orders`,
        });
      }
      return { success: true };
    }),
  }),

  // ─── Notifications ───
  notification: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserNotifications(ctx.user.id);
    }),
    markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.markNotificationRead(input.id);
      return { success: true };
    }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsRead(ctx.user.id);
      return { success: true };
    }),
  }),

  // ─── Reviews ───
  review: router({
    create: protectedProcedure.input(z.object({
      vendorId: z.number(),
      productId: z.number().optional(),
      rating: z.number().min(1).max(5),
      comment: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      await db.createReview({ ...input, userId: ctx.user.id });
      return { success: true };
    }),
    vendorReviews: publicProcedure.input(z.object({ vendorId: z.number() })).query(async ({ input }) => {
      return db.getVendorReviews(input.vendorId);
    }),
  }),

  // ─── Admin ───
  admin: router({
    stats: adminProcedure.query(async () => {
      const stats = await db.getAdminStats();
      const waitlistCount = await db.getWaitlistCount();
      return { ...stats, waitlistCount };
    }),
    vendors: adminProcedure.query(async () => {
      return db.getAllVendors();
    }),
    updateVendorStatus: adminProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["approved", "rejected", "suspended"]),
    })).mutation(async ({ input }) => {
      await db.updateVendorStatus(input.id, input.status);
      const vendor = await db.getVendorById(input.id);
      if (vendor) {
        await db.createNotification({
          userId: vendor.userId,
          title: "Vendor Status Updated",
          message: `Your vendor application has been ${input.status}.`,
          type: "vendor",
        });
      }
      return { success: true };
    }),
    orders: adminProcedure.query(async () => {
      return db.getAllOrders();
    }),
    seedCategories: adminProcedure.mutation(async () => {
      const cats = [
        { name: "Engine Parts", slug: "engine-parts", icon: "Cog" },
        { name: "Brake System", slug: "brake-system", icon: "CircleStop" },
        { name: "Suspension", slug: "suspension", icon: "ArrowUpDown" },
        { name: "Electrical", slug: "electrical", icon: "Zap" },
        { name: "Body Parts", slug: "body-parts", icon: "Car" },
        { name: "Transmission", slug: "transmission", icon: "Settings" },
        { name: "Exhaust System", slug: "exhaust-system", icon: "Wind" },
        { name: "Cooling System", slug: "cooling-system", icon: "Thermometer" },
        { name: "Filters & Fluids", slug: "filters-fluids", icon: "Droplets" },
        { name: "Lighting", slug: "lighting", icon: "Lightbulb" },
        { name: "Tires & Wheels", slug: "tires-wheels", icon: "Circle" },
        { name: "Interior", slug: "interior", icon: "Armchair" },
      ];
      for (const cat of cats) {
        try { await db.createCategory(cat); } catch (e) { /* ignore duplicates */ }
      }
      return { success: true, count: cats.length };
    }),
  }),

  // ─── Payment (Paystack) ───
  payment: router({
    /** Get the Paystack public key for client-side initialization */
    getConfig: publicProcedure.query(() => {
      return {
        publicKey: process.env.VITE_PAYSTACK_PUBLIC_KEY || "",
        hasPaystack: !!process.env.PAYSTACK_SECRET_KEY,
      };
    }),

    /** Initialize a Paystack transaction for an order */
    initialize: protectedProcedure.input(z.object({
      orderId: z.number(),
      email: z.string().email(),
      callbackUrl: z.string().optional(),
    })).mutation(async ({ input }) => {
      const order = await db.getOrderById(input.orderId);
      if (!order) throw new Error("Order not found");

      const amountInPesewas = Math.round(parseFloat(order.totalAmount) * 100);
      const reference = `VOM-PAY-${order.orderNumber}-${nanoid(6)}`;

      const channels: string[] = ["mobile_money", "card"];

      const result = await paystack.initializeTransaction({
        email: input.email,
        amount: amountInPesewas,
        reference,
        currency: "GHS",
        channels,
        callback_url: input.callbackUrl,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          custom_fields: [
            { display_name: "Order Number", variable_name: "order_number", value: order.orderNumber },
          ],
        },
      });

      // Store the payment reference on the order
      await db.updateOrderPaymentReference(order.id, reference);

      return {
        authorizationUrl: result.data.authorization_url,
        accessCode: result.data.access_code,
        reference: result.data.reference,
      };
    }),

    /** Verify a payment after Paystack redirect or webhook */
    verify: protectedProcedure.input(z.object({
      reference: z.string(),
    })).mutation(async ({ input }) => {
      const result = await paystack.verifyTransaction(input.reference);

      if (result.data.status === "success") {
        // Find order by payment reference and mark as paid
        const order = await db.getOrderByPaymentReference(input.reference);
        if (order) {
          await db.updateOrderPaymentStatus(order.id, "paid", input.reference);
        }
        return { success: true, status: "paid" as const };
      }

      return { success: false, status: result.data.status };
    }),

    /** Charge mobile money directly (MTN MoMo, Vodafone Cash, AirtelTigo) */
    chargeMomo: protectedProcedure.input(z.object({
      orderId: z.number(),
      email: z.string().email(),
      phone: z.string(),
      provider: z.enum(["mtn", "vod", "tgo"]).optional(),
    })).mutation(async ({ input }) => {
      const order = await db.getOrderById(input.orderId);
      if (!order) throw new Error("Order not found");

      const amountInPesewas = Math.round(parseFloat(order.totalAmount) * 100);
      const reference = `VOM-MOMO-${order.orderNumber}-${nanoid(6)}`;
      const provider = input.provider || paystack.detectMomoProvider(input.phone);

      const result = await paystack.chargeMobileMoney({
        email: input.email,
        amount: amountInPesewas,
        reference,
        phone: input.phone.replace(/[\s\-()]/g, ""),
        provider,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
        },
      });

      await db.updateOrderPaymentReference(order.id, reference);

      return {
        reference: result.data.reference,
        status: result.data.status,
        displayText: result.data.display_text || "Please approve the payment on your phone",
      };
    }),
  }),

  // ─── File Upload ───
  upload: router({
    /** Upload a product image (base64 encoded) */
    image: vendorProcedure.input(z.object({
      data: z.string(), // base64 encoded image data
      filename: z.string(),
      contentType: z.string().default("image/jpeg"),
    })).mutation(async ({ ctx, input }) => {
      const key = `products/${ctx.vendor.id}/${nanoid(12)}-${input.filename.replace(/[^a-zA-Z0-9._-]/g, "")}`;
      const buffer = Buffer.from(input.data, "base64");
      const result = await storagePut(key, buffer, input.contentType);
      return { url: result.url, key: result.key };
    }),
  }),

  // ─── Wishlist ───
  wishlist: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getWishlist(ctx.user.id);
    }),
    productIds: protectedProcedure.query(async ({ ctx }) => {
      return db.getWishlistProductIds(ctx.user.id);
    }),
    toggle: protectedProcedure.input(z.object({
      productId: z.number(),
    })).mutation(async ({ ctx, input }) => {
      const exists = await db.isWishlisted(ctx.user.id, input.productId);
      if (exists) {
        await db.removeFromWishlist(ctx.user.id, input.productId);
        return { wishlisted: false };
      } else {
        await db.addToWishlist(ctx.user.id, input.productId);
        return { wishlisted: true };
      }
    }),
  }),

  // ─── Waitlist (MoMo Payment Interest) ───
  waitlist: router({
    join: publicProcedure.input(z.object({
      phone: z.string().min(9),
      email: z.string().email().optional(),
      productId: z.number().optional(),
    })).mutation(async ({ input }) => {
      await db.createWaitlistEntry(input);

      // Send WhatsApp community invite via Twilio (fire-and-forget)
      if (ENV.twilioAccountSid && ENV.twilioAuthToken) {
        try {
          const raw = input.phone.replace(/[\s\-]/g, "");
          const e164 = raw.startsWith("+") ? raw
            : raw.startsWith("233") ? `+${raw}`
            : `+233${raw.replace(/^0/, "")}`;
          const body = `Hi! 👋 You're on the VOOM Ghana MoMo waitlist. We'll notify you the moment mobile money payments go live.\n\nIn the meantime, join our WhatsApp community for launch updates and exclusive offers:\nhttps://chat.whatsapp.com/IZzVqhrkhxQ04PyznlWD4N`;
          const params = new URLSearchParams({
            From: ENV.twilioWhatsappFrom,
            To: `whatsapp:${e164}`,
            Body: body,
          });
          await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${ENV.twilioAccountSid}/Messages.json`,
            {
              method: "POST",
              headers: {
                "Authorization": "Basic " + Buffer.from(`${ENV.twilioAccountSid}:${ENV.twilioAuthToken}`).toString("base64"),
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: params.toString(),
            }
          );
        } catch (err) {
          console.warn("[Waitlist] WhatsApp invite failed (non-fatal):", err);
        }
      }

      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
