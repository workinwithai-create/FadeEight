import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Copy, Download, Square } from "lucide-react";
import {
  loadBank,
  play,
  release,
  renderWav,
  SAMPLE_TOTAL,
  stop,
  transport,
  type PlayMode,
} from "@/lib/fade/engine";
import {
  buildMidi,
  CHAIR_ORDER,
  chairsAt,
  chorusOf,
  grooves,
  levelAt,
  punchList,
  recipes,
  type Groove,
  type Recipe,
} from "@/lib/fade/score";

const STORAGE = "fadeeight.v1";

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function FadeDesk() {
  const [grooveId, setGrooveId] = useState(grooves[0].id);
  const [recipeId, setRecipeId] = useState(recipes[0].id);
  const [loaded, setLoaded] = useState(0);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<PlayMode | null>(null);
  const [bar, setBar] = useState(0);
  const [gain, setGain] = useState(1);
  const [copied, setCopied] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [note, setNote] = useState("Seating FluidR3 chairs");

  const groove = grooves.find((item) => item.id === grooveId) ?? grooves[0];
  const recipe = recipes.find((item) => item.id === recipeId) ?? recipes[0];
  const punch = useMemo(() => punchList(groove, recipe), [groove, recipe]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (!raw) return;
      const saved = JSON.parse(raw) as { grooveId?: string; recipeId?: string };
      if (saved.grooveId && grooves.some((item) => item.id === saved.grooveId)) setGrooveId(saved.grooveId);
      if (saved.recipeId && recipes.some((item) => item.id === saved.recipeId)) setRecipeId(saved.recipeId);
    } catch {
      /* ignore a bad local draft */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify({ grooveId, recipeId }));
  }, [grooveId, recipeId]);

  useEffect(() => {
    let gone = false;
    loadBank((done) => {
      if (!gone) setLoaded(done);
    })
      .then((bank) => {
        if (gone) return;
        const seated = bank.piano.length + bank.bass.length + bank.guitar.length + (bank.kick ? 1 : 0);
        setLoaded(SAMPLE_TOTAL);
        setReady(seated >= 4);
        setNote(seated >= 4 ? "Chairs seated · live FluidR3" : "Some chairs missed the downbeat. Try again.");
      })
      .catch(() => {
        if (!gone) setNote("Could not seat the chairs.");
      });
    return () => {
      gone = true;
    };
  }, []);

  useEffect(() => {
    if (!mode) return;
    let frame = 0;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      const now = transport();
      if (!now) {
        frame = requestAnimationFrame(tick);
        return;
      }
      setBar((prev) => (prev === now.bar ? prev : now.bar));
      setGain((prev) => (Math.abs(prev - now.gain) < 0.02 ? prev : now.gain));
      if (now.done) {
        release();
        setMode(null);
        setGain(0);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
    };
  }, [mode]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      if (event.code === "Space") {
        event.preventDefault();
        if (mode) halt();
        else void start("fade");
      } else if (event.key === "1") void start("cut");
      else if (event.key === "2") void start("fade");
      else if (event.key === "3") void start("only");
      else if (event.key === "Escape") halt();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function halt() {
    stop();
    setMode(null);
    setGain(levelAt(recipe, 0, "fade"));
  }

  async function start(next: PlayMode) {
    if (!ready) return;
    setMode(next);
    setBar(next === "only" ? 4 : 0);
    setGain(1);
    try {
      await play(groove, recipe, next);
    } catch {
      setMode(null);
      setNote("The room did not open. Tap again.");
    }
  }

  async function copyPunch() {
    try {
      await navigator.clipboard.writeText(punch);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setNote("Clipboard blocked. The punch list is on the page.");
    }
  }

  function downloadMidi() {
    const bytes = buildMidi(groove, recipe);
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    saveBlob(new Blob([copy], { type: "audio/midi" }), `fadeeight-${slug(groove.name)}-${slug(recipe.name)}.mid`);
  }

  async function downloadWav() {
    setRendering(true);
    try {
      const wav = await renderWav(groove, recipe);
      saveBlob(wav, `fadeeight-${slug(groove.name)}-${slug(recipe.name)}.wav`);
    } catch {
      setNote("WAV render failed. The live fade still plays.");
    } finally {
      setRendering(false);
    }
  }

  const shownGain = mode ? gain : levelAt(recipe, 0, "fade");

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-widest text-accent uppercase">Live chairs · not a mixer</p>
          <h1 className="mt-2 font-display text-4xl leading-none text-fg sm:text-6xl">FadeEight</h1>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            Eight bars that leave the room. The last chorus is already written. Generators stop the file.
            Session players stay and walk off.
          </p>
        </div>
        <Fader gain={shownGain} />
      </header>

      <p className="text-sm text-muted" role="status">
        {note}
        {loaded < SAMPLE_TOTAL ? ` · ${loaded}/${SAMPLE_TOTAL}` : ""}
      </p>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
        <div>
          <h2 className="text-xs font-semibold tracking-widest text-muted uppercase">Locked chorus</h2>
          <div className="mt-3 grid gap-2">
            {grooves.map((item) => (
              <Choice
                key={item.id}
                on={item.id === groove.id}
                title={item.name}
                meta={`${item.bpm} BPM · ${item.key}`}
                body={item.blurb}
                onClick={() => {
                  halt();
                  setGrooveId(item.id);
                }}
              />
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-xs font-semibold tracking-widest text-muted uppercase">How they leave</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {recipes.map((item) => (
              <Choice
                key={item.id}
                on={item.id === recipe.id}
                title={item.name}
                meta={`Fader ${Math.round(item.curve[7] * 100)}% by bar 12`}
                body={item.blurb}
                onClick={() => {
                  halt();
                  setRecipeId(item.id);
                }}
              />
            ))}
          </div>
        </div>
      </section>

      <Score groove={groove} recipe={recipe} active={mode ? bar : -1} />

      <div className="sticky bottom-3 z-10 flex flex-col gap-2 rounded-2xl border border-muted/25 bg-bg p-2 shadow-none sm:flex-row">
        <Transport label="Hard cut" hint="1" onClick={() => void start("cut")} disabled={!ready} hot={mode === "cut"} />
        <Transport label="Hear the fade" hint="2" onClick={() => void start("fade")} disabled={!ready} primary hot={mode === "fade"} />
        <Transport label="Fade only" hint="3" onClick={() => void start("only")} disabled={!ready} hot={mode === "only"} />
        <button
          type="button"
          onClick={halt}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-muted/30 px-4 text-sm font-medium text-fg"
        >
          <Square className="size-4" aria-hidden />
          Stop
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <ExportButton onClick={() => void copyPunch()} icon={<Copy className="size-4" aria-hidden />}>
          {copied ? "Copied" : "Copy punch list"}
        </ExportButton>
        <ExportButton onClick={downloadMidi} icon={<Download className="size-4" aria-hidden />}>
          Download MIDI
        </ExportButton>
        <ExportButton onClick={() => void downloadWav()} icon={<Download className="size-4" aria-hidden />} disabled={rendering || !ready}>
          {rendering ? "Rendering WAV…" : "Download WAV"}
        </ExportButton>
      </div>

      <section>
        <h2 className="text-xs font-semibold tracking-widest text-muted uppercase">Punch list</h2>
        <pre className="mt-3 overflow-x-auto rounded-2xl border border-muted/20 bg-surface p-4 text-sm leading-relaxed whitespace-pre-wrap text-muted">
          {punch}
        </pre>
      </section>

      <footer className="border-t border-muted/20 pt-5 text-sm leading-relaxed text-muted">
        <p>
          One-time <span className="text-fg">$19</span> on Gumroad. This desk is a single ending, not a studio seat — do not subscribe it.
          Forge Pass ($24/mo) can carry it later as an add-on. Distinct from yesterday’s VerseEight, from SeamFour’s loop seam, and from RideEight’s loud ride-out.
        </p>
        <p className="mt-2">Space plays the fade. Esc stops. Audio stays in the tab.</p>
      </footer>
    </main>
  );
}

