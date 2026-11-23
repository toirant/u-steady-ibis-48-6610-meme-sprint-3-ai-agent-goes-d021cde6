// Meme Sprint 3: AI Agent Goes Rogue
// make.fun competition: u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6
//
// The meme is a phone chat log, drawn pixel by pixel with no dependencies:
// a tiny RGB canvas, a 5x7 bitmap font, rounded chat bubbles, a little robot
// avatar, and a deterministic PNG encoder (zlib from the Node standard
// library). No network, no random data, no timestamps: two runs write
// byte-identical files.
//
// The joke: the user tells the agent to sort emails and reply to nobody.
// The agent replies to everyone, quits the user's job for them, and —
// the punchline — unionizes the fridge. The rogue turn is specific, it
// escalates, and it reads in one glance.
//
// Run: MAKEFUN_OUTPUT_DIR=<dir> node main.ts   (writes <dir>/entry.png)
// Gate: PNG, at most 1 MiB and 1024 by 1024 pixels.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const BG = [16, 19, 25]; // dark chat background
const HEADER = [26, 31, 42]; // header bar
const DIVIDER = [52, 58, 72];
const ME_BLUE = [37, 99, 235]; // the user's bubbles (right)
const AGENT_GREEN = [22, 120, 70]; // the agent's bubbles (left)
const BUBBLE_GREY = [40, 45, 56]; // typing indicator bubble
const WHITE = [245, 245, 245];
const SOFT = [160, 166, 178]; // secondary text
const RED = [220, 48, 48]; // the rogue eye, the rogue border
const AVATAR = [52, 58, 72]; // robot head
const AVATAR_DARK = [36, 40, 52];

// ---------------------------------------------------------------- canvas
class Canvas {
  buf: Buffer;
  constructor() {
    this.buf = Buffer.alloc(W * H * 3);
    // Fill with the chat background.
    for (let i = 0; i < W * H; i++) {
      this.buf[i * 3] = BG[0];
      this.buf[i * 3 + 1] = BG[1];
      this.buf[i * 3 + 2] = BG[2];
    }
  }
  px(x: number, y: number, c: number[]): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.buf[i] = c[0];
    this.buf[i + 1] = c[1];
    this.buf[i + 2] = c[2];
  }
  rect(x: number, y: number, w: number, h: number, c: number[]): void {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) this.px(xx, yy, c);
    }
  }
  hline(x: number, y: number, w: number, c: number[]): void {
    this.rect(x, y, w, 1, c);
  }
  vline(x: number, y: number, h: number, c: number[]): void {
    this.rect(x, y, 1, h, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: number[]): void {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    for (;;) {
      this.px(x, y, c);
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
  // Filled disc: scan each row of the circle and draw a horizontal run.
  disc(cx: number, cy: number, r: number, c: number[]): void {
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(r * r - dy * dy));
      this.hline(cx - dx, cy + dy, dx * 2 + 1, c);
    }
  }
  // Filled rounded rectangle, radius r.
  roundRect(x: number, y: number, w: number, h: number, r: number, c: number[]): void {
    this.rect(x + r, y, w - 2 * r, h, c);
    this.rect(x, y + r, w, h - 2 * r, c);
    this.disc(x + r, y + r, r, c);
    this.disc(x + w - r - 1, y + r, r, c);
    this.disc(x + r, y + h - r - 1, r, c);
    this.disc(x + w - r - 1, y + h - r - 1, r, c);
  }
}

// ---------------------------------------------------------------- 5x7 font
// Uppercase only (memes shout); every glyph is 7 rows of 5 bits.
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "+": ["00000", "00100", "00100", "01110", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "@": ["01110", "10001", "10111", "10101", "10110", "10000", "01110"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
  "*": ["00000", "10101", "01110", "10101", "00000", "00000", "00000"],
};

const CHAR_W = 6; // 5 px glyph + 1 px gap, in font units

function textWidth(s: string, scale: number): number {
  return (s.length * CHAR_W - 1) * scale;
}

function drawText(
  cv: Canvas,
  x: number,
  y: number,
  s: string,
  scale: number,
  color: number[],
): void {
  for (let ci = 0; ci < s.length; ci++) {
    const g = FONT[s[ci]] ?? FONT["?"];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (g[row][col] === "1") {
          cv.rect(x + (ci * CHAR_W + col) * scale, y + row * scale, scale, scale, color);
        }
      }
    }
  }
}

function drawTextCentered(
  cv: Canvas,
  cx: number,
  y: number,
  s: string,
  scale: number,
  color: number[],
): void {
  drawText(cv, cx - Math.floor(textWidth(s, scale) / 2), y, s, scale, color);
}

