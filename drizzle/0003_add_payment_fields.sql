-- Add payment fields to orders table
DO $$ BEGIN
  CREATE TYPE "payment_method" AS ENUM ('pay_on_delivery', 'mobile_money', 'card');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "payment_status" AS ENUM ('unpaid', 'paid', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentMethod" "payment_method" NOT NULL DEFAULT 'pay_on_delivery';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentStatus" "payment_status" NOT NULL DEFAULT 'unpaid';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentReference" VARCHAR(255);
