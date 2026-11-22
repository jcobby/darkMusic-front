/*
 * DMY Pool's table sounds — the cue's strike, balls clicking, cushions and pockets — made
 * with Web Audio (nothing to download). Off with "Table sounds" in the game's menu; the
 * choice is kept on this device.
 */

export type SfxKind = "cue" | "ball" | "cushion" | "pocket";

const PREF_KEY = "dmy_pool_sfx";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let on: boolean | null = null;
let lastAt: Record<SfxKind, number> = { cue: 0, ball: 0, cushion: 0, pocket: 0 };

export function sfxOn(): boolean {
  if (on === null) {
    try {
      on = localStorage.getItem(PREF_KEY) !== "off";
    } catch {
      on = true;
    }
  }
  return on;
}

export function setSfxOn(v: boolean) {
  on = v;
  try {
    localStorage.setItem(PREF_KEY, v ? "on" : "off");
  } catch {
    /* private mode — for this visit only */
  }
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.7;
      master.connect(ctx.destination);
      // Half a second of white noise, shared by every click and thud
      noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      return null;
    }
  }
  return ctx;
}

/** Call from a tap or click: browsers only let sound start after one. */
export function unlockSfx() {
  const c = audio();
  if (c && c.state === "suspended") void c.resume();
}

/** A short burst of filtered noise. */
function burst(c: AudioContext, at: number, type: BiquadFilterType, freq: number, q: number, gain: number, decay: number) {
  const src = c.createBufferSource();
  src.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  src.connect(f).connect(g).connect(master!);
  src.start(at, Math.random() * 0.4);
  src.stop(at + decay + 0.02);
}

/** A decaying tone, optionally sliding in pitch. */
function tone(c: AudioContext, at: number, from: number, to: number, gain: number, decay: number, type: OscillatorType = "sine") {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(from, at);
  if (to !== from) o.frequency.exponentialRampToValueAtTime(to, at + decay);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  o.connect(g).connect(master!);
  o.start(at);
  o.stop(at + decay + 0.02);
}

/**
 * Play one sound now. `strength` 0–1 sets how hard (a soft kiss to a full-power break).
 * Sounds of the same kind closer than ~12 ms merge, so a cluster of hits stays one click.
 */
export function playSfx(kind: SfxKind, strength: number) {
  if (!sfxOn()) return;
  const c = audio();
  if (!c || !master || !noise || c.state !== "running") return;
  const now = c.currentTime;
  if (now - lastAt[kind] < 0.012) return;
  lastAt[kind] = now;
  const s = Math.max(0.04, Math.min(1, strength));
  const v = Math.pow(s, 0.8);
  const at = now + 0.005;
  switch (kind) {
    case "cue":
      // Leather tip on phenolic: a dull tock with a bright edge
      tone(c, at, 520, 380, 0.35 * v, 0.06, "triangle");
      burst(c, at, "bandpass", 2200, 1.2, 0.28 * v, 0.035);
      break;
    case "ball":
      // Resin on resin: a hard, bright click with a short ring
      burst(c, at, "bandpass", 3200 + Math.random() * 600, 2.5, 0.55 * v, 0.03);
      tone(c, at, 2400 + Math.random() * 300, 2100, 0.16 * v, 0.05);
      break;
    case "cushion":
      // Rubber and cloth: a soft, low thump
      tone(c, at, 150, 70, 0.5 * v, 0.14);
      burst(c, at, "lowpass", 700, 0.7, 0.25 * v, 0.08);
      break;
    case "pocket":
      // The drop into the pocket, then the ball rattling in the net
      tone(c, at, 210, 95, 0.55 * v, 0.18);
      burst(c, at, "lowpass", 1200, 0.8, 0.3 * v, 0.12);
      burst(c, at + 0.11, "bandpass", 1800, 1.5, 0.12 * v, 0.05);
      burst(c, at + 0.19, "bandpass", 1500, 1.5, 0.07 * v, 0.05);
      break;
  }
}

/** Forget the merge timers (a new shot starts). */
export function resetSfx() {
  lastAt = { cue: 0, ball: 0, cushion: 0, pocket: 0 };
}
