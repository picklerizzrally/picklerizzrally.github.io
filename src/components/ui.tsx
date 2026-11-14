import { Component, createContext, useContext, useState, type ReactNode } from "react";
import { CREDIT, EVENT, FEE, isEarlyBird, registrationWindowOpen, rupees } from "../config";
import { useLive } from "../lib/store";
import {
  divLabel, fmtTime, isDone, matchTime, nameOf, playersOf, targetFor, validScore,
  type Match, type State, type Status,
} from "../lib/tournament";
import { Icon, LogoMark } from "./Icon";

/* ---------- crash guard: shows a message instead of a blank page ---------- */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: unknown) { console.error(err); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4f3ed] p-6 text-center text-[#132116]">
        <div>
          <h1 className="font-display text-5xl font-bold uppercase">Something went wrong</h1>
          <p className="mt-3 text-[#5b655e]">Reload the page to get the latest scores.</p>
          <button onClick={() => window.location.reload()} className="mt-6 rounded-full bg-[#b8ef3f] px-7 py-3.5 font-bold">
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

/* ---------- app-wide actions (open registration, share sheet) ---------- */
export interface UI {
  openRegistration: (div?: string) => void;
}
export const UIContext = createContext<UI>({ openRegistration: () => {} });
export const useUI = () => useContext(UIContext);

/* ---------- connection banner ---------- */
export function LiveBanner() {
  const { status, offline } = useLive();
  if (status === "not-configured")
    return <Banner tone="warn">Preview mode. Connect Firebase in src/config.ts to turn on live scores and registration.</Banner>;
  if (status === "error") return <Banner tone="warn">Live scores are not reachable right now. Reload in a minute.</Banner>;
  if (offline && status === "ready") return <Banner tone="info">You are offline. Showing the last scores we received.</Banner>;
  return null;
}
function Banner({ tone, children }: { tone: "warn" | "info"; children: ReactNode }) {
  return (
    <div role="status" className={`px-5 py-2.5 text-center text-sm font-semibold ${tone === "warn" ? "bg-[#ff705c] text-[#132116]" : "bg-[#132116] text-white"}`}>
      {children}
    </div>
  );
}

/* ---------- page shell for inner pages ---------- */
export function Shell({ children, active }: { children: ReactNode; active?: "live" | "admin" }) {
  const { openRegistration } = useUI();
  const { state } = useLive();
  return (
    <div className="min-h-screen bg-[#f4f3ed] text-[#132116]">
      <LiveBanner />
      <header className="bg-[#102b1b] text-white">
        <div className="mx-auto flex h-[76px] max-w-[1312px] items-center justify-between gap-3 px-5 md:px-10">
          <a href="#" className="flex items-center gap-3" aria-label={`${EVENT.brand} home`}>
            <LogoMark />
            <span className="font-display text-[23px] font-bold tracking-[-.01em]">{EVENT.brand}</span>
          </a>
          <nav className="flex items-center gap-2 text-sm font-semibold" aria-label="Pages">
            <a href="#/live" className={`rounded-full px-4 py-2.5 ${active === "live" ? "bg-white/15" : "hover:bg-white/10"}`}>Live</a>
            {state.settings.regOpen && registrationWindowOpen() && active !== "admin" && (
              <button onClick={() => openRegistration()} className="hidden rounded-full bg-[#b8ef3f] px-5 py-2.5 font-bold text-[#132116] sm:block">
                Register
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1312px] px-5 pb-20 pt-10 md:px-10">{children}</main>
      <footer className="mx-auto max-w-[1312px] border-t border-[#ccd0c8] px-5 py-8 text-sm text-[#6a736c] md:px-10">
        © {EVENT.year} {EVENT.name}, {EVENT.city}
        <span className="mt-1 block text-xs">
          Website made by {CREDIT.name}.{" "}
          <a href={CREDIT.contactUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#132116] underline">{CREDIT.contactLabel}</a>
        </span>
      </footer>
    </div>
  );
}

export function PageTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-8">
      <p className="eyebrow text-[#5b655e]">{eyebrow}</p>
      <h1 className="section-title">{title}</h1>
      {children && <div className="mt-4 max-w-2xl text-[#5b655e]">{children}</div>}
    </div>
  );
}

/* ---------- status pill ---------- */
const pill: Record<Status, [string, string]> = {
  final: ["Final", "bg-[#132116] text-white"],
  live: ["On court now", "bg-[#b8ef3f] text-[#132116]"],
  next: ["Next up", "bg-[#dff7a8] text-[#29420d]"],
  upcoming: ["Upcoming", "bg-[#f0f0eb] text-[#6d746e]"],
  waiting: ["Waiting", "bg-[#f0f0eb] text-[#6d746e]"],
};
export function StatusPill({ status }: { status: Status }) {
  const [label, cls] = pill[status];
  return <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${cls}`}>{label}</span>;
}

/* ---------- match row, styled after the design's schedule table ---------- */
export function MatchRow({ s, m, status, label }: { s: State; m: Match; status: Status; label?: string }) {
  const t = matchTime(s, m);
  const done = isDone(m);
  const side = (id: string | null, score: number | null, win: boolean) => (
    <div className="mt-1.5 flex items-center gap-3 font-semibold first:mt-0">
      <span className={`w-7 text-right font-display text-xl ${win ? "text-[#132116]" : "text-[#929990]"}`}>{done ? score : ""}</span>
      <span className={win ? "" : done ? "text-[#6d746e]" : ""}>
        {id ? <a href={`#/team/${id}`} className="hover:underline">{nameOf(s, id)}</a> : "TBD"}
        <small className="ml-2 font-medium text-[#8a928b]">{playersOf(s, id)}</small>
      </span>
    </div>
  );
  return (
    <div className="grid gap-4 border-b border-[#e4e4dc] px-5 py-5 last:border-0 md:grid-cols-[130px_1fr_150px_140px] md:items-center md:px-7">
      <div>
        <strong className="text-lg">{t !== null ? fmtTime(t) : "TBD"}</strong>
        <span className="mt-1 block text-xs font-semibold uppercase tracking-wider text-[#7c847d]">{label ?? (m.stage === "pool" ? `Pool ${m.pool}` : "Knockout")}</span>
      </div>
      <div>
        <span className="mb-2 block text-[11px] font-bold uppercase tracking-[.14em] text-[#6b746c]">{divLabel(m.div)}</span>
        {side(m.a, m.sa, done && m.sa! > m.sb!)}
        {side(m.b, m.sb, done && m.sb! > m.sa!)}
      </div>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon name="location" size={18} />
        {m.court ? `Court ${m.court}` : "Court TBD"}
      </div>
      <div><StatusPill status={status} /></div>
    </div>
  );
}

