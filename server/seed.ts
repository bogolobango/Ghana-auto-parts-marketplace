/**
 * VOOM Ghana — Database Seed Script
 * Run: npx tsx server/seed.ts
 *
 * Seeds categories, demo vendors, and realistic parts listings
 * based on Ghana market data (Tonaton, Jiji pricing).
 */

import { db } from "./db";
import { categories, vendors, users, products } from "../drizzle/schema";
import { sql } from "drizzle-orm";

// ── Categories ──────────────────────────────────────────────
const CATEGORIES = [
  { id: 1,  name: "Engine & Drivetrain",           slug: "engine-drivetrain",          icon: "Cog" },
  { id: 2,  name: "Brakes, Suspension & Steering", slug: "brakes-suspension-steering", icon: "CircleDot" },
  { id: 3,  name: "Exterior & Body Parts",          slug: "exterior-body",              icon: "Car" },
  { id: 4,  name: "Headlights & Lighting",          slug: "headlights-lighting",        icon: "Lightbulb" },
  { id: 5,  name: "Cooling System",                 slug: "cooling-system",             icon: "Thermometer" },
  { id: 6,  name: "Filters & Fluids",               slug: "filters-fluids",             icon: "Droplets" },
  { id: 7,  name: "Transmission & Clutch",          slug: "transmission-clutch",        icon: "Settings" },
  { id: 8,  name: "Electrical & Electronics",       slug: "electrical-electronics",     icon: "Zap" },
  { id: 9,  name: "Wheels & Tires",                 slug: "wheels-tires",               icon: "Circle" },
  { id: 10, name: "Interior & Accessories",         slug: "interior-accessories",       icon: "Armchair" },
  { id: 11, name: "Audio & Entertainment",          slug: "audio-entertainment",        icon: "Music" },
  { id: 12, name: "Safety & Security",              slug: "safety-security",            icon: "Shield" },
];

// ── Demo vendors ─────────────────────────────────────────────
// These are inserted via raw SQL since we need predictable IDs
const DEMO_USERS = [
  { id: 9001, email: "tonaton@voom.gh",  name: "Tonaton Auto Parts",   passwordHash: "$2b$10$demo", role: "vendor" as const },
  { id: 9002, email: "jiji@voom.gh",     name: "Jiji Spare Parts Hub", passwordHash: "$2b$10$demo", role: "vendor" as const },
];

const DEMO_VENDORS = [
  { id: 9001, userId: 9001, businessName: "Tonaton Auto Parts",   phone: "+233200000001", whatsapp: "+233200000001", email: "tonaton@voom.gh",  address: "Abossey Okai", city: "Accra", region: "Greater Accra", description: "Wide selection of new and used auto parts for all major vehicle makes.", status: "approved" as const },
  { id: 9002, userId: 9002, businessName: "Jiji Spare Parts Hub", phone: "+233200000002", whatsapp: "+233200000002", email: "jiji@voom.gh",     address: "Abossey Okai", city: "Accra", region: "Greater Accra", description: "Quality spare parts at competitive prices from trusted Ghana dealers.",  status: "approved" as const },
];

