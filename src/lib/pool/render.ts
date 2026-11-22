/*
 * DMY Pool's balls as real spheres: each one carries an orientation (which way its number,
 * stripe and spots face), turned as it rolls and spins, and is shaded pixel by pixel — lit
 * from the top left, with a sharp highlight and the purple cloth reflected underneath. Its
 * number is printed on the spot and turns, foreshortens and disappears round the back with it.
 *
 * Orientations are 3×3 rotation matrices (row-major) taking the ball's own axes to the
 * table's: x along the table, y across it (down the screen when lying down), z up out of the
 * cloth towards the player. The ball's own z axis goes through its number spots; a stripe
 * ball's band runs round its own x axis.
 */

export type Mat3 = Float64Array;

const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/** A ball's first orientation: number up, turned a random way round. */
export function initialOrientation(): Mat3 {
  const a = Math.random() * Math.PI * 2;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return new Float64Array([c, -s, 0, s, c, 0, 0, 0, 1]);
}

export const identity = (): Mat3 => new Float64Array(IDENTITY);

/** Turn `m` by the angular velocity (ox, oy, oz) for `dt` seconds (in place). */
export function rotate(m: Mat3, ox: number, oy: number, oz: number, dt: number) {
  const w = Math.sqrt(ox * ox + oy * oy + oz * oz);
  const th = w * dt;
  if (th < 1e-7) return;
  const kx = ox / w;
  const ky = oy / w;
  const kz = oz / w;
  const c = Math.cos(th);
  const s = Math.sin(th);
  const t = 1 - c;
  // Rodrigues: R = I cos + (1 − cos) k kᵀ + sin [k]×
  const r0 = c + t * kx * kx;
  const r1 = t * kx * ky - s * kz;
  const r2 = t * kx * kz + s * ky;
  const r3 = t * kx * ky + s * kz;
  const r4 = c + t * ky * ky;
  const r5 = t * ky * kz - s * kx;
  const r6 = t * kx * kz - s * ky;
  const r7 = t * ky * kz + s * kx;
  const r8 = c + t * kz * kz;
  for (let col = 0; col < 3; col++) {
    const a0 = m[col];
    const a1 = m[3 + col];
    const a2 = m[6 + col];
    m[col] = r0 * a0 + r1 * a1 + r2 * a2;
    m[3 + col] = r3 * a0 + r4 * a1 + r5 * a2;
    m[6 + col] = r6 * a0 + r7 * a1 + r8 * a2;
  }
}

/** Keep `m` a pure rotation (rounding creeps in over thousands of small turns). */
export function orthonormalize(m: Mat3) {
  // Columns: the ball's x and y axes; z = x × y
  let x0 = m[0], x1 = m[3], x2 = m[6];
  let l = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2) || 1;
  x0 /= l; x1 /= l; x2 /= l;
  let y0 = m[1], y1 = m[4], y2 = m[7];
  const d = x0 * y0 + x1 * y1 + x2 * y2;
  y0 -= d * x0; y1 -= d * x1; y2 -= d * x2;
  l = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2) || 1;
  y0 /= l; y1 /= l; y2 /= l;
  m[0] = x0; m[3] = x1; m[6] = x2;
  m[1] = y0; m[4] = y1; m[7] = y2;
  m[2] = x1 * y2 - x2 * y1;
  m[5] = x2 * y0 - x0 * y2;
  m[8] = x0 * y1 - x1 * y0;
}

// ---------- Drawing ----------

const RGB: Record<number, [number, number, number]> = {
  0: [246, 245, 238],
  1: [245, 196, 0],
  2: [31, 79, 209],
  3: [212, 32, 32],
  4: [106, 43, 191],
  5: [240, 122, 16],
  6: [26, 138, 58],
  7: [122, 31, 31],
  8: [18, 18, 20],
};
const WHITE: [number, number, number] = [250, 249, 243];
const CUE_DOT: [number, number, number] = [205, 30, 40];
const SPOT = 0.8; // |z| beyond this is the white number spot (a circle about 37° across)
const BAND = 0.56; // |x| below this is a stripe ball's coloured band
const DOT = 0.955; // the cue ball's small red dots

// Light from the top left, towards the player; the highlight halfway between it and the eye
const L = norm(-0.42, -0.55, 0.72);
const HV = norm(L[0], L[1], L[2] + 1);
function norm(x: number, y: number, z: number): [number, number, number] {
  const l = Math.sqrt(x * x + y * y + z * z);
  return [x / l, y / l, z / l];
}

/*
 * Each ball keeps its own small canvas, redrawn only when it turns (or changes size or fades) —
 * during a shot most balls sit still, so most frames redraw just the few that are moving.
 */
interface Sprite {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  img: ImageData;
  size: number;
  rot: Float64Array;
  r: number;
  alpha: number;
}
const sprites = new Map<number, Sprite>();

function spriteFor(id: number, size: number): Sprite | null {
  let sp = sprites.get(id);
  if (!sp || sp.size !== size) {
    const canvas = sp?.canvas ?? document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    sp = { canvas, ctx, img: ctx.createImageData(size, size), size, rot: new Float64Array(9).fill(NaN), r: -1, alpha: -1 };
    sprites.set(id, sp);
  }
  return sp;
}

