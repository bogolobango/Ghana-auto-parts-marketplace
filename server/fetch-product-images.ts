/**
 * VOOM Ghana — Fetch Real Product Images
 * Run: npx tsx server/fetch-product-images.ts
 *
 * Maps every product to a specific part type, downloads 3 real product
 * images from web image search results, saves them to
 * client/public/images/parts/specific/, and updates the DB.
 */

import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import { getDb } from "./db";
import { products } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ── Part-type map ─────────────────────────────────────────────────────────────
// Maps keywords found in product names → part-type keys from product-image-map.json

const NAME_TO_KEY: [RegExp, string][] = [
  // Engine
  [/timing belt/i,        "timing-belt"],
  [/spark plug/i,         "spark-plugs"],
  [/engine mount/i,       "engine-mount"],
  [/ignition coil/i,      "ignition-coil"],
  [/fuel injector/i,      "fuel-injector"],
  [/alternator/i,         "alternator"],
  [/starter motor/i,      "starter-motor"],
  [/fuel pump/i,          "fuel-pump"],
  [/valve cover/i,        "valve-cover-gasket"],
  [/throttle body/i,      "throttle-body"],
  [/engine block/i,       "alternator"],
  [/turbocharger/i,       "fuel-injector"],
  [/camshaft/i,           "valve-cover-gasket"],
  [/egr valve/i,          "throttle-body"],
  [/flywheel/i,           "engine-mount"],
  [/crankshaft/i,         "timing-belt"],
  [/drive belt/i,         "timing-belt"],
  [/intake manifold/i,    "throttle-body"],
  // Brakes
  [/brake pad/i,          "brake-pads"],
  [/shock absorber/i,     "shock-absorber"],
  [/brake disc|brake rotor/i, "brake-rotor"],
  [/control arm/i,        "control-arm"],
  [/power steering rack/i,"control-arm"],
  [/wheel bearing|hub bearing/i, "wheel-bearing"],
  [/cv axle|driveshaft/i, "cv-axle"],
  [/tie rod/i,            "tie-rod-end"],
  [/brake caliper/i,      "brake-caliper"],
  [/coil spring/i,        "coil-spring"],
  [/ball joint/i,         "ball-joint"],
  [/strut assembly/i,     "shock-absorber"],
  [/leaf spring/i,        "coil-spring"],
  [/bushing kit/i,        "control-arm"],
  [/stabilizer|sway bar/i,"tie-rod-end"],
  [/master cylinder/i,    "brake-caliper"],
  [/brake master/i,       "brake-caliper"],
  // Exterior
  [/front bumper/i,       "front-bumper"],
  [/rear bumper/i,        "front-bumper"],
  [/door handle/i,        "door-handle"],
  [/side mirror|wing mirror/i, "side-mirror"],
  [/hood|bonnet/i,        "car-hood"],
  [/grille/i,             "front-grille"],
  [/windshield|windscreen/i, "windshield"],
  [/fender|quarter panel/i, "car-fender"],
  [/running board/i,      "front-bumper"],
  [/roof rack/i,          "front-bumper"],
  [/spoiler/i,            "front-bumper"],
  [/fender liner/i,       "car-fender"],
  [/tailgate/i,           "car-hood"],
  [/door(?! handle)/i,    "car-fender"],
  // Lighting
  [/headlight/i,          "headlight-assembly"],
  [/tail light|tail lamp/i, "led-tail-light"],
  [/h4 led|h7 led|led bulb/i, "led-headlight-bulb"],
  [/fog light/i,          "fog-light-kit"],
  [/drl|daytime running/i,"drl-led"],
  [/turn signal/i,        "drl-led"],
  [/license plate light/i,"led-headlight-bulb"],
  [/interior light|led interior/i,"led-headlight-bulb"],
  [/led reverse/i,        "led-headlight-bulb"],
  [/third brake/i,        "led-tail-light"],
  [/side marker/i,        "drl-led"],
  [/halogen bulb/i,       "led-headlight-bulb"],
  [/led light bar/i,      "fog-light-kit"],
  // Cooling
  [/radiator(?! cap| fan)/i, "car-radiator"],
  [/ac compressor/i,      "ac-compressor"],
  [/thermostat/i,         "thermostat"],
  [/radiator fan|cooling fan/i, "radiator-fan"],
  [/ac condenser/i,       "ac-condenser"],
  [/intercooler/i,        "ac-condenser"],
  [/coolant reservoir|expansion tank/i, "thermostat"],
  [/heater core|heater matrix/i, "car-radiator"],
  [/radiator cap/i,       "thermostat"],
  [/oil cooler/i,         "ac-condenser"],
  [/radiator hose/i,      "car-radiator"],
  [/ac evaporator/i,      "ac-condenser"],
  // Filters & Fluids
  [/oil filter/i,         "oil-filter"],
  [/cabin.*filter|pollen filter/i, "cabin-filter"],
  [/fuel filter/i,        "fuel-filter"],
  [/engine oil|motor oil/i, "engine-oil"],
  [/air filter/i,         "air-filter"],
  [/transmission fluid|atf/i, "engine-oil"],
  [/coolant|antifreeze/i, "engine-oil"],
  [/brake fluid/i,        "engine-oil"],
  [/power steering fluid/i, "engine-oil"],
  [/transmission filter/i,"oil-filter"],
  [/washer fluid/i,       "engine-oil"],
  // Transmission & Clutch
  [/clutch kit/i,         "clutch-kit"],
  [/torque converter/i,   "torque-converter"],
  [/gearbox mount|transmission mount/i, "gearbox"],
  [/clutch disc/i,        "clutch-kit"],
  [/transfer case/i,      "gearbox"],
  [/shift cable|gear selector/i, "gearbox"],
  [/differential/i,       "torque-converter"],
  [/propeller shaft|prop shaft/i, "cv-axle"],
  [/release bearing/i,    "clutch-kit"],
  [/transmission(?! fluid| filter| mount)/i, "gearbox"],
  [/pressure plate/i,     "clutch-kit"],
  // Electrical
  [/battery/i,            "car-battery"],
  [/window regulator/i,   "window-regulator"],
  [/oxygen sensor|lambda sensor|o2 sensor/i, "oxygen-sensor"],
  [/door lock actuator/i, "door-lock-actuator"],
  [/crankshaft.*sensor|crank.*sensor/i, "oxygen-sensor"],
  [/ecu|engine control unit/i, "oxygen-sensor"],
  [/abs.*sensor|wheel speed/i, "oxygen-sensor"],
  [/blower motor/i,       "window-regulator"],
  [/ignition switch/i,    "oxygen-sensor"],
  [/maf sensor|map sensor/i, "oxygen-sensor"],
  [/horn/i,               "door-lock-actuator"],
  [/relay/i,              "car-battery"],
  [/fuse box|wiring harness/i, "car-battery"],
  // Wheels & Tires
  [/tire|tyre/i,          "car-tire"],
  [/alloy.*rim|alloy.*wheel|rim.*set/i, "alloy-rim"],
  [/steel rim|steel wheel/i, "car-tire"],
  [/spare tire/i,         "car-tire"],
  [/wheel cover|hubcap/i, "wheel-cover"],
  [/tpms/i,               "tpms-sensor"],
  [/lug nut/i,            "wheel-cover"],
  [/wheel spacer/i,       "alloy-rim"],
  [/wheel stud/i,         "wheel-cover"],
  // Interior
  [/seat cover/i,         "seat-cover"],
  [/floor mat/i,          "floor-mat"],
  [/steering wheel/i,     "seat-cover"],
  [/seat belt|seatbelt/i, "seat-belt"],
  [/gear knob|gear shift/i, "floor-mat"],
  [/rearview mirror|rear view mirror/i, "floor-mat"],
  [/airbag/i,             "seat-belt"],
  [/instrument cluster/i, "seat-belt"],
  [/glove box/i,          "floor-mat"],
  [/center console|organizer/i, "floor-mat"],
  [/sun visor/i,          "seat-cover"],
  [/armrest|seat(?! cover| belt)/i, "seat-cover"],
  // Audio
  [/android.*stereo|head unit|car stereo/i, "car-stereo"],
  [/speaker/i,            "car-speaker"],
  [/subwoofer|sub woofer/i, "car-subwoofer"],
  [/amplifier|amp/i,      "car-subwoofer"],
  [/gps navigator/i,      "gps-tracker"],
  [/reverse camera|backup camera/i, "reverse-camera"],
  [/dash cam|dashcam/i,   "dash-cam"],
  [/bluetooth.*adapter|fm transmitter/i, "car-stereo"],
  [/carplay|android auto/i, "car-stereo"],
  [/usb.*charger|car charger/i, "car-stereo"],
  // Safety
  [/gps.*tracker|vehicle tracker/i, "gps-tracker"],
  [/car alarm/i,          "car-alarm"],
  [/central locking/i,    "car-alarm"],
  [/immobilizer/i,        "car-alarm"],
  [/parking sensor/i,     "parking-sensor"],
  [/fire extinguisher/i,  "fire-extinguisher"],
  [/warning triangle/i,   "fire-extinguisher"],
  [/wheel clamp|wheel lock/i, "car-alarm"],
];

