import { useMemo, useState } from "react";
import { EVENT, siteUrl } from "../config";
import { useLive } from "../lib/store";
import {
  champion, divLabel, fmtTime, isBye, isDone, koRounds, matchTime, nameOf, poolOfTeam, roundName, standings,
  namesOf, statusMap, teamMatches, teamOf, type Match,
} from "../lib/tournament";
import { Icon } from "../components/Icon";
import { Empty, MatchRow, PageTitle, Shell } from "../components/ui";
import { ShareStory } from "../components/ShareStory";
import type { StoryContent } from "../lib/story";

export default function TeamPage({ id }: { id: string }) {
  const { state, status } = useLive();
  const [story, setStory] = useState<StoryContent | null>(null);
  const statuses = useMemo(() => statusMap(state), [state]);
  const team = teamOf(state, id);

  if (status === "loading") return <Shell><Empty>Loading team</Empty></Shell>;
  if (!team)
    return (
      <Shell>
        <Empty>
          We could not find this team. It may still be waiting for confirmation.
          <a href="#/live" className="mt-4 block font-bold underline">Back to live scores</a>
        </Empty>
      </Shell>
    );

  const ms = teamMatches(state, id).filter((m) => !isBye(m));
  const next = ms.find((m) => !isDone(m) && m.a && m.b);
  const played = ms.filter(isDone);
  const wins = played.filter((m) => (m.a === id ? m.sa! > m.sb! : m.sb! > m.sa!)).length;
  const pool = poolOfTeam(state, team);
  const rank = pool ? standings(state, team.div, pool).findIndex((r) => r.id === id) + 1 : 0;
  const isChamp = champion(state, team.div) === id;
  const label = (m: Match) => (m.stage === "pool" ? `Pool ${m.pool}` : roundName(koRounds(state, m.div).length, m.round));
  const last = played[played.length - 1];
  const opp = (m: Match) => (m.a === id ? m.b : m.a);
  const score = (m: Match) => (m.a === id ? `${m.sa}-${m.sb}` : `${m.sb}-${m.sa}`);
  const won = (m: Match) => (m.a === id ? m.sa! > m.sb! : m.sb! > m.sa!);

  const teamStory: StoryContent = isChamp
    ? { kicker: `${divLabel(team.div)} champs`, title: [team.name, "Champions"], highlight: 1, sticker: ["main", "characters"],
        lines: [namesOf(team), `${EVENT.name}`, `${EVENT.venue}, ${EVENT.city}`], footer: "See the bracket", url: `${siteUrl()}#/team/${id}` }
    : last && won(last)
      ? { kicker: label(last), title: [team.name, `W ${score(last)}`], highlight: 1, sticker: ["big", "W"],
          lines: [`vs ${nameOf(state, opp(last))}`, namesOf(team), next ? `Next: Court ${next.court}, ${fmtTime(matchTime(state, next)!)}` : `${wins} wins so far`],
          footer: team.p2 ? "Follow our run" : "Follow my run", url: `${siteUrl()}#/team/${id}` }
      : { kicker: divLabel(team.div), title: [team.name, team.p2 ? "We’re in" : "I’m in"], highlight: 1, sticker: ["pull", "up"],
          lines: [namesOf(team), next ? `First up: Court ${next.court}, ${fmtTime(matchTime(state, next)!)}` : EVENT.dateLabel, `${EVENT.venue}, ${EVENT.city}`],
          footer: team.p2 ? "Cheer us on" : "Cheer me on", url: `${siteUrl()}#/team/${id}` };

  return (
    <Shell>
      <a href="#/live" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#5b655e]"><Icon name="back" size={18} /> Live scores</a>
      <PageTitle eyebrow={`${divLabel(team.div)}${pool ? ` · Pool ${pool}` : ""}`} title={team.name}>
        {namesOf(team)}
      </PageTitle>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-[28px] bg-[#102b1b] p-6 text-white md:col-span-2">
          <p className="eyebrow text-[#b8ef3f]">{isChamp ? "Champions" : next ? "Next match" : "Status"}</p>
          {isChamp ? (
            <p className="font-display mt-2 text-5xl font-bold uppercase">Champions of {divLabel(team.div)}</p>
          ) : next ? (
            <>
              <p className="font-display mt-2 text-5xl font-bold uppercase">
                {next.court ? `Court ${next.court}` : "Court TBD"}, {matchTime(state, next) !== null ? fmtTime(matchTime(state, next)!) : "time TBD"}
              </p>
              <p className="mt-2 text-white/75">vs {nameOf(state, opp(next))}, {label(next)}</p>
            </>
          ) : (
            <p className="font-display mt-2 text-4xl font-bold uppercase">{played.length ? "All matches played" : "Schedule coming soon"}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-[28px] border border-[#d8d8cf] bg-white p-5">
            <strong className="font-display text-5xl">{wins}-{played.length - wins}</strong>
            <span className="block text-sm text-[#6d746e]">win, loss</span>
          </div>
          <div className="rounded-[28px] border border-[#d8d8cf] bg-white p-5">
            <strong className="font-display text-5xl">{rank || "-"}</strong>
            <span className="block text-sm text-[#6d746e]">in pool</span>
          </div>
        </div>
      </div>

      <button onClick={() => setStory(teamStory)} className="mb-8 flex items-center gap-3 rounded-full bg-[#b8ef3f] px-6 py-4 font-bold">
        <Icon name="share" size={18} /> Share our story
      </button>

      {ms.length ? (
        <div className="overflow-hidden rounded-[28px] border border-[#d8d8cf] bg-white">
          {ms.map((m) => <MatchRow key={m.id} s={state} m={m} status={statuses[m.id]} label={label(m)} />)}
        </div>
      ) : (
        <Empty>Matches appear here once the schedule is out.</Empty>
      )}

      {story && <ShareStory content={story} onClose={() => setStory(null)} />}
    </Shell>
  );
}
