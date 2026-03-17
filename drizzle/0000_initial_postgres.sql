-- Initial PostgreSQL migration for Voom Ghana Marketplace
-- Migrated from MySQL to PostgreSQL (Supabase)

-- Enums
CREATE TYPE "role" AS ENUM ('user', 'admin', 'vendor');
CREATE TYPE "vendor_status" AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE "condition" AS ENUM ('new', 'used', 'refurbished');
CREATE TYPE "product_status" AS ENUM ('active', 'inactive', 'out_of_stock');
CREATE TYPE "order_status" AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');
CREATE TYPE "payment_method" AS ENUM ('pay_on_delivery', 'bank_transfer', 'mobile_money');
CREATE TYPE "payment_status" AS ENUM ('unpaid', 'paid', 'refunded');
CREATE TYPE "notification_type" AS ENUM ('order', 'vendor', 'system', 'inventory', 'inquiry');
CREATE TYPE "inquiry_status" AS ENUM ('pending', 'responded', 'sold', 'closed');

-- Users
CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "openId" VARCHAR(64) NOT NULL UNIQUE,
  "name" TEXT,
  "email" VARCHAR(320),
  "phone" VARCHAR(20),
  "loginMethod" VARCHAR(64),
  "role" "role" NOT NULL DEFAULT 'user',
  "otpCode" VARCHAR(10),
  "otpExpiresAt" TIMESTAMP,
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "lastSignedIn" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Vendors
CREATE TABLE "vendors" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "businessName" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "phone" VARCHAR(20) NOT NULL,
  "whatsapp" VARCHAR(20),
  "email" VARCHAR(320),
  "address" TEXT,
  "city" VARCHAR(100),
  "region" VARCHAR(100),
  "latitude" DECIMAL(10, 7),
  "longitude" DECIMAL(10, 7),
  "logoUrl" TEXT,
  "coverUrl" TEXT,
  "status" "vendor_status" NOT NULL DEFAULT 'pending',
  "rating" DECIMAL(3, 2) DEFAULT '0',
  "totalSales" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Categories
CREATE TABLE "categories" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL,
  "slug" VARCHAR(100) NOT NULL UNIQUE,
  "icon" VARCHAR(50),
  "parentId" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Vehicle reference tables
CREATE TABLE "vehicle_makes" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE "vehicle_models" (
  "id" SERIAL PRIMARY KEY,
  "makeId" INTEGER NOT NULL,
  "name" VARCHAR(100) NOT NULL
);

