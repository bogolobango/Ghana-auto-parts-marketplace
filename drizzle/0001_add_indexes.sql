-- Performance indexes for Voom Ghana Marketplace
-- Run after 0000_initial_postgres.sql

-- Users: phone lookup for OTP auth
CREATE INDEX IF NOT EXISTS "idx_users_phone" ON "users" ("phone");
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users" ("role");

-- Vendors: lookup by userId, filter by status
CREATE INDEX IF NOT EXISTS "idx_vendors_userId" ON "vendors" ("userId");
CREATE INDEX IF NOT EXISTS "idx_vendors_status" ON "vendors" ("status");

-- Products: search and filter performance
CREATE INDEX IF NOT EXISTS "idx_products_vendorId" ON "products" ("vendorId");
CREATE INDEX IF NOT EXISTS "idx_products_categoryId" ON "products" ("categoryId");
CREATE INDEX IF NOT EXISTS "idx_products_status" ON "products" ("status");
CREATE INDEX IF NOT EXISTS "idx_products_status_createdAt" ON "products" ("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_products_vehicleMake" ON "products" ("vehicleMake");
CREATE INDEX IF NOT EXISTS "idx_products_vehicleMake_model" ON "products" ("vehicleMake", "vehicleModel");
CREATE INDEX IF NOT EXISTS "idx_products_featured" ON "products" ("featured") WHERE "featured" = true;
CREATE INDEX IF NOT EXISTS "idx_products_name_trgm" ON "products" USING gin ("name" gin_trgm_ops);

-- Cart: lookup by userId
CREATE INDEX IF NOT EXISTS "idx_cart_userId" ON "cart_items" ("userId");
CREATE INDEX IF NOT EXISTS "idx_cart_userId_productId" ON "cart_items" ("userId", "productId");

-- Orders: lookup by userId, vendorId, status
CREATE INDEX IF NOT EXISTS "idx_orders_userId" ON "orders" ("userId");
CREATE INDEX IF NOT EXISTS "idx_orders_vendorId" ON "orders" ("vendorId");
CREATE INDEX IF NOT EXISTS "idx_orders_status" ON "orders" ("status");
CREATE INDEX IF NOT EXISTS "idx_orders_createdAt" ON "orders" ("createdAt" DESC);

-- Order items: lookup by orderId
CREATE INDEX IF NOT EXISTS "idx_orderItems_orderId" ON "order_items" ("orderId");
CREATE INDEX IF NOT EXISTS "idx_orderItems_productId" ON "order_items" ("productId");

-- Reviews: lookup by vendorId
CREATE INDEX IF NOT EXISTS "idx_reviews_vendorId" ON "reviews" ("vendorId");
CREATE INDEX IF NOT EXISTS "idx_reviews_userId_vendorId" ON "reviews" ("userId", "vendorId");

-- Notifications: lookup by userId, filter unread
CREATE INDEX IF NOT EXISTS "idx_notifications_userId" ON "notifications" ("userId");
CREATE INDEX IF NOT EXISTS "idx_notifications_userId_read" ON "notifications" ("userId", "read");

-- Inquiries: lookup by vendorId, buyerId
CREATE INDEX IF NOT EXISTS "idx_inquiries_vendorId" ON "inquiries" ("vendorId");
CREATE INDEX IF NOT EXISTS "idx_inquiries_buyerId" ON "inquiries" ("buyerId");

-- Vehicle models: lookup by makeId
CREATE INDEX IF NOT EXISTS "idx_vehicleModels_makeId" ON "vehicle_models" ("makeId");

-- NOTE: The gin_trgm_ops index on products.name requires the pg_trgm extension.
-- If not available, you can skip that index. Run this first:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
