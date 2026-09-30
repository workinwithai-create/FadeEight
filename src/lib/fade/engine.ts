import {
  chairsAt,
  chorusOf,
  levelAt,
  type Groove,
  type Recipe,
} from "@/lib/fade/score";

const CDN = "https://cdn.jsdelivr.net/gh/workinwithai-create/PreEight@main/public/samples";

type Pitched = { base: number; buffer: AudioBuffer };

export type Bank = {
  kick?: AudioBuffer;
  snare?: AudioBuffer;
  hat?: AudioBuffer;
  crash?: AudioBuffer;
  piano: Pitched[];
  bass: Pitched[];
  guitar: Pitched[];
  trumpet: Pitched[];
  violin: Pitched[];
};

export type PlayMode = "cut" | "fade" | "only";

const FILES: { key: string; url: string; base?: number }[] = [
  { key: "kick", url: `${CDN}/drums/kick.mp3` },
  { key: "snare", url: `${CDN}/drums/snare.mp3` },
  { key: "hat", url: `${CDN}/drums/hihat.mp3` },
  { key: "crash", url: `${CDN}/drums/crash.mp3` },
  { key: "piano", url: `${CDN}/piano/C3.mp3`, base: 48 },
  { key: "piano", url: `${CDN}/piano/A3.mp3`, base: 57 },
  { key: "piano", url: `${CDN}/piano/C4.mp3`, base: 60 },
  { key: "bass", url: `${CDN}/bass/E1.mp3`, base: 28 },
  { key: "bass", url: `${CDN}/bass/A1.mp3`, base: 33 },
  { key: "bass", url: `${CDN}/bass/C2.mp3`, base: 36 },
  { key: "guitar", url: `${CDN}/guitar/E2.mp3`, base: 40 },
  { key: "guitar", url: `${CDN}/guitar/A2.mp3`, base: 45 },
  { key: "guitar", url: `${CDN}/guitar/E3.mp3`, base: 52 },
  { key: "trumpet", url: `${CDN}/trumpet/C4.mp3`, base: 60 },
  { key: "violin", url: `${CDN}/violin/A3.mp3`, base: 57 },
];

export const SAMPLE_TOTAL = FILES.length;

let bankPromise: Promise<Bank> | null = null;
let audioCtx: AudioContext | null = null;

type Live = {
  ctx: AudioContext;
  bus: GainNode;
  sources: AudioBufferSourceNode[];
  startedAt: number;
  barDur: number;
  from: number;
  to: number;
  groove: Groove;
  recipe: Recipe;
  mode: PlayMode;
};

let live: Live | null = null;
let hangover: AudioBufferSourceNode[] = [];

function silence(nodes: AudioBufferSourceNode[], bus?: GainNode, ctx?: AudioContext) {
  if (bus && ctx) {
    const now = ctx.currentTime;
    try {
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(Math.max(0.001, bus.gain.value || 0.2), now);
      bus.gain.linearRampToValueAtTime(0.001, now + 0.05);
    } catch {
      /* context gone */
    }
  }
  window.setTimeout(() => {
    for (const source of nodes) {
      try {
        source.stop();
      } catch {
        /* already ended */
      }
    }
  }, 80);
}

function emptyBank(): Bank {
  return { piano: [], bass: [], guitar: [], trumpet: [], violin: [] };
}

export function getContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function loadBank(onProgress?: (loaded: number, total: number) => void): Promise<Bank> {
  if (bankPromise) return bankPromise;
  bankPromise = (async () => {
    const ctx = getContext();
    const bank = emptyBank();
    let loaded = 0;
    await Promise.all(
      FILES.map(async (file) => {
        try {
          const response = await fetch(file.url);
          if (!response.ok) throw new Error(String(response.status));
          const audio = await response.arrayBuffer();
          const buffer = await ctx.decodeAudioData(audio.slice(0));
          if (file.base == null) {
            if (file.key === "kick") bank.kick = buffer;
            if (file.key === "snare") bank.snare = buffer;
            if (file.key === "hat") bank.hat = buffer;
            if (file.key === "crash") bank.crash = buffer;
          } else {
            const list = bank[file.key as "piano" | "bass" | "guitar" | "trumpet" | "violin"];
            list.push({ base: file.base, buffer });
          }
        } catch (error) {
          console.warn("sample failed", file.url, error);
        } finally {
          loaded += 1;
          onProgress?.(loaded, FILES.length);
        }
      }),
    );
    return bank;
  })();
  return bankPromise;
}

function nearest(list: Pitched[], midi: number): { buffer: AudioBuffer; rate: number } | null {
  if (!list.length) return null;
  let best = list[0];
  let dist = Math.abs(midi - best.base);
  for (const sample of list) {
    const next = Math.abs(midi - sample.base);
    if (next < dist) {
      best = sample;
      dist = next;
    }
  }
  const rate = Math.pow(2, (midi - best.base) / 12);
  if (!Number.isFinite(rate) || rate < 0.25 || rate > 4) return null;
  return { buffer: best.buffer, rate };
}

