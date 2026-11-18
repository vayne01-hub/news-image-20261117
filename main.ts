// WORLD NEWS · 17 NOVEMBER 2026 — one-image news summary.
// Drawn from scratch: RGB canvas, bitmap font, dot-matrix world map,
// numbered pins and callouts. Node 22+, standard library only.
// Writes exactly one file: $MAKEFUN_OUTPUT_DIR/entry.png (1024x1024).
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

// ------------------------------------------------------------------
// Canvas
// ------------------------------------------------------------------
const W = 1024;
const H = 1024;
const px = new Uint8Array(W * H * 3);

type RGB = [number, number, number];
const PAPER: RGB = [247, 243, 232];
const INK: RGB = [20, 33, 61];
const RED: RGB = [192, 57, 43];
const BLUE: RGB = [29, 111, 184];
const GOLD: RGB = [217, 164, 65];

function fill(c: RGB): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0];
    px[i * 3 + 1] = c[1];
    px[i * 3 + 2] = c[2];
  }
}

function setPixel(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++) setPixel(xx, yy, c);
}

function hline(x0: number, x1: number, y: number, c: RGB, t = 1): void {
  for (let t0 = 0; t0 < t; t0++)
    for (let x = x0; x <= x1; x++) setPixel(x, y + t0, c);
}

function vline(x: number, y0: number, y1: number, c: RGB, t = 1): void {
  for (let t0 = 0; t0 < t; t0++)
    for (let y = y0; y <= y1; y++) setPixel(x + t0, y, c);
}

function line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    setPixel(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function circle(cx: number, cy: number, r: number, c: RGB, filled: boolean): void {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d2 = x * x + y * y;
      if (filled ? d2 <= r * r : d2 <= r * r && d2 >= (r - 2) * (r - 2))
        setPixel(cx + x, cy + y, c);
    }
  }
}

function disc(cx: number, cy: number, r: number, c: RGB): void {
  circle(cx, cy, r, c, true);
}

function ring(cx: number, cy: number, r: number, c: RGB): void {
  circle(cx, cy, r, c, false);
}