const shadows = new Map<number, HTMLCanvasElement>();
/** The shadow's picture for a ball of `rp` device pixels, drawn once. */
function shadowFor(rp: number): HTMLCanvasElement {
  const key = Math.round(rp * 4);
  let c = shadows.get(key);
  if (!c) {
    const size = Math.ceil(rp * 2.5) + 2;
    c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    if (ctx) {
      const g = ctx.createRadialGradient(size / 2, size / 2, rp * 0.2, size / 2, size / 2, rp * 1.25);
      g.addColorStop(0, "rgba(0,0,0,0.5)");
      g.addColorStop(0.6, "rgba(0,0,0,0.22)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    }
    shadows.set(key, c);
  }
  return c;
}

/**
 * The screen's view of the table's axes: lying down they're the same; standing up the
 * table's x runs up the screen and its y to the right. Returns screen = P · table.
 */
export function screenMatrix(m: Mat3, portrait: boolean, out: Mat3): Mat3 {
  if (!portrait) {
    out.set(m);
  } else {
    // (sx, sy, sz) = (ty, −tx, tz)
    out[0] = m[3]; out[1] = m[4]; out[2] = m[5];
    out[3] = -m[0]; out[4] = -m[1]; out[5] = -m[2];
    out[6] = m[6]; out[7] = m[7]; out[8] = m[8];
  }
  return out;
}

/** The soft shadow a ball casts on the cloth (drawn for every ball before any ball). */
export function drawShadow(ctx: CanvasRenderingContext2D, dpr: number, cx: number, cy: number, r: number) {
  const img = shadowFor(r * dpr);
  const size = img.width / dpr;
  ctx.drawImage(img, cx + r * 0.28 - size / 2, cy + r * 0.34 - size / 2, size, size);
}

/**
 * Draw ball `id` centred on (cx, cy) with radius r (CSS pixels; the context is already
 * scaled by `dpr`), oriented by `s` (its screen matrix — see screenMatrix).
 */
export function drawBall3D(ctx: CanvasRenderingContext2D, dpr: number, id: number, cx: number, cy: number, r: number, s: Mat3, alpha = 1) {
  const rp = r * dpr; // radius in device pixels
  const size = Math.ceil(rp * 2) + 3;
  const half = size / 2;
  const sp = spriteFor(id, size);
  if (!sp) return;
  let same = sp.r === r && sp.alpha === alpha;
  for (let k = 0; same && k < 9; k++) same = sp.rot[k] === s[k];
  if (!same) {
    paintSprite(sp, id, rp, s, alpha);
    sp.rot.set(s);
    sp.r = r;
    sp.alpha = alpha;
  }
  ctx.drawImage(sp.canvas, cx - half / dpr, cy - half / dpr, size / dpr, size / dpr);
}

/** Shade the ball pixel by pixel into its canvas, then print its number on the spot facing us. */
function paintSprite(sp: Sprite, id: number, rp: number, s: Mat3, alpha: number) {
  const { size, img, ctx } = sp;
  const half = size / 2;
  const data = img.data;
  const base = RGB[id > 8 ? id - 8 : id] ?? RGB[0];
  const stripe = id > 8;
  const cue = id === 0;
  const inv = 1 / rp;
  const edge = (1 + 1.5 * inv) ** 2;
  let i = 0;
  for (let py = 0; py < size; py++) {
    const y = (py + 0.5 - half) * inv;
    for (let px = 0; px < size; px++, i += 4) {
      const x = (px + 0.5 - half) * inv;
      const d2 = x * x + y * y;
      if (d2 >= edge) {
        data[i + 3] = 0;
        continue;
      }
      const dist = Math.sqrt(d2);
      const cover = Math.min(1, Math.max(0, (1 - dist) * rp + 0.5));
      // The surface point (screen space), then the same point in the ball's own axes
      const nx = dist > 1 ? x / dist : x;
      const ny = dist > 1 ? y / dist : y;
      const nz = dist >= 1 ? 0 : Math.sqrt(1 - d2);
      const bx = s[0] * nx + s[3] * ny + s[6] * nz;
      const bz = s[2] * nx + s[5] * ny + s[8] * nz;
      let c = base;
      if (cue) {
        if (bz > DOT || bz < -DOT) c = CUE_DOT;
      } else if (bz > SPOT || bz < -SPOT) c = WHITE;
      else if (stripe && (bx > BAND || bx < -BAND)) c = WHITE;
      // Light it
      const diff = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
      const nh = Math.max(0, nx * HV[0] + ny * HV[1] + nz * HV[2]);
      const nh2 = nh * nh;
      const nh8 = nh2 * nh2 * nh2 * nh2;
      const nh64 = nh8 * nh8 * nh8 * nh8 * nh8 * nh8 * nh8 * nh8;
      const spec = 255 * (0.85 * nh64 + 0.06 * nh8);
      const k = (0.3 + 0.8 * diff) * (0.82 + 0.18 * nz);
      const bounce = ny > 0 ? ny * (1 - nz) * 0.35 : 0; // the purple cloth, reflected low down
      data[i] = c[0] * k + spec + 70 * bounce;
      data[i + 1] = c[1] * k + spec + 18 * bounce;
      data[i + 2] = c[2] * k + spec + 120 * bounce;
      data[i + 3] = 255 * cover * alpha;
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.putImageData(img, 0, 0);

  // The number on whichever spot faces the player (both, at an angle), turning with the ball
  if (cue || rp < 7) return;
  const label = String(id);
  ctx.fillStyle = "#151515";
  ctx.font = `800 ${Math.max(9, rp * 0.62)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const side of [1, -1]) {
    const dz = side * s[8];
    if (dz < 0.28) continue;
    // The spot's own axes on screen: x, and y (mirrored on the far side so it never reads backwards)
    ctx.globalAlpha = alpha * Math.min(1, (dz - 0.28) / 0.25);
    ctx.setTransform(s[0], s[3], side * s[1], side * s[4], half + side * s[2] * rp, half + side * s[5] * rp);
    ctx.fillText(label, 0, rp * 0.04);
  }
  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