function hit(
  ctx: BaseAudioContext,
  bus: AudioNode,
  sources: AudioBufferSourceNode[],
  buffer: AudioBuffer | undefined,
  when: number,
  gain: number,
  rate = 1,
  dur = 0.4,
) {
  if (!buffer || gain <= 0.001 || when < 0) return;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  const amp = ctx.createGain();
  const peak = Math.max(0.0008, gain);
  amp.gain.setValueAtTime(0.0008, when);
  amp.gain.exponentialRampToValueAtTime(peak, when + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0008, when + Math.max(0.06, dur));
  src.connect(amp);
  amp.connect(bus);
  src.start(when);
  src.stop(when + dur + 0.05);
  sources.push(src);
}

function leadPitch(midi: number): number {
  let note = midi;
  while (note < 60) note += 12;
  while (note > 79) note -= 12;
  return note;
}

export function span(mode: PlayMode): { from: number; to: number } {
  if (mode === "cut") return { from: 0, to: 4 };
  if (mode === "only") return { from: 4, to: 12 };
  return { from: 0, to: 12 };
}

export function barDuration(bpm: number): number {
  return (60 / bpm) * 4;
}

function schedule(
  ctx: BaseAudioContext,
  destination: AudioNode,
  bank: Bank,
  groove: Groove,
  recipe: Recipe,
  mode: PlayMode,
  when: number,
): { bus: GainNode; sources: AudioBufferSourceNode[] } {
  const { from, to } = span(mode);
  const barDur = barDuration(groove.bpm);
  const step = barDur / 16;
  const bus = ctx.createGain();
  bus.connect(destination);
  const sources: AudioBufferSourceNode[] = [];
  const points: { t: number; g: number }[] = [];
  for (let bar = from; bar <= to; bar++) {
    points.push({
      t: when + (bar - from) * barDur,
      g: Math.max(0.001, levelAt(recipe, bar, mode) * 0.72),
    });
  }
  bus.gain.setValueAtTime(points[0]?.g ?? 0.5, when);
  for (let i = 1; i < points.length; i++) {
    bus.gain.linearRampToValueAtTime(points[i].g, points[i].t);
  }

  for (let bar = from; bar < to; bar++) {
    const chairs = new Set(chairsAt(recipe, bar));
    const harmony = chorusOf(groove, bar);
    const fadeIndex = bar - 4;
    const t0 = when + (bar - from) * barDur;
    const pianoShift = recipe.kind === "octave" && fadeIndex >= 3 ? 12 : 0;
    const soloPiano = chairs.has("piano") && !chairs.has("guitar") && !chairs.has("kit");
    const soloGuitar = chairs.has("guitar") && !chairs.has("piano") && !chairs.has("kit");

    if (chairs.has("kit")) {
      const hatsOnly = recipe.kind === "crash" && fadeIndex > 0;
      if (recipe.kind === "crash" && fadeIndex === 0) {
        hit(ctx, bus, sources, bank.crash, t0, 0.42, 1, 1.4);
        hit(ctx, bus, sources, bank.kick, t0, 0.55, 1, 0.28);
      } else if (!hatsOnly) {
        hit(ctx, bus, sources, bank.kick, t0, 0.58, 1, 0.26);
        hit(ctx, bus, sources, bank.kick, t0 + 8 * step, 0.42, 1, 0.22);
        hit(ctx, bus, sources, bank.kick, t0 + 10 * step, 0.22, 1, 0.16);
        hit(ctx, bus, sources, bank.snare, t0 + 4 * step, 0.36, 1, 0.22);
        hit(ctx, bus, sources, bank.snare, t0 + 12 * step, 0.3, 1, 0.2);
      }
      if (!hatsOnly || fadeIndex < 5) {
        for (let s = 0; s < 16; s += 2) {
          hit(ctx, bus, sources, bank.hat, t0 + s * step, s % 4 === 0 ? 0.07 : 0.045, 1, 0.08);
        }
      }
    }

    if (chairs.has("piano")) {
      const pitches = soloPiano
        ? [groove.exit[Math.max(0, fadeIndex)] ?? harmony.piano[2]]
        : harmony.piano;
      pitches.forEach((midi, index) => {
        const picked = nearest(bank.piano, midi + pianoShift);
        if (!picked) return;
        hit(ctx, bus, sources, picked.buffer, t0 + index * 0.012, soloPiano ? 0.28 : 0.18 - index * 0.02, picked.rate, soloPiano ? 1.5 : 1.15);
      });
      if (!soloPiano) {
        const top = nearest(bank.piano, harmony.piano[2] + pianoShift);
        if (top) hit(ctx, bus, sources, top.buffer, t0 + 8 * step, 0.1, top.rate, 0.7);
      }
    }

    if (chairs.has("bass")) {
      if (recipe.kind === "walk" && fadeIndex >= 0) {
        const root = groove.walk[fadeIndex] ?? harmony.bass;
        for (let q = 0; q < 4; q++) {
          const midi = Math.max(26, q === 3 ? root - 1 : root);
          const picked = nearest(bank.bass, midi);
          if (picked) hit(ctx, bus, sources, picked.buffer, t0 + q * 4 * step, 0.46, picked.rate, 0.42);
        }
      } else {
        const root = nearest(bank.bass, harmony.bass);
        const fifthMidi = harmony.bass + 7 > 52 ? harmony.bass : harmony.bass + 7;
        const fifth = nearest(bank.bass, fifthMidi);
        if (root) hit(ctx, bus, sources, root.buffer, t0, 0.48, root.rate, 0.48);
        if (fifth) hit(ctx, bus, sources, fifth.buffer, t0 + 8 * step, 0.32, fifth.rate, 0.36);
      }
    }

    if (chairs.has("guitar")) {
      if (soloGuitar) {
        const midi = groove.exit[Math.max(0, fadeIndex)] ?? harmony.guitar[2];
        for (const s of [2, 6, 10, 14]) {
          const picked = nearest(bank.guitar, midi);
          if (picked) hit(ctx, bus, sources, picked.buffer, t0 + s * step, 0.2, picked.rate, 0.36);
        }
      } else {
        for (const onset of [0, 8]) {
          harmony.guitar.forEach((midi, index) => {
            const picked = nearest(bank.guitar, midi);
            if (picked) hit(ctx, bus, sources, picked.buffer, t0 + onset * step + index * 0.01, 0.11, picked.rate, 0.55);
          });
        }
      }
    }

    if (chairs.has("horn")) {
      const picked = nearest(bank.trumpet, leadPitch(harmony.piano[1]));
      if (picked) hit(ctx, bus, sources, picked.buffer, t0, 0.22, picked.rate, 1.35);
    }

    if (chairs.has("bow")) {
      const picked = nearest(bank.violin, leadPitch(harmony.piano[2]));
      if (picked) hit(ctx, bus, sources, picked.buffer, t0 + 0.02, 0.16, picked.rate, 1.6);
    }
  }

  return { bus, sources };
}

