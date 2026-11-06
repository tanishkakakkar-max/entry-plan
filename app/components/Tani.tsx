"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { FACES, SUGGESTIONS, faceSrc, type ChatTurn, type Face } from "@/lib/tani";

// Tani, the site guide, drawn from Tanishka's sticker sheet. She is "alive" in three ways:
// a slow idle bob, a pop whenever her face changes, and (with idle) a glance at another face now and then.
// All motion stops for prefers-reduced-motion (see globals.css).

let preloaded = false;
function preloadFaces() {
  if (preloaded || typeof window === "undefined") return;
  preloaded = true;
  FACES.forEach((f) => {
    const img = new Image();
    img.src = faceSrc(f);
  });
}

const IDLE_GLANCES: Partial<Record<Face, Face[]>> = {
  smile: ["relaxed", "thinking", "smile"],
  wave: ["smile", "wave"],
  pointing: ["smile", "pointing"],
  thinking: ["curious", "thinking"],
};

export function TaniFace({
  face,
  size = 64,
  idle = false,
  round = false,
  className = "",
}: {
  face: Face;
  size?: number;
  idle?: boolean;
  round?: boolean;
  className?: string;
}) {
  const [shown, setShown] = useState<Face>(face);
  const [hover, setHover] = useState(false);
  useEffect(preloadFaces, []);
  useEffect(() => setShown(face), [face]);

  // Now and then, glance at another face and come back.
  useEffect(() => {
    if (!idle) return;
    const options = IDLE_GLANCES[face];
    if (!options) return;
    let back: ReturnType<typeof setTimeout>;
    const t = setInterval(() => {
      const next = options[Math.floor(Math.random() * options.length)];
      setShown(next);
      back = setTimeout(() => setShown(face), 2200);
    }, 7000 + Math.random() * 4000);
    return () => {
      clearInterval(t);
      clearTimeout(back);
    };
  }, [face, idle]);

  const current = hover && idle ? "wave" : shown;
  return (
    <span
      className={`tani-face${round ? " round" : ""} ${className}`}
      style={{ width: size, height: size }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-hidden="true"
    >
      <span className="tani-bob">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={current} src={faceSrc(current)} alt="" width={size} height={size} className="tani-img" draggable={false} />
      </span>
    </span>
  );
}

// A guide line from Tani at a step of the app: her face and a speech bubble. Changing the text replays the pop-in.
export function TaniTip({
  face,
  children,
  size = 76,
  ask,
  className = "",
}: {
  face: Face;
  children: React.ReactNode;
  size?: number;
  ask?: string; // a follow-up question to open the chat with
  className?: string;
}) {
  const key = typeof children === "string" ? children : face;
  return (
    <div className={`tani-tip ${className}`}>
      <TaniFace face={face} size={size} idle />
      <div key={key} className="tani-bubble">
        <span className="tani-name">Tani</span>
        <div>{children}</div>
        {ask && (
          <button type="button" className="tani-ask-link" onClick={() => askTani(ask)}>
            {ask} <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </div>
  );
}

// Opens the chat from anywhere, optionally asking a question straight away.
export function askTani(question?: string) {
  window.dispatchEvent(new CustomEvent("tani:ask", { detail: question ?? "" }));
}

// **bold**, emails and links in Tani's replies.
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|[\w.+-]+@[\w-]+\.[\w.]+|https?:\/\/[^\s)]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^\*\*[^*]+\*\*$/.test(p) ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : /^[\w.+-]+@[\w-]+\.[\w.]+$/.test(p) ? (
          <a key={i} href={`mailto:${p.replace(/\.$/, "")}`}>
            {p}
          </a>
        ) : /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer">
            {p.replace(/^https?:\/\/(www\.)?/, "")}
          </a>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

const PAGE_NAMES: Record<string, string> = { "/": "Home", "/how-it-works": "How it works", "/markets": "Markets", "/samples": "Samples", "/about": "About", "/create": "Create" };
const GREETING: Record<string, { face: Face; text: string }> = {
  Home: { face: "wave", text: "Hi, I'm Tani. I built First Port. Stuck on anything? Ask me." },
  "How it works": { face: "idea", text: "Hi! Want to know what's in a plan or how codes work? Ask me." },
  Markets: { face: "thinking", text: "Hi! Curious which country or entry route fits your brand? Ask me." },
  About: { face: "relaxed", text: "Hi, I'm Tani! Ask me anything about why I built First Port." },
  Samples: { face: "pointing", text: "Hi! Want to know how to read a plan, or what the tags mean? Ask me." },
  Create: { face: "idea", text: "Hi! Need a hand with the form or your code? Ask me anything." },
};

// The floating "Ask Tani" button and her chat panel. Lives in the root layout, so the chat
// carries over as you move between pages.
export function AskTani() {
  const pathname = usePathname();
  const page = PAGE_NAMES[pathname] ?? (pathname.startsWith("/samples") ? "Samples" : "Home");
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [onStage, setOnStage] = useState(false); // the jumping Tani is on screen
  useEffect(() => {
    const on = (e: Event) => setOnStage(!!(e as CustomEvent<boolean>).detail);
    window.addEventListener("tani:stage", on);
    return () => window.removeEventListener("tani:stage", on);
  }, []);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const openRef = useRef(false);
  openRef.current = open;

  const greeting = GREETING[page] ?? GREETING.Home;
  const hidden = pathname.startsWith("/admin");
  const lastFace: Face = busy ? "thinking" : ([...turns].reverse().find((t) => t.role === "tani")?.face ?? greeting.face);

  // A one-time "need help?" nudge a few seconds into the first visit.
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("fp-tani-nudge") === "1";
    } catch {}
    if (seen) return;
    const t = setTimeout(() => {
      if (openRef.current) return;
      setNudge(true);
      try {
        sessionStorage.setItem("fp-tani-nudge", "1");
      } catch {}
    }, 6000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onAsk = (e: Event) => {
      const q = (e as CustomEvent<string>).detail;
      setOpen(true);
      setNudge(false);
      if (q) send(q);
      else setTimeout(() => inputRef.current?.focus(), 80);
    };
    window.addEventListener("tani:ask", onAsk);
    return () => window.removeEventListener("tani:ask", onAsk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turns, busy, page]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next: ChatTurn[] = [...turns, { role: "user", text: q }];
    setTurns(next);
    setDraft("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map(({ role, text }) => ({ role, text })), page }),
      });
      const data = await res.json().catch(() => ({}));
      setTurns([...next, { role: "tani", text: data.reply || data.error || "Hmm, I lost my train of thought. Try again?", face: data.face ?? "shrug" }]);
    } catch {
      setTurns([...next, { role: "tani", text: "I can't reach the internet right now. Try again in a moment.", face: "shrug" }]);
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }

  const asked = new Set(turns.filter((t) => t.role === "user").map((t) => t.text));
  const chips = SUGGESTIONS.filter((s) => !asked.has(s)).slice(0, 3);

  if (hidden) return null;
  return (
    <div className="no-print">
      {!open && (
        <div className={`ask-tani-wrap${onStage ? " away" : ""}`} aria-hidden={onStage || undefined}>
          {nudge && (
            <button type="button" className="ask-nudge" onClick={() => askTani()}>
              Need help? Ask me!
              <span
                className="ask-nudge-x"
                role="button"
                aria-label="Dismiss"
                onClick={(e) => {
                  e.stopPropagation();
                  setNudge(false);
                }}
              >
                ×
              </span>
            </button>
          )}
          <button type="button" className="ask-tani" onClick={() => askTani()} aria-label="Ask Tani, the First Port guide">
            <TaniFace face={nudge ? "wave" : "smile"} size={44} round idle />
            <span>Ask Tani</span>
          </button>
        </div>
      )}
      {open && (
        <section className="tani-chat" role="dialog" aria-label="Chat with Tani">
          <header className="tani-chat-head">
            <TaniFace face={lastFace} size={52} round />
            <div>
              <p className="tani-chat-name">Tani</p>
              <p className="tani-chat-sub">{busy ? "thinking..." : "Founder's AI guide · here to help"}</p>
            </div>
            <button type="button" className="tani-close" aria-label="Close chat" onClick={() => setOpen(false)}>
              ×
            </button>
          </header>
          <div className="tani-chat-body" ref={listRef} aria-live="polite">
            <div className="msg tani">
              <RichText text={greeting.text} />
            </div>
            {turns.map((t, i) => (
              <div key={i} className={`msg ${t.role}`}>
                <RichText text={t.text} />
              </div>
            ))}
            {busy && (
              <div className="msg tani typing" aria-label="Tani is typing">
                <span />
                <span />
                <span />
              </div>
            )}
            {!busy && chips.length > 0 && (
              <div className="tani-chips">
                {chips.map((c) => (
                  <button type="button" key={c} onClick={() => send(c)}>
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
          <form
            className="tani-chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
          >
            <input
              ref={inputRef}
              value={draft}
              maxLength={500}
              placeholder="Ask a question..."
              aria-label="Ask Tani a question"
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" aria-label="Send" disabled={!draft.trim() || busy}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 15V5M5 10l5-5 5 5" />
              </svg>
            </button>
          </form>
          <p className="tani-chat-foot">An AI guide based on Tanishka. For a real reply, email contact@findyourfirstport.com.</p>
        </section>
      )}
    </div>
  );
}

// Full-body Tani who jumps for joy: when the page stops scrolling, when she's tapped, and once when she first appears.
// At rest she's the waving "hi" sticker; the jump uses Tanishka's full-body frames: crouch (wind-up and landing)
// and arms-up (mid-air), then she's back to waving hi.
type JumpPhase = "rest" | "prep" | "air" | "land";
const FRAME_OF: Record<JumpPhase, "rest" | "crouch" | "jump"> = { rest: "rest", prep: "crouch", air: "jump", land: "crouch" };
export function JumpingTani({ height = 150 }: { height?: number }) {
  const [phase, setPhase] = useState<JumpPhase>("rest");
  const ref = useRef<HTMLButtonElement>(null);
  const busy = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const jump = () => {
    if (busy.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    busy.current = true;
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
    setPhase("prep");
    at(200, () => setPhase("air"));
    at(200 + 780, () => setPhase("land"));
    at(200 + 780 + 240, () => {
      setPhase("rest");
      busy.current = false;
    });
  };

  useEffect(() => {
    ["crouch", "jump"].forEach((f) => {
      const img = new Image();
      img.src = `/tani/tani-${f}.webp`;
    });
    let seen = false;
    let visible = false;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      // The floating "Ask Tani" button steps aside while this Tani is on screen (one Tani at a time).
      window.dispatchEvent(new CustomEvent("tani:stage", { detail: visible }));
      if (visible && !seen) {
        seen = true;
        timers.current.push(setTimeout(jump, 450));
      }
    });
    if (ref.current) io.observe(ref.current);
    let t: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(t);
      t = setTimeout(() => visible && jump(), 160); // the scroll has stopped
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const all = timers.current;
    return () => {
      window.dispatchEvent(new CustomEvent("tani:stage", { detail: false }));
      io.disconnect();
      clearTimeout(t);
      all.forEach(clearTimeout);
      window.removeEventListener("scroll", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const frame = FRAME_OF[phase];
  return (
    <button ref={ref} type="button" className={`jump-tani jt-${phase}`} style={{ height }} aria-label="Tani jumps for joy" onClick={jump}>
      <span className="jump-body">
        {(["crouch", "jump"] as const).map((f) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={f} src={`/tani/tani-${f}.webp`} alt="" className={`jump-frame${frame === f ? " on" : ""}`} draggable={false} />
        ))}
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={faceSrc("wave")} alt="" className={`jump-rest${frame === "rest" ? " on" : ""}`} draggable={false} />
      <span className="jump-shadow" aria-hidden="true" />
    </button>
  );
}

// A plain "Ask Tani" link for places where Tani is already on screen.
export function AskTaniButton({ label = "Ask Tani", question }: { label?: string; question?: string }) {
  return (
    <button type="button" className="tani-ask-link" onClick={() => askTani(question)}>
      {label} <span aria-hidden="true">→</span>
    </button>
  );
}