/* ---------- score entry for organisers ---------- */
export function ScoreEditor({ s, m, onSave }: { s: State; m: Match; onSave: (a: number | null, b: number | null) => Promise<string> }) {
  const [a, setA] = useState(m.sa === null ? "" : String(m.sa));
  const [b, setB] = useState(m.sb === null ? "" : String(m.sb));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = !!m.a && !!m.b;
  const dirty = a !== (m.sa === null ? "" : String(m.sa)) || b !== (m.sb === null ? "" : String(m.sb));
  const save = async () => {
    setErr("");
    if (a === "" && b === "") { setBusy(true); setErr(await onSave(null, null)); setBusy(false); return; }
    if (a === "" || b === "") return setErr("Enter the score for both teams");
    const x = parseInt(a, 10), y = parseInt(b, 10);
    const msg = validScore(x, y, targetFor(s, m));
    if (msg) return setErr(msg);
    setBusy(true);
    setErr(await onSave(x, y));
    setBusy(false);
  };
  const input = (v: string, set: (v: string) => void, id: string | null) => (
    <div className="flex items-center justify-between gap-3">
      <span className="truncate font-semibold">{nameOf(s, id)}</span>
      <input inputMode="numeric" pattern="[0-9]*" value={v} disabled={!ready} onChange={(e) => set(e.target.value.replace(/\D/g, "").slice(0, 2))}
        aria-label={`${nameOf(s, id)} score`}
        className="h-12 w-16 shrink-0 rounded-xl border border-[#d8d9d1] bg-white text-center font-display text-2xl font-bold outline-none focus:border-[#789b2d] focus:shadow-[0_0_0_3px_rgb(184_239_63/0.25)] disabled:bg-[#eeeee8]" />
    </div>
  );
  return (
    <div className={`rounded-[22px] border bg-white p-4 ${isDone(m) ? "border-[#789b2d]" : "border-[#d8d8cf]"}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold">
        <span className="rounded-full bg-[#132116] px-3 py-1 text-white">{m.court ? `Court ${m.court}` : "No court"}</span>
        {matchTime(s, m) !== null && <span className="rounded-full bg-[#f0f0eb] px-3 py-1 text-[#5b655e]">{fmtTime(matchTime(s, m)!)}</span>}
        <span className="rounded-full bg-[#f0f0eb] px-3 py-1 text-[#5b655e]">{divLabel(m.div)}{m.pool ? `, Pool ${m.pool}` : ""}</span>
      </div>
      <div className="space-y-2">
        {input(a, setA, m.a)}
        {input(b, setB, m.b)}
      </div>
      {err && <p className="mt-2 text-sm font-semibold text-[#b03a22]">{err}</p>}
      {ready && dirty && (
        <button onClick={save} disabled={busy} className="mt-3 w-full rounded-full bg-[#b8ef3f] py-2.5 text-sm font-bold disabled:opacity-60">
          {busy ? "Saving" : a === "" && b === "" ? "Clear score" : "Save score"}
        </button>
      )}
    </div>
  );
}

/* ---------- entry fee with the early bird price ---------- */
export function Price({ className = "", solo = false }: { className?: string; solo?: boolean }) {
  const regular = solo ? FEE.soloRegular : FEE.regular;
  const early = solo ? FEE.soloEarly : FEE.early;
  const unit = solo ? "per player" : "per team";
  if (!isEarlyBird()) return <span className={className}><b>{rupees(regular)}</b> {unit}</span>;
  return (
    <span className={className}>
      <s className="opacity-60">{rupees(regular)}</s> <b>{rupees(early)}</b> {unit}
      <span className="ml-2 inline-block rounded-full bg-[#132116] px-2.5 py-0.5 align-middle text-[11px] font-bold uppercase tracking-wider text-[#b8ef3f]">
        Early bird till {FEE.earlyLabel}
      </span>
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-[28px] border-2 border-dashed border-[#d8d8cf] p-10 text-center text-[#5b655e]">{children}</div>;
}
