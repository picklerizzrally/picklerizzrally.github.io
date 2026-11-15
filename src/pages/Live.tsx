import { useMemo, useState, type ReactNode } from "react";
import { EVENT, photo, siteUrl } from "../config";
import { useLive } from "../lib/store";
import {
  DIVS, champion, divLabel, fmtTime, isBye, isDone, koRounds, koStartMin, matchTime, nameOf, playersOf,
  koLabel, namesOf, roundName, standings, statusMap, stats, type Div, type Match, type State,
} from "../lib/tournament";
import { Icon } from "../components/Icon";
import { Empty, MatchRow, PageTitle, Shell, StatusPill } from "../components/ui";
import { ShareStory } from "../components/ShareStory";
import type { StoryContent } from "../lib/story";

type Tab = "schedule" | "standings" | "bracket";

export default function Live({ tab: initial }: { tab?: string }) {
  const { state, status } = useLive();
  const [tab, setTab] = useState<Tab>((["schedule", "standings", "bracket"].includes(initial ?? "") ? initial : "schedule") as Tab);
  const [div, setDiv] = useState<"all" | Div>("all");
  const [q, setQ] = useState("");
  const [story, setStory] = useState<StoryContent | null>(null);
  const statuses = useMemo(() => statusMap(state), [state]);
  const st = stats(state);

  const found = q.trim().length >= 2
    ? state.teams.filter((t) => `${t.name} ${t.p1} ${t.p2}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6)
    : [];

  const liveNow = state.matches.filter((m) => statuses[m.id] === "live");
  const liveStory: StoryContent = {
    kicker: "live rn",
    title: ["On court", "right now"],
    highlight: 1,
    sticker: ["live", "scores"],
    lines: liveNow.length
      ? liveNow.slice(0, 4).map((m) => `Court ${m.court}: ${nameOf(state, m.a)} vs ${nameOf(state, m.b)}`)
      : [`${st.played} of ${st.total} matches played`, `${EVENT.venue}, ${EVENT.city}`],
    footer: "Follow live",
    url: `${siteUrl()}#/live`,
  };

  const go = (t: Tab) => { setTab(t); history.replaceState(null, "", `#/live/${t}`); };
  const divs = DIVS.filter((d) => div === "all" || d.key === div);

  return (
    <Shell active="live">
      <PageTitle eyebrow={`${EVENT.dateLabel} · ${EVENT.venue}`} title="Live scores">
        Scores update on their own as the organiser enters them. No need to refresh.
      </PageTitle>

      <div className="relative mb-8 h-40 overflow-hidden rounded-[28px] md:h-52">
        <img src={photo("ball-net-shadow.jpg")} alt="" className="absolute inset-0 h-full w-full object-cover object-[center_55%]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#102b1b]/85 via-[#102b1b]/40 to-transparent" />
        <p className="font-display absolute bottom-5 left-6 text-3xl font-bold uppercase text-white md:text-5xl">
          Live from {EVENT.venue}
        </p>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="relative">
          <label htmlFor="find" className="sr-only">Find your team</label>
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6d746e]"><Icon name="search" /></span>
          <input id="find" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find your team or a player"
            className="w-full rounded-full border border-[#d8d9d1] bg-white py-4 pl-12 pr-5 outline-none focus:border-[#789b2d] focus:shadow-[0_0_0_3px_rgb(184_239_63/0.25)]" />
          {found.length > 0 && (
            <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-[#d8d8cf] bg-white shadow-xl">
              {found.map((t) => (
                <a key={t.id} href={`#/team/${t.id}`} className="flex items-center justify-between gap-3 border-b border-[#eeeee8] px-5 py-3 last:border-0 hover:bg-[#f4f3ed]">
                  <span><b>{t.name}</b><small className="ml-2 text-[#6d746e]">{namesOf(t)}</small></span>
                  <Icon name="chevron" size={17} />
                </a>
              ))}
            </div>
          )}
          {q.trim().length >= 2 && !found.length && <p className="mt-2 pl-5 text-sm text-[#6d746e]">No team matches that name yet.</p>}
        </div>
        <button onClick={() => setStory(liveStory)} className="flex items-center justify-center gap-3 rounded-full bg-[#132116] px-6 py-4 font-bold text-white">
          <Icon name="share" size={18} /> Share live story
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          [`${st.played}/${st.total}`, "matches played"],
          [st.played ? st.avgMargin.toFixed(1) : "-", "average winning margin"],
          [st.played ? `${st.closePct}%` : "-", "games won by 2 points"],
          [st.played ? `${st.upsetPct}%` : "-", "upsets by lower rated teams"],
        ].map(([v, l]) => (
          <div key={l} className="rounded-[22px] border border-[#d8d8cf] bg-white p-4">
            <strong className="font-display text-4xl">{v}</strong>
            <span className="block text-sm text-[#6d746e]">{l}</span>
          </div>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex w-fit rounded-full bg-[#e5e4dc] p-1" role="tablist">
          {(["schedule", "standings", "bracket"] as Tab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => go(t)}
              className={`rounded-full px-5 py-2.5 text-sm font-bold capitalize transition ${tab === t ? "bg-[#132116] text-white shadow" : "text-[#5b655e] hover:text-[#132116]"}`}>
              {t}
            </button>
          ))}
        </div>
        <select value={div} onChange={(e) => setDiv(e.target.value as "all" | Div)} aria-label="Category"
          className="rounded-full border border-[#d8d9d1] bg-white px-5 py-2.5 text-sm font-bold">
          <option value="all">All categories</option>
          {DIVS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
        </select>
      </div>

      {status === "loading" ? (
        <Empty>Loading live scores</Empty>
      ) : !state.generated ? (
        <Empty>The schedule appears here once entries close.</Empty>
      ) : tab === "schedule" ? (
        <ScheduleList s={state} div={div} statuses={statuses} />
      ) : tab === "standings" ? (
        <div className="grid gap-8">{divs.map((d) => <DivisionStandings key={d.key} s={state} div={d.key} />)}</div>
      ) : (
        <div className="grid gap-8">{divs.map((d) => <Bracket key={d.key} s={state} div={d.key} />)}</div>
      )}

      {story && <ShareStory content={story} onClose={() => setStory(null)} />}
    </Shell>
  );
}

function ScheduleList({ s, div, statuses }: { s: State; div: "all" | Div; statuses: Record<string, ReturnType<typeof statusMap>[string]> }) {
  const ms = s.matches
    .filter((m) => !isBye(m) && (div === "all" || m.div === div))
    .sort((x, y) => (matchTime(s, x) ?? 1e9) - (matchTime(s, y) ?? 1e9) || (x.court ?? 0) - (y.court ?? 0));
  const labelFor = (m: Match) => {
    if (m.stage === "pool") return `Pool ${m.pool}`;
    return koLabel(s, m);
  };
  return (
    <div className="overflow-hidden rounded-[28px] border border-[#d8d8cf] bg-white">
      {ms.map((m) => <MatchRow key={m.id} s={s} m={m} status={statuses[m.id]} label={labelFor(m)} />)}
    </div>
  );
}

export function DivisionStandings({ s, div }: { s: State; div: Div }) {
  const pools = s.pools[div];
  if (!pools) return null;
  return (
    <section>
      <h2 className="font-display mb-4 text-4xl font-bold uppercase">{divLabel(div)}</h2>
      <div className="grid gap-5 lg:grid-cols-2">
        {Object.keys(pools).sort().map((letter) => (
          <div key={letter} className="overflow-hidden rounded-[28px] border border-[#d8d8cf] bg-white">
            <div className="flex items-center justify-between bg-[#eeeee8] px-6 py-3">
              <b>Pool {letter}</b>
              <span className="text-xs font-semibold text-[#687169]">Top {s.settings.qualifiers} go through</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-bold uppercase tracking-[.12em] text-[#687169]">
                    <th className="px-6 py-3">Team</th>
                    {["P", "W", "L", "+/-"].map((h) => <th key={h} className="px-2 py-3 text-right last:pr-6">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {standings(s, div, letter).map((r, i) => (
                    <tr key={r.id} className="border-t border-[#eeeee8]">
                      <td className="px-6 py-3">
                        <span className={`mr-3 inline-grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${i < s.settings.qualifiers ? "bg-[#b8ef3f]" : "bg-[#f0f0eb] text-[#6d746e]"}`}>{i + 1}</span>
                        <a href={`#/team/${r.id}`} className="font-semibold hover:underline">{nameOf(s, r.id)}</a>
                      </td>
                      <td className="px-2 text-right tabular-nums">{r.p}</td>
                      <td className="px-2 text-right font-bold tabular-nums">{r.w}</td>
                      <td className="px-2 text-right tabular-nums">{r.l}</td>
                      <td className="px-2 pr-6 text-right tabular-nums">{r.pf - r.pa > 0 ? "+" : ""}{r.pf - r.pa}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Bracket({ s, div, render }: { s: State; div: Div; render?: (m: Match) => ReactNode }) {
  const rounds = koRounds(s, div);
  if (!rounds.length)
    return (
      <section>
        <h2 className="font-display mb-4 text-4xl font-bold uppercase">{divLabel(div)}</h2>
        <Empty>The knockout bracket is drawn after pool play, around {fmtTime(koStartMin(s))}.</Empty>
      </section>
    );
  const champ = champion(s, div);
  const statuses = statusMap(s);
  return (
    <section>
      <h2 className="font-display mb-4 text-4xl font-bold uppercase">{divLabel(div)}</h2>
      {champ && (
        <div className="mb-5 flex items-center gap-4 rounded-[24px] bg-[#b8ef3f] p-5">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-[#132116] text-[#b8ef3f]"><Icon name="trophy" size={28} /></span>
          <div>
            <p className="eyebrow">Champions</p>
            <a href={`#/team/${champ}`} className="font-display text-3xl font-bold uppercase">{nameOf(s, champ)}</a>
          </div>
        </div>
      )}
      <div className="flex gap-5 overflow-x-auto pb-3">
        {rounds.map((round, r) => (
          <div key={r} className="flex min-w-[270px] flex-col gap-3">
            <h3 className="font-display text-xl font-bold uppercase text-[#5b655e]">{roundName(rounds.length, r)}</h3>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {round.map((m) =>
                isBye(m) ? (
                  <div key={m.id} className="rounded-[22px] border border-dashed border-[#d8d8cf] bg-white/60 p-4 text-sm">
                    <b>{nameOf(s, m.a ?? m.b)}</b> <span className="text-[#6d746e]">moves on with a bye</span>
                  </div>
                ) : render ? (
                  <div key={m.id}>
                    {m.bronze && <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#6d746e]">3rd place match</p>}
                    {render(m)}
                  </div>
                ) : (
                  <div key={m.id} className="rounded-[22px] border border-[#d8d8cf] bg-white p-4">
                    {m.bronze && <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#6d746e]">3rd place match</p>}
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[#6d746e]">
                      <span>{m.court && m.a && m.b ? `Court ${m.court}, ${fmtTime(matchTime(s, m)!)}` : "Waiting for teams"}</span>
                      {m.a && m.b && <StatusPill status={statuses[m.id]} />}
                    </div>
                    {[[m.a, m.sa, m.sb], [m.b, m.sb, m.sa]].map(([id, mine, theirs], i) => (
                      <div key={i} className="flex items-center justify-between gap-3 py-1">
                        <span className={isDone(m) && (mine as number) > (theirs as number) ? "font-bold" : "text-[#5b655e]"}>
                          {id ? nameOf(s, id as string) : "TBD"}
                          <small className="ml-2 text-[#8a928b]">{playersOf(s, id as string | null)}</small>
                        </span>
                        <span className="font-display text-2xl">{isDone(m) ? (mine as number) : ""}</span>
                      </div>
                    ))}
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
