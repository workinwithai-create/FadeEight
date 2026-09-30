export type Chair = "kit" | "bass" | "guitar" | "piano" | "horn" | "bow";

export type Voicing = {
  symbol: string;
  piano: [number, number, number];
  guitar: [number, number, number];
  bass: number;
};

export type Groove = {
  id: string;
  name: string;
  bpm: number;
  key: string;
  blurb: string;
  chorus: Voicing[];
  /** One note per fade bar when a single chair is left. */
  exit: number[];
  /** Upright walks off, one pitch per fade bar. */
  walk: number[];
};

export type RecipeKind = "band" | "walk" | "crash" | "octave";

export type Recipe = {
  id: string;
  name: string;
  blurb: string;
  kind: RecipeKind;
  /** Level at the start of each fade bar. 1 is the chorus. */
  curve: number[];
  chairs: Chair[][];
};

export const CHAIR_LABEL: Record<Chair, string> = {
  kit: "Kit",
  bass: "Upright",
  guitar: "Nylon",
  piano: "Grand",
  horn: "Trumpet",
  bow: "Violin",
};

export const CHAIR_ORDER: Chair[] = ["kit", "bass", "guitar", "piano", "horn", "bow"];

const ALL: Chair[] = ["kit", "bass", "guitar", "piano", "horn", "bow"];

export const grooves: Groove[] = [
  {
    id: "amber",
    name: "Amber Last",
    bpm: 92,
    key: "A minor",
    blurb: "A minor chorus that has been looping since the hook locked.",
    chorus: [
      { symbol: "Am", piano: [57, 60, 64], guitar: [57, 64, 69], bass: 45 },
      { symbol: "F", piano: [53, 57, 60], guitar: [53, 60, 65], bass: 41 },
      { symbol: "C", piano: [48, 52, 55], guitar: [52, 55, 60], bass: 36 },
      { symbol: "G", piano: [55, 59, 62], guitar: [55, 62, 67], bass: 43 },
    ],
    exit: [69, 67, 65, 64, 62, 60, 57, 55],
    walk: [45, 43, 41, 40, 38, 36, 35, 33],
  },
  {
    id: "porch",
    name: "Porch Last",
    bpm: 84,
    key: "E major",
    blurb: "Slower porch chorus. The cut feels ruder because the tempo is already low.",
    chorus: [
      { symbol: "E", piano: [52, 56, 59], guitar: [52, 59, 64], bass: 40 },
      { symbol: "B", piano: [47, 51, 54], guitar: [47, 54, 59], bass: 35 },
      { symbol: "C#m", piano: [49, 52, 56], guitar: [49, 56, 61], bass: 37 },
      { symbol: "A", piano: [45, 49, 52], guitar: [45, 52, 57], bass: 33 },
    ],
    exit: [64, 63, 61, 59, 57, 56, 54, 52],
    walk: [40, 39, 37, 35, 33, 32, 30, 28],
  },
  {
    id: "fold",
    name: "Fold Last",
    bpm: 100,
    key: "D minor",
    blurb: "Radio-tempo minor chorus. A hard stop here sounds like the export failed.",
    chorus: [
      { symbol: "Dm", piano: [50, 53, 57], guitar: [50, 57, 62], bass: 38 },
      { symbol: "Bb", piano: [46, 50, 53], guitar: [46, 53, 58], bass: 34 },
      { symbol: "F", piano: [53, 57, 60], guitar: [53, 57, 65], bass: 41 },
      { symbol: "C", piano: [48, 52, 55], guitar: [48, 52, 55], bass: 36 },
    ],
    exit: [65, 64, 62, 60, 58, 57, 55, 53],
    walk: [38, 36, 34, 33, 31, 29, 28, 26],
  },
];

