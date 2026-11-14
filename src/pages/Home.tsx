import { useMemo, useState } from "react";
import { CREDIT, EVENT, feeLine, isEarlyBird, FEE, PERKS, PRIZES, TOP_PRIZE, photo, rupees, prettyPhone, siteUrl } from "../config";
import { useLive } from "../lib/store";
import { DIVS, fmtTime, isDone, isFull, matchTime, startMin, statusMap, type Div } from "../lib/tournament";

const HOW = [
  ["Claim your spot", "Pick Doubles or Solo and fill in the form. Takes about two minutes."],
  ["Pay by UPI", "Tap the pay button in the form, then paste your UPI transaction ID."],
  ["Get the green tick", "We check your payment and confirm your spot on WhatsApp."],
  ["Pull up and play", "Find your court and time on the live page. Then go win something."],
];
import { Icon, LogoMark } from "../components/Icon";
import { LiveBanner, MatchRow, Price, useUI } from "../components/ui";
import { ShareStory } from "../components/ShareStory";
import type { StoryContent } from "../lib/story";

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

export default function Home() {
  const { state } = useLive();
  const { openRegistration } = useUI();
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | Div>("all");
  const [story, setStory] = useState<StoryContent | null>(null);
  const regOpen = state.settings.regOpen;

  const statuses = useMemo(() => statusMap(state), [state]);
  const upcoming = useMemo(() => {
    const ms = state.matches.filter((m) => m.a && m.b && (filter === "all" || m.div === filter));
    const open = ms.filter((m) => !isDone(m)).sort((x, y) => (matchTime(state, x) ?? 0) - (matchTime(state, y) ?? 0));
    const finals = ms.filter(isDone).sort((x, y) => (matchTime(state, y) ?? 0) - (matchTime(state, x) ?? 0));
    return [...open, ...finals].slice(0, 6);
  }, [state, filter]);

  const promoStory: StoryContent = {
    kicker: `29.11 · ${EVENT.city}`,
    title: ["Serve it.", "Own it."],
    highlight: 1,
    sticker: ["win", rupees(TOP_PRIZE)],
    chips: [`🏆 win up to ${rupees(TOP_PRIZE)}`, "🔥 limited spots", "🥤 water + refreshments", "🏓 2+ matches", "🧍 solo entry", "✨ all levels"],
    lines: ["doubles · solo · open to everyone", feeLine(), `${EVENT.venue}, ${EVENT.city}`],
    footer: regOpen ? "Claim your spot" : "Follow live",
    url: regOpen ? `${siteUrl()}#/register` : `${siteUrl()}#/live`,
  };

  const nav = [["Prizes", "prizes"], ["How it works", "how"], ["Categories", "divisions"], ["Venue", "venue"], ["FAQ", "faq"]];
  const scoring = `Pool games go to ${state.settings.poolTarget} and knockout games to ${state.settings.koTarget}, and you win by 2.`;

  return (
    <div className="min-h-screen overflow-hidden bg-[#f4f3ed] text-[#132116]">
      <div className="relative z-40"><LiveBanner /></div>
      <header className="absolute inset-x-0 top-auto z-30 border-b border-white/20 text-white">
        <div className="mx-auto flex h-[84px] max-w-[1440px] items-center justify-between px-5 md:px-10 lg:px-16">
          <a href="#" className="flex items-center gap-3" aria-label={`${EVENT.brand} home`}>
            <LogoMark />
            <span className="font-display text-[25px] font-bold tracking-[-.01em]">{EVENT.brand}</span>
          </a>
          <nav className="hidden items-center gap-7 text-sm font-semibold lg:flex" aria-label="Main navigation">
            {nav.map(([label, id]) => (
              <button key={id} className="nav-link" onClick={() => scrollTo(id)}>{label}</button>
            ))}
            <a className="nav-link" href="#/live">Live scores</a>
          </nav>
          <div className="flex items-center gap-3">
            {regOpen ? (
              <button onClick={() => openRegistration()} className="hidden rounded-full bg-[#b8ef3f] px-6 py-3 text-sm font-bold text-[#132116] transition hover:bg-white sm:block">
                Register now
              </button>
            ) : (
              <a href="#/live" className="hidden rounded-full bg-[#b8ef3f] px-6 py-3 text-sm font-bold text-[#132116] transition hover:bg-white sm:block">Live scores</a>
            )}
            <button onClick={() => setMenuOpen(!menuOpen)} className="grid h-11 w-11 place-items-center rounded-full border border-white/35 lg:hidden" aria-label="Toggle menu" aria-expanded={menuOpen}>
              <Icon name={menuOpen ? "x" : "menu"} />
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="mx-5 mb-4 flex flex-col gap-1 rounded-2xl bg-[#102b1b] p-3 text-sm font-semibold shadow-2xl lg:hidden">
            {nav.map(([label, id]) => (
              <button key={id} onClick={() => { setMenuOpen(false); scrollTo(id); }} className="rounded-xl px-4 py-3 text-left hover:bg-white/10">{label}</button>
            ))}
            <a href="#/live" className="rounded-xl px-4 py-3 hover:bg-white/10">Live scores</a>
            {regOpen && <button onClick={() => { setMenuOpen(false); openRegistration(); }} className="rounded-xl bg-[#b8ef3f] px-4 py-3 text-left font-bold text-[#132116]">Register now</button>}
          </nav>
        )}
      </header>

      <main>
        <section id="tournament" className="relative flex min-h-[790px] items-end overflow-hidden bg-[#163b25] text-white">
          <img
            src={photo("sunset-courts.jpg")}
            alt="Pickleball courts under a pink and orange sunset"
            className="absolute inset-0 h-full w-full object-cover object-[center_45%]"
          />
          <div className="hero-overlay absolute inset-0" />
          <div className="court-lines pointer-events-none absolute -right-24 top-36 h-[580px] w-[620px] rotate-[-8deg] opacity-35" />
          <div className="relative z-10 mx-auto grid w-full max-w-[1440px] items-end gap-8 px-5 pb-16 pt-36 md:px-10 md:pb-20 lg:grid-cols-[1fr_320px] lg:px-16">
            <div>
              <div className="mb-7 flex items-center gap-3 text-xs font-bold uppercase tracking-[.2em]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#b8ef3f]" />
                {EVENT.dateLabel} · {EVENT.venue}, {EVENT.city}
              </div>
              <h1 className="font-display max-w-[940px] text-[clamp(4.5rem,11vw,10rem)] font-bold uppercase leading-[.76] tracking-[-.055em]">
                Serve <span className="text-[#b8ef3f]">it.</span>
                <br />
                Own it.
              </h1>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                {regOpen && (
                  <button onClick={() => openRegistration()} className="group flex items-center gap-6 rounded-full bg-[#b8ef3f] px-7 py-4 font-bold text-[#132116] transition hover:scale-[1.02]">
                    Claim your spot <span className="transition group-hover:translate-x-1"><Icon name="arrow" /></span>
                  </button>
                )}
                <a href="#/live" className="flex items-center gap-3 rounded-full border border-white/40 bg-white/5 px-6 py-4 font-semibold backdrop-blur-sm transition hover:bg-white/15">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[#132116]"><Icon name="play" size={15} /></span>
                  Follow live scores
                </a>
              </div>
              {regOpen && (
                <p className="mt-6 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full bg-black/25 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#b8ef3f] opacity-75 motion-reduce:animate-none" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#b8ef3f]" />
                  </span>
                  {isFull(state, "doubles") && isFull(state, "solo")
                    ? "Both categories are full"
                    : isFull(state, "doubles")
                      ? "Doubles is full · limited solo spots left"
                      : isFull(state, "solo")
                        ? "Solo is full · limited doubles spots left"
                        : "Limited spots · grab yours before they’re gone"}
                </p>
              )}
            </div>
            <div className="hidden border-l border-white/35 pl-8 lg:block">
              <p className="text-sm leading-6 text-white/75">
                One day. Doubles and solo. Live scores on your phone. {EVENT.city}’s open pickleball tournament at {EVENT.venue}.
              </p>
              <div className="mt-7 grid grid-cols-2 gap-6">
                <div>
                  <strong className="font-display text-4xl">29.11</strong>
                  <span className="mt-1 block text-xs uppercase tracking-widest text-white/60">Game day</span>
                </div>
                <div>
                  <strong className="font-display text-4xl">₹{TOP_PRIZE / 1000}K</strong>
                  <span className="mt-1 block text-xs uppercase tracking-widest text-white/60">Top prize</span>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-[#b8ef3f] via-[#b8ef3f] to-transparent" />
        </section>

        <section className="bg-[#b8ef3f] py-5 text-[#132116]" aria-hidden="true">
          <div className="ticker flex w-max items-center gap-10 font-display text-xl font-bold uppercase tracking-wide">
            {[1, 2, 3].map((n) => (
              <span key={n} className="flex items-center gap-10">
                <span>{regOpen ? `Registration closes ${EVENT.registrationCloses}` : "Registration closed"}</span>
                <span className="text-2xl">✦</span>
                {regOpen && isEarlyBird() && (
                  <>
                    <span>Early bird {rupees(FEE.early)} till {FEE.earlyLabel}</span>
                    <span className="text-2xl">✦</span>
                  </>
                )}
                <span>{rupees(TOP_PRIZE)} top prize</span>
                <span className="text-2xl">✦</span>
                <span>All skill levels welcome</span>
                <span className="text-2xl">✦</span>
                <span>Live scores on this site</span>
                <span className="text-2xl">✦</span>
              </span>
            ))}
          </div>
        </section>

        <section id="prizes" className="px-5 pt-24 md:px-10 lg:px-16 lg:pt-32" aria-labelledby="prizes-title">
          <div className="relative mx-auto max-w-[1312px] overflow-hidden rounded-[32px] bg-[#102b1b] text-white">
            <img src={photo("golden-hour-paddles.jpg")} alt="" className="absolute inset-0 h-full w-full object-cover object-[center_30%]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(16_43_27/0.35)_0%,rgb(16_43_27/0.8)_45%,rgb(16_43_27/0.97)_100%)]" />
            <div className="relative p-6 md:p-12 lg:p-16">
              <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
                <div>
                  <p className="eyebrow text-[#b8ef3f]">What’s on the line</p>
                  <h2 id="prizes-title" className="section-title">Play for<br />{rupees(TOP_PRIZE)}.</h2>
                </div>
                <p className="max-w-sm text-white/80">Cash and a trophy for every podium finish. Water, ORS and refreshments for everyone, all day.</p>
              </div>
              <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                {([["Doubles", "Two players", PRIZES.doubles], ["Solo", "Singles, one player", PRIZES.solo]] as const).map(([title, sub, list]) => (
                  <div key={title} className="rounded-[28px] bg-white/10 p-5 ring-1 ring-white/20 backdrop-blur-md md:p-7">
                    <div className="mb-5 flex items-baseline justify-between gap-3">
                      <h3 className="font-display text-3xl font-bold uppercase">{title}</h3>
                      <span className="text-sm text-white/65">{sub}</span>
                    </div>
                    <div className={`grid gap-3 ${list.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                      {list.map((p, i) => (
                        <div key={p.place} className={`rounded-[22px] p-5 ${i === 0 ? "bg-[#b8ef3f] text-[#132116]" : "bg-[#102b1b]/70 ring-1 ring-white/15"}`}>
                          <p className="text-sm font-bold uppercase tracking-wider opacity-70">{p.place}</p>
                          <p className="font-display mt-1 text-4xl font-bold md:text-5xl">{rupees(p.cash)}</p>
                          {p.trophy && <p className="mt-2 flex items-center gap-2 text-sm font-semibold"><Icon name="trophy" size={18} /> plus trophy</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <ul className="mt-8 flex flex-wrap gap-3" aria-label="What you get on the day">
                {PERKS.map(([emoji, text]) => (
                  <li key={text} className="rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold ring-1 ring-white/20 backdrop-blur-md">
                    <span aria-hidden="true">{emoji}</span> {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="how" className="px-5 pt-24 md:px-10 lg:px-16 lg:pt-32" aria-labelledby="how-title">
          <div className="mx-auto grid max-w-[1312px] items-center gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
            <figure className="relative overflow-hidden rounded-[32px]">
              <img src={photo("racket-tap.jpg")} alt="Two players tapping rackets over the net after a game" loading="lazy" className="aspect-[4/5] w-full object-cover" />
              <figcaption className="absolute left-5 top-5 rotate-[-4deg] rounded-full bg-[#b8ef3f] px-4 py-2 text-sm font-bold text-[#132116] shadow-lg">gg, always</figcaption>
            </figure>
            <div>
              <p className="eyebrow">How it works</p>
              <h2 id="how-title" className="section-title">Four steps<br />to the court.</h2>
              <ol className="mt-10 divide-y divide-[#d8d8cf] border-y border-[#d8d8cf]">
                {HOW.map(([title, text], i) => (
                  <li key={title} className="grid grid-cols-[56px_1fr] gap-4 py-6">
                    <span className="font-display text-3xl font-bold text-[#789b2d]">0{i + 1}</span>
                    <div>
                      <h3 className="font-display text-2xl font-bold uppercase">{title}</h3>
                      <p className="mt-1 text-[#5b655e]">{text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              {regOpen && (
                <button onClick={() => openRegistration()} className="mt-8 flex items-center gap-5 rounded-full bg-[#132116] px-7 py-4 font-bold text-white transition hover:scale-[1.02]">
                  Start step 1 <Icon name="arrow" />
                </button>
              )}
            </div>
          </div>
        </section>

        <section id="schedule" className="px-5 py-24 md:px-10 lg:px-16 lg:py-32">
          <div className="mx-auto max-w-[1312px]">
            <div className="mb-12 flex flex-col justify-between gap-8 md:flex-row md:items-end">
              <div>
                <p className="eyebrow">On the court</p>
                <h2 className="section-title">Match schedule</h2>
              </div>
              <div className="flex w-fit flex-wrap rounded-full bg-[#e5e4dc] p-1">
                {([["all", "All"], ...DIVS.map((d) => [d.key, d.label.replace(" Doubles", "").replace(" Entry", "")])] as [string, string][]).map(([key, label]) => (
                  <button key={key} onClick={() => setFilter(key as "all" | Div)}
                    className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${filter === key ? "bg-[#132116] text-white shadow" : "text-[#5b655e] hover:text-[#132116]"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-hidden rounded-[28px] border border-[#d8d8cf] bg-white">
              <div className="hidden grid-cols-[130px_1fr_150px_140px] border-b border-[#e4e4dc] bg-[#eeeee8] px-7 py-4 text-[11px] font-bold uppercase tracking-[.16em] text-[#687169] md:grid">
                <span>Time</span><span>Matchup</span><span>Location</span><span>Status</span>
              </div>
              {upcoming.length ? (
                upcoming.map((m) => <MatchRow key={m.id} s={state} m={m} status={statuses[m.id]} />)
              ) : (
                <div className="px-7 py-14 text-center text-[#5b655e]">
                  The match schedule goes up here once registration closes on {EVENT.registrationCloses}. Every score updates live.
                </div>
              )}
            </div>
            <a href="#/live" className="mt-6 inline-flex items-center gap-3 rounded-full bg-[#132116] px-6 py-3.5 font-bold text-white">
              Full schedule, standings and bracket <Icon name="arrow" />
            </a>
          </div>
        </section>

        <section id="divisions" className="bg-[#102b1b] px-5 py-24 text-white md:px-10 lg:px-16 lg:py-32">
          <div className="mx-auto max-w-[1312px]">
            <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr] lg:gap-20">
              <div>
                <p className="eyebrow text-[#b8ef3f]">Pick your bracket</p>
                <h2 className="section-title">Built for<br />the bold.</h2>
                <p className="mt-6 max-w-sm leading-7 text-white/62">
                  Both categories start with pool play, then move into a knockout bracket. Every team and solo player plays at least two matches.
                </p>
                <div className="mt-10 overflow-hidden rounded-[24px]">
                  <img src={photo("paddle-crew.jpg")}
                    alt="Friends standing in a circle with their paddles on a green court" className="h-72 w-full object-cover object-[center_55%]" />
                </div>
              </div>
              <div>
              <div className="divide-y divide-white/15 border-y border-white/15">
                {DIVS.map((d, index) => {
                  return (
                    <button key={d.key} onClick={() => (regOpen ? openRegistration(d.key) : (window.location.hash = "#/live"))}
                      className="group grid w-full grid-cols-[52px_1fr_auto] items-center gap-4 py-8 text-left md:grid-cols-[70px_1fr_110px_auto]">
                      <span className="font-display text-lg text-white/35">0{index + 1}</span>
                      <span>
                        <strong className="font-display text-3xl uppercase md:text-4xl">{d.label}</strong>
                        <small className="mt-1 block text-sm text-white/50">{d.detail}</small>
                      </span>
                      <span className="hidden text-sm md:block">
                        <b style={{ color: d.color }}>{isFull(state, d.key) ? "Full" : "Limited"}</b>
                        <small className="block text-white/45">{isFull(state, d.key) ? "no spots left" : "spots only"}</small>
                      </span>
                      <span className="grid h-12 w-12 place-items-center rounded-full border border-white/25 transition group-hover:rotate-[-30deg] group-hover:bg-[#b8ef3f] group-hover:text-[#132116]">
                        <Icon name="arrow" />
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {DIVS.map((d) => (
                  <div key={d.key} className="rounded-[24px] bg-white/[.06] p-5 ring-1 ring-white/15">
                    <p className="text-xs font-bold uppercase tracking-[.16em] text-white/55">{d.label} entry</p>
                    <p className="mt-2 text-lg"><Price solo={d.key === "solo"} /></p>
                    <p className="mt-2 text-sm text-white/55">{d.key === "solo" ? "Winner and runner-up take cash and a trophy." : "Top 3 take cash and a trophy."}</p>
                  </div>
                ))}
              </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 pt-24 md:px-10 lg:px-16 lg:pt-32" aria-labelledby="vibe-title">
          <div className="mx-auto max-w-[1312px]">
            <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="eyebrow">The vibe</p>
                <h2 id="vibe-title" className="section-title">Courts, coffee<br />and chaos.</h2>
              </div>
              <p className="max-w-sm text-[#5b655e]">
                Bring your partner, your playlist and your best fit. Stay for the finals, the photos and the post-match chai.
              </p>
            </div>
            <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-10">
              {[
                ["ball-net-shadow.jpg", "Pickleball resting in the net’s shadow", "dink responsibly"],
                ["gingham-net.jpg", "Gingham paddle and a white ball resting by the net", "gingham szn"],
                ["matcha-paddle.jpg", "Iced coffee and matcha on a striped paddle", "matcha, then match"],
              ].map(([src, alt, caption], i) => (
                <figure key={src} className={`relative w-[78%] shrink-0 snap-center overflow-hidden rounded-[28px] md:w-auto ${i === 1 ? "md:translate-y-10" : ""}`}>
                  <img src={photo(src)} alt={alt} loading="lazy" className="aspect-[4/5] w-full object-cover" />
                  <figcaption className="absolute bottom-4 left-4 rounded-full bg-[#f4f3ed]/90 px-4 py-2 text-sm font-bold text-[#132116] backdrop-blur-sm">
                    {caption}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section id="venue" className="px-5 py-24 md:px-10 lg:px-16 lg:py-32">
          <div className="mx-auto grid max-w-[1312px] overflow-hidden rounded-[32px] bg-[#ff6f5a] lg:grid-cols-2">
            <div className="flex flex-col justify-between p-8 md:p-12 lg:p-16">
              <div>
                <p className="eyebrow">Tournament central</p>
                <h2 className="section-title mt-3 text-[clamp(3rem,5.2vw,5rem)] [overflow-wrap:anywhere]">{EVENT.venue}<br />{EVENT.city}</h2>
              </div>
              <div className="mt-16 grid gap-6 sm:grid-cols-2">
                <div className="flex gap-3">
                  <span className="shrink-0"><Icon name="location" /></span>
                  <p className="text-sm font-semibold leading-6">{EVENT.venueFullName}<br />{EVENT.venueAddressLine1}<br />{EVENT.venueAddressLine2}</p>
                </div>
                <div className="flex gap-3">
                  <span className="shrink-0"><Icon name="clock" /></span>
                  <p className="text-sm font-semibold leading-6">Gates open at {EVENT.gatesOpen}<br />First serve at {fmtTime(startMin(state))}</p>
                </div>
              </div>
            </div>
            <div className="relative min-h-[430px] overflow-hidden bg-[#efeee7] p-6">
              <div className="map-grid absolute inset-0 opacity-35" />
              <div className="absolute left-[44%] top-[42%] grid h-16 w-16 place-items-center rounded-full bg-[#132116] text-[#b8ef3f] shadow-xl">
                <Icon name="location" size={28} />
              </div>
              <div className="absolute bottom-7 left-7 right-7 flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-xl">
                <div>
                  <strong className="block">{state.settings.courts} tournament courts</strong>
                  <span className="text-sm text-[#717a72]">{EVENT.parkingNote}</span>
                </div>
                <a href={EVENT.mapsUrl} target="_blank" rel="noreferrer" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#b8ef3f]" aria-label="Open directions in Google Maps">
                  <Icon name="arrow" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="px-5 pb-24 md:px-10 lg:px-16 lg:pb-32" aria-labelledby="faq-title">
          <div className="mx-auto grid max-w-[1312px] gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
            <div>
              <p className="eyebrow">Good questions</p>
              <h2 id="faq-title" className="section-title">Before you<br />pull up.</h2>
              <p className="mt-6 max-w-sm text-[#5b655e]">
                Still stuck? WhatsApp us on{" "}
                {EVENT.whatsappNumbers.map((n, i) => (
                  <span key={n}>{i > 0 && " or "}<a className="whitespace-nowrap font-semibold text-[#132116] underline" href={`https://wa.me/${n}`} target="_blank" rel="noreferrer">{prettyPhone(n)}</a></span>
                ))}
                .
              </p>
            </div>
            <div className="divide-y divide-[#d8d8cf] border-y border-[#d8d8cf]">
              {([
                ["No partner? Can I still play?", "Yes. Enter Solo, which is singles: one player against one player. Doubles needs a partner who plays with you all day."],
                ["How does the day work?", "Both categories start with pool play, where you face everyone in your pool. The top two from each pool move into a knockout bracket. Everyone plays at least two matches, and Doubles has a 3rd place match too."],
                ["How are games scored?", scoring],
                ["How much is entry?", `Till ${FEE.earlyLabel} it is ${rupees(FEE.early)} per Doubles team and ${rupees(FEE.soloEarly)} per Solo player. After that it is ${rupees(FEE.regular)} and ${rupees(FEE.soloRegular)}. Pay by UPI right inside the form.`],
                ["When am I confirmed?", "As soon as we check your UPI payment, we message you on WhatsApp. Your name then shows up on the live page."],
                ["What do I need to bring?", "Your paddle, court shoes and your best fit. Water, ORS and refreshments are on us."],
                ["Where do I find my court and time?", "Open Live scores and search your name. Your next court and time update on their own, no refresh needed."],
              ] as [string, string][]).map(([q, a]) => (
                <details key={q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-2xl font-bold uppercase [&::-webkit-details-marker]:hidden">
                    {q}
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#cfd2c9] transition group-open:rotate-45 group-open:bg-[#b8ef3f]" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                    </span>
                  </summary>
                  <p className="mt-3 max-w-2xl text-[#5b655e]">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 pb-8 md:px-10 lg:px-16">
          <div className="mx-auto flex max-w-[1312px] flex-col items-center rounded-[32px] bg-[#b8ef3f] px-6 py-20 text-center">
            <Icon name="trophy" size={42} />
            <h2 className="font-display mt-6 text-5xl font-bold uppercase leading-none tracking-[-.04em] md:text-7xl">Your court is calling.</h2>
            <p className="mt-5 max-w-md text-[#425034]">
              {regOpen ? "Spots are limited. Grab your partner and lock in your bracket before registration closes." : "Registration is closed. Follow every match live on the day."}
            </p>
            {regOpen && <p className="mt-4 text-lg text-[#132116]"><Price /></p>}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {regOpen ? (
                <button onClick={() => openRegistration()} className="flex items-center gap-5 rounded-full bg-[#132116] px-7 py-4 font-bold text-white transition hover:scale-[1.03]">
                  Register your team <Icon name="arrow" />
                </button>
              ) : (
                <a href="#/live" className="flex items-center gap-5 rounded-full bg-[#132116] px-7 py-4 font-bold text-white">Live scores <Icon name="arrow" /></a>
              )}
              <button onClick={() => setStory(promoStory)} className="flex items-center gap-3 rounded-full border border-[#132116]/30 px-7 py-4 font-bold">
                <Icon name="share" size={18} /> Share on your story
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-5 py-10 md:px-10 lg:px-16">
        <div className="mx-auto flex max-w-[1312px] flex-col justify-between gap-6 border-t border-[#ccd0c8] pt-8 text-sm text-[#6a736c] md:flex-row">
          <div>
            <span>© {EVENT.year} {EVENT.brand} {EVENT.city}</span>
            <span className="mt-1 block text-xs">
              Website made by {CREDIT.name}.{" "}
              <a href={CREDIT.contactUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#132116] underline">{CREDIT.contactLabel}</a>
            </span>
          </div>
          <div className="flex flex-wrap gap-7">
            {!EVENT.instagramUrl.includes("yourhandle") && <a href={EVENT.instagramUrl} target="_blank" rel="noreferrer">Instagram</a>}
            <a href="#/live">Live scores</a>
            {EVENT.whatsappNumbers.map((n) => (
              <a key={n} href={`https://wa.me/${n}`} target="_blank" rel="noreferrer" className="whitespace-nowrap">WhatsApp {prettyPhone(n)}</a>
            ))}
            <a href="#/admin">Organiser</a>
          </div>
        </div>
      </footer>

      {story && <ShareStory content={story} onClose={() => setStory(null)} />}
    </div>
  );
}
