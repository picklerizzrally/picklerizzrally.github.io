import QRCode from "qrcode";
import { EVENT } from "../config";

export interface StoryContent {
  kicker: string; // small line at the top, e.g. "Live now"
  title: string[]; // 1 to 3 big lines
  highlight?: number; // index of the title line drawn in lime
  lines: string[]; // supporting details
  footer: string; // call to action above the QR code
  url: string; // where the QR code and link sticker point
}

const W = 1080;
const H = 1920;
const INK = "#132116";
const FOREST = "#102b1b";
const LIME = "#b8ef3f";
const CREAM = "#f4f3ed";

async function fontsReady() {
  try {
    await Promise.all([
      document.fonts.load('700 200px "Barlow Condensed"'),
      document.fonts.load('600 40px "DM Sans"'),
      document.fonts.load('700 40px "DM Sans"'),
    ]);
  } catch {
    /* system fonts are fine as a fallback */
  }
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number, start: number, min: number, weight: string, family: string) {
  let size = start;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > maxW && size > min) {
    size -= 4;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

// Rounded boxes, with a plain box on older phones that lack roundRect
function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
  ctx.fill();
}

export async function renderStory(c: StoryContent): Promise<Blob> {
  await fontsReady();
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const display = '"Barlow Condensed", "Arial Narrow", sans-serif';
  const body = '"DM Sans", system-ui, sans-serif';

  // Background and court lines
  ctx.fillStyle = FOREST;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W * 0.62, 560);
  ctx.rotate((-8 * Math.PI) / 180);
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 6;
  ctx.strokeRect(-360, -330, 720, 660);
  ctx.beginPath();
  ctx.moveTo(0, -330); ctx.lineTo(0, 330);
  ctx.moveTo(-360, -20); ctx.lineTo(360, -20);
  ctx.stroke();
  ctx.restore();

  // Brand row
  ctx.fillStyle = LIME;
  ctx.beginPath(); ctx.arc(110, 150, 38, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.arc(110, 150, 15, Math.PI * 0.25, Math.PI * 1.75); ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = `700 52px ${display}`;
  ctx.fillText(EVENT.brand, 168, 168); // the brand is styled lowercase on purpose

  // Kicker
  ctx.fillStyle = LIME;
  ctx.beginPath(); ctx.arc(92, 420, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = `700 34px ${body}`;
  ctx.fillText(c.kicker.toUpperCase(), 120, 432);

  // Title
  let y = 470;
  c.title.slice(0, 3).forEach((line, i) => {
    const size = fitText(ctx, line.toUpperCase(), W - 160, 200, 90, "700", display);
    y += size * 0.9; // each line sits under the previous one based on its own size
    ctx.fillStyle = i === c.highlight ? LIME : "#fff";
    ctx.fillText(line.toUpperCase(), 76, y);
  });

  // Details panel
  y += 40;
  const panelH = 70 + c.lines.length * 62;
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  box(ctx, 76, y, W - 152, panelH, 36);
  ctx.fillStyle = CREAM;
  c.lines.forEach((line, i) => {
    fitText(ctx, line, W - 260, 42, 26, "600", body);
    ctx.fillText(line, 120, y + 80 + i * 62);
  });

  // QR code and call to action
  const qr = await QRCode.toDataURL(c.url, { margin: 1, width: 300, color: { dark: INK, light: "#ffffff" } });
  const img = new Image();
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); img.src = qr; });
  const qy = H - 470;
  ctx.fillStyle = LIME;
  box(ctx, 76, qy - 30, W - 152, 380, 40);
  ctx.fillStyle = "#fff";
  box(ctx, 110, qy, 320, 320, 24);
  ctx.drawImage(img, 120, qy + 10, 300, 300);
  ctx.fillStyle = INK;
  const ctaW = W - 152 - 410;
  fitText(ctx, c.footer.toUpperCase(), ctaW, 68, 40, "700", display);
  ctx.fillText(c.footer.toUpperCase(), 470, qy + 110);
  ctx.font = `600 32px ${body}`;
  ctx.fillText("Scan or tap the link", 470, qy + 175);
  ctx.fillText(`${EVENT.dateShort}`, 470, qy + 225);
  ctx.fillText(`${EVENT.venue}`, 470, qy + 275);

  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Could not create image"))), "image/png"));
}

export const inInstagramApp = () => /Instagram|FBAN|FBAV/i.test(navigator.userAgent);

// Opens the phone's share sheet with the image so the person can pick Instagram > Story.
// Returns false when sharing files is not supported, so the caller can offer a download.
export async function shareImage(blob: Blob, filename: string, text: string): Promise<boolean> {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], text });
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return true; // person closed the sheet
    }
  }
  return false;
}

export function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
