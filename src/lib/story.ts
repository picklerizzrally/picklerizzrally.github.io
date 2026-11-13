import QRCode from "qrcode";
import { EVENT } from "../config";

export interface StoryContent {
  kicker: string; // small line at the top right, e.g. "29.11 · indore"
  title: string[]; // 1 to 3 big lines
  highlight?: number; // index of the title line drawn in lime with an echo
  sticker?: string[]; // 1 or 2 short lines on the rotated starburst sticker
  lines: string[]; // supporting details, drawn as pills
  footer: string; // call to action on the ticket
  url: string; // where the QR code and link sticker point
}

const W = 1080;
const H = 1920;
const INK = "#132116";
const FOREST = "#0d2416";
const LIME = "#b8ef3f";
const CORAL = "#ff705c";
const CREAM = "#f4f3ed";
const DISPLAY = '"Barlow Condensed", "Arial Narrow", sans-serif';
const BODY = '"DM Sans", system-ui, sans-serif';

async function fontsReady() {
  try {
    await Promise.all([
      document.fonts.load(`800 220px "Barlow Condensed"`),
      document.fonts.load(`700 60px "Barlow Condensed"`),
      document.fonts.load(`600 40px "DM Sans"`),
      document.fonts.load(`700 40px "DM Sans"`),
    ]);
  } catch {
    /* system fonts are fine as a fallback */
  }
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number, start: number, min: number, weight: string, family: string) {
  let size = start;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > maxW && size > min) {
    size -= 4;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

// Rounded box path, with a plain box on older phones that lack roundRect
function boxPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

function starburst(ctx: CanvasRenderingContext2D, cx: number, cy: number, outer: number, inner: number, points: number) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function pickleball(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.fillStyle = LIME;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(19,33,22,0.28)";
  const holes: [number, number][] = [[-0.4, -0.35], [0.2, -0.5], [0.5, 0.05], [-0.1, 0.1], [-0.55, 0.3], [0.15, 0.55], [0.6, -0.4]];
  holes.forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(cx + dx * r, cy + dy * r, r * 0.09, 0, Math.PI * 2); ctx.fill(); });
}

// Four point sparkle, the little ✦ shape
function sparkle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx, cy, cx + r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + r);
  ctx.quadraticCurveTo(cx, cy, cx - r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - r);
  ctx.fill();
}

// Photo used at the top of every story, served from public/images
export const POSTER_PHOTO = `${import.meta.env.BASE_URL}images/matcha-paddle.jpg`;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null); // the poster still renders without the photo
    img.src = src;
  });
}

// Draws an image to fill a box, cropping the edges like CSS object-fit: cover
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, focusY = 0.5) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) * focusY;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