// ── Seed listings ─────────────────────────────────────────────
// Prices in GHS (stored as decimal, displayed directly — NOT pesewas)
const LISTINGS = [
  // Toyota Corolla
  { name: "Front Brake Pads - Toyota Corolla 2009–2019",         categoryId: 2, vendorId: 9001, make: "Toyota", model: "Corolla", yf: 2009, yt: 2019, price: "150.00",   condition: "new"  as const },
  { name: "Rear Brake Pads - Toyota Corolla 2014–2019",          categoryId: 2, vendorId: 9002, make: "Toyota", model: "Corolla", yf: 2014, yt: 2019, price: "120.00",   condition: "new"  as const },
  { name: "Front Shock Absorber Pair - Toyota Corolla 2008–2013",categoryId: 2, vendorId: 9001, make: "Toyota", model: "Corolla", yf: 2008, yt: 2013, price: "450.00",   condition: "new"  as const },
  { name: "Radiator - Toyota Corolla 2009–2013",                 categoryId: 5, vendorId: 9002, make: "Toyota", model: "Corolla", yf: 2009, yt: 2013, price: "650.00",   condition: "new"  as const },
  { name: "AC Condenser - Toyota Corolla 2014–2019",             categoryId: 5, vendorId: 9001, make: "Toyota", model: "Corolla", yf: 2014, yt: 2019, price: "550.00",   condition: "new"  as const },
  { name: "Headlight Assembly Left - Toyota Corolla 2014–2017",  categoryId: 4, vendorId: 9001, make: "Toyota", model: "Corolla", yf: 2014, yt: 2017, price: "850.00",   condition: "new"  as const },
  { name: "Headlight Assembly Right - Toyota Corolla 2014–2017", categoryId: 4, vendorId: 9002, make: "Toyota", model: "Corolla", yf: 2014, yt: 2017, price: "850.00",   condition: "new"  as const },
  { name: "Tail Light Left - Toyota Corolla 2014–2017",          categoryId: 4, vendorId: 9002, make: "Toyota", model: "Corolla", yf: 2014, yt: 2017, price: "350.00",   condition: "new"  as const },
  { name: "Lower Control Arm - Toyota Corolla 2009–2019",        categoryId: 2, vendorId: 9001, make: "Toyota", model: "Corolla", yf: 2009, yt: 2019, price: "250.00",   condition: "new"  as const },
  { name: "Tie Rod End Pair - Toyota Corolla 2009–2019",         categoryId: 2, vendorId: 9002, make: "Toyota", model: "Corolla", yf: 2009, yt: 2019, price: "180.00",   condition: "new"  as const },
  { name: "Stabilizer Link - Toyota Corolla 2009–2019",          categoryId: 2, vendorId: 9001, make: "Toyota", model: "Corolla", yf: 2009, yt: 2019, price: "80.00",    condition: "new"  as const },
  { name: "Oil Filter - Toyota Corolla (All Years)",             categoryId: 6, vendorId: 9002, make: "Toyota", model: "Corolla", yf: 2003, yt: 2024, price: "35.00",    condition: "new"  as const },
  { name: "Air Filter - Toyota Corolla 2009–2019",               categoryId: 6, vendorId: 9001, make: "Toyota", model: "Corolla", yf: 2009, yt: 2019, price: "45.00",    condition: "new"  as const },
  { name: "Spark Plug Set 4pcs - Toyota Corolla 2009–2019",      categoryId: 1, vendorId: 9002, make: "Toyota", model: "Corolla", yf: 2009, yt: 2019, price: "120.00",   condition: "new"  as const },
  { name: "Engine Mount Set - Toyota Corolla 2009–2013",         categoryId: 1, vendorId: 9001, make: "Toyota", model: "Corolla", yf: 2009, yt: 2013, price: "350.00",   condition: "new"  as const },
  // Toyota Camry
  { name: "Front Brake Pads - Toyota Camry 2012–2018",           categoryId: 2, vendorId: 9001, make: "Toyota", model: "Camry",   yf: 2012, yt: 2018, price: "180.00",   condition: "new"  as const },
  { name: "Front Shock Pair - Toyota Camry 2012–2017",           categoryId: 2, vendorId: 9002, make: "Toyota", model: "Camry",   yf: 2012, yt: 2017, price: "550.00",   condition: "new"  as const },
  { name: "Radiator - Toyota Camry 2012–2017",                   categoryId: 5, vendorId: 9001, make: "Toyota", model: "Camry",   yf: 2012, yt: 2017, price: "750.00",   condition: "new"  as const },
  { name: "Headlight Left - Toyota Camry 2012–2014",             categoryId: 4, vendorId: 9002, make: "Toyota", model: "Camry",   yf: 2012, yt: 2014, price: "950.00",   condition: "new"  as const },
  { name: "AC Compressor - Toyota Camry 2012–2017",              categoryId: 5, vendorId: 9001, make: "Toyota", model: "Camry",   yf: 2012, yt: 2017, price: "1200.00",  condition: "new"  as const },
  { name: "Alternator - Toyota Camry 2012–2017",                 categoryId: 8, vendorId: 9002, make: "Toyota", model: "Camry",   yf: 2012, yt: 2017, price: "800.00",   condition: "used" as const },
  // Toyota RAV4
  { name: "Front Brake Pads - Toyota RAV4 2013–2018",            categoryId: 2, vendorId: 9001, make: "Toyota", model: "RAV4",    yf: 2013, yt: 2018, price: "200.00",   condition: "new"  as const },
  { name: "Rear Shock Pair - Toyota RAV4 2013–2018",             categoryId: 2, vendorId: 9002, make: "Toyota", model: "RAV4",    yf: 2013, yt: 2018, price: "600.00",   condition: "new"  as const },
  { name: "Radiator - Toyota RAV4 2013–2018",                    categoryId: 5, vendorId: 9001, make: "Toyota", model: "RAV4",    yf: 2013, yt: 2018, price: "800.00",   condition: "new"  as const },
  { name: "Side Mirror Left - Toyota RAV4 2013–2018",            categoryId: 3, vendorId: 9002, make: "Toyota", model: "RAV4",    yf: 2013, yt: 2018, price: "450.00",   condition: "new"  as const },
  // Toyota Hilux
  { name: "Front Shock Pair - Toyota Hilux 2015–2024",           categoryId: 2, vendorId: 9001, make: "Toyota", model: "Hilux",   yf: 2015, yt: 2024, price: "700.00",   condition: "new"  as const },
  { name: "Brake Disc Front - Toyota Hilux 2015–2024",           categoryId: 2, vendorId: 9002, make: "Toyota", model: "Hilux",   yf: 2015, yt: 2024, price: "350.00",   condition: "new"  as const },
  { name: "Rear Leaf Spring - Toyota Hilux 2015–2024",           categoryId: 2, vendorId: 9001, make: "Toyota", model: "Hilux",   yf: 2015, yt: 2024, price: "900.00",   condition: "new"  as const },
  // Honda Civic
  { name: "Front Brake Pads - Honda Civic 2012–2016",            categoryId: 2, vendorId: 9002, make: "Honda",  model: "Civic",   yf: 2012, yt: 2016, price: "140.00",   condition: "new"  as const },
  { name: "Front Shock Pair - Honda Civic 2012–2016",            categoryId: 2, vendorId: 9001, make: "Honda",  model: "Civic",   yf: 2012, yt: 2016, price: "400.00",   condition: "new"  as const },
  { name: "Radiator - Honda Civic 2012–2016",                    categoryId: 5, vendorId: 9002, make: "Honda",  model: "Civic",   yf: 2012, yt: 2016, price: "600.00",   condition: "new"  as const },
  { name: "Headlight Left - Honda Civic 2012–2015",              categoryId: 4, vendorId: 9001, make: "Honda",  model: "Civic",   yf: 2012, yt: 2015, price: "750.00",   condition: "new"  as const },
  { name: "CV Axle Left - Honda Civic 2012–2016",                categoryId: 2, vendorId: 9002, make: "Honda",  model: "Civic",   yf: 2012, yt: 2016, price: "350.00",   condition: "new"  as const },
  // Honda CR-V
  { name: "Front Brake Pads - Honda CR-V 2012–2017",             categoryId: 2, vendorId: 9001, make: "Honda",  model: "CR-V",    yf: 2012, yt: 2017, price: "160.00",   condition: "new"  as const },
  { name: "Radiator - Honda CR-V 2012–2017",                     categoryId: 5, vendorId: 9002, make: "Honda",  model: "CR-V",    yf: 2012, yt: 2017, price: "700.00",   condition: "new"  as const },
  { name: "Rear Shock Pair - Honda CR-V 2012–2017",              categoryId: 2, vendorId: 9001, make: "Honda",  model: "CR-V",    yf: 2012, yt: 2017, price: "500.00",   condition: "new"  as const },
  // Hyundai Tucson
  { name: "Front Brake Pads - Hyundai Tucson 2016–2021",         categoryId: 2, vendorId: 9002, make: "Hyundai",model: "Tucson",  yf: 2016, yt: 2021, price: "160.00",   condition: "new"  as const },
  { name: "Front Shock Pair - Hyundai Tucson 2016–2021",         categoryId: 2, vendorId: 9001, make: "Hyundai",model: "Tucson",  yf: 2016, yt: 2021, price: "550.00",   condition: "new"  as const },
  { name: "Headlight Left - Hyundai Tucson 2016–2018",           categoryId: 4, vendorId: 9002, make: "Hyundai",model: "Tucson",  yf: 2016, yt: 2018, price: "900.00",   condition: "new"  as const },
  { name: "AC Condenser - Hyundai Tucson 2016–2021",             categoryId: 5, vendorId: 9001, make: "Hyundai",model: "Tucson",  yf: 2016, yt: 2021, price: "600.00",   condition: "new"  as const },
  { name: "Lower Ball Joint - Hyundai Tucson 2016–2021",         categoryId: 2, vendorId: 9002, make: "Hyundai",model: "Tucson",  yf: 2016, yt: 2021, price: "120.00",   condition: "new"  as const },
  // Hyundai Elantra
  { name: "Front Brake Pads - Hyundai Elantra 2011–2016",        categoryId: 2, vendorId: 9001, make: "Hyundai",model: "Elantra", yf: 2011, yt: 2016, price: "120.00",   condition: "new"  as const },
  { name: "Tie Rod End Pair - Hyundai Elantra 2011–2016",        categoryId: 2, vendorId: 9002, make: "Hyundai",model: "Elantra", yf: 2011, yt: 2016, price: "150.00",   condition: "new"  as const },
  // Nissan
  { name: "Front Brake Pads - Nissan X-Trail 2014–2020",         categoryId: 2, vendorId: 9002, make: "Nissan", model: "X-Trail", yf: 2014, yt: 2020, price: "180.00",   condition: "new"  as const },
  { name: "Radiator - Nissan Almera 2006–2013",                  categoryId: 5, vendorId: 9001, make: "Nissan", model: "Almera",  yf: 2006, yt: 2013, price: "550.00",   condition: "new"  as const },
  { name: "Front Shock Pair - Nissan Pathfinder 2013–2020",      categoryId: 2, vendorId: 9002, make: "Nissan", model: "Pathfinder",yf:2013,  yt: 2020, price: "650.00",   condition: "new"  as const },
  // Mercedes-Benz
  { name: "Front Brake Pads - Mercedes C-Class W204 2008–2014",  categoryId: 2, vendorId: 9001, make: "Mercedes-Benz",model:"C-Class",yf:2008,yt: 2014, price: "250.00",  condition: "new"  as const },
  { name: "Headlight Left - Mercedes C-Class W204 2008–2014",    categoryId: 4, vendorId: 9002, make: "Mercedes-Benz",model:"C-Class",yf:2008,yt: 2014, price: "1500.00", condition: "new"  as const },
  { name: "Radiator - Mercedes E-Class W212 2010–2016",          categoryId: 5, vendorId: 9001, make: "Mercedes-Benz",model:"E-Class",yf:2010,yt: 2016, price: "1200.00", condition: "new"  as const },
  // BMW
  { name: "Front Brake Pads - BMW 3 Series F30 2012–2018",       categoryId: 2, vendorId: 9001, make: "BMW",    model: "3 Series",yf: 2012, yt: 2018, price: "300.00",   condition: "new"  as const },
  { name: "Radiator - BMW X5 E70 2007–2013",                     categoryId: 5, vendorId: 9002, make: "BMW",    model: "X5",      yf: 2007, yt: 2013, price: "1400.00",  condition: "new"  as const },
  // Kia
  { name: "Front Brake Pads - Kia Sportage 2016–2021",           categoryId: 2, vendorId: 9002, make: "Kia",    model: "Sportage",yf: 2016, yt: 2021, price: "150.00",   condition: "new"  as const },
  { name: "Radiator - Kia Rio 2012–2017",                        categoryId: 5, vendorId: 9001, make: "Kia",    model: "Rio",     yf: 2012, yt: 2017, price: "500.00",   condition: "new"  as const },
  // Ford
  { name: "Front Brake Pads - Ford Ranger 2012–2020",            categoryId: 2, vendorId: 9001, make: "Ford",   model: "Ranger",  yf: 2012, yt: 2020, price: "200.00",   condition: "new"  as const },
  { name: "Front Shock Pair - Ford Escape 2013–2019",            categoryId: 2, vendorId: 9002, make: "Ford",   model: "Escape",  yf: 2013, yt: 2019, price: "500.00",   condition: "new"  as const },
  // Universal / multi-fit
  { name: "Car Battery 75AH - Universal Fit",                    categoryId: 8, vendorId: 9001, make: null, model: null, yf: null, yt: null, price: "850.00",   condition: "new"  as const },
  { name: "Car Battery 60AH - Universal Fit",                    categoryId: 8, vendorId: 9002, make: null, model: null, yf: null, yt: null, price: "650.00",   condition: "new"  as const },
  { name: "Engine Oil 5W-30 Full Synthetic 4L",                  categoryId: 6, vendorId: 9001, make: null, model: null, yf: null, yt: null, price: "180.00",   condition: "new"  as const },
  { name: "Engine Oil 10W-40 Semi-Synthetic 4L",                 categoryId: 6, vendorId: 9002, make: null, model: null, yf: null, yt: null, price: "120.00",   condition: "new"  as const },
  { name: "Brake Fluid DOT 4 500ml",                             categoryId: 6, vendorId: 9001, make: null, model: null, yf: null, yt: null, price: "35.00",    condition: "new"  as const },
  { name: "Coolant/Antifreeze 1L",                               categoryId: 6, vendorId: 9002, make: null, model: null, yf: null, yt: null, price: "40.00",    condition: "new"  as const },
  { name: "Leather Seat Cover Set - Universal",                  categoryId: 10,vendorId: 9001, make: null, model: null, yf: null, yt: null, price: "450.00",   condition: "new"  as const },
  { name: "Rubber Floor Mat Set - Universal",                    categoryId: 10,vendorId: 9002, make: null, model: null, yf: null, yt: null, price: "150.00",   condition: "new"  as const },
  { name: "Dash Cam 1080P Front",                                categoryId: 12,vendorId: 9001, make: null, model: null, yf: null, yt: null, price: "250.00",   condition: "new"  as const },
  { name: "GPS Tracker Real-time SIM-based",                     categoryId: 12,vendorId: 9002, make: null, model: null, yf: null, yt: null, price: "200.00",   condition: "new"  as const },
  { name: "Car Alarm System with Remote",                        categoryId: 12,vendorId: 9001, make: null, model: null, yf: null, yt: null, price: "350.00",   condition: "new"  as const },
  { name: "Android Car Stereo 9-inch GPS + CarPlay",             categoryId: 11,vendorId: 9002, make: null, model: null, yf: null, yt: null, price: "800.00",   condition: "new"  as const },
];