export const recipes: Recipe[] = [
  {
    id: "kit-first",
    name: "Kit leaves first",
    blurb: "Drums step out by bar 6. Nylon, then upright, then the grand is the last thing in the room.",
    kind: "band",
    curve: [0.94, 0.8, 0.66, 0.52, 0.38, 0.26, 0.14, 0.06],
    chairs: [
      ALL,
      ["kit", "bass", "guitar", "piano", "bow"],
      ["bass", "guitar", "piano", "horn", "bow"],
      ["bass", "guitar", "piano", "bow"],
      ["bass", "guitar", "piano"],
      ["bass", "piano"],
      ["piano"],
      ["piano"],
    ],
  },
  {
    id: "hallway",
    name: "Vocal hallway",
    blurb: "The band clears a hallway for one last line, then the piano and nylon fade with it.",
    kind: "band",
    curve: [0.78, 0.7, 0.6, 0.46, 0.32, 0.2, 0.1, 0.04],
    chairs: [
      ["piano", "guitar"],
      ["piano", "guitar", "bow"],
      ["piano", "guitar"],
      ["piano"],
      ["piano", "guitar"],
      ["guitar"],
      ["guitar"],
      [],
    ],
  },
  {
    id: "walk-off",
    name: "Bass walks off",
    blurb: "Upright walks down the scale and out the door. The band follows the bass, not a fader trick.",
    kind: "walk",
    curve: [0.96, 0.84, 0.7, 0.56, 0.4, 0.26, 0.14, 0.05],
    chairs: [
      ALL,
      ["kit", "bass", "guitar", "piano", "bow"],
      ["bass", "guitar", "piano", "bow"],
      ["bass", "guitar", "piano"],
      ["bass", "piano"],
      ["bass", "piano"],
      ["bass"],
      ["bass"],
    ],
  },
  {
    id: "brass-last",
    name: "Trumpet last",
    blurb: "Everyone sits down. The trumpet holds the third and lets it thin until it is gone.",
    kind: "band",
    curve: [0.92, 0.78, 0.64, 0.5, 0.36, 0.24, 0.12, 0.05],
    chairs: [
      ALL,
      ["kit", "bass", "piano", "horn", "bow"],
      ["bass", "piano", "horn", "bow"],
      ["piano", "horn", "bow"],
      ["horn", "bow"],
      ["horn"],
      ["horn"],
      ["horn"],
    ],
  },
  {
    id: "crash-dim",
    name: "Crash, then hats",
    blurb: "One crash on the downbeat of the fade. Hats only after that, then nothing.",
    kind: "crash",
    curve: [0.9, 0.62, 0.42, 0.28, 0.16, 0.09, 0.04, 0.02],
    chairs: [["kit"], ["kit"], ["kit"], ["kit"], ["kit"], [], [], []],
  },
  {
    id: "octave",
    name: "Octave lift",
    blurb: "The grand jumps an octave as the room empties. A soul fade, not a key change.",
    kind: "octave",
    curve: [1, 0.86, 0.7, 0.54, 0.38, 0.24, 0.12, 0.05],
    chairs: [
      ALL,
      ALL,
      ["bass", "guitar", "piano", "horn", "bow"],
      ["guitar", "piano", "bow"],
      ["piano", "bow"],
      ["piano"],
      ["piano"],
      ["piano"],
    ],
  },
  {
    id: "cliff",
    name: "One more chorus",
    blurb: "The hook plays once more at full band, then drops away across the last four bars.",
    kind: "band",
    curve: [1, 0.98, 0.96, 0.9, 0.5, 0.28, 0.12, 0.04],
    chairs: [
      ALL,
      ALL,
      ALL,
      ALL,
      ["bass", "guitar", "piano", "bow"],
      ["guitar", "piano"],
      ["piano"],
      ["piano"],
    ],
  },
  {
    id: "nylon",
    name: "One chair",
    blurb: "By the middle of the fade only nylon is left, single notes, then the room is empty.",
    kind: "band",
    curve: [0.88, 0.7, 0.52, 0.36, 0.24, 0.14, 0.07, 0.03],
    chairs: [
      ["kit", "bass", "guitar", "piano"],
      ["bass", "guitar", "piano"],
      ["guitar", "piano"],
      ["guitar"],
      ["guitar"],
      ["guitar"],
      ["guitar"],
      [],
    ],
  },
];

export function chorusOf(groove: Groove, bar: number): Voicing {
  return groove.chorus[bar % 4];
}

