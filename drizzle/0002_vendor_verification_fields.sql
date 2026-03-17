-- Add identity verification fields to vendors table
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "ghanaCardNumber" VARCHAR(30);
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "ghanaCardImageUrl" TEXT;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "businessRegNumber" VARCHAR(50);
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "businessRegImageUrl" TEXT;

-- Auto-approve any existing pending vendors (MVP migration fix)
UPDATE "vendors" SET "status" = 'approved' WHERE "status" = 'pending';