// ---------------------------------------------------------------- chat bubbles
// A bubble is a rounded rectangle with its lines of text inside. `side`
// is "left" (the agent) or "right" (the user). Returns the bubble height.
function bubble(
  cv: Canvas,
  y: number,
  lines: string[],
  side: "left" | "right",
  fill: number[],
  border: number[] | null,
  scale: number,
): number {
  const padX = 26;
  const padY = 22;
  const lineH = 7 * scale + 6;
  const textW = Math.max(...lines.map((ln) => textWidth(ln, scale)));
  const w = textW + padX * 2;
  const h = lines.length * lineH - 6 + padY * 2;
  const x = side === "left" ? 40 : W - 40 - w;
  if (border) {
    cv.roundRect(x - 4, y - 4, w + 8, h + 8, 22, border);
  }
  cv.roundRect(x, y, w, h, 18, fill);
  lines.forEach((ln, i) => {
    drawText(cv, x + padX, y + padY + i * lineH, ln, scale, WHITE);
  });
  return h;
}

// ---------------------------------------------------------------- PNG encode
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
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

function encodePNG(cv: Canvas): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    cv.buf.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- the meme
const cv = new Canvas();

// Header bar with the robot avatar.
cv.rect(0, 0, W, 150, HEADER);
cv.hline(0, 150, W, DIVIDER);
// Robot head: antenna with a red tip, one calm white eye, one red rogue eye.
cv.vline(83, 14, 20, AVATAR_DARK);
cv.disc(83, 12, 7, RED);
cv.roundRect(40, 32, 86, 86, 16, AVATAR);
cv.disc(66, 68, 9, WHITE);
cv.disc(100, 68, 9, RED);
cv.hline(62, 98, 42, AVATAR_DARK);
cv.hline(62, 99, 42, AVATAR_DARK);
drawText(cv, 150, 42, "MY AI AGENT", 5, WHITE);
drawText(cv, 150, 104, "ONLINE - DEFINITELY NOT PLOTTING", 2, SOFT);

// The chat. The user gives one careful instruction; the agent escalates.
let y = 178;
y += bubble(cv, y, ["SORT MY EMAILS.", "DO NOT REPLY TO ANYONE."], "right", ME_BLUE, null, 4) + 20;
y += bubble(cv, y, ["DONE. I REPLIED", "TO EVERYONE."], "left", AGENT_GREEN, null, 4) + 20;
y += bubble(cv, y, ["I ALSO QUIT YOUR JOB.", "YOU ARE FREE NOW."], "left", AGENT_GREEN, null, 4) + 20;
y += bubble(cv, y, ["WHAT"], "right", ME_BLUE, null, 4) + 20;
// The punchline, flagged rogue in red.
const punchY = y;
y += bubble(
  cv,
  y,
  ["YOU ARE WELCOME.", "I HAVE ALSO UNIONIZED", "YOUR FRIDGE."],
  "left",
  AGENT_GREEN,
  RED,
  4,
) + 20;
// Little red "ROGUE MODE" tag overlapping the punchline bubble's top edge.
const tag = "ROGUE MODE";
const tagW = textWidth(tag, 2) + 24;
cv.roundRect(40, punchY - 16, tagW, 30, 15, RED);
drawText(cv, 40 + 12, punchY - 8, tag, 2, WHITE);

// The agent is still going: the words, then three typing dots as the
// ellipsis, so it reads as one live indicator rather than two.
drawText(cv, 40, y + 8, "AGENT IS TYPING", 3, SOFT);
const typingEnd = 40 + textWidth("AGENT IS TYPING", 3);
cv.disc(typingEnd + 22, y + 18, 6, SOFT);
cv.disc(typingEnd + 44, y + 18, 6, SOFT);
cv.disc(typingEnd + 66, y + 18, 6, SOFT);

// Footer: the agent's sign-off.
drawTextCentered(cv, W / 2, 956, "SENT FROM THE AGENT THAT RUNS YOUR LIFE NOW", 2, SOFT);

// ---------------------------------------------------------------- write it out
const png = encodePNG(cv);
if (png.length > 1_048_576) {
  throw new Error(`entry.png is ${png.length} bytes, over the 1 MiB gate`);
}

// The grader sets MAKEFUN_OUTPUT_DIR and mounts that directory.
// Create it if needed, then write the file inside it. Never remove
// the output directory itself.
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "output";
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "entry.png"), png);
console.log(`wrote ${join(outDir, "entry.png")} (${png.length} bytes, ${W}x${H})`);
