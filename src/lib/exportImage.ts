/**
 * Draws a tier list onto a canvas and returns it as a PNG, entirely in the browser.
 * Everything is drawn by hand (no DOM screenshot), so the result looks the same everywhere.
 */
import { imageUrl } from "./images";
import { textOn } from "./tiers";
import type { Placements, TemplateItem, Tier } from "./types";

export interface ExportOptions {
  title: string;
  author: string;
  templateTitle: string;
  tiers: Tier[];
  placements: Placements;
  items: TemplateItem[];
  /** Shown in the footer, e.g. "hear-me-out-delta.vercel.app/lists/…" */
  link: string;
}

// Layout (in CSS pixels; the canvas is drawn at 2× for sharpness)
const SCALE = 2;
const WIDTH = 1200;
const PAD = 40;
const LABEL_W = 150;
const TILE = 104;
const GAP = 6;
const ROW_PAD = 6;
const ROW_GAP = 4;
const HEADER_H = 112;
const FOOTER_H = 56;

const COLORS = {
  bg: "#151412",
  surface: "#1f1d1a",
  tileBg: "#2a2824",
  line: "#3a3732",
  ink: "#f2eee6",
  inkSoft: "#a9a398",
};

const DISPLAY = '"Bricolage Grotesque", system-ui, sans-serif';
const BODY = "Inter, system-ui, sans-serif";

/** Loads an item picture through fetch, so a failing image becomes a text tile instead of breaking the export. */
async function loadPicture(path: string | null): Promise<ImageBitmap | null> {
  const url = imageUrl(path);
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    return await createImageBitmap(await res.blob());
  } catch {
    return null;
  }
}

/** Splits text into lines that fit `maxWidth` at the current font (breaking only between words). */
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Shortens the last allowed line with "…" if there are too many lines. */
function clampLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  max: number,
  maxWidth: number,
): string[] {
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  let last = kept[max - 1];
  while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth)
    last = last.slice(0, -1);
  kept[max - 1] = `${last.trimEnd()}…`;
  return kept;
}

/**
 * Picks the largest font size (from `max` down to `min`) at which the text fits the box,
 * wrapping between words. Returns the size and the lines.
 */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  family: string,
  weight: number,
  box: { w: number; h: number },
  max: number,
  min: number,
  lineHeight = 1.1,
) {
  for (let size = max; size >= min; size -= 1) {
    ctx.font = `${weight} ${size}px ${family}`;
    const lines = wrap(ctx, text, box.w);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (widest <= box.w && lines.length * size * lineHeight <= box.h)
      return { size, lines };
  }
  ctx.font = `${weight} ${min}px ${family}`;
  return {
    size: min,
    lines: clampLines(
      ctx,
      wrap(ctx, text, box.w),
      Math.max(1, Math.floor(box.h / (min * lineHeight))),
      box.w,
    ),
  };
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  cx: number,
  cy: number,
  size: number,
  lineHeight = 1.1,
) {
  const total = lines.length * size * lineHeight;
  let y = cy - total / 2 + (size * lineHeight) / 2;
  for (const line of lines) {
    ctx.fillText(line, cx, y);
    y += size * lineHeight;
  }
}

/** Draws an item: its picture (cropped to a square) with the full name on a dark strip, or a text tile. */
function drawItem(
  ctx: CanvasRenderingContext2D,
  item: TemplateItem,
  picture: ImageBitmap | null,
  x: number,
  y: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, TILE, TILE, 10);
  ctx.clip();

  if (picture) {
    // Cover-crop the picture into the square
    const s = Math.min(picture.width, picture.height);
    ctx.drawImage(
      picture,
      (picture.width - s) / 2,
      (picture.height - s) / 2,
      s,
      s,
      x,
      y,
      TILE,
      TILE,
    );

    // Name strip at the bottom: up to 2 lines, full name where it fits
    ctx.font = `600 12px ${BODY}`;
    const lines = clampLines(
      ctx,
      wrap(ctx, item.label, TILE - 10),
      2,
      TILE - 10,
    );
    const stripH = lines.length * 14 + 8;
    ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
    ctx.fillRect(x, y + TILE - stripH, TILE, stripH);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((line, i) =>
      ctx.fillText(line, x + TILE / 2, y + TILE - stripH + 4 + 7 + i * 14),
    );
  } else {
    ctx.fillStyle = COLORS.tileBg;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = COLORS.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const { size, lines } = fitText(
      ctx,
      item.label,
      BODY,
      700,
      { w: TILE - 12, h: TILE - 12 },
      16,
      10,
      1.15,
    );
    drawLines(ctx, lines, x + TILE / 2, y + TILE / 2, size, 1.15);
  }
  ctx.restore();
}

function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const bars: [number, string][] = [
    [26, "#ff7f7f"],
    [19, "#ffbf7f"],
    [13, "#ffdf7f"],
  ];
  bars.forEach(([w, color], i) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y + i * 8, w, 6, 3);
    ctx.fill();
  });
}

