import { useEffect, useMemo, useState, type FormEvent } from "react";
import { EVENT, FEE, TOP_PRIZE, feeFor, isEarlyBird, posterPrices, priceNote, rupees, siteUrl } from "../config";
import {
  approveRegistration, deleteRegistration, getProof, login, logout, setRegStatus, updateState, useLive, useRegistrations, useUser,
  type Registration,
} from "../lib/store";
import {
  DIVS, buildKO, champion, divLabel, estimateFinish, fmtTime, generateSchedule, isBye, isDone, matchTime, nameOf,
  namesOf, propagate, spotsLeft, spotsText, startMin, statusMap, uid, type Div, type Match, type Settings, type State,
} from "../lib/tournament";
import { Icon } from "../components/Icon";
import { Empty, PageTitle, ScoreEditor, Shell } from "../components/ui";
import { ShareStory } from "../components/ShareStory";
import { Bracket } from "./Live";
import type { StoryContent } from "../lib/story";

type Tab = "registrations" | "teams" | "setup" | "scores" | "knockouts" | "share";
const TABS: [Tab, string][] = [
  ["registrations", "Registrations"], ["teams", "Teams"], ["setup", "Setup"],
  ["scores", "Scores"], ["knockouts", "Knockouts"], ["share", "Stories"],
];

