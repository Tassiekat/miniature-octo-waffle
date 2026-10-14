export const FIRST_NAMES = ["Alex","Jordan","Sam","Taylor","Casey","Riley","Morgan","Jamie","Avery","Quinn","Reese","Drew","Cameron","Skyler","Hayden","Parker","Logan","Emerson","Rowan","Sage","Kai","Noa","Ezra","Mila","Luca","Iris","Theo","Nova","Finn","Zara"];
export const LAST_INITIALS = ["A.","B.","C.","D.","E.","F.","G.","H.","K.","L.","M.","N.","P.","R.","S.","T."];

export type Tier = "Basic" | "Pro" | "VIP";
export const TIER_PRICES: Record<Tier, number> = { Basic: 5, Pro: 15, VIP: 30 };
export const TIERS: Tier[] = ["Basic", "Pro", "VIP"];

export function randomName() {
  const f = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const l = LAST_INITIALS[Math.floor(Math.random() * LAST_INITIALS.length)];
  return `${f} ${l}`;
}

export function randomTier(): Tier {
  const r = Math.random();
  if (r < 0.55) return "Basic";
  if (r < 0.85) return "Pro";
  return "VIP";
}

export function randomHandle(name: string) {
  return "@" + name.toLowerCase().replace(/[^a-z]/g, "") + Math.floor(Math.random() * 900 + 100);
}

// Seeded RNG so initial render is stable-ish across SSR/CSR
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDailyEarnings(days = 30) {
  const rng = mulberry32(42);
  const out: { date: string; earnings: number }[] = [];
  let base = 180;
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    base += (rng() - 0.45) * 60;
    const earnings = Math.max(40, Math.round(base + rng() * 120));
    out.push({ date: d.toISOString().slice(5, 10), earnings });
  }
  return out;
}

export function generateMembers(n = 24) {
  const rng = mulberry32(7);
  const list = [];
  for (let i = 0; i < n; i++) {
    const name = `${FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)]} ${LAST_INITIALS[Math.floor(rng() * LAST_INITIALS.length)]}`;
    const tier: Tier = rng() < 0.55 ? "Basic" : rng() < 0.75 ? "Pro" : "VIP";
    const daysAgo = Math.floor(rng() * 90);
    const joined = new Date();
    joined.setDate(joined.getDate() - daysAgo);
    const referrer = rng() < 0.6 ? `${FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)]} ${LAST_INITIALS[Math.floor(rng() * LAST_INITIALS.length)]}` : "—";
    const status = rng() < 0.88 ? "Active" : rng() < 0.5 ? "Past due" : "Cancelled";
    list.push({
      id: `usr_${(1000 + i).toString(36)}`,
      name,
      handle: "@" + name.toLowerCase().split(" ")[0] + Math.floor(rng() * 900 + 100),
      tier,
      joined: joined.toISOString().slice(0, 10),
      referrer,
      status,
    });
  }
  return list;
}

export function generateLeaderboard() {
  const rng = mulberry32(11);
  const arr = Array.from({ length: 8 }).map((_, i) => {
    const name = `${FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)]} ${LAST_INITIALS[Math.floor(rng() * LAST_INITIALS.length)]}`;
    return {
      rank: i + 1,
      name,
      handle: "@" + name.toLowerCase().split(" ")[0] + Math.floor(rng() * 900 + 100),
      referrals: Math.floor(80 - i * 7 - rng() * 6),
      commission: Math.floor(1200 - i * 110 - rng() * 80),
    };
  });
  return arr;
}