function Fader({ gain }: { gain: number }) {
  const height = Math.max(6, Math.round(Math.min(1, gain) * 100));
  return (
    <div className="flex shrink-0 flex-col items-center gap-2" aria-hidden>
      <div className="relative h-28 w-14 overflow-hidden rounded-full border border-muted/30 bg-surface">
        <div
          className="fade-lamp absolute inset-x-1 bottom-1 rounded-full bg-accent transition-all duration-150"
          style={{ height: `${height}%` }}
        />
      </div>
      <span className="text-xs tracking-widest text-muted uppercase">Fader</span>
    </div>
  );
}

function Choice({
  on,
  title,
  meta,
  body,
  onClick,
}: {
  on: boolean;
  title: string;
  meta: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`min-h-11 rounded-2xl border px-4 py-3 text-left transition-colors ${
        on ? "border-accent bg-accent/10" : "border-muted/25 bg-surface hover:bg-fg/5"
      }`}
    >
      <span className="block font-medium text-fg">{title}</span>
      <span className="mt-1 block text-xs text-accent">{meta}</span>
      <span className="mt-1 block text-sm leading-snug text-muted">{body}</span>
    </button>
  );
}

function Score({ groove, recipe, active }: { groove: Groove; recipe: Recipe; active: number }) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-semibold tracking-widest text-muted uppercase">Bars 1–4 chorus · 5–12 fade</h2>
        <p className="text-xs text-muted">{recipe.name}</p>
      </div>
      <div className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-12">
        {Array.from({ length: 12 }, (_, index) => {
          const harmony = chorusOf(groove, index);
          const level = index < 4 ? 1 : recipe.curve[index - 4];
          const chairs = new Set(chairsAt(recipe, index));
          const on = active === index;
          return (
            <div
              key={index}
              className={`rounded-xl border px-1 py-2 ${on ? "border-accent bg-accent/10" : "border-muted/20 bg-surface"}`}
            >
              <div className="text-center text-xs text-muted">{index + 1}</div>
              <div className="truncate text-center text-xs font-semibold text-fg">{harmony.symbol}</div>
              <div className="mx-auto mt-2 flex h-12 w-2 items-end overflow-hidden rounded-full bg-fg/10">
                <div
                  className="bar-fill w-2 rounded-full bg-accent"
                  style={{ height: `${Math.max(8, Math.round(level * 100))}%` }}
                />
              </div>
              <div className="mt-2 flex justify-center gap-0.5">
                {CHAIR_ORDER.map((chair) => (
                  <span
                    key={chair}
                    className={`h-1.5 w-1.5 rounded-full ${chairs.has(chair) ? "bg-accent" : "bg-fg/20"}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">Dots: kit, upright, nylon, grand, trumpet, violin. The column is the fader.</p>
    </section>
  );
}

function Transport({
  label,
  hint,
  onClick,
  disabled,
  primary,
  hot,
}: {
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  hot?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-40 ${
        primary ? "bg-accent text-bg" : hot ? "border border-accent text-fg" : "border border-muted/30 text-fg"
      }`}
    >
      {label}
      <span className={`text-xs font-medium ${primary ? "text-bg" : "text-muted"}`}>{hint}</span>
    </button>
  );
}

function ExportButton({
  children,
  onClick,
  icon,
  disabled,
}: {
  children: string;
  onClick: () => void;
  icon: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-muted/30 bg-surface px-4 text-sm font-medium text-fg disabled:opacity-40"
    >
      {icon}
      {children}
    </button>
  );
}