export async function renderStory(c: StoryContent): Promise<Blob> {
  const [, photo] = await Promise.all([fontsReady(), loadImage(POSTER_PHOTO)]);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.textBaseline = "alphabetic";
  const PHOTO_H = 1180;

  /* background and photo, fading into deep green */
  ctx.fillStyle = FOREST;
  ctx.fillRect(0, 0, W, H);
  if (photo) drawCover(ctx, photo, 0, 0, W, PHOTO_H, 0.35);
  const fade = ctx.createLinearGradient(0, 520, 0, PHOTO_H);
  fade.addColorStop(0, "rgba(13,36,22,0)");
  fade.addColorStop(0.55, "rgba(13,36,22,0.75)");
  fade.addColorStop(1, FOREST);
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, W, PHOTO_H + 2);
  const topShade = ctx.createLinearGradient(0, 0, 0, 280);
  topShade.addColorStop(0, "rgba(13,36,22,0.7)");
  topShade.addColorStop(1, "rgba(13,36,22,0)");
  ctx.fillStyle = topShade;
  ctx.fillRect(0, 0, W, 280);
  for (let i = 0; i < 14000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.05)";
    ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
  }

  /* top row: brand pill on the left, date on the right */
  ctx.font = `700 46px ${DISPLAY}`;
  const brandW = ctx.measureText(EVENT.brand).width;
  boxPath(ctx, 64, 84, brandW + 120, 84, 42);
  ctx.fillStyle = "rgba(13,36,22,0.55)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.stroke();
  pickleball(ctx, 112, 126, 24);
  ctx.fillStyle = "#fff";
  ctx.fillText(EVENT.brand, 150, 142);
  ctx.font = `700 30px ${BODY}`;
  const kick = c.kicker.toLowerCase();
  const kw = ctx.measureText(kick).width;
  boxPath(ctx, W - 64 - kw - 56, 98, kw + 56, 56, 28);
  ctx.fillStyle = "rgba(13,36,22,0.55)";
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText(kick, W - 64 - kw - 28, 136);

  /* sticker: one clean coral starburst on the photo */
  if (c.sticker?.length) {
    ctx.save();
    ctx.translate(W - 190, 330);
    ctx.rotate((12 * Math.PI) / 180);
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 10;
    starburst(ctx, 0, 0, 132, 116, 16);
    ctx.fillStyle = CORAL;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    const st = c.sticker.slice(0, 2);
    st.forEach((t, i) => {
      const last = i === st.length - 1;
      const size = fit(ctx, t.toUpperCase(), 190, last ? 60 : 36, 26, last ? "800" : "700", DISPLAY);
      const offset = st.length === 1 ? size * 0.35 : i === 0 ? -12 : size * 0.78;
      ctx.fillText(t.toUpperCase(), 0, offset);
    });
    ctx.textAlign = "left";
    ctx.restore();
  }

  /* title, anchored to the bottom of the photo */
  const lines = c.title.slice(0, 3).map((t) => t.toUpperCase());
  const maxSize = lines.length > 2 ? 150 : 196;
  const sizes = lines.map((l) => fit(ctx, l, W - 140, maxSize, 90, "800", DISPLAY));
  let y = PHOTO_H - 40 - sizes.slice(1).reduce((a, b) => a + b * 0.88, 0);
  lines.forEach((line, i) => {
    if (i > 0) y += sizes[i] * 0.88;
    ctx.font = `800 ${sizes[i]}px ${DISPLAY}`;
    ctx.fillStyle = i === c.highlight ? LIME : "#fff";
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 24;
    ctx.fillText(line, 70, y);
  });
  ctx.shadowColor = "transparent";
  sparkle(ctx, W - 96, PHOTO_H - 150, 24, LIME);
  sparkle(ctx, W - 150, PHOTO_H - 90, 11, CREAM);

  /* details: a neat list with a thin lime rule on the left */
  const details = c.lines.filter(Boolean).slice(0, 4);
  const listTop = PHOTO_H + 40;
  const step = 70;
  ctx.fillStyle = LIME;
  boxPath(ctx, 70, listTop, 6, details.length * step - 20, 3);
  ctx.fill();
  details.forEach((text, i) => {
    const ty = listTop + 40 + i * step;
    fit(ctx, text, W - 210, 36, 24, "600", BODY);
    ctx.fillStyle = i === 0 ? "#fff" : "rgba(244,243,237,0.82)";
    ctx.fillText(text, 104, ty);
  });

  /* ticket stub with QR code */
  const th = 290;
  const ty = H - th - 70;
  boxPath(ctx, 56, ty, W - 112, th, 36);
  ctx.fillStyle = CREAM;
  ctx.fill();
  ctx.fillStyle = FOREST;
  [56, W - 56].forEach((x) => { ctx.beginPath(); ctx.arc(x, ty + th / 2, 28, 0, Math.PI * 2); ctx.fill(); });
  ctx.strokeStyle = "rgba(19,33,22,0.3)";
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 12]);
  ctx.beginPath(); ctx.moveTo(360, ty + 26); ctx.lineTo(360, ty + th - 26); ctx.stroke();
  ctx.setLineDash([]);

  const qr = await QRCode.toDataURL(c.url, { margin: 1, width: 230, color: { dark: INK, light: CREAM } });
  const qimg = await loadImage(qr);
  if (qimg) ctx.drawImage(qimg, 100, ty + 30, 230, 230);

  ctx.fillStyle = INK;
  fit(ctx, c.footer.toUpperCase(), W - 400 - 110, 80, 44, "800", DISPLAY);
  ctx.fillText(c.footer.toUpperCase(), 400, ty + 112);
  ctx.font = `700 30px ${BODY}`;
  ctx.fillStyle = "rgba(19,33,22,0.75)";
  ctx.fillText("scan it or tap the link sticker", 400, ty + 168);
  ctx.font = `600 28px ${BODY}`;
  ctx.fillText(`${EVENT.dateShort.toLowerCase()} · ${EVENT.venue.toLowerCase()}`, 400, ty + 216);
  ctx.fillText(EVENT.city.toLowerCase(), 400, ty + 256);

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
