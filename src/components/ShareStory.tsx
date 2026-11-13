import { useEffect, useState } from "react";
import { downloadBlob, inInstagramApp, renderStory, shareImage, type StoryContent } from "../lib/story";
import { Icon } from "./Icon";

export function ShareStory({ content, onClose }: { content: StoryContent; onClose: () => void }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [src, setSrc] = useState("");
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    let url = "";
    renderStory(content)
      .then((b) => { setBlob(b); url = URL.createObjectURL(b); setSrc(url); })
      .catch(() => setErr("Could not create the story image on this device."));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [content]);

  const file = "pickle-rizz-rally-story.png";
  const share = async () => {
    if (!blob) return;
    const ok = await shareImage(blob, file, content.url);
    if (!ok) { downloadBlob(blob, file); setNote("Saved. Open Instagram, add a story and pick this image."); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(content.url); setNote("Link copied. Paste it into the link sticker."); }
    catch { setNote(content.url); }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#07150d]/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Share to Instagram story">
      <div className="relative w-full max-w-md rounded-[28px] bg-[#f4f3ed] p-6 text-[#132116] shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-[#e4e4dc]" aria-label="Close">
          <Icon name="x" />
        </button>
        <h3 className="font-display text-3xl font-bold uppercase">Share to your story</h3>
        <div className="mx-auto mt-4 aspect-[9/16] w-48 overflow-hidden rounded-2xl bg-[#102b1b]">
          {src ? <img src={src} alt="Story preview" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm text-white/70">{err || "Creating image"}</div>}
        </div>
        {inInstagramApp() && (
          <p className="mt-4 rounded-2xl bg-white p-3 text-sm">
            You are inside Instagram’s browser, which blocks saving. Press and hold the image to save it, or open this page in Chrome or Safari.
          </p>
        )}
        <div className="mt-5 grid gap-3">
          <button onClick={share} disabled={!blob} className="flex items-center justify-center gap-3 rounded-full bg-[#b8ef3f] py-3.5 font-bold disabled:opacity-50">
            <Icon name="share" size={18} /> Share image
          </button>
          <button onClick={copy} className="rounded-full border border-[#cfd2c9] bg-white py-3.5 font-bold">Copy link for the sticker</button>
        </div>
        {note && <p className="mt-3 break-all text-sm font-semibold text-[#29420d]">{note}</p>}
        <ol className="mt-5 list-decimal space-y-1 pl-5 text-sm text-[#5b655e]">
          <li>Tap Share image, then pick Instagram and Stories</li>
          <li>Tap the sticker icon and choose Link</li>
          <li>Paste the link and place the sticker on the lime box</li>
        </ol>
      </div>
    </div>
  );
}