-- Products
CREATE TABLE "products" (
  "id" SERIAL PRIMARY KEY,
  "vendorId" INTEGER NOT NULL,
  "categoryId" INTEGER,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "price" DECIMAL(12, 2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'GHS',
  "sku" VARCHAR(100),
  "brand" VARCHAR(100),
  "condition" "condition" NOT NULL DEFAULT 'new',
  "vehicleMake" VARCHAR(100),
  "vehicleModel" VARCHAR(100),
  "yearFrom" INTEGER,
  "yearTo" INTEGER,
  "oemPartNumber" VARCHAR(100),
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "minOrderQty" INTEGER DEFAULT 1,
  "images" JSON,
  "status" "product_status" NOT NULL DEFAULT 'active',
  "featured" BOOLEAN DEFAULT false,
  "views" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Cart items
CREATE TABLE "cart_items" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Orders
CREATE TABLE "orders" (
  "id" SERIAL PRIMARY KEY,
  "orderNumber" VARCHAR(20) NOT NULL UNIQUE,
  "userId" INTEGER NOT NULL,
  "vendorId" INTEGER NOT NULL,
  "status" "order_status" NOT NULL DEFAULT 'pending',
  "paymentMethod" "payment_method" NOT NULL DEFAULT 'pay_on_delivery',
  "paymentStatus" "payment_status" NOT NULL DEFAULT 'unpaid',
  "totalAmount" DECIMAL(12, 2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'GHS',
  "shippingAddress" TEXT,
  "shippingCity" VARCHAR(100),
  "shippingRegion" VARCHAR(100),
  "buyerPhone" VARCHAR(20),
  "buyerName" VARCHAR(255),
  "notes" TEXT,
  "statusHistory" JSON,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Order items
CREATE TABLE "order_items" (
  "id" SERIAL PRIMARY KEY,
  "orderId" INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  "productName" VARCHAR(255) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DECIMAL(12, 2) NOT NULL,
  "totalPrice" DECIMAL(12, 2) NOT NULL
);

-- Reviews
CREATE TABLE "reviews" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "vendorId" INTEGER NOT NULL,
  "productId" INTEGER,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE "notifications" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "message" TEXT NOT NULL,
  "type" "notification_type" NOT NULL DEFAULT 'system',
  "read" BOOLEAN NOT NULL DEFAULT false,
  "link" VARCHAR(500),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inquiries
CREATE TABLE "inquiries" (
  "id" SERIAL PRIMARY KEY,
  "buyerId" INTEGER NOT NULL,
  "vendorId" INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  "message" TEXT,
  "buyerPhone" VARCHAR(20),
  "buyerName" VARCHAR(255),
  "status" "inquiry_status" NOT NULL DEFAULT 'pending',
  "vendorNotes" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed vehicle makes
INSERT INTO "vehicle_makes" ("name") VALUES
  ('Toyota'), ('Nissan'), ('Honda'), ('Hyundai'), ('Kia'),
  ('Mercedes-Benz'), ('BMW'), ('Volkswagen'), ('Ford'), ('Chevrolet'),
  ('Mitsubishi'), ('Suzuki'), ('Mazda'), ('Peugeot'), ('Renault'),
  ('Isuzu'), ('Land Rover'), ('Jeep'), ('Subaru'), ('Lexus');

-- Seed vehicle models
INSERT INTO "vehicle_models" ("makeId", "name") VALUES
  -- Toyota (1)
  (1, 'Corolla'), (1, 'Camry'), (1, 'RAV4'), (1, 'Hilux'), (1, 'Land Cruiser'),
  (1, 'Yaris'), (1, 'Prado'), (1, 'Fortuner'), (1, 'Avensis'), (1, 'Vitz'),
  -- Nissan (2)
  (2, 'Almera'), (2, 'Sentra'), (2, 'X-Trail'), (2, 'Pathfinder'), (2, 'Patrol'),
  (2, 'Navara'), (2, 'Juke'), (2, 'Qashqai'),
  -- Honda (3)
  (3, 'Civic'), (3, 'Accord'), (3, 'CR-V'), (3, 'HR-V'), (3, 'Fit'),
  (3, 'City'), (3, 'Pilot'),
  -- Hyundai (4)
  (4, 'Elantra'), (4, 'Tucson'), (4, 'Santa Fe'), (4, 'Accent'), (4, 'Creta'),
  (4, 'i10'), (4, 'i20'), (4, 'Sonata'),
  -- Kia (5)
  (5, 'Sportage'), (5, 'Sorento'), (5, 'Rio'), (5, 'Cerato'), (5, 'Picanto'),
  (5, 'Seltos'),
  -- Mercedes-Benz (6)
  (6, 'C-Class'), (6, 'E-Class'), (6, 'S-Class'), (6, 'GLC'), (6, 'GLE'),
  (6, 'Sprinter'),
  -- BMW (7)
  (7, '3 Series'), (7, '5 Series'), (7, 'X3'), (7, 'X5'),
  -- Volkswagen (8)
  (8, 'Golf'), (8, 'Polo'), (8, 'Tiguan'), (8, 'Passat'),
  -- Ford (9)
  (9, 'Ranger'), (9, 'Escape'), (9, 'Explorer'), (9, 'Focus'), (9, 'EcoSport'),
  -- Chevrolet (10)
  (10, 'Cruze'), (10, 'Spark'), (10, 'Equinox'),
  -- Mitsubishi (11)
  (11, 'L200'), (11, 'Pajero'), (11, 'Outlander'), (11, 'ASX'),
  -- Suzuki (12)
  (12, 'Swift'), (12, 'Vitara'), (12, 'Alto'), (12, 'Jimny'),
  -- Mazda (13)
  (13, 'Mazda3'), (13, 'CX-5'), (13, 'CX-3'),
  -- Peugeot (14)
  (14, '308'), (14, '508'), (14, '3008'),
  -- Renault (15)
  (15, 'Duster'), (15, 'Kwid'), (15, 'Logan'),
  -- Isuzu (16)
  (16, 'D-Max'), (16, 'MU-X'),
  -- Land Rover (17)
  (17, 'Defender'), (17, 'Discovery'), (17, 'Range Rover Sport'),
  -- Jeep (18)
  (18, 'Wrangler'), (18, 'Grand Cherokee'), (18, 'Cherokee'),
  -- Subaru (19)
  (19, 'Forester'), (19, 'Outback'), (19, 'Impreza'),
  -- Lexus (20)
  (20, 'RX'), (20, 'ES'), (20, 'NX');