export async function play(groove: Groove, recipe: Recipe, mode: PlayMode): Promise<void> {
  const ctx = getContext();
  if (ctx.state === "suspended") await ctx.resume();
  const bank = await loadBank();
  stop();
  const { from, to } = span(mode);
  const when = ctx.currentTime + 0.08;
  const { bus, sources } = schedule(ctx, ctx.destination, bank, groove, recipe, mode, when);
  live = {
    ctx,
    bus,
    sources,
    startedAt: when,
    barDur: barDuration(groove.bpm),
    from,
    to,
    groove,
    recipe,
    mode,
  };
}

export function stop(): void {
  const nodes = [...hangover];
  hangover = [];
  if (live) {
    nodes.push(...live.sources);
    silence(nodes, live.bus, live.ctx);
    live = null;
    return;
  }
  silence(nodes);
}

/** Let the scheduled fade finish ringing. The next play still cuts leftovers. */
export function release(): void {
  if (!live) return;
  hangover.push(...live.sources);
  live = null;
}

export function transport(): { bar: number; gain: number; done: boolean } | null {
  if (!live) return null;
  const elapsed = live.ctx.currentTime - live.startedAt;
  if (elapsed < 0) return { bar: live.from, gain: levelAt(live.recipe, live.from, live.mode), done: false };
  const length = (live.to - live.from) * live.barDur;
  if (elapsed >= length) return { bar: live.to - 1, gain: 0, done: true };
  const bar = live.from + Math.floor(elapsed / live.barDur);
  const into = (elapsed % live.barDur) / live.barDur;
  const now = levelAt(live.recipe, bar, live.mode);
  const next = levelAt(live.recipe, bar + 1, live.mode);
  return { bar, gain: now + (next - now) * into, done: false };
}

export async function renderWav(groove: Groove, recipe: Recipe): Promise<Blob> {
  const bank = await loadBank();
  const bars = 12;
  const dur = barDuration(groove.bpm) * bars + 1.3;
  const offline = new OfflineAudioContext(2, Math.ceil(dur * 44100), 44100);
  schedule(offline, offline.destination, bank, groove, recipe, "fade", 0.05);
  const rendered = await offline.startRendering();
  return new Blob([encodeWav(rendered)], { type: "audio/wav" });
}

function encodeWav(buffer: AudioBuffer): ArrayBuffer {
  const channels = buffer.numberOfChannels;
  const rate = buffer.sampleRate;
  const frames = buffer.length;
  const bytesPer = 2;
  const block = channels * bytesPer;
  const data = frames * block;
  const out = new ArrayBuffer(44 + data);
  const view = new DataView(out);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + data, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * block, true);
  view.setUint16(32, block, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, data, true);
  const chan = Array.from({ length: channels }, (_, i) => buffer.getChannelData(i));
  let offset = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      const sample = Math.max(-1, Math.min(1, chan[c][i] || 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return out;
}
