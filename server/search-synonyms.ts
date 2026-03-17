/**
 * Ghana auto-parts synonym dictionary.
 * Maps canonical forms and their aliases so that a search for any alias
 * finds products tagged with the canonical term (and vice-versa).
 *
 * Format:  canonical: [alias1, alias2, ...]
 * Single-word terms use underscores for multi-word phrases in tsquery context.
 */

// ── Core synonym map ──────────────────────────────────────────────────────────
const RAW: Record<string, string[]> = {
  // British / Ghanaian English ↔ American English
  tyre:               ["tire"],
  tyres:              ["tires", "tyre"],
  bonnet:             ["hood"],
  windscreen:         ["windshield"],
  gearbox:            ["transmission", "gear box"],
  silencer:           ["muffler", "exhaust"],
  boot:               ["trunk"],
  petrol:             ["fuel", "gasoline"],
  numberplate:        ["license plate", "number plate"],

  // Suspension / steering
  "shock absorber":   ["absorber", "shocks", "damper", "strut", "shocker"],
  "ball joint":       ["ball joints"],
  "tie rod":          ["tierod", "tie rod end", "track rod"],
  bushing:            ["bush", "bushes", "rubber bush", "rubber mount"],
  "stabilizer link":  ["sway bar link", "anti roll link", "link rod"],
  "sway bar":         ["stabilizer bar", "anti roll bar", "anti-roll bar"],
  "coil spring":      ["spring", "suspension spring"],
  "leaf spring":      ["leaf springs", "spring pack"],
  "steering rack":    ["rack and pinion", "rack"],
  "steering knuckle": ["spindle", "knuckle"],
  "control arm":      ["wishbone", "lower arm", "upper arm", "a arm"],
  "wheel bearing":    ["hub bearing", "bearing", "wheel hub"],

  // Brakes
  "brake pad":        ["pads", "brake pads", "disc pads"],
  "brake disc":       ["rotor", "disc", "brake rotor"],
  "brake drum":       ["drum", "rear drum"],
  "brake caliper":    ["caliper", "calipers"],
  "brake shoe":       ["shoes", "brake shoes"],
  "brake booster":    ["brake servo", "vacuum booster"],
  "brake master":     ["master cylinder", "brake master cylinder"],
  "abs sensor":       ["wheel speed sensor", "abs module"],

  // Engine / drivetrain
  "timing belt":      ["cam belt", "camshaft belt", "timing chain"],
  "timing chain":     ["cam chain"],
  "serpentine belt":  ["drive belt", "alternator belt", "fan belt"],
  "water pump":       ["coolant pump", "engine pump"],
  "oil pump":         ["engine oil pump"],
  "fuel pump":        ["petrol pump", "in-tank pump"],
  "oil filter":       ["engine oil filter"],
  "air filter":       ["air cleaner"],
  "fuel filter":      ["petrol filter", "diesel filter"],
  "spark plug":       ["plugs", "spark plugs", "ignition plug"],
  "glow plug":        ["glow plugs", "diesel plug"],
  "piston ring":      ["rings", "piston rings"],
  "head gasket":      ["head gasket set", "cylinder head gasket"],
  "valve cover":      ["rocker cover", "cam cover"],
  "intake manifold":  ["inlet manifold"],
  "exhaust manifold": ["exhaust header", "header"],

  // Transmission & axle
  "cv joint":         ["cv", "constant velocity joint", "cv axle"],
  "cv boot":          ["cv axle boot", "driveshaft boot", "constant velocity boot"],
  "drive shaft":      ["driveshaft", "axle shaft", "prop shaft", "propeller shaft"],
  "universal joint":  ["uj", "u joint", "u-joint"],
  clutch:             ["clutch kit", "clutch plate", "clutch disc", "clutch disk"],
  "flywheel":         ["flex plate"],

  // Electrical / sensors
  "ignition coil":    ["coil pack", "coil"],
  alternator:         ["dynamo", "generator"],
  "starter motor":    ["starter", "engine starter"],
  battery:            ["car battery", "12v battery"],
  "oxygen sensor":    ["o2 sensor", "lambda sensor", "air fuel ratio sensor"],
  "maf sensor":       ["mass air flow", "maf", "air flow meter"],
  "map sensor":       ["manifold pressure sensor", "boost sensor"],
  "throttle body":    ["throttle valve"],
  "idle valve":       ["iac", "idle air control", "idle control valve"],
  "crankshaft sensor":["crank sensor", "ckp sensor"],
  "camshaft sensor":  ["cam sensor", "cmp sensor"],
  ecu:                ["ecm", "engine control unit", "engine computer", "pcm"],

  // Cooling
  radiator:           ["cooling radiator"],
  thermostat:         ["engine thermostat", "coolant thermostat"],
  "radiator cap":     ["pressure cap"],
  "coolant hose":     ["radiator hose", "coolant pipe"],
  "expansion tank":   ["overflow tank", "coolant reservoir"],

  // Emissions
  "catalytic converter": ["cat", "catalyst", "catalytic"],
  egr:                   ["exhaust gas recirculation", "egr valve"],
  dpf:                   ["diesel particulate filter", "particulate filter"],

  // HVAC / AC
  "air conditioning": ["ac", "aircon", "air-con", "a/c"],
  "ac compressor":    ["aircon compressor", "a/c compressor"],
  "heater core":      ["car heater"],

  // Steering
  "power steering":   ["ps", "power steer"],
  "ps pump":          ["power steering pump", "power assist pump"],

  // Lighting
  headlight:          ["headlamp", "front light", "head light"],
  taillight:          ["tail lamp", "rear light", "brake light"],
  "fog light":        ["fog lamp"],

  // Body / exterior
  bumper:             ["fender", "front bumper", "rear bumper"],
  "door handle":      ["car handle"],
  mirror:             ["side mirror", "wing mirror"],

  // Common brands (handles typos via pg_trgm — listed here for FTS boost)
  toyota:             ["toyot", "toyotas"],
  mercedes:           ["mersedes", "mercedez", "benz", "merc"],
  "land rover":       ["landrover", "range rover"],
  "land cruiser":     ["landcruiser", "land cruizer"],
};