export function levelAt(recipe: Recipe, bar: number, mode: "cut" | "fade" | "only"): number {
  if (mode === "cut") return bar < 4 ? 1 : 0.001;
  if (bar < 4) return 1;
  if (bar >= 12) return 0.012;
  return recipe.curve[bar - 4];
}

export function chairsAt(recipe: Recipe, bar: number): Chair[] {
  if (bar < 4) return ALL;
  if (bar >= 12) return [];
  return recipe.chairs[bar - 4];
}

export function punchList(groove: Groove, recipe: Recipe): string {
  const chorus = groove.chorus
    .map((bar, i) => `  ${i + 1}. ${bar.symbol} — full band`)
    .join("\n");
  const fade = recipe.chairs
    .map((chairs, i) => {
      const harmony = chorusOf(groove, i);
      const who = chairs.length ? chairs.map((c) => CHAIR_LABEL[c]).join(", ") : "empty room";
      const pct = Math.round(recipe.curve[i] * 100);
      return `  ${i + 5}. ${harmony.symbol} — fader ${pct}% — ${who}`;
    })
    .join("\n");
  return [
    "FadeEight punch list",
    `${groove.name} · ${groove.bpm} BPM · ${groove.key} · ${recipe.name}`,
    "",
    "The problem: the last chorus ends on a brick wall. Generators stop the file. People glue on a second song, or the record dies mid-breath.",
    `The move: ${recipe.blurb}`,
    "",
    "Last chorus (bars 1–4) — this is where a hard cut would happen",
    chorus,
    "",
    `Fade (bars 5–12) — ${recipe.name}`,
    fade,
    "",
    "Live FluidR3 chairs only. No oscillators. Audio never leaves the tab.",
    "Drop the MIDI on the outro. Ride the printed fader. Do not button-end it and do not start a second song.",
    "",
    "Not VerseEight (verse in front of the hook). Not SeamFour (the loop seam). Not RideEight (a ride-out that stays loud). Not ButtonFour, TagFour, EndEight, Exhale, or DieTwice.",
  ].join("\n");
}

function midiPriority(data: number[]): number {
  const status = data[0] ?? 0;
  if (status === 0xff) return 0;
  if ((status & 0xf0) === 0xc0) return 1;
  if ((status & 0xf0) === 0x80) return 2;
  return 3;
}

function vlq(value: number): number[] {
  let n = value;
  const bytes = [n & 0x7f];
  n >>= 7;
  while (n > 0) {
    bytes.unshift((n & 0x7f) | 0x80);
    n >>= 7;
  }
  return bytes;
}

function textMeta(text: string): number[] {
  const data = Array.from(new TextEncoder().encode(text));
  return [0xff, 0x01, ...vlq(data.length), ...data];
}