// ------------------------------------------------------------------
// PNG encoder (deterministic: no ancillary chunks, fixed settings)
// ------------------------------------------------------------------
const CRC_TABLE = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------
// Bitmap font: 5x7 glyphs, hand-authored. Each glyph is 7 rows of
// 5 bits (bit 4 = leftmost pixel). A-Z, 0-9 and basic punctuation.
// ------------------------------------------------------------------
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ".": [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ",": [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ";": [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  "-": [0, 0, 0, 0x0e, 0, 0, 0],
  "+": [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  "%": [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  "·": [0, 0, 0, 0x0c, 0x0c, 0, 0],
  "/": [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04],
  "?": [0x0e, 0x11, 0x01, 0x02, 0x04, 0x00, 0x04],
  " ": [0, 0, 0, 0, 0, 0, 0],
};

const CHAR_W = 6; // 5 glyph columns + 1 gap, in font units
const CHAR_H = 7;

function textWidth(s: string, scale: number): number {
  return s.length * CHAR_W * scale - scale;
}

function drawText(x: number, y: number, s: string, scale: number, c: RGB): void {
  // The bitmap font covers capitals only; render everything in
  // capitals so lowercase input can never fall through to "?".
  const up = s.toUpperCase();
  for (let ci = 0; ci < up.length; ci++) {
    const g = FONT[up[ci]] ?? FONT["?"];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r] & (1 << (4 - col))) {
          rect(x + ci * CHAR_W * scale + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
  }
}

function drawTextCentered(cx: number, y: number, s: string, scale: number, c: RGB): void {
  drawText(cx - Math.floor(textWidth(s, scale) / 2), y, s, scale, c);
}

// Greedy word wrap: returns lines that fit maxWidth at the given scale.
function wrapText(s: string, scale: number, maxWidth: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur ? cur + " " + w : w;
    if (textWidth(trial, scale) <= maxWidth) {
      cur = trial;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ------------------------------------------------------------------
// World map: hand-authored land grid, 64 cols (lon -180..180) x
// 32 rows (lat 84..-56), equirectangular. Each entry lists the
// inclusive land column spans of that row.
// ------------------------------------------------------------------
const MAP_SPANS: Record<number, [number, number][]> = {
  0: [[17, 19], [22, 24]],
  1: [[15, 20], [21, 26]],
  2: [[3, 16], [21, 26], [28, 29], [33, 62]],
  3: [[4, 16], [21, 25], [32, 61]],
  4: [[5, 15], [29, 37], [36, 60]],
  5: [[6, 14], [29, 37], [40, 59]],
  6: [[7, 15], [29, 37], [40, 56]],
  7: [[7, 16], [29, 36], [40, 54]],
  8: [[8, 20], [29, 36], [37, 39], [44, 52], [56, 58]],
  9: [[8, 19], [29, 32], [37, 39], [44, 50], [55, 57]],
  10: [[9, 19], [29, 39], [37, 38], [44, 48], [55, 56]],
  11: [[10, 14], [29, 39], [37, 39], [45, 48]],
  12: [[11, 14], [29, 39], [37, 40], [45, 47]],
  13: [[13, 24], [30, 39], [37, 41], [47, 49]],
  14: [[17, 25], [31, 39], [37, 39], [48, 50]],
  15: [[18, 25], [31, 38], [49, 56]],
  16: [[18, 24], [31, 38], [50, 55]],
  17: [[18, 23], [32, 37], [49, 57]],
  18: [[19, 22], [31, 37], [50, 57]],
  19: [[19, 22], [32, 38], [52, 57]],
  20: [[19, 21], [32, 38], [51, 58]],
  21: [[20, 21], [32, 37], [52, 58]],
  22: [[20, 21], [33, 36], [51, 59]],
  23: [[20, 20], [33, 36], [51, 59]],
  24: [[20, 20], [34, 35], [52, 58]],
  25: [[20, 21], [34, 35], [53, 56]],
  26: [[20, 21], [34, 35]],
  27: [[20, 20], [35, 35], [61, 62]],
  28: [[20, 20], [35, 35], [61, 63]],
  29: [[55, 56], [61, 62]],
  30: [[20, 20]],
};

interface MapRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function project(lat: number, lon: number, m: MapRect): [number, number] {
  const x = m.x + ((lon + 180) / 360) * m.w;
  const y = m.y + ((84 - lat) / 140) * m.h;
  return [Math.round(x), Math.round(y)];
}

function drawMap(m: MapRect): void {
  // graticule hairlines every 30 degrees
  for (let lon = -150; lon <= 150; lon += 30) {
    const gx = Math.round(m.x + ((lon + 180) / 360) * m.w);
    for (let y = m.y; y < m.y + m.h; y += 2) setPixel(gx, y, GOLD);
  }
  for (let lat = 60; lat >= -60; lat -= 30) {
    const gy = Math.round(m.y + ((84 - lat) / 140) * m.h);
    for (let x = m.x; x < m.x + m.w; x += 2) setPixel(x, gy, GOLD);
  }
  // land dots
  const cw = m.w / 64;
  const ch = m.h / 32;
  const r = Math.max(2, Math.floor(Math.min(cw, ch) * 0.42));
  for (const [row, spans] of Object.entries(MAP_SPANS)) {
    const cy = Math.round(m.y + (Number(row) + 0.5) * ch);
    for (const [c0, c1] of spans) {
      for (let c = c0; c <= c1; c++) {
        const cx = Math.round(m.x + (c + 0.5) * cw);
        disc(cx, cy, r, BLUE);
      }
    }
  }
  rect(m.x - 3, m.y - 3, m.w + 6, 3, INK);
  rect(m.x - 3, m.y + m.h, m.w + 6, 3, INK);
  rect(m.x - 3, m.y - 3, 3, m.h + 6, INK);
  rect(m.x + m.w, m.y - 3, 3, m.h + 6, INK);
}

function drawPin(m: MapRect, lat: number, lon: number, n: number, dx: number, dy: number): void {
  const [tx, ty] = project(lat, lon, m);
  const cx = tx + dx;
  const cy = ty + dy;
  if (dx !== 0 || dy !== 0) {
    line(tx, ty, cx, cy, RED);
    disc(tx, ty, 4, RED);
  }
  disc(cx, cy, 13, RED);
  ring(cx, cy, 13, PAPER);
  drawText(cx - 5, cy - 7, String(n), 2, PAPER);
}

// ------------------------------------------------------------------
// Story icons, drawn with primitives into a small square.
// ------------------------------------------------------------------
function drawIcon(kind: string, x: number, y: number, s: number, c: RGB): void {
  const u = s / 24; // unit
  const X = (v: number) => Math.round(x + v * u);
  const Y = (v: number) => Math.round(y + v * u);
  if (kind === "bridge") {
    hline(X(1), X(23), Y(18), c, 3);
    line(X(1), Y(18), X(12), Y(6), c);
    line(X(23), Y(18), X(12), Y(6), c);
    vline(X(6), Y(10), Y(18), c, 2);
    vline(X(18), Y(10), Y(18), c, 2);
    rect(X(10), Y(4), 4, 4, RED); // gap marker: broken arch
  } else if (kind === "drone") {
    rect(X(9), Y(10), 6, 4, c);
    hline(X(3), X(9), Y(8), c, 2);
    hline(X(15), X(21), Y(8), c, 2);
    hline(X(1), X(7), Y(6), c, 2);
    hline(X(17), X(23), Y(6), c, 2);
    hline(X(1), X(7), Y(16), c, 2);
    hline(X(17), X(23), Y(16), c, 2);
    disc(X(4), Y(20), 2, RED);
    disc(X(20), Y(20), 2, RED);
  } else if (kind === "flag") {
    vline(X(4), Y(2), Y(22), c, 2);
    rect(X(6), Y(3), 14, 8, RED);
    rect(X(6), Y(11), 14, 3, PAPER);
    line(X(6), Y(3), X(20), Y(11), c);
  } else if (kind === "plane") {
    hline(X(2), X(22), Y(12), c, 3);
    line(X(18), Y(12), X(22), Y(6), c);
    line(X(10), Y(12), X(6), Y(18), c);
    line(X(14), Y(12), X(12), Y(18), c);
    rect(X(20), Y(10), 3, 6, c);
  } else if (kind === "mountain") {
    line(X(1), Y(21), X(9), Y(6), c);
    line(X(9), Y(6), X(15), Y(21), c);
    line(X(12), Y(21), X(18), Y(10), c);
    line(X(18), Y(10), X(23), Y(21), c);
    hline(X(1), X(23), Y(21), c, 2);
    disc(X(9), Y(8), 2, PAPER);
  } else if (kind === "medical") {
    ring(X(12), Y(12), 10, c);
    rect(X(10), Y(6), 4, 12, RED);
    rect(X(6), Y(10), 12, 4, RED);
  } else if (kind === "chart") {
    hline(X(2), X(22), Y(21), c, 2);
    vline(X(2), Y(3), Y(21), c, 2);
    rect(X(5), Y(14), 4, 7, BLUE);
    rect(X(11), Y(10), 4, 11, BLUE);
    rect(X(17), Y(15), 4, 6, RED);
    line(X(4), Y(6), X(9), Y(9), RED);
    line(X(9), Y(9), X(15), Y(7), RED);
    line(X(15), Y(7), X(21), Y(12), RED);
  }
}

// ------------------------------------------------------------------
// Stories: verified 17 November 2026, each from 2+ independent
// sources dated that day. Text is reproduced exactly as approved.
// ------------------------------------------------------------------
interface Story {
  n: number;
  lat: number;
  lon: number;
  dx: number;
  dy: number;
  icon: string;
  title: string;
  fact: string;
}

const STORIES: Story[] = [
  { n: 1, lat: 45.3, lon: 36.5, dx: 0, dy: 0, icon: "bridge",
    title: "UKRAINE STRIKE COLLAPSES KERCH BRIDGE",
    fact: "Missiles and drones drop the road arch of the 19 km Russia-Crimea bridge; two killed in Crimea." },
  { n: 2, lat: 26.2, lon: 50.6, dx: 0, dy: 0, icon: "drone",
    title: "BAHRAIN BLOCKS 3RD IRANIAN DRONE ATTACK",
    fact: "Air defences intercept drones aimed at a US radar base; third attack in five days, no casualties." },
  { n: 3, lat: 14.6, lon: 121.0, dx: 0, dy: 0, icon: "flag",
    title: "TRUMP MEETS QUAD LEADERS IN MANILA",
    fact: "Asia trip opens with Japan, India and Australia before Xi-Putin talks in Shenzhen." },
  { n: 4, lat: -1.9, lon: 30.1, dx: 0, dy: 0, icon: "plane",
    title: "FIVE EU STATES PLAN RWANDA HUB",
    fact: "Austria, Denmark, Germany, Greece and the Netherlands plan a return hub for rejected asylum seekers, from 2027." },
  { n: 5, lat: 28.0, lon: 85.0, dx: 0, dy: 0, icon: "mountain",
    title: "NEPAL SEEKS BILLIONS AT COP31",
    fact: "Flood recovery needs billions after August floods killed over 1,500; the UN fund has pledged $20M." },
  { n: 6, lat: 38.9, lon: -77.0, dx: -16, dy: 14, icon: "medical",
    title: "US LOSES MEASLES ELIMINATION STATUS",
    fact: "PAHO ends the status held since 2000 after 5,400+ cases and 10 deaths in 2026." },
  { n: 7, lat: 40.7, lon: -74.0, dx: 16, dy: -14, icon: "chart",
    title: "STOCKS SLIDE, NVIDIA BEATS EARNINGS",
    fact: "S&P 500 falls 1.03% in a fourth straight decline; Nvidia guides revenue to about $130B." },
];

const SOURCES = "SOURCES: REUTERS, AP, BBC, AL JAZEERA, BLOOMBERG, NBC NEWS, NPR";

// ------------------------------------------------------------------
// Shared chrome: header + footer
// ------------------------------------------------------------------
function drawHeader(subtitle: string): void {
  hline(40, 984, 14, RED, 4);
  drawTextCentered(512, 28, "WORLD NEWS · 17 NOVEMBER 2026", 4, INK);
  drawTextCentered(512, 68, subtitle, 2, BLUE);
}

function drawBadge(cx: number, cy: number, n: number): void {
  disc(cx, cy, 15, RED);
  ring(cx, cy, 15, PAPER);
  drawText(cx - 5, cy - 7, String(n), 2, PAPER);
}

// ------------------------------------------------------------------
// Layout A: map in the middle, callout cards in a 2x4 grid below.
// ------------------------------------------------------------------
function layoutA(): void {
  drawHeader("7 STORIES FROM AROUND THE WORLD");
  const m: MapRect = { x: 40, y: 106, w: 944, h: 392 };
  drawMap(m);
  for (const s of STORIES) drawPin(m, s.lat, s.lon, s.n, s.dx, s.dy);
  const cw = 462;
  const ch = 116;
  const gap = 20;
  for (let i = 0; i < STORIES.length; i++) {
    const s = STORIES[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 40 + col * (cw + gap);
    const y = 512 + row * (ch + 8);
    rect(x, y, cw, ch, PAPER);
    rect(x, y, cw, 3, RED);
    rect(x, y + ch - 2, cw, 2, INK);
    drawBadge(x + 28, y + 26, s.n);
    drawIcon(s.icon, x + 14, y + 60, 28, INK);
    const titleLines = wrapText(s.title, 2, cw - 64);
    let ty = y + 12;
    for (const ln of titleLines) {
      drawText(x + 56, ty, ln, 2, INK);
      ty += 15;
    }
    const factLines = wrapText(s.fact, 2, cw - 64);
    for (const ln of factLines.slice(0, 4)) {
      drawText(x + 56, ty, ln, 2, BLUE);
      ty += 15;
    }
  }
  // footer cell: sources
  const fx = 40 + (cw + gap);
  const fy = 512 + 3 * (ch + 8);
  rect(fx, fy, cw, ch, INK);
  drawText(fx + 20, fy + 18, "ALL 7 STORIES, ONE DAY", 2, GOLD);
  const srcLines = wrapText(SOURCES, 2, cw - 40);
  let sy = fy + 46;
  for (const ln of srcLines) {
    drawText(fx + 20, sy, ln, 2, PAPER);
    sy += 15;
  }
}

// ------------------------------------------------------------------
// Layout B: map on top, seven full-width story rows below.
// ------------------------------------------------------------------
function layoutB(): void {
  drawHeader("7 STORIES FROM AROUND THE WORLD");
  const m: MapRect = { x: 40, y: 102, w: 944, h: 296 };
  drawMap(m);
  for (const s of STORIES) drawPin(m, s.lat, s.lon, s.n, s.dx, s.dy);
  let y = 420;
  for (const s of STORIES) {
    rect(40, y, 944, 74, PAPER);
    rect(40, y, 944, 2, GOLD);
    drawBadge(70, y + 37, s.n);
    drawIcon(s.icon, 100, y + 22, 30, INK);
    drawText(146, y + 10, s.title, 2, INK);
    const factLines = wrapText(s.fact, 2, 944 - 146 - 20);
    let fy = y + 34;
    for (const ln of factLines.slice(0, 2)) {
      drawText(146, fy, ln, 2, BLUE);
      fy += 15;
    }
    y += 80;
  }
  drawTextCentered(512, y + 2, SOURCES, 2, INK);
}

// ------------------------------------------------------------------
// Entry point
// ------------------------------------------------------------------
function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? ".";
  const layout = (process.env.NEWS_LAYOUT ?? "B").toUpperCase();
  fill(PAPER);
  if (layout === "A") layoutA();
  else layoutB();
  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/entry.png`, encodePNG());
}

main();