async function seed() {
  console.log("🌱 Starting seed...\n");

  // 1. Categories
  console.log("→ Seeding categories...");
  for (const cat of CATEGORIES) {
    await db.execute(sql`
      INSERT INTO categories (id, name, slug, icon)
      VALUES (${cat.id}, ${cat.name}, ${cat.slug}, ${cat.icon})
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon
    `);
  }
  console.log(`  ✓ ${CATEGORIES.length} categories`);

  // 2. Demo users
  console.log("→ Seeding demo vendor accounts...");
  for (const u of DEMO_USERS) {
    await db.execute(sql`
      INSERT INTO users (id, email, name, "passwordHash", role, "createdAt", "updatedAt")
      VALUES (${u.id}, ${u.email}, ${u.name}, ${u.passwordHash}, ${u.role}, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `);
  }

  // 3. Demo vendors
  for (const v of DEMO_VENDORS) {
    await db.execute(sql`
      INSERT INTO vendors (id, "userId", "businessName", phone, whatsapp, email, address, city, region, description, status, "createdAt", "updatedAt")
      VALUES (${v.id}, ${v.userId}, ${v.businessName}, ${v.phone}, ${v.whatsapp}, ${v.email}, ${v.address}, ${v.city}, ${v.region}, ${v.description}, ${v.status}, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `);
  }
  console.log("  ✓ 2 demo vendors (Tonaton Auto Parts, Jiji Spare Parts Hub)");

  // 4. Seed listings
  console.log("→ Seeding product listings...");
  let inserted = 0;
  for (const p of LISTINGS) {
    await db.execute(sql`
      INSERT INTO products ("vendorId", "categoryId", name, description, price, currency, condition, "vehicleMake", "vehicleModel", "yearFrom", "yearTo", images, status, quantity, "createdAt", "updatedAt")
      VALUES (
        ${p.vendorId}, ${p.categoryId}, ${p.name},
        ${"Quality part sourced from verified Ghana dealers. Compatible with listed vehicle years."},
        ${p.price}, 'GHS', ${p.condition},
        ${p.make}, ${p.model}, ${p.yf}, ${p.yt},
        '[]', 'active', 10, NOW(), NOW()
      )
      ON CONFLICT DO NOTHING
    `);
    inserted++;
  }
  console.log(`  ✓ ${inserted} product listings`);

  console.log("\n✅ Seed complete!");
  console.log(`   Categories: ${CATEGORIES.length}`);
  console.log(`   Demo vendors: ${DEMO_USERS.length}`);
  console.log(`   Listings: ${LISTINGS.length}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
