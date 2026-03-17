CREATE TYPE "public"."payment_method" AS ENUM('pay_on_delivery', 'mobile_money', 'card');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'paid', 'refunded');--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paymentMethod" "payment_method" DEFAULT 'pay_on_delivery' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paymentStatus" "payment_status" DEFAULT 'unpaid' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paymentReference" varchar(255);