export default function Admin() {
  const { user, ready } = useUser();
  const { regs, denied } = useRegistrations(!!user);
  const [tab, setTab] = useState<Tab>("registrations");

  if (!ready) return <Shell active="admin"><Empty>Checking your login</Empty></Shell>;
  if (!user) return <Shell active="admin"><Login /></Shell>;
  if (denied)
    return (
      <Shell active="admin">
        <PageTitle eyebrow="Organiser" title="Not an organiser yet">
          You are signed in as {user.email}, but this account is not in the security rules. Copy the ID below into
          firestore.rules where it says PASTE_YOUR_UID_HERE, then publish the rules.
        </PageTitle>
        <code className="block break-all rounded-2xl bg-white p-4 text-lg">{user.uid}</code>
        <button onClick={() => logout()} className="mt-6 rounded-full border border-[#cfd2c9] px-6 py-3 font-bold">Sign out</button>
      </Shell>
    );

  const pending = regs.filter((r) => r.status === "pending").length;
  return (
    <Shell active="admin">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <PageTitle eyebrow={`Signed in as ${user.email}`} title="Organiser" />
        <button onClick={() => logout()} className="mb-8 rounded-full border border-[#cfd2c9] px-5 py-2.5 text-sm font-bold">Sign out</button>
      </div>
      <div className="mb-8 flex gap-1 overflow-x-auto rounded-full bg-[#e5e4dc] p-1" role="tablist">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-bold transition ${tab === key ? "bg-[#132116] text-white shadow" : "text-[#5b655e] hover:text-[#132116]"}`}>
            {label}{key === "registrations" && pending ? ` (${pending})` : ""}
          </button>
        ))}
      </div>
      {tab === "registrations" && <Registrations regs={regs} />}
      {tab === "teams" && <Teams />}
      {tab === "setup" && <SetupKeyed />}
      {tab === "scores" && <Scores />}
      {tab === "knockouts" && <Knockouts />}
      {tab === "share" && <Stories />}
    </Shell>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(await login(email.trim(), password));
    setBusy(false);
  };
  return (
    <div className="mx-auto max-w-md rounded-[28px] bg-white p-8 shadow-sm">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-[#b8ef3f]"><Icon name="lock" size={26} /></span>
      <h1 className="font-display mt-5 text-4xl font-bold uppercase">Organiser login</h1>
      <p className="mt-2 text-sm text-[#687169]">Only the accounts you added in Firebase can sign in here.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm font-bold">Email
          <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" />
        </label>
        <label className="block text-sm font-bold">Password
          <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="form-input" />
        </label>
        {err && <p className="text-sm font-semibold text-[#b03a22]" role="alert">{err}</p>}
        <button disabled={busy} className="w-full rounded-full bg-[#132116] py-4 font-bold text-white disabled:opacity-60">{busy ? "Signing in" : "Sign in"}</button>
      </form>
    </div>
  );
}

function useAction() {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<string>, ok = "") => {
    setBusy(true);
    const err = await fn();
    setBusy(false);
    setMsg(err || ok);
    if (!err && ok) setTimeout(() => setMsg(""), 2500);
    return !err;
  };
  const note = msg ? <p className="mt-3 text-sm font-semibold text-[#29420d]" role="status">{msg}</p> : null;
  return { run, busy, note };
}

/* ---------- registrations ---------- */
// Full screen view of a payment screenshot, loaded only when the organiser asks for it
function ProofViewer({ reg, onClose }: { reg: Registration; onClose: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => { getProof(reg.id).then(setSrc); }, [reg.id]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#07150d]/85 p-4" role="dialog" aria-modal="true" aria-label={`Payment screenshot from ${reg.teamName}`}>
      <div className="relative w-full max-w-md rounded-[28px] bg-[#f4f3ed] p-5">
        <button onClick={onClose} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-[#e4e4dc]" aria-label="Close"><Icon name="x" /></button>
        <h3 className="font-display pr-12 text-2xl font-bold uppercase">{reg.teamName}</h3>
        <p className="mb-4 text-sm text-[#5b655e]">UPI ref: {reg.upiRef || "not given"}</p>
        {src === null ? <Empty>Loading screenshot</Empty> : src ? (
          <a href={src} target="_blank" rel="noreferrer"><img src={src} alt={`Payment screenshot from ${reg.teamName}`} className="max-h-[70vh] w-full rounded-2xl object-contain" /></a>
        ) : <Empty>No screenshot found for this registration.</Empty>}
      </div>
    </div>
  );
}

function Registrations({ regs }: { regs: Registration[] }) {
  const [viewing, setViewing] = useState<Registration | null>(null);
  const [show, setShow] = useState<Registration["status"]>("pending");
  const { run, busy, note } = useAction();
  const list = regs.filter((r) => r.status === show);
  return (
    <div>
      {viewing && <ProofViewer reg={viewing} onClose={() => setViewing(null)} />}
      <div className="mb-5 flex flex-wrap gap-2">
        {(["pending", "approved", "rejected"] as const).map((k) => (
          <button key={k} onClick={() => setShow(k)} className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${show === k ? "bg-[#b8ef3f]" : "bg-white"}`}>
            {k} ({regs.filter((r) => r.status === k).length})
          </button>
        ))}
      </div>
      {note}
      {!list.length ? (
        <Empty>{show === "pending" ? "No new registrations. Share your story to bring more teams in." : `No ${show} registrations.`}</Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((r) => (
            <div key={r.id} className="rounded-[24px] border border-[#d8d8cf] bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.14em] text-[#6b746c]">{divLabel(r.division)} · Level {r.skill}</p>
                  <h3 className="font-display text-3xl font-bold uppercase">{r.teamName}</h3>
                  <p className="text-sm">{r.player2 ? `${r.player1} and ${r.player2}` : "Solo entry"}</p>
                </div>
                <span className="text-xs text-[#8a928b]">{r.createdAt?.toDate?.().toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
              </div>
              <dl className="mt-3 grid grid-cols-[110px_1fr] gap-y-1 text-sm">
                <dt className="text-[#6d746e]">Fee due</dt>
                <dd className="font-semibold">
                  {rupees(feeFor(r.division === "solo", r.createdAt?.toDate ? r.createdAt.toDate().getTime() : Date.now()))}
                </dd>
                <dt className="text-[#6d746e]">UPI ref</dt><dd className="font-mono font-semibold">{r.upiRef || "not given"}</dd>
                <dt className="text-[#6d746e]">Screenshot</dt>
                <dd>{r.hasProof ? <button onClick={() => setViewing(r)} className="font-semibold underline">View screenshot</button> : "not attached"}</dd>
                <dt className="text-[#6d746e]">WhatsApp</dt>
                <dd><a className="font-semibold underline" href={`https://wa.me/91${r.phone}`} target="_blank" rel="noreferrer">{r.phone}</a></dd>
                <dt className="text-[#6d746e]">Email</dt><dd className="break-all">{r.email}</dd>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                {r.status !== "approved" && (
                  <button disabled={busy} onClick={() => run(() => approveRegistration(r), `${r.teamName} added to teams`)}
                    className="flex items-center gap-2 rounded-full bg-[#b8ef3f] px-5 py-2.5 text-sm font-bold"><Icon name="check" size={16} /> Approve</button>
                )}
                {r.status === "pending" && (
                  <button disabled={busy} onClick={() => run(() => setRegStatus(r.id, "rejected"))} className="rounded-full border border-[#cfd2c9] px-5 py-2.5 text-sm font-bold">Reject</button>
                )}
                <a href={`https://wa.me/91${r.phone}?text=${encodeURIComponent(`Hi ${r.player1}, your team ${r.teamName} is confirmed for ${EVENT.name} on ${EVENT.dateLabel}. Follow live: ${siteUrl()}#/live`)}`}
                  target="_blank" rel="noreferrer" className="rounded-full border border-[#cfd2c9] px-5 py-2.5 text-sm font-bold">Send WhatsApp</a>
                {r.status === "rejected" && (
                  <button disabled={busy} onClick={() => confirm("Delete this registration for good?") && run(() => deleteRegistration(r.id))} className="rounded-full px-5 py-2.5 text-sm font-bold text-[#b03a22]">Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- teams ---------- */
// Practice entries named Team 1, Team 2 and so on, so they are easy to spot and remove
const TEST_TEAMS: [string, string, string, Div, number][] = [
  ...Array.from({ length: 14 }, (_, i): [string, string, string, Div, number] => [`Team ${i + 1}`, `Player ${2 * i + 1}`, `Player ${2 * i + 2}`, "doubles", 5 - (i % 5)]),
  ...Array.from({ length: 6 }, (_, i): [string, string, string, Div, number] => [`Solo Player ${i + 1}`, `Solo Player ${i + 1}`, "", "solo", 5 - (i % 5)]),
];

function Teams() {
  const { state } = useLive();
  const { run, busy, note } = useAction();
  const [f, setF] = useState({ name: "", p1: "", p2: "", div: "doubles" as Div, skill: 3 });
  const warn = state.generated ? "The schedule already exists. After changing teams, regenerate it in Setup." : "";

  const add = (e: FormEvent) => {
    e.preventDefault();
    run(() => updateState((s) => {
      if (s.teams.some((t) => t.name.toLowerCase() === f.name.trim().toLowerCase())) return "That team name is taken";
      s.teams.push({ id: uid(), name: f.name.trim(), p1: f.p1.trim(), p2: f.div === "solo" ? "" : f.p2.trim(), div: f.div, skill: Number(f.skill), checked: false, regId: null });
    }), `${f.name} added`).then((ok) => ok && setF({ ...f, name: "", p1: "", p2: "" }));
  };
  const patch = (id: string, change: (t: State["teams"][number]) => void) =>
    run(() => updateState((s) => { const t = s.teams.find((x) => x.id === id); if (!t) return "Team not found"; change(t); }));
  const remove = (id: string) => {
    if (!confirm(state.generated ? "This team is in the schedule. Remove it anyway? You will need to regenerate." : "Remove this team?")) return;
    run(() => updateState((s) => { s.teams = s.teams.filter((t) => t.id !== id); }));
  };

  return (
    <div className="grid gap-8">
      {warn && <p className="rounded-2xl bg-[#ffe1db] p-4 text-sm font-semibold">{warn}</p>}
      <form onSubmit={add} className="rounded-[28px] border border-[#d8d8cf] bg-white p-6">
        <h3 className="font-display text-2xl font-bold uppercase">Add a walk-in team</h3>
        <div className="mt-3 grid gap-4 md:grid-cols-5">
          <input required maxLength={40} placeholder="Team name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="form-input" />
          <input required maxLength={40} placeholder="Player 1" value={f.p1} onChange={(e) => setF({ ...f, p1: e.target.value })} className="form-input" />
          <input required={f.div !== "solo"} disabled={f.div === "solo"} maxLength={40} placeholder={f.div === "solo" ? "Not needed for solo" : "Player 2"} value={f.div === "solo" ? "" : f.p2} onChange={(e) => setF({ ...f, p2: e.target.value })} className="form-input disabled:opacity-50" />
          <select value={f.div} onChange={(e) => setF({ ...f, div: e.target.value as Div })} className="form-input">
            {DIVS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
          <select value={f.skill} onChange={(e) => setF({ ...f, skill: Number(e.target.value) })} className="form-input">
            {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>Level {v}</option>)}
          </select>
        </div>
        <button disabled={busy} className="mt-4 rounded-full bg-[#132116] px-6 py-3 font-bold text-white">Add team</button>
        {note}
      </form>

      {DIVS.map((d) => {
        const ts = state.teams.filter((t) => t.div === d.key);
        return (
          <section key={d.key}>
            <h3 className="font-display mb-3 text-3xl font-bold uppercase">{d.label} <span className="text-[#8a928b]">{ts.length}/{d.key === "solo" ? state.settings.capSolo : state.settings.capDoubles}</span></h3>
            {!ts.length ? <Empty>No teams yet.</Empty> : (
              <div className="overflow-x-auto rounded-[24px] border border-[#d8d8cf] bg-white">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-[11px] font-bold uppercase tracking-[.12em] text-[#687169]">
                    <th className="px-5 py-3">Here</th><th className="px-3 py-3">Team</th><th className="px-3 py-3">Players</th><th className="px-3 py-3">Level</th><th className="px-5 py-3" />
                  </tr></thead>
                  <tbody>
                    {ts.map((t) => (
                      <tr key={t.id} className="border-t border-[#eeeee8]">
                        <td className="px-5 py-3"><input type="checkbox" className="h-5 w-5 accent-[#789b2d]" checked={t.checked} onChange={(e) => patch(t.id, (x) => { x.checked = e.target.checked; })} aria-label={`${t.name} checked in`} /></td>
                        <td className="px-3 font-semibold">{t.name}</td>
                        <td className="px-3">{namesOf(t)}</td>
                        <td className="px-3">
                          <select value={t.skill} onChange={(e) => patch(t.id, (x) => { x.skill = Number(e.target.value); })} className="rounded-lg border border-[#d8d9d1] px-2 py-1" aria-label={`${t.name} level`}>
                            {[1, 2, 3, 4, 5].map((v) => <option key={v}>{v}</option>)}
                          </select>
                        </td>
                        <td className="px-5 text-right"><button onClick={() => remove(t.id)} className="font-bold text-[#b03a22]">Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* ---------- setup ---------- */
function SetupKeyed() {
  const { state } = useLive();
  return <Setup key={JSON.stringify(state.settings)} />;
}

function Setup() {
  const { state } = useLive();
  const { run, busy, note } = useAction();
  const [f, setF] = useState<Settings>(state.settings);
  const num = (k: keyof Settings, label: string, min: number, max: number) => (
    <label className="block text-sm font-bold">{label}
      <input type="number" min={min} max={max} value={f[k] as number} onChange={(e) => setF({ ...f, [k]: Math.min(max, Math.max(min, Number(e.target.value) || min)) })} className="form-input" />
    </label>
  );
  const save = () => run(() => updateState((s) => { s.settings = { ...f }; }), "Settings saved");
  const generate = () => {
    if (state.generated && !confirm("This clears every score and the bracket, then builds a new schedule. Continue?")) return;
    run(() => updateState((s) => {
      s.settings = { ...f };
      if (s.teams.length < 2) return "Add at least two teams first";
      generateSchedule(s);
    }), "Pools and schedule are live");
  };
  const testTeams = (add: boolean) => run(() => updateState((s) => {
    s.teams = s.teams.filter((t) => t.regId !== "test");
    if (add) TEST_TEAMS.forEach(([name, p1, p2, div, skill]) => s.teams.push({ id: uid(), name, p1, p2, div, skill, checked: false, regId: "test" }));
  }), add ? "Test teams added" : "Test teams removed");

  return (
    <div className="grid gap-8">
      <div className="rounded-[28px] border border-[#d8d8cf] bg-white p-6">
        <h3 className="font-display text-2xl font-bold uppercase">Day settings</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm font-bold">First match
            <input type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} className="form-input" />
          </label>
          {num("courts", "Courts", 1, 12)}
          {num("matchMin", "Minutes per match", 8, 60)}
          {num("breakMin", "Break before knockouts", 0, 120)}
          {num("poolSize", "Teams per pool (target)", 3, 8)}
          {num("qualifiers", "Teams through per pool", 1, 4)}
          {num("poolTarget", "Pool games to", 7, 21)}
          {num("koTarget", "Knockout games to", 7, 21)}
          {num("capDoubles", "Max doubles teams", 2, 64)}
          {num("capSolo", "Max solo players", 2, 64)}
          {num("offlineDoubles", "Doubles booked outside the site", 0, 64)}
          {num("offlineSolo", "Solo booked outside the site", 0, 64)}
          <label className="flex items-center gap-3 self-end rounded-[14px] border border-[#d8d9d1] p-4 text-sm font-bold">
            <input type="checkbox" className="h-5 w-5 accent-[#789b2d]" checked={f.regOpen} onChange={(e) => setF({ ...f, regOpen: e.target.checked })} />
            Registration open
          </label>
        </div>
        <button disabled={busy} onClick={save} className="mt-5 rounded-full bg-[#132116] px-6 py-3 font-bold text-white">Save settings</button>
      </div>

      <div className="rounded-[28px] bg-[#102b1b] p-6 text-white">
        <h3 className="font-display text-2xl font-bold uppercase">Build the schedule</h3>
        <p className="mt-2 max-w-2xl text-sm text-white/70">
          Spreads strong teams across pools, plays every pool as a round robin, and fills every court without making a team play two slots in a row where it can.
          {state.generated && ` Current plan finishes around ${estimateFinish(state)}.`}
          {state.generated && state.backToBack > 0 && ` ${state.backToBack} matches could not avoid a back-to-back game.`}
        </p>
        <button disabled={busy} onClick={generate} className="mt-5 rounded-full bg-[#b8ef3f] px-6 py-3 font-bold text-[#132116]">
          {state.generated ? "Regenerate pools and schedule" : "Generate pools and schedule"}
        </button>
        {note}
      </div>

      <div className="rounded-[28px] border border-dashed border-[#cfd2c9] p-6">
        <h3 className="font-display text-2xl font-bold uppercase">Test run</h3>
        <p className="mt-2 text-sm text-[#5b655e]">Add 14 practice Doubles teams (Team 1 to Team 14) and 6 Solo players to try the full flow with friends, then remove them before the real day.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button disabled={busy} onClick={() => testTeams(true)} className="rounded-full bg-white px-5 py-2.5 text-sm font-bold">Add test teams</button>
          <button disabled={busy} onClick={() => testTeams(false)} className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#b03a22]">Remove test teams</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- scores ---------- */
function saveScore(m: Match, a: number | null, b: number | null) {
  return updateState((s) => {
    const x = s.matches.find((y) => y.id === m.id);
    if (!x) return "This match no longer exists. Reload the page.";
    if (x.a !== m.a || x.b !== m.b) return "The teams in this match changed. Check the latest bracket.";
    x.sa = a;
    x.sb = b;
    propagate(s);
  });
}

function Scores() {
  const { state } = useLive();
  const [court, setCourt] = useState(0);
  const [hideDone, setHideDone] = useState(false);
  const [copied, setCopied] = useState("");
  const ms = state.matches
    .filter((m) => m.stage === "pool" && (!court || m.court === court) && (!hideDone || !isDone(m)))
    .sort((x, y) => (x.slot ?? 0) - (y.slot ?? 0) || (x.court ?? 0) - (y.court ?? 0));
  const bySlot = useMemo(() => {
    const g: Record<number, Match[]> = {};
    ms.forEach((m) => (g[m.slot ?? 0] ??= []).push(m));
    return g;
  }, [ms]);
  const left = state.matches.filter((m) => m.stage === "pool" && !isDone(m)).length;

  const whatsapp = async () => {
    const st = statusMap(state);
    const lines = [`*${EVENT.name}*`, `Live scores: ${siteUrl()}#/live`, ""];
    state.matches.filter((m) => m.a && m.b && !isBye(m) && st[m.id] !== "final").slice(0, 12).forEach((m) =>
      lines.push(`${fmtTime(matchTime(state, m) ?? 0)}  Court ${m.court}: ${nameOf(state, m.a)} vs ${nameOf(state, m.b)}`));
    try { await navigator.clipboard.writeText(lines.join("\n")); setCopied("Copied. Paste it in your WhatsApp group."); }
    catch { setCopied("Copy failed on this browser."); }
  };

  if (!state.generated) return <Empty>Generate the schedule in Setup first.</Empty>;
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select value={court} onChange={(e) => setCourt(Number(e.target.value))} className="rounded-full border border-[#d8d9d1] bg-white px-5 py-2.5 text-sm font-bold" aria-label="Court">
          <option value={0}>All courts</option>
          {Array.from({ length: state.settings.courts }, (_, i) => <option key={i} value={i + 1}>Court {i + 1} only</option>)}
        </select>
        <label className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold">
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} className="accent-[#789b2d]" /> Hide finished
        </label>
        <button onClick={whatsapp} className="rounded-full bg-white px-5 py-2.5 text-sm font-bold">Copy next matches for WhatsApp</button>
        <span className="text-sm font-semibold text-[#5b655e]">{left ? `${left} pool matches left` : "Pool play done. Build the knockouts next."}</span>
      </div>
      {copied && <p className="mb-4 text-sm font-semibold text-[#29420d]">{copied}</p>}
      <div className="grid gap-6">
        {Object.keys(bySlot).map(Number).sort((a, b) => a - b).map((slot) => (
          <div key={slot} className="grid gap-4 border-t border-[#d8d8cf] pt-5 md:grid-cols-[140px_1fr]">
            <div className="whitespace-nowrap font-display text-3xl font-bold">{fmtTime(matchTime(state, bySlot[slot][0]) ?? 0)}</div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {bySlot[slot].map((m) => (
                <ScoreEditor key={`${m.id}-${m.sa}-${m.sb}-${m.a}-${m.b}`} s={state} m={m} onSave={(a, b) => saveScore(m, a, b)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- knockouts ---------- */
function Knockouts() {
  const { state } = useLive();
  const { run, busy, note } = useAction();
  const left = state.matches.filter((m) => m.stage === "pool" && !isDone(m)).length;
  const build = () => {
    if (state.koBuilt && !confirm("Rebuilding clears all knockout scores. Continue?")) return;
    if (left && !confirm(`${left} pool matches have no score yet. Build the bracket from the current standings anyway?`)) return;
    run(() => updateState((s) => { buildKO(s); }), "Bracket is live");
  };
  if (!state.generated) return <Empty>Generate the schedule in Setup first.</Empty>;
  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center gap-4">
        <button disabled={busy} onClick={build} className="rounded-full bg-[#b8ef3f] px-6 py-3 font-bold">
          {state.koBuilt ? "Rebuild knockout bracket" : "Build knockout bracket"}
        </button>
        <span className="text-sm text-[#5b655e]">Top {state.settings.qualifiers} from each pool go through. Winners move forward on their own.</span>
      </div>
      {note}
      {state.koBuilt && DIVS.map((d) => (
        <Bracket key={d.key} s={state} div={d.key}
          render={(m) => <ScoreEditor key={`${m.id}-${m.sa}-${m.sb}-${m.a}-${m.b}`} s={state} m={m} onSave={(a, b) => saveScore(m, a, b)} />} />
      ))}
    </div>
  );
}

/* ---------- stories ---------- */
function Stories() {
  const { state } = useLive();
  const [story, setStory] = useState<StoryContent | null>(null);
  const base = siteUrl();
  const st = statusMap(state);
  const liveNow = state.matches.filter((m) => st[m.id] === "live");
  const options: [string, string, StoryContent][] = [
    ["Registrations open", "Bring teams in", {
      kicker: `29.11 · ${EVENT.city}`, title: ["Serve it.", "Own it."], highlight: 1,
      sticker: ["win", rupees(TOP_PRIZE)],
      chips: [`🏆 win up to ${rupees(TOP_PRIZE)}`, "🔥 filling fast", "🥤 water + refreshments", "🏓 2+ matches", "🧍 solo entry", "✨ all levels"],
      prices: posterPrices(),
      lines: [`${spotsText(state, "doubles")} · ${spotsText(state, "solo")}`, priceNote()],
      footer: "Claim your spot", url: `${base}#/register` }],
    ["Last few spots", "Push before the deadline", {
      kicker: "filling fast", title: ["Last few", "spots fr"], highlight: 1, sticker: isEarlyBird() ? ["early bird", rupees(FEE.early)] : ["don’t", "sleep"],
      chips: [`🏆 ${rupees(TOP_PRIZE)} top prize`, "🥤 water + refreshments", "🏓 2+ matches"],
      prices: posterPrices(),
      lines: [`${spotsText(state, "doubles")} · ${spotsText(state, "solo")}`, priceNote()], footer: "Grab your spot", url: `${base}#/register` }],
    ["Schedule is out", "After you generate pools", {
      kicker: "pools are drawn", title: ["Schedule", "dropped"], highlight: 1, sticker: ["find", "your court"],
      lines: [`First serve ${fmtTime(startMin(state))}`, `${state.teams.length} teams, ${state.settings.courts} courts`, "Find your team and your court"],
      footer: "Find your team", url: `${base}#/live` }],
    ["Live now", "During the day", {
      kicker: "live rn", title: ["On court", "right now"], highlight: 1, sticker: ["live", "scores"],
      lines: liveNow.length ? liveNow.slice(0, 4).map((m) => `Court ${m.court}: ${nameOf(state, m.a)} vs ${nameOf(state, m.b)}`) : ["Scores update live", `${EVENT.venue}, ${EVENT.city}`],
      footer: "Follow live", url: `${base}#/live` }],
    ...DIVS.flatMap((d): [string, string, StoryContent][] => {
      const c = champion(state, d.key);
      if (!c) return [];
      const t = state.teams.find((x) => x.id === c);
      return [[`${d.label} champions`, nameOf(state, c), {
        kicker: `${d.label} champs`, title: [nameOf(state, c), "Champions"], highlight: 1, sticker: ["main", "characters"],
        lines: [t ? namesOf(t) : "", EVENT.name, `${EVENT.venue}, ${EVENT.city}`], footer: "See the bracket", url: `${base}#/live/bracket` }]];
    }),
  ];
  return (
    <div>
      <p className="mb-5 max-w-2xl text-[#5b655e]">Pick a story. On your phone, Share opens Instagram directly. Every image has a QR code back to the site, and you can add a link sticker on top.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {options.map(([title, sub, content]) => (
          <button key={title} onClick={() => setStory(content)} className="group flex items-center justify-between gap-4 rounded-[24px] bg-[#102b1b] p-6 text-left text-white">
            <span>
              <strong className="font-display block text-3xl uppercase">{title}</strong>
              <small className="text-white/60">{sub}</small>
            </span>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/25 group-hover:bg-[#b8ef3f] group-hover:text-[#132116]"><Icon name="share" /></span>
          </button>
        ))}
      </div>
      {story && <ShareStory content={story} onClose={() => setStory(null)} />}
    </div>
  );
}
