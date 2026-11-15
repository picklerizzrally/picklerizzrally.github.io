import { useEffect, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { EVENT, currentFee, prettyPhone, rupees, registrationWindowOpen, siteUrl } from "../config";
import { submitRegistration, useLive } from "../lib/store";
import { DIVS, type Div } from "../lib/tournament";
import { Icon } from "./Icon";
import { ShareStory } from "./ShareStory";
import type { StoryContent } from "../lib/story";
import { Price } from "./ui";

const SKILLS = [
  [1, "1: New to pickleball"],
  [2, "2: Play now and then"],
  [3, "3: Regular, solid rallies"],
  [4, "4: Strong club player"],
  [5, "5: Tournament level"],
] as const;

const isPhone = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// Standard UPI payment link: opens GPay, PhonePe, Paytm or any UPI app with the amount filled in
function upiLink(amount: number) {
  // the UPI ID stays unencoded because some apps reject %40 in place of @
  return `upi://pay?pa=${EVENT.upiId}&pn=${encodeURIComponent(EVENT.brand)}&am=${amount}.00&cu=INR&tn=${encodeURIComponent(`${EVENT.brand} entry`)}`;
}

function PayBox({ solo }: { solo: boolean }) {
  const fee = currentFee(solo);
  const link = upiLink(fee);
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    QRCode.toDataURL(link, { margin: 1, width: 220, color: { dark: "#132116", light: "#ffffff" } }).then(setQr).catch(() => setQr(""));
  }, [link]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(EVENT.upiId); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* shows the ID anyway */ }
  };
  return (
    <div className="rounded-[20px] border border-[#d8d9d1] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <b className="text-sm">Step 1: Pay {rupees(fee)}</b>
        <span className="rounded-full bg-[#dff7a8] px-2.5 py-1 text-[11px] font-bold text-[#29420d]">UPI</span>
      </div>
      {isPhone() ? (
        <>
          <a href={link} className="mt-3 flex w-full items-center justify-center gap-3 rounded-full bg-[#132116] py-3.5 font-bold text-white">
            Pay {rupees(fee)} with UPI <Icon name="arrow" size={18} />
          </a>
          <p className="mt-2 text-center text-xs text-[#687169]">Opens GPay, PhonePe, Paytm or any UPI app with the amount filled in</p>
        </>
      ) : (
        <div className="mt-3 flex items-center gap-4">
          {qr ? <img src={qr} alt={`UPI QR code to pay ${rupees(fee)}`} className="h-28 w-28 rounded-xl border border-[#eeeee8]" /> : <div className="h-28 w-28 rounded-xl bg-[#eeeee8]" />}
          <p className="text-sm text-[#5b655e]">Scan with any UPI app on your phone. The amount fills in on its own.</p>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-[#f4f3ed] px-4 py-2.5 text-sm">
        <span>UPI ID <b className="text-[#132116]">{EVENT.upiId}</b></span>
        <button type="button" onClick={copy} className="font-bold underline">{copied ? "Copied" : "Copy"}</button>
      </div>
      <p className="mt-2 text-xs text-[#687169]">{isPhone() ? "If the button does not open your app, pay to the UPI ID by hand." : "Or pay to this UPI ID by hand from any app."}</p>
    </div>
  );
}


// Shrinks a payment screenshot to a small JPEG so it fits in the database (well under 1 MB)
async function compressImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("unreadable"));
      i.src = url;
    });
    let max = 1280;
    let quality = 0.72;
    let out = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      out = c.toDataURL("image/jpeg", quality);
      if (out.length < 650000) return out;
      max *= 0.8;
      quality -= 0.1;
    }
    return out.length < 880000 ? out : "";
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function RegisterModal({ initialDiv, onClose }: { initialDiv?: string; onClose: () => void }) {
  const { state } = useLive();
  const count = (d: Div) => state.teams.filter((t) => t.div === d).length;
  const firstOpen: Div = "doubles";
  const [f, setF] = useState({
    teamName: "", player1: "", player2: "", phone: "", email: "",
    division: (DIVS.some((d) => d.key === initialDiv) ? initialDiv : firstOpen) as Div,
    skill: 3, upiRef: "", website: "",
  });
  const [busy, setBusy] = useState(false);
  const [proof, setProof] = useState("");
  const [proofNote, setProofNote] = useState("");
  const pickProof = async (file?: File) => {
    setProofNote("");
    if (!file) return;
    if (!file.type.startsWith("image/")) return setProofNote("Please pick an image, like a screenshot of the payment.");
    setProofNote("Attaching");
    try {
      const data = await compressImage(file);
      if (!data) return setProofNote("That image is too large. Try a normal phone screenshot.");
      setProof(data);
      setProofNote("");
      setErr("");
    } catch {
      setProofNote("Could not read that image. Take a screenshot and attach that instead.");
    }
  };
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [sent, setSent] = useState<{ name: string; first: string; solo: boolean; amount: number; proof: string } | null>(null);
  const [story, setStory] = useState<StoryContent | null>(null);
  const solo = f.division === "solo";
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    if (f.website) return setDone(true); // hidden field, only bots fill it
    const phone = f.phone.replace(/\D/g, "").slice(-10);
    if (phone.length !== 10) return setErr("Enter a 10 digit WhatsApp number");
    if (!proof && f.upiRef.trim().length < 4) return setErr("Add your UPI transaction ID or attach the payment screenshot");
    setBusy(true);
    const msg = await submitRegistration({
      // a solo entry shows on the schedule under the player's own name
      teamName: solo ? f.player1.trim() : f.teamName.trim(),
      player1: f.player1.trim(),
      player2: solo ? "" : f.player2.trim(),
      phone, email: f.email.trim(), division: f.division, skill: Number(f.skill), upiRef: f.upiRef.trim(), hasProof: !!proof,
    }, proof);
    setBusy(false);
    if (msg) return setErr(msg);
    setSent({
      name: solo ? f.player1.trim() : f.teamName.trim(),
      first: f.player1.trim().split(/\s+/)[0] || "",
      solo,
      amount: currentFee(solo),
      proof: f.upiRef.trim() ? `UTR ${f.upiRef.trim()}` : "Screenshot attached",
    });
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#07150d]/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Tournament registration">
      <div className="relative my-8 w-full max-w-lg rounded-[28px] bg-[#f4f3ed] p-7 text-[#132116] shadow-2xl md:p-10">
        <button onClick={onClose} className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-[#e4e4dc]" aria-label="Close registration">
          <Icon name="x" />
        </button>
        {done ? (
          <div className="relative py-6 text-center">
            {/* a short confetti burst, skipped for people who prefer less motion */}
            <div className="pointer-events-none absolute inset-x-0 -top-6 h-0 motion-reduce:hidden" aria-hidden="true">
              {Array.from({ length: 26 }, (_, i) => (
                <span
                  key={i}
                  className="confetti"
                  style={{
                    left: `${(i * 37) % 100}%`,
                    background: ["#b8ef3f", "#ff705c", "#132116", "#50c9ff"][i % 4],
                    animationDelay: `${(i % 7) * 70}ms`,
                    width: i % 3 ? 8 : 12,
                    height: i % 2 ? 14 : 8,
                  }}
                />
              ))}
            </div>
            <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#b8ef3f]"><Icon name="check" size={40} /></span>
            <h3 className="font-display mt-6 text-5xl font-bold uppercase leading-none">
              Thank you{sent?.first ? `, ${sent.first}` : ""}!
            </h3>
            <p className="mx-auto mt-3 max-w-sm text-[#667068]">Your registration is in. Your spot is almost locked.</p>

            {sent && (
              <dl className="mx-auto mt-6 grid max-w-sm grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-[22px] bg-white p-5 text-left text-sm">
                <dt className="text-[#6d746e]">{sent.solo ? "Player" : "Team"}</dt><dd className="text-right font-semibold">{sent.name}</dd>
                <dt className="text-[#6d746e]">Category</dt><dd className="text-right font-semibold">{sent.solo ? "Solo" : "Doubles"}</dd>
                <dt className="text-[#6d746e]">Entry fee</dt><dd className="text-right font-semibold">{rupees(sent.amount)}</dd>
                <dt className="text-[#6d746e]">Payment</dt><dd className="truncate text-right font-semibold">{sent.proof}</dd>
              </dl>
            )}

            <ol className="mx-auto mt-6 max-w-sm space-y-2 text-left text-sm text-[#425034]">
              {["We match your payment with our UPI app", "You get a WhatsApp confirmation", "Your name shows up on the live page"].map((t, i) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#132116] text-xs font-bold text-white">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
              {sent && (
                <button
                  onClick={() =>
                    setStory({
                      kicker: `${EVENT.dateShort} · ${EVENT.city}`,
                      title: [sent.name, sent.solo ? "I’m in" : "We’re in"],
                      highlight: 1,
                      sticker: ["see you", "29.11"],
                      lines: [sent.solo ? "Solo" : "Doubles", `${EVENT.venue}, ${EVENT.city}`],
                      footer: sent.solo ? "Join me" : "Join us",
                      url: `${siteUrl()}#/register`,
                    })
                  }
                  className="flex items-center justify-center gap-3 rounded-full bg-[#b8ef3f] px-7 py-3.5 font-bold"
                >
                  <Icon name="share" size={18} /> Share that {sent.solo ? "I’m" : "we’re"} in
                </button>
              )}
              <button onClick={onClose} className="rounded-full bg-[#132116] px-7 py-3.5 font-bold text-white">Done</button>
            </div>
            {story && <ShareStory content={story} onClose={() => setStory(null)} />}
          </div>
        ) : !(state.settings.regOpen && registrationWindowOpen()) ? (
          <div className="py-10 text-center">
            <h3 className="font-display text-4xl font-bold uppercase">Registration is closed</h3>
            <p className="mt-3 text-[#667068]">Follow the live scores on the day.</p>
            <a href="#/live" onClick={onClose} className="mt-7 inline-block rounded-full bg-[#132116] px-7 py-3.5 font-bold text-white">See live page</a>
          </div>
        ) : (
          <>
            <p className="eyebrow">{EVENT.brand} {EVENT.year}</p>
            <h3 className="font-display mt-3 text-4xl font-bold uppercase">Claim your spot</h3>
            <p className="mt-2 text-sm text-[#687169]">
              Entry: <Price className="text-[#132116]" solo={solo} />
            </p>
            <form onSubmit={submit} className="mt-7 space-y-4">
              <label className="block text-sm font-bold">Category
                <select value={f.division} onChange={set("division")} className="form-input">
                  {DIVS.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label}{d.key === "solo" ? " (singles, one player)" : " (two players)"}
                    </option>
                  ))}
                </select>
              </label>
              {solo ? (
                <label className="block text-sm font-bold">Your name
                  <input required maxLength={40} value={f.player1} onChange={set("player1")} placeholder="Full name" className="form-input" />
                </label>
              ) : (
                <>
                  <label className="block text-sm font-bold">Team name
                    <input required maxLength={40} value={f.teamName} onChange={set("teamName")} placeholder="Poha Paddlers" className="form-input" />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-bold">Player 1 (captain)
                      <input required maxLength={40} value={f.player1} onChange={set("player1")} placeholder="Full name" className="form-input" />
                    </label>
                    <label className="block text-sm font-bold">Player 2
                      <input required maxLength={40} value={f.player2} onChange={set("player2")} placeholder="Full name" className="form-input" />
                    </label>
                  </div>
                </>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-bold">{solo ? "Your WhatsApp" : "Captain’s WhatsApp"}
                  <input required inputMode="tel" maxLength={15} value={f.phone} onChange={set("phone")} placeholder="98XXXXXXXX" className="form-input" />
                </label>
                <label className="block text-sm font-bold">Email
                  <input required type="email" maxLength={80} value={f.email} onChange={set("email")} placeholder="you@example.com" className="form-input" />
                </label>
              </div>
              <label className="block text-sm font-bold">{solo ? "Your level" : "Team level"}
                <select value={f.skill} onChange={set("skill")} className="form-input">
                  {SKILLS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <PayBox solo={solo} />
              <fieldset className="space-y-3">
                <legend className="text-sm font-bold">Step 2: Proof of payment</legend>
                <p className="text-xs text-[#687169]">Add the UPI transaction ID, attach the payment screenshot, or both.</p>
                <label className="block text-sm font-bold">UPI transaction ID
                  <input maxLength={40} value={f.upiRef} onChange={set("upiRef")} placeholder="12 digit UTR number" className="form-input" />
                  <span className="mt-1 block text-xs font-normal text-[#687169]">Find it in your UPI app under the payment details, called UTR or UPI Ref No.</span>
                </label>
                {proof ? (
                  <div className="flex items-center gap-4 rounded-[14px] border border-[#d8d9d1] bg-white p-3">
                    <img src={proof} alt="Your payment screenshot" className="h-20 w-14 rounded-lg object-cover ring-1 ring-[#d8d9d1]" />
                    <div className="flex-1 text-sm">
                      <p className="flex items-center gap-2 font-bold text-[#29420d]"><Icon name="check" size={16} /> Screenshot attached</p>
                      <button type="button" onClick={() => setProof("")} className="mt-1 font-semibold text-[#b03a22] underline">Remove</button>
                    </div>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center gap-3 rounded-[14px] border-2 border-dashed border-[#c9cdc3] bg-white px-4 py-4 text-sm font-bold transition hover:border-[#789b2d] hover:bg-[#f7fbe9]">
                    <Icon name="share" size={18} />
                    Attach payment screenshot
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => { pickProof(e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                )}
                {proofNote && <p className="text-xs font-semibold text-[#5b655e]" role="status">{proofNote}</p>}
              </fieldset>
              <input tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} className="hidden" aria-hidden="true" />
              {err && <p className="text-sm font-semibold text-[#b03a22]" role="alert">{err}</p>}
              <p className="text-xs text-[#687169]">
                Questions? WhatsApp{" "}
                {EVENT.whatsappNumbers.map((n, i) => (
                  <span key={n}>{i > 0 && " or "}<a className="whitespace-nowrap font-semibold underline" href={`https://wa.me/${n}`} target="_blank" rel="noreferrer">{prettyPhone(n)}</a></span>
                ))}
              </p>
              <button disabled={busy} className="flex w-full items-center justify-center gap-4 rounded-full bg-[#b8ef3f] py-4 font-bold transition hover:bg-[#132116] hover:text-white disabled:opacity-60">
                {busy ? "Sending" : "Send registration"} <Icon name="arrow" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
