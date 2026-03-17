/**
 * VOOM Ghana — Product Image Assignment Script
 * Run: npx tsx server/seed-images.ts
 *
 * Assigns 3 real stock images to every product from the category image pool.
 * Images are served from /images/parts/ (client/public/images/parts/).
 */

import { getDb } from "./db";
import { products } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// 6 images per category — filename base matches what was downloaded
const CAT_IMAGES: Record<number, string[]> = {
  1:  ["parts-cat-1-engine_1.jpg","parts-cat-1-engine_2.jpg","parts-cat-1-engine_3.jpg","parts-cat-1-engine_4.jpg","parts-cat-1-engine_5.jpg","parts-cat-1-engine_6.jpg"],
  2:  ["parts-cat-2-brakes_1.jpg","parts-cat-2-brakes_2.jpg","parts-cat-2-brakes_3.jpg","parts-cat-2-brakes_4.jpg","parts-cat-2-brakes_5.jpg","parts-cat-2-brakes_6.jpg"],
  3:  ["parts-cat-3-exterior_1.jpg","parts-cat-3-exterior_2.jpg","parts-cat-3-exterior_3.jpg","parts-cat-3-exterior_4.jpg","parts-cat-3-exterior_5.jpg","parts-cat-3-exterior_6.jpg"],
  4:  ["parts-cat-4-lighting_1.jpg","parts-cat-4-lighting_2.jpg","parts-cat-4-lighting_3.jpg","parts-cat-4-lighting_4.jpg","parts-cat-4-lighting_5.jpg","parts-cat-4-lighting_6.jpg"],
  5:  ["parts-cat-5-cooling_1.jpg","parts-cat-5-cooling_2.jpg","parts-cat-5-cooling_3.jpg","parts-cat-5-cooling_4.jpg","parts-cat-5-cooling_5.jpg","parts-cat-5-cooling_6.jpg"],
  6:  ["parts-cat-6-filters_1.jpg","parts-cat-6-filters_2.jpg","parts-cat-6-filters_3.jpg","parts-cat-6-filters_4.jpg","parts-cat-6-filters_5.jpg","parts-cat-6-filters_6.jpg"],
  7:  ["parts-cat-7-transmission_1.jpg","parts-cat-7-transmission_2.jpg","parts-cat-7-transmission_3.jpg","parts-cat-7-transmission_4.jpg","parts-cat-7-transmission_5.jpg","parts-cat-7-transmission_6.jpg"],
  8:  ["parts-cat-8-electrical_1.jpg","parts-cat-8-electrical_2.jpg","parts-cat-8-electrical_3.jpg","parts-cat-8-electrical_4.jpg","parts-cat-8-electrical_5.jpg","parts-cat-8-electrical_6.jpg"],
  9:  ["parts-cat-9-wheels_1.jpg","parts-cat-9-wheels_2.jpg","parts-cat-9-wheels_3.jpg","parts-cat-9-wheels_4.jpg","parts-cat-9-wheels_5.jpg","parts-cat-9-wheels_6.jpg"],
  10: ["parts-cat-10-interior_1.jpg","parts-cat-10-interior_2.jpg","parts-cat-10-interior_3.jpg","parts-cat-10-interior_4.jpg","parts-cat-10-interior_5.jpg","parts-cat-10-interior_6.jpg"],
  11: ["parts-cat-11-audio_1.jpg","parts-cat-11-audio_2.jpg","parts-cat-11-audio_3.jpg","parts-cat-11-audio_4.jpg","parts-cat-11-audio_5.jpg","parts-cat-11-audio_6.jpg"],
  12: ["parts-cat-12-safety_1.jpg","parts-cat-12-safety_2.jpg","parts-cat-12-safety_3.jpg","parts-cat-12-safety_4.jpg","parts-cat-12-safety_5.jpg","parts-cat-12-safety_6.jpg"],
};

const BASE = "/images/parts/";

/** Pick 3 images from pool, starting at offset to spread variety across products */
function pick3(pool: string[], offset: number): string[] {
  const n = pool.length;
  return [
    BASE + pool[offset % n],
    BASE + pool[(offset + 2) % n],
    BASE + pool[(offset + 4) % n],
  ];
}

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB connection failed");

  // Fetch all products ordered by category then id so offset cycles nicely
  const all = await db
    .select({ id: products.id, categoryId: products.categoryId })
    .from(products)
    .orderBy(products.categoryId, products.id);

  console.log(`Updating images for ${all.length} products...`);

  // Track position within each category to vary the starting image
  const catOffset: Record<number, number> = {};

  let updated = 0;
  for (const p of all) {
    const catId = p.categoryId ?? 1;
    const pool = CAT_IMAGES[catId] ?? CAT_IMAGES[1];
    const offset = catOffset[catId] ?? 0;
    catOffset[catId] = offset + 1;

    const imgs = pick3(pool, offset);

    await db.update(products)
      .set({ images: imgs })
      .where(eq(products.id, p.id));

    updated++;
    if (updated % 40 === 0) console.log(`  ✓ ${updated}/${all.length}`);
  }

  console.log(`\nDone! ${updated} products updated with 3 images each.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
