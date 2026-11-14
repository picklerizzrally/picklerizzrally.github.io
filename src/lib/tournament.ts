// Tournament engine. Pure functions only, no Firebase or React in here,
// so the same logic runs in the browser and in tests.

export type Div = "doubles" | "solo";

export const DIVS: { key: Div; label: string; detail: string; color: string }[] = [
  { key: "doubles", label: "Doubles", detail: "Two players, open to everyone", color: "#b8ef3f" },
  { key: "solo", label: "Solo", detail: "Singles, one player, open to everyone", color: "#ff705c" },
];
export const divLabel = (d: Div) => DIVS.find((x) => x.key === d)?.label ?? d;
export const isSoloDiv = (d: Div) => d === "solo";
// Entry limit for a category, and whether it has filled up
export const capFor = (s: State, d: Div) => (d === "solo" ? s.settings.capSolo : s.settings.capDoubles);
export const isFull = (s: State, d: Div) => s.teams.filter((t) => t.div === d).length >= capFor(s, d);
// "Rohan Mehta and Aditya Jain", or just "Rohan Mehta" for a solo entry
export const namesOf = (t: { p1: string; p2: string }) => (t.p2 ? `${t.p1} and ${t.p2}` : t.p1);

export interface Team {
  id: string;
  name: string;
  p1: string;
  p2: string;
  div: Div;
  skill: number; // 1 to 5
  checked: boolean;
  regId: string | null;
}

export interface Match {
  id: string;
  div: Div;
  stage: "pool" | "ko";
  pool: string | null; // "A", "B" for pool play
  round: number; // pool round, or knockout round (0 = first round)
  pos: number; // position inside a knockout round
  a: string | null;
  b: string | null;
  sa: number | null;
  sb: number | null;
  slot: number | null;
  court: number | null;
  bronze?: boolean; // the 3rd place match between the two semifinal losers
}

export interface Settings {
  courts: number;
  start: string; // "07:45"
  matchMin: number;
  poolSize: number;
  poolTarget: number;
  koTarget: number;
  breakMin: number;
  qualifiers: number;
  capDoubles: number; // max doubles teams
  capSolo: number; // max solo players
  regOpen: boolean;
}

export interface State {
  settings: Settings;
  teams: Team[];
  pools: Partial<Record<Div, Record<string, string[]>>>;
  matches: Match[];
  generated: boolean;
  koBuilt: boolean;
  backToBack: number;
}

export const DEFAULT_SETTINGS: Settings = {
  courts: 2,
  start: "07:45",
  matchMin: 15,
  poolSize: 4,
  poolTarget: 11,
  koTarget: 15,
  breakMin: 30,
  qualifiers: 2,
  capDoubles: 24,
  capSolo: 20,
  regOpen: true,
};

export function emptyState(): State {
  return { settings: { ...DEFAULT_SETTINGS }, teams: [], pools: {}, matches: [], generated: false, koBuilt: false, backToBack: 0 };
}