export function buildMidi(groove: Groove, recipe: Recipe): Uint8Array {
  const tpq = 480;
  const sixteenth = tpq / 4;
  const events: { tick: number; data: number[] }[] = [];
  const tempo = Math.round(60_000_000 / groove.bpm);
  events.push({
    tick: 0,
    data: [0xff, 0x51, 0x03, (tempo >> 16) & 0xff, (tempo >> 8) & 0xff, tempo & 0xff],
  });
  events.push({ tick: 0, data: textMeta(`FadeEight ${groove.name} ${recipe.name}`) });
  events.push({ tick: 0, data: [0xc0, 0] });
  events.push({ tick: 0, data: [0xc1, 32] });
  events.push({ tick: 0, data: [0xc2, 24] });
  events.push({ tick: 0, data: [0xc3, 56] });
  events.push({ tick: 0, data: [0xc4, 40] });

  const note = (tick: number, channel: number, midi: number, dur: number, vel: number) => {
    const m = Math.max(0, Math.min(127, Math.round(midi)));
    events.push({ tick, data: [0x90 | channel, m, vel] });
    events.push({ tick: tick + dur, data: [0x80 | channel, m, 0] });
  };

  for (let bar = 0; bar < 12; bar++) {
    const chairs = new Set(chairsAt(recipe, bar));
    const harmony = chorusOf(groove, bar);
    const fadeIndex = bar - 4;
    const origin = bar * 16 * sixteenth;
    const pianoShift = recipe.kind === "octave" && fadeIndex >= 3 ? 12 : 0;
    const soloPiano = chairs.has("piano") && !chairs.has("guitar") && !chairs.has("kit");
    const soloGuitar = chairs.has("guitar") && !chairs.has("piano") && !chairs.has("kit");

    if (chairs.has("kit")) {
      if (recipe.kind === "crash" && fadeIndex === 0) {
        note(origin, 9, 49, sixteenth * 8, 100);
        note(origin, 9, 36, sixteenth * 2, 100);
      } else if (recipe.kind !== "crash" || fadeIndex < 0) {
        note(origin, 9, 36, sixteenth * 2, 104);
        note(origin + 8 * sixteenth, 9, 36, sixteenth * 2, 84);
        note(origin + 4 * sixteenth, 9, 38, sixteenth * 2, 96);
        note(origin + 12 * sixteenth, 9, 38, sixteenth * 2, 90);
      }
      const hatBars = recipe.kind === "crash" ? 4 : 8;
      if (fadeIndex < 0 || fadeIndex < hatBars) {
        for (let s = 0; s < 16; s += 2) note(origin + s * sixteenth, 9, 42, sixteenth, 48);
      }
    }
    if (chairs.has("piano")) {
      const pitches = soloPiano ? [groove.exit[Math.max(0, fadeIndex)] ?? harmony.piano[2]] : harmony.piano;
      pitches.forEach((p, i) => note(origin, 0, p + pianoShift, sixteenth * (soloPiano ? 8 : 14), 78 - i * 8));
      if (!soloPiano) note(origin + 8 * sixteenth, 0, harmony.piano[2] + pianoShift, sixteenth * 6, 60);
    }
    if (chairs.has("bass")) {
      if (recipe.kind === "walk" && fadeIndex >= 0) {
        const root = groove.walk[fadeIndex];
        for (let q = 0; q < 4; q++) {
          const step = q === 3 ? root - 1 : root;
          note(origin + q * 4 * sixteenth, 1, step, sixteenth * 3, 90);
        }
      } else {
        note(origin, 1, harmony.bass, sixteenth * 6, 96);
        note(origin + 8 * sixteenth, 1, harmony.bass + 7 > 52 ? harmony.bass : harmony.bass + 7, sixteenth * 4, 80);
      }
    }
    if (chairs.has("guitar")) {
      if (soloGuitar) {
        const top = groove.exit[Math.max(0, fadeIndex)] ?? harmony.guitar[2];
        for (const step of [2, 6, 10, 14]) note(origin + step * sixteenth, 2, top, sixteenth * 2, 70);
      } else {
        harmony.guitar.forEach((p, i) => note(origin, 2, p, sixteenth * 6, 64 - i * 6));
        harmony.guitar.forEach((p, i) => note(origin + 8 * sixteenth, 2, p, sixteenth * 6, 54 - i * 4));
      }
    }
    if (chairs.has("horn")) {
      const lead = harmony.piano[1] < 60 ? harmony.piano[1] + 12 : harmony.piano[1];
      note(origin, 3, lead, sixteenth * 12, 84);
    }
    if (chairs.has("bow")) {
      let lead = harmony.piano[2];
      while (lead < 60) lead += 12;
      note(origin, 4, lead, sixteenth * 14, 70);
    }
  }

  events.sort((a, b) => a.tick - b.tick || midiPriority(a.data) - midiPriority(b.data));
  const track: number[] = [];
  let cursor = 0;
  for (const event of events) {
    track.push(...vlq(event.tick - cursor), ...event.data);
    cursor = event.tick;
  }
  const endTick = 12 * 16 * sixteenth;
  track.push(...vlq(Math.max(0, endTick - cursor)), 0xff, 0x2f, 0x00);
  const header = [
    0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x01,
    (tpq >> 8) & 0xff, tpq & 0xff,
  ];
  const len = track.length;
  const mtrk = [0x4d, 0x54, 0x72, 0x6b, (len >> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff];
  return new Uint8Array([...header, ...mtrk, ...track]);
}