function getPartKey(name: string): string {
  for (const [rx, key] of NAME_TO_KEY) {
    if (rx.test(name)) return key;
  }
  return "timing-belt"; // default fallback
}

// ── Download helper ───────────────────────────────────────────────────────────

async function downloadImage(url: string, dest: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const client = url.startsWith("https") ? https : http;
      const req = client.get(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; VoomBot/1.0)" },
        timeout: 12000,
      }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          // follow one redirect
          const location = res.headers.location;
          if (location) { resolve(downloadImage(location, dest)); return; }
        }
        if (!res.statusCode || res.statusCode >= 400) { resolve(false); return; }
        const ct = res.headers["content-type"] || "";
        if (!ct.startsWith("image/")) { resolve(false); return; }

        const out = fs.createWriteStream(dest);
        res.pipe(out);
        out.on("finish", () => { out.close(); resolve(true); });
        out.on("error", () => resolve(false));
      });
      req.on("error", () => resolve(false));
      req.on("timeout", () => { req.destroy(); resolve(false); });
    } catch { resolve(false); }
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB connection failed");

  // Load image URL map
  const mapPath = path.join(process.cwd(), "data/product-image-map.json");
  if (!fs.existsSync(mapPath)) {
    console.error("Missing data/product-image-map.json — run the code_execution step first.");
    process.exit(1);
  }
  const imageMap: Record<string, string[]> = JSON.parse(fs.readFileSync(mapPath, "utf8"));

  // Output directory
  const outDir = path.join(process.cwd(), "client/public/images/parts/specific");
  fs.mkdirSync(outDir, { recursive: true });

  // Fetch all products
  const all = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .orderBy(products.id);

  console.log(`Processing ${all.length} products...`);

  let updated = 0, skipped = 0, fallback = 0;

  for (const p of all) {
    const key    = getPartKey(p.name);
    const pool   = imageMap[key] ?? [];

    const localUrls: string[] = [];

    for (let i = 0; i < 3; i++) {
      const rawUrl = pool[i % pool.length];
      if (!rawUrl) break;

      // Sanitise filename
      const ext  = rawUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[1] ?? "jpg";
      const fname = `p${p.id}-${key}-${i + 1}.${ext}`;
      const dest  = path.join(outDir, fname);
      const publicUrl = `/images/parts/specific/${fname}`;

      // Skip download if already exists
      if (fs.existsSync(dest)) {
        localUrls.push(publicUrl);
        continue;
      }

      const ok = await downloadImage(rawUrl, dest);
      if (ok) {
        localUrls.push(publicUrl);
      } else {
        // Fallback to category-pool image
        fallback++;
      }
    }

    if (localUrls.length === 0) {
      skipped++;
      continue;
    }

    // Pad to 3 with category fallback images if needed
    const catId = Math.ceil(all.indexOf(p) / 20) + 1 || 1;
    const catKey = ["engine","brakes","exterior","lighting","cooling",
                    "filters","transmission","electrical","wheels","interior","audio","safety"][Math.min(catId - 1, 11)];
    while (localUrls.length < 3) {
      const n = (localUrls.length % 6) + 1;
      localUrls.push(`/images/parts/parts-cat-${catId}-${catKey}_${n}.jpg`);
    }

    await db.update(products)
      .set({ images: localUrls })
      .where(eq(products.id, p.id));

    updated++;
    if (updated % 30 === 0) {
      console.log(`  ✓ ${updated}/${all.length} updated`);
    }
  }

  console.log(`\nDone!`);
  console.log(`  Updated:  ${updated}`);
  console.log(`  Fallback: ${fallback} images fell back to category pool`);
  console.log(`  Skipped:  ${skipped}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