// Firestore data can be partial or old. Fill gaps so the UI never reads undefined.
export function normalize(raw: unknown): State {
  const d = (raw ?? {}) as Partial<State>;
  return {
    settings: { ...DEFAULT_SETTINGS, ...(d.settings ?? {}) },
    teams: Array.isArray(d.teams) ? d.teams.map((t) => ({ ...t, checked: t.checked ?? false, regId: t.regId ?? null })) : [],
    pools: d.pools ?? {},
    matches: Array.isArray(d.matches) ? d.matches : [],
    generated: !!d.generated,
    koBuilt: !!d.koBuilt,
    backToBack: d.backToBack ?? 0,
  };
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const has = (v: number | null | undefined): v is number => typeof v === "number";
export const isDone = (m: Match) => has(m.sa) && has(m.sb);
export const teamOf = (s: State, id: string | null) => (id ? s.teams.find((t) => t.id === id) : undefined);
export const nameOf = (s: State, id: string | null) => (id ? teamOf(s, id)?.name ?? "Unknown team" : "TBD");
export const playersOf = (s: State, id: string | null) => {
  const t = teamOf(s, id);
  if (!t || !t.p2) return ""; // solo entries show just their name
  const short = (n: string) => {
    const parts = n.trim().split(/\s+/);
    return parts.length > 1 ? `${parts[0][0]}. ${parts[parts.length - 1]}` : n;
  };
  return `${short(t.p1)} / ${short(t.p2)}`;
};

/* ---------- time ---------- */
export function fmtTime(totalMin: number): string {
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  const ap = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${ap}`;
}
export function startMin(s: State) {
  const [h, m] = (s.settings.start || "07:45").split(":").map(Number);
  return h * 60 + m;
}
export function poolSlots(s: State) {
  const slots = s.matches.filter((m) => m.stage === "pool" && has(m.slot)).map((m) => m.slot as number);
  return slots.length ? Math.max(...slots) + 1 : 0;
}
export function koStartMin(s: State) {
  return startMin(s) + poolSlots(s) * s.settings.matchMin + Number(s.settings.breakMin);
}
export function matchTime(s: State, m: Match): number | null {
  if (!has(m.slot)) return null;
  return (m.stage === "pool" ? startMin(s) : koStartMin(s)) + m.slot * s.settings.matchMin;
}

/* ---------- scoring rules ---------- */
export function validScore(x: number, y: number, target: number): string {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0) return "Enter whole numbers for both teams";
  if (x === y) return "A game cannot end tied";
  const hi = Math.max(x, y);
  const lo = Math.min(x, y);
  if (hi < target) return `The winner needs at least ${target}`;
  if (hi - lo < 2) return "The winner must lead by 2";
  if (hi > target && hi - lo !== 2) return `Past ${target}, the game ends at a 2 point lead`;
  return "";
}
export const targetFor = (s: State, m: Match) => (m.stage === "ko" ? s.settings.koTarget : s.settings.poolTarget);

/* ---------- pools ---------- */
function poolCount(n: number, size: number) {
  let p = Math.ceil(n / size);
  while (p > 1 && n / p < 3) p--;
  return Math.max(1, p);
}

// Snake seeding: strongest teams are spread across pools (A B C, then C B A)
export function buildPools(s: State) {
  s.pools = {};
  const size = Math.max(3, Number(s.settings.poolSize) || 4);
  for (const { key } of DIVS) {
    const ts = s.teams
      .filter((t) => t.div === key)
      .sort((a, b) => b.skill - a.skill || a.name.localeCompare(b.name));
    if (ts.length < 2) continue;
    const n = poolCount(ts.length, size);
    const buckets: string[][] = Array.from({ length: n }, () => []);
    ts.forEach((t, i) => {
      const row = Math.floor(i / n);
      const col = i % n;
      buckets[row % 2 === 0 ? col : n - 1 - col].push(t.id);
    });
    const rec: Record<string, string[]> = {};
    buckets.forEach((b, i) => (rec[String.fromCharCode(65 + i)] = b));
    s.pools[key] = rec;
  }
}

// Circle method: every team meets every other team once
export function roundRobin(ids: string[]): [string, string][][] {
  const arr: (string | null)[] = [...ids];
  if (arr.length % 2) arr.push(null);
  const n = arr.length;
  const rounds: [string, string][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a && b) pairs.push([a, b]);
    }
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop() as string | null);
  }
  return rounds;
}

// Greedy court packer: fill every court each slot, avoid back-to-back games when possible
export function packSlots(list: Match[], courts: number) {
  const remaining = [...list];
  const last: Record<string, number> = {};
  let slot = 0;
  let backToBack = 0;
  const waited = (m: Match) => slot - Math.max(last[m.a!] ?? -2, last[m.b!] ?? -2);
  while (remaining.length) {
    const busy = new Set<string>();
    let placed = 0;
    remaining.sort((x, y) => x.round - y.round || waited(y) - waited(x));
    for (const needRest of [true, false]) {
      for (let i = 0; i < remaining.length && placed < courts; ) {
        const m = remaining[i];
        const rested = last[m.a!] !== slot - 1 && last[m.b!] !== slot - 1;
        if (!busy.has(m.a!) && !busy.has(m.b!) && (rested || !needRest)) {
          if (!rested) backToBack++;
          m.slot = slot;
          m.court = placed + 1;
          busy.add(m.a!);
          busy.add(m.b!);
          last[m.a!] = slot;
          last[m.b!] = slot;
          placed++;
          remaining.splice(i, 1);
        } else i++;
      }
    }
    slot++;
  }
  return { slots: slot, backToBack };
}

export function generateSchedule(s: State) {
  buildPools(s);
  const all: Match[] = [];
  for (const { key } of DIVS) {
    const pools = s.pools[key];
    if (!pools) continue;
    for (const letter of Object.keys(pools).sort()) {
      roundRobin(pools[letter]).forEach((pairs, r) =>
        pairs.forEach(([a, b]) =>
          all.push({ id: uid(), div: key, stage: "pool", pool: letter, round: r, pos: 0, a, b, sa: null, sb: null, slot: null, court: null }),
        ),
      );
    }
  }
  const res = packSlots(all, Math.max(1, Number(s.settings.courts)));
  s.matches = all.sort((x, y) => (x.slot ?? 0) - (y.slot ?? 0) || (x.court ?? 0) - (y.court ?? 0));
  s.generated = true;
  s.koBuilt = false;
  s.backToBack = res.backToBack;
}

/* ---------- standings ---------- */
export interface Row { id: string; p: number; w: number; l: number; pf: number; pa: number }

// Wins, then head to head (when exactly two teams are level), then point difference, then points scored
export function standings(s: State, div: Div, letter: string): Row[] {
  const ids = s.pools[div]?.[letter] ?? [];
  const rows: Row[] = ids.map((id) => ({ id, p: 0, w: 0, l: 0, pf: 0, pa: 0 }));
  const R = Object.fromEntries(rows.map((r) => [r.id, r]));
  const ms = s.matches.filter((m) => m.stage === "pool" && m.div === div && m.pool === letter && isDone(m));
  for (const m of ms) {
    const A = R[m.a!];
    const B = R[m.b!];
    if (!A || !B) continue;
    A.p++; B.p++;
    A.pf += m.sa!; A.pa += m.sb!; B.pf += m.sb!; B.pa += m.sa!;
    if (m.sa! > m.sb!) { A.w++; B.l++; } else { B.w++; A.l++; }
  }
  rows.sort((x, y) => y.w - x.w || y.pf - y.pa - (x.pf - x.pa) || y.pf - x.pf || nameOf(s, x.id).localeCompare(nameOf(s, y.id)));
  for (let i = 0; i < rows.length - 1; i++) {
    const x = rows[i];
    const y = rows[i + 1];
    if (x.w === y.w && rows.filter((r) => r.w === x.w).length === 2) {
      const h = ms.find((m) => (m.a === x.id && m.b === y.id) || (m.a === y.id && m.b === x.id));
      if (h && (h.a === y.id) === h.sa! > h.sb!) { rows[i] = y; rows[i + 1] = x; }
    }
  }
  return rows;
}
const per = (v: number, p: number) => v / (p || 1);
const cmpOverall = (x: Row, y: Row) => per(y.w, y.p) - per(x.w, x.p) || per(y.pf - y.pa, y.p) - per(x.pf - x.pa, x.p);

/* ---------- knockouts ---------- */
export function seedOrder(n: number): number[] {
  let o = [1];
  while (o.length < n) {
    const m = o.length * 2;
    o = o.flatMap((x) => [x, m + 1 - x]);
  }
  return o;
}

export const koMatches = (s: State, div: Div) => s.matches.filter((m) => m.stage === "ko" && m.div === div);
export function koRounds(s: State, div: Div): Match[][] {
  const ms = koMatches(s, div);
  const n = ms.length ? Math.max(...ms.map((m) => m.round)) + 1 : 0;
  return Array.from({ length: n }, (_, r) => ms.filter((m) => m.round === r).sort((a, b) => a.pos - b.pos));
}
// Label for any knockout match, including the 3rd place match
export function koLabel(s: State, m: Match) {
  if (m.bronze) return "3rd place";
  return roundName(koRounds(s, m.div).length, m.round);
}

export function roundName(total: number, r: number) {
  const d = total - 1 - r;
  if (d === 0) return "Final";
  if (d === 1) return "Semifinals";
  if (d === 2) return "Quarterfinals";
  return `Round of ${2 ** (d + 1)}`;
}
export const isBye = (m: Match) => m.stage === "ko" && m.round === 0 && (!m.a || !m.b);
// Categories that play a 3rd place match (3rd place wins prize money in doubles)
export const hasBronze = (d: Div) => d !== "solo";

export function koWinner(m: Match): string | null {
  if (m.round === 0 && m.stage === "ko") {
    if (m.a && !m.b) return m.a;
    if (m.b && !m.a) return m.b;
  }
  if (m.a && m.b && isDone(m) && m.sa !== m.sb) return m.sa! > m.sb! ? m.a : m.b;
  return null;
}

export function koLoser(m: Match): string | null {
  const w = koWinner(m);
  if (!w || !m.a || !m.b) return null;
  return w === m.a ? m.b : m.a;
}

export function propagate(s: State) {
  for (const { key } of DIVS) {
    const rounds = koRounds(s, key);
    for (let r = 1; r < rounds.length; r++) {
      rounds[r].forEach((m) => {
        const prev = rounds[r - 1];
        const take = m.bronze ? koLoser : koWinner; // the 3rd place match takes the semifinal losers
        const ia = m.bronze ? 0 : 2 * m.pos;
        const na = prev[ia] ? take(prev[ia]) : null;
        const nb = prev[ia + 1] ? take(prev[ia + 1]) : null;
        if (m.a !== na || m.b !== nb) { m.a = na; m.b = nb; m.sa = null; m.sb = null; }
      });
    }
  }
}

export function champion(s: State, div: Div): string | null {
  const rounds = koRounds(s, div);
  if (!rounds.length) return null;
  return koWinner(rounds[rounds.length - 1][0]);
}

export function buildKO(s: State) {
  s.matches = s.matches.filter((m) => m.stage !== "ko");
  const q = Math.max(1, Number(s.settings.qualifiers));
  for (const { key } of DIVS) {
    const pools = s.pools[key];
    if (!pools) continue;
    const letters = Object.keys(pools).sort();
    const tables = letters.map((l) => standings(s, key, l));
    const poolOf: Record<string, string> = {};
    letters.forEach((l) => pools[l].forEach((id) => (poolOf[id] = l)));
    const seeds: string[] = [];
    for (let rank = 0; rank < q; rank++) {
      seeds.push(...tables.map((t) => t[rank]).filter(Boolean).sort(cmpOverall).map((r) => r.id));
    }
    if (seeds.length < 2) continue;
    let size = 2;
    while (size < seeds.length) size *= 2;
    const order = seedOrder(size);
    const r0: Match[] = [];
    for (let i = 0; i < size / 2; i++) {
      r0.push({
        id: uid(), div: key, stage: "ko", pool: null, round: 0, pos: i,
        a: seeds[order[2 * i] - 1] ?? null, b: seeds[order[2 * i + 1] - 1] ?? null,
        sa: null, sb: null, slot: null, court: null,
      });
    }
    // Avoid a same-pool rematch in the first knockout round when a swap fixes it
    const same = (m: Match) => !!m.a && !!m.b && poolOf[m.a] === poolOf[m.b];
    r0.forEach((m, i) => {
      if (!same(m)) return;
      for (let j = 0; j < r0.length; j++) {
        if (j === i || !r0[j].b) continue;
        [m.b, r0[j].b] = [r0[j].b, m.b];
        if (!same(m) && !same(r0[j])) break;
        [m.b, r0[j].b] = [r0[j].b, m.b];
      }
    });
    s.matches.push(...r0);
    let lastRound = 0;
    for (let len = size / 4, r = 1; len >= 1; len /= 2, r++) {
      lastRound = r;
      for (let p = 0; p < len; p++) {
        s.matches.push({ id: uid(), div: key, stage: "ko", pool: null, round: r, pos: p, a: null, b: null, sa: null, sb: null, slot: null, court: null });
      }
    }
    if (size >= 4 && hasBronze(key)) {
      s.matches.push({ id: uid(), div: key, stage: "ko", pool: null, round: lastRound, pos: 1, a: null, b: null, sa: null, sb: null, slot: null, court: null, bronze: true });
    }
  }
  s.koBuilt = true;
  propagate(s);
  scheduleKO(s);
}

// Rounds with the same distance from the final share a time block, so every final is last
export function scheduleKO(s: State) {
  const C = Math.max(1, Number(s.settings.courts));
  const all = DIVS.map((d) => koRounds(s, d.key)).filter((r) => r.length);
  const maxDepth = Math.max(0, ...all.map((r) => r.length - 1));
  let slot = 0;
  for (let d = maxDepth; d >= 0; d--) {
    const batch: Match[] = [];
    for (const rounds of all) {
      const r = rounds.length - 1 - d;
      if (r < 0) continue;
      rounds[r].forEach((m) => {
        if (isBye(m)) { m.slot = null; m.court = null; } else batch.push(m);
      });
    }
    batch.sort((x, y) => Number(!!y.bronze) - Number(!!x.bronze)); // 3rd place matches before the finals
    batch.forEach((m, i) => { m.slot = slot + Math.floor(i / C); m.court = (i % C) + 1; });
    if (batch.length) slot += Math.ceil(batch.length / C);
  }
}

/* ---------- match status for the public schedule ---------- */
export type Status = "final" | "live" | "next" | "upcoming" | "waiting";
export function statusMap(s: State): Record<string, Status> {
  const out: Record<string, Status> = {};
  const open = s.matches.filter((m) => m.a && m.b && !isDone(m) && has(m.slot));
  const times = [...new Set(open.map((m) => matchTime(s, m) as number))].sort((a, b) => a - b);
  for (const m of s.matches) {
    if (isDone(m)) out[m.id] = "final";
    else if (!m.a || !m.b) out[m.id] = "waiting";
    else {
      const t = matchTime(s, m);
      out[m.id] = t === times[0] ? "live" : t === times[1] ? "next" : "upcoming";
    }
  }
  return out;
}

/* ---------- team view ---------- */
export function teamMatches(s: State, id: string) {
  return s.matches
    .filter((m) => m.a === id || m.b === id)
    .sort((x, y) => (matchTime(s, x) ?? 1e9) - (matchTime(s, y) ?? 1e9));
}
export function poolOfTeam(s: State, t: Team): string | null {
  const pools = s.pools[t.div];
  if (!pools) return null;
  return Object.keys(pools).find((l) => pools[l].includes(t.id)) ?? null;
}

/* ---------- stats ---------- */
export function stats(s: State) {
  const played = s.matches.filter((m) => m.a && m.b && isDone(m));
  const margins = played.map((m) => Math.abs(m.sa! - m.sb!));
  const avg = margins.length ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;
  let fav = 0;
  let decided = 0;
  for (const m of played) {
    const A = teamOf(s, m.a);
    const B = teamOf(s, m.b);
    if (!A || !B || A.skill === B.skill) continue;
    decided++;
    const favId = A.skill > B.skill ? m.a : m.b;
    if ((m.sa! > m.sb! ? m.a : m.b) === favId) fav++;
  }
  return {
    played: played.length,
    total: s.matches.filter((m) => !isBye(m)).length,
    avgMargin: avg,
    closePct: played.length ? Math.round((margins.filter((x) => x === 2).length / played.length) * 100) : 0,
    upsetPct: decided ? Math.round((1 - fav / decided) * 100) : 0,
  };
}

export function estimateFinish(s: State): string {
  if (!s.generated) return "-";
  const koSlots = Math.max(0, ...s.matches.filter((m) => m.stage === "ko" && has(m.slot)).map((m) => (m.slot as number) + 1));
  return fmtTime(koStartMin(s) + koSlots * s.settings.matchMin);
}
