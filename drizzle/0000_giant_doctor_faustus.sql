CREATE TYPE "public"."notification_type" AS ENUM('order', 'vendor', 'system', 'inventory');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."product_condition" AS ENUM('new', 'used', 'refurbished');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('active', 'inactive', 'out_of_stock');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'vendor');--> statement-breakpoint
CREATE TYPE "public"."vendor_status" AS ENUM('pending', 'approved', 'rejected', 'suspended');--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"productId" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"icon" varchar(50),
	"parentId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"type" "notification_type" DEFAULT 'system' NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"link" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"productId" integer NOT NULL,
	"productName" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"unitPrice" numeric(12, 2) NOT NULL,
	"totalPrice" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderNumber" varchar(20) NOT NULL,
	"userId" integer NOT NULL,
	"vendorId" integer NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"totalAmount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'GHS' NOT NULL,
	"shippingAddress" text,
	"shippingCity" varchar(100),
	"shippingRegion" varchar(100),
	"buyerPhone" varchar(20),
	"buyerName" varchar(255),
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_orderNumber_unique" UNIQUE("orderNumber")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendorId" integer NOT NULL,
	"categoryId" integer,
	"name" varchar(255) NOT NULL,
	"description" text,
	"price" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'GHS' NOT NULL,
	"sku" varchar(100),
	"brand" varchar(100),
	"condition" "product_condition" DEFAULT 'new' NOT NULL,
	"vehicleMake" varchar(100),
	"vehicleModel" varchar(100),
	"yearFrom" integer,
	"yearTo" integer,
	"quantity" integer DEFAULT 0 NOT NULL,
	"minOrderQty" integer DEFAULT 1,
	"images" json,
	"status" "product_status" DEFAULT 'active' NOT NULL,
	"featured" boolean DEFAULT false,
	"views" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"vendorId" integer NOT NULL,
	"productId" integer,
	"rating" integer NOT NULL,
	"comment" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"phone" varchar(20),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"businessName" varchar(255) NOT NULL,
	"description" text,
	"phone" varchar(20) NOT NULL,
	"whatsapp" varchar(20),
	"email" varchar(320),
	"address" text,
	"city" varchar(100),
	"region" varchar(100),
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"logoUrl" text,
	"coverUrl" text,
	"status" "vendor_status" DEFAULT 'pending' NOT NULL,
	"rating" numeric(3, 2) DEFAULT '0',
	"totalSales" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
