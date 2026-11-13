import { useEffect, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { EVENT, currentFee, prettyPhone, rupees } from "../config";
import { submitRegistration, useLive } from "../lib/store";
import { DIVS, type Div } from "../lib/tournament";
import { Icon } from "./Icon";
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

export function RegisterModal({ initialDiv, onClose }: { initialDiv?: string; onClose: () => void }) {
  const { state } = useLive();
  const count = (d: Div) => state.teams.filter((t) => t.div === d).length;
  const firstOpen = DIVS.find((d) => count(d.key) < state.settings.cap)?.key ?? "mens";
  const [f, setF] = useState({
    teamName: "", player1: "", player2: "", phone: "", email: "",
    division: (DIVS.some((d) => d.key === initialDiv) ? initialDiv : firstOpen) as Div,
    skill: 3, upiRef: "", website: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const solo = f.division === "solo";
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    if (f.website) return setDone(true); // hidden field, only bots fill it
    const phone = f.phone.replace(/\D/g, "").slice(-10);
    if (phone.length !== 10) return setErr("Enter a 10 digit WhatsApp number");
    if (count(f.division) >= state.settings.cap) return setErr("That division is full. Pick another one.");
    setBusy(true);
    const msg = await submitRegistration({
      // a solo entry shows on the schedule under the player's own name
      teamName: solo ? f.player1.trim() : f.teamName.trim(),
      player1: f.player1.trim(),
      player2: solo ? "" : f.player2.trim(),
      phone, email: f.email.trim(), division: f.division, skill: Number(f.skill), upiRef: f.upiRef.trim(),
    });
    setBusy(false);
    if (msg) setErr(msg); else setDone(true);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#07150d]/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Tournament registration">
      <div className="relative my-8 w-full max-w-lg rounded-[28px] bg-[#f4f3ed] p-7 text-[#132116] shadow-2xl md:p-10">
        <button onClick={onClose} className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-[#e4e4dc]" aria-label="Close registration">
          <Icon name="x" />
        </button>
        {done ? (
          <div className="py-10 text-center">
            <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#b8ef3f]"><Icon name="trophy" size={38} /></span>
            <h3 className="font-display mt-7 text-4xl font-bold uppercase">You’re on the list.</h3>
            <p className="mx-auto mt-3 max-w-sm text-[#667068]">
              We’ll check your payment and confirm your spot on WhatsApp. You show up on the live page once it is confirmed.
            </p>
            <button onClick={onClose} className="mt-7 rounded-full bg-[#132116] px-7 py-3.5 font-bold text-white">Done</button>
          </div>
        ) : !state.settings.regOpen ? (
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
              <label className="block text-sm font-bold">Division
                <select value={f.division} onChange={set("division")} className="form-input">
                  {DIVS.map((d) => (
                    <option key={d.key} value={d.key} disabled={count(d.key) >= state.settings.cap}>
                      {d.label}{d.key === "solo" ? " (singles)" : ""}{count(d.key) >= state.settings.cap ? " (full)" : ""}
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
              <label className="block text-sm font-bold">Step 2: UPI transaction ID
                <input required maxLength={40} value={f.upiRef} onChange={set("upiRef")} placeholder="12 digit UTR number" className="form-input" />
                <span className="mt-1 block text-xs font-normal text-[#687169]">Find it in your UPI app under the payment details, called UTR or UPI Ref No.</span>
              </label>
              <input tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} className="hidden" aria-hidden="true" />
              {err && <p className="text-sm font-semibold text-[#b03a22]" role="alert">{err}</p>}
              <p className="text-xs text-[#687169]">
                Questions? WhatsApp{" "}
                {EVENT.whatsappNumbers.map((n, i) => (
                  <span key={n}>{i > 0 && " or "}<a className="font-semibold underline" href={`https://wa.me/${n}`} target="_blank" rel="noreferrer">{prettyPhone(n)}</a></span>
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