// ── Flatten into a quick-lookup map: term → all related terms ──────────────────
const LOOKUP = new Map<string, Set<string>>();

for (const [canonical, aliases] of Object.entries(RAW)) {
  const allTerms = [canonical, ...aliases];
  for (const term of allTerms) {
    if (!LOOKUP.has(term)) LOOKUP.set(term, new Set<string>());
    for (const other of allTerms) {
      if (other !== term) LOOKUP.get(term)!.add(other);
    }
  }
}

// ── Public helpers ─────────────────────────────────────────────────────────────

/** Escape a single term for use as a tsquery lexeme (no spaces). */
function safeLexeme(term: string): string {
  // Replace spaces with _ and strip non-alphanumeric (except underscore)
  return term.trim().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

/**
 * Build a PostgreSQL tsquery string from user input.
 * Applies synonym expansion and prefix matching.
 *
 * Example:  "tyre absorber" → "(tyre | tire) & (shock_absorber | absorber | damper | strut)"
 */
export function buildTsQuery(raw: string): string | null {
  const clean = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return null;

  // Try multi-word phrase lookup first (e.g. "shock absorber")
  const fullPhrase = LOOKUP.get(clean);
  if (fullPhrase) {
    const all = [clean, ...Array.from(fullPhrase)].map(safeLexeme).filter(Boolean);
    const unique = Array.from(new Set(all)).slice(0, 8);
    return unique.length > 1 ? `(${unique.join(" | ")})` : `${unique[0]}:*`;
  }

  const tokens = clean.split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length === 0) return null;

  // Also check pairs (2-gram) for multi-word matches
  const groups: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    // Try bigram first
    if (i + 1 < tokens.length) {
      const bigram = `${tokens[i]} ${tokens[i + 1]}`;
      const bigramAliases = LOOKUP.get(bigram);
      if (bigramAliases) {
        const all = [bigram, ...Array.from(bigramAliases)].map(safeLexeme).filter(Boolean);
        const unique = Array.from(new Set(all)).slice(0, 8);
        groups.push(unique.length > 1 ? `(${unique.join(" | ")})` : unique[0]);
        i += 2;
        continue;
      }
    }
    // Single token with synonyms
    const token = tokens[i];
    const aliases = LOOKUP.get(token);
    if (aliases && aliases.size > 0) {
      const all = [token, ...Array.from(aliases)].map(safeLexeme).filter(Boolean);
      const unique = Array.from(new Set(all)).slice(0, 8);
      groups.push(unique.length > 1 ? `(${unique.join(" | ")})` : `${safeLexeme(token)}:*`);
    } else {
      // No synonym — use prefix matching so "brak" finds "brake"
      const lex = safeLexeme(token);
      groups.push(lex ? `${lex}:*` : "");
    }
    i++;
  }

  const valid = groups.filter(Boolean);
  return valid.length > 0 ? valid.join(" & ") : null;
}

/**
 * Return the plain expanded search string (for ILIKE / trigram fallback).
 * Adds synonym terms joined by spaces.
 */
export function expandForLike(raw: string): string[] {
  const clean = raw.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const tokens = clean.split(/\s+/).filter((t) => t.length >= 2);
  const all = new Set<string>(tokens);

  for (const token of tokens) {
    const aliases = LOOKUP.get(token);
    if (aliases) aliases.forEach((a) => all.add(a));
  }

  return Array.from(all).slice(0, 10);
}