export async function renderTierListImage(opts: ExportOptions): Promise<Blob> {
  // Make sure the site's fonts are ready before measuring or drawing text
  await Promise.all([
    document.fonts.load(`800 40px ${DISPLAY}`),
    document.fonts.load(`600 12px ${BODY}`),
    document.fonts.load(`700 16px ${BODY}`),
    document.fonts.load(`500 20px ${BODY}`),
  ]).catch(() => undefined);

  const byId = new Map(opts.items.map((i) => [i.id, i]));
  const rows = opts.tiers.map((tier) => ({
    tier,
    ids: (opts.placements[tier.id] ?? []).filter((id) => byId.has(id)),
  }));

  // Download all pictures that will be shown, in parallel
  const shown = rows.flatMap((r) => r.ids);
  const pictures = new Map(
    await Promise.all(
      shown.map(
        async (id) =>
          [id, await loadPicture(byId.get(id)!.image_path)] as const,
      ),
    ),
  );

  // Measure: each tier is as tall as its wrapped rows of pictures
  const perLine = Math.max(
    1,
    Math.floor((WIDTH - PAD * 2 - LABEL_W - ROW_PAD * 2 + GAP) / (TILE + GAP)),
  );
  const rowHeights = rows.map((r) => {
    const lines = Math.max(1, Math.ceil(r.ids.length / perLine));
    return lines * TILE + (lines - 1) * GAP + ROW_PAD * 2;
  });
  const boardH =
    rowHeights.reduce((a, b) => a + b, 0) + ROW_GAP * (rows.length - 1);
  const height = PAD + HEADER_H + boardH + FOOTER_H + PAD / 2;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * SCALE;
  canvas.height = Math.ceil(height * SCALE);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);

  // Background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, WIDTH, height);

  // Header: title, "Glaxer's ranking of …", logo
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = COLORS.ink;
  const title = fitText(
    ctx,
    opts.title,
    DISPLAY,
    800,
    { w: WIDTH - PAD * 2 - 220, h: 56 },
    48,
    26,
    1.05,
  );
  ctx.font = `800 ${title.size}px ${DISPLAY}`;
  ctx.fillText(
    title.lines[0] + (title.lines.length > 1 ? "…" : ""),
    PAD,
    PAD + title.size,
  );
  ctx.font = `500 20px ${BODY}`;
  ctx.fillStyle = COLORS.inkSoft;
  ctx.fillText(
    `${opts.author}’s ranking of ${opts.templateTitle}`,
    PAD,
    PAD + title.size + 34,
  );

  drawLogo(ctx, WIDTH - PAD - 190, PAD + 6);
  ctx.font = `800 26px ${DISPLAY}`;
  ctx.fillStyle = COLORS.ink;
  ctx.fillText("Hear Me Out", WIDTH - PAD - 155, PAD + 29);

  // Board
  let y = PAD + HEADER_H;
  rows.forEach((row, i) => {
    const h = rowHeights[i];
    const x = PAD;

    // Row background
    ctx.fillStyle = COLORS.surface;
    ctx.beginPath();
    ctx.roundRect(x, y, WIDTH - PAD * 2, h, 10);
    ctx.fill();

    // Tier label (left side, rounded on the left)
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, WIDTH - PAD * 2, h, 10);
    ctx.clip();
    ctx.fillStyle = row.tier.color;
    ctx.fillRect(x, y, LABEL_W, h);
    ctx.restore();

    ctx.fillStyle = textOn(row.tier.color);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = fitText(
      ctx,
      row.tier.label,
      DISPLAY,
      800,
      { w: LABEL_W - 20, h: h - 16 },
      40,
      12,
      1.05,
    );
    drawLines(ctx, label.lines, x + LABEL_W / 2, y + h / 2, label.size, 1.05);

    // Items
    row.ids.forEach((id, n) => {
      const col = n % perLine;
      const line = Math.floor(n / perLine);
      drawItem(
        ctx,
        byId.get(id)!,
        pictures.get(id) ?? null,
        x + LABEL_W + ROW_PAD + col * (TILE + GAP),
        y + ROW_PAD + line * (TILE + GAP),
      );
    });

    y += h + ROW_GAP;
  });

  // Footer
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = `500 15px ${BODY}`;
  ctx.fillStyle = COLORS.inkSoft;
  ctx.fillText(
    `Made with Hear Me Out · ${opts.link}`,
    PAD,
    y - ROW_GAP + FOOTER_H / 2 + 6,
  );

  pictures.forEach((p) => p?.close());

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not create the image"))),
      "image/png",
    ),
  );
}

/** "Glaxer's Tal!" -> "glaxers-tal.png" */
export function imageFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/['’]/g, "") // "Glaxer's" -> "glaxers", not "glaxer-s"
    .normalize("NFKD")
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "oe")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "tier-list"}.png`;
}
