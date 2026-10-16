/**
 * Draws a tier list onto a canvas and returns it as a PNG, entirely in the browser.
 * Everything is drawn by hand (no DOM screenshot), so the result looks the same everywhere.
 */
import { imageUrl } from "./images";
import { textOn } from "./tiers";
import type { Placements, TemplateItem, Tier } from "./types";

export interface ExportOptions {
	title: string;
	/** Username shown as "Jacob’s ranking of …"; empty for people who aren't logged in. */
	author: string;
	/** The template it ranks; empty for quick tier lists. */
	templateTitle: string;
	tiers: Tier[];
	placements: Placements;
	items: TemplateItem[];
	/** Shown in the footer, e.g. "hearmeout.page/lists/…" */
	link: string;
	/** Replaces the "Jacob’s ranking of …" line under the title, e.g. "Based on 5 rankings". */
	byline?: string;
	/** Extra section under the board: the items people disagree about most (the verdict). */
	divisive?: DivisiveRow[];
	/** Extra section under the board: where this ranking disagrees most with everyone else. */
	hotTakes?: {
		heading: string;
		/** Shown next to this ranking's tier, e.g. the username */
		who: string;
		rows: HotTakeRow[];
	};
}

export interface HotTakeRow {
	item: TemplateItem;
	/** The tier this ranking put it in. */
	mine: Tier;
	/** Where everyone else's average lands. */
	others: Tier;
	/** True when this ranking rates it higher than everyone else. */
	higher: boolean;
}

export interface DivisiveRow {
	item: TemplateItem;
	/** Votes per tier, top tier first (same order as `tiers`). */
	distribution: number[];
	/** e.g. "3 said S · 2 said D" */
	summary: string;
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
// "Most divisive" section
const DIV_HEAD_H = 76;
const DIV_TILE = 72;
const DIV_ROW_GAP = 12;
const DIV_BAR_H = 22;
// Hot takes section: up to three columns of "top tier · picture · bottom tier", like the page
const HOT_BADGE_MAX_W = 230;
const HOT_BADGE_FONT = 16;
const HOT_BADGE_LINE = 20;
const HOT_BADGE_PAD_X = 10;
const HOT_BADGE_PAD_Y = 6;
const HOT_GAP = 12;
const HOT_ARROW_W = 32;
const HOT_ARROW_H = 40;

const COLORS = {
	bg: "#151412",
	surface: "#1f1d1a",
	tileBg: "#2a2824",
	line: "#3a3732",
	ink: "#f2eee6",
	inkSoft: "#a9a398"
};

const DISPLAY = '"Bricolage Grotesque Variable", system-ui, sans-serif';
const BODY = '"Inter Variable", system-ui, sans-serif';

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
	maxWidth: number
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
	maxWidth: number
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
	lineHeight = 1.1
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
			box.w
		)
	};
}

function drawLines(
	ctx: CanvasRenderingContext2D,
	lines: string[],
	cx: number,
	cy: number,
	size: number,
	lineHeight = 1.1
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
	tile = TILE,
	/** Off when the name is written next to the picture anyway */
	nameStrip = true
) {
	ctx.save();
	ctx.beginPath();
	ctx.roundRect(x, y, tile, tile, 10);
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
			tile,
			tile
		);

		// Name strip at the bottom: up to 2 lines, full name where it fits
		if (nameStrip) {
			ctx.font = `600 12px ${BODY}`;
			const lines = clampLines(
				ctx,
				wrap(ctx, item.label, tile - 10),
				2,
				tile - 10
			);
			const stripH = lines.length * 14 + 8;
			ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
			ctx.fillRect(x, y + tile - stripH, tile, stripH);
			ctx.fillStyle = "#ffffff";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			lines.forEach((line, i) =>
				ctx.fillText(line, x + tile / 2, y + tile - stripH + 4 + 7 + i * 14)
			);
		}
	} else {
		ctx.fillStyle = COLORS.tileBg;
		ctx.fillRect(x, y, tile, tile);
		ctx.fillStyle = COLORS.ink;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		const { size, lines } = fitText(
			ctx,
			item.label,
			BODY,
			700,
			{ w: tile - 12, h: tile - 12 },
			16,
			10,
			1.15
		);
		drawLines(ctx, lines, x + tile / 2, y + tile / 2, size, 1.15);
	}
	ctx.restore();
}

/** A tier badge that wraps onto up to 3 lines (like the hot takes on the page). */
function measureBlockBadge(ctx: CanvasRenderingContext2D, tier: Tier) {
	ctx.font = `800 ${HOT_BADGE_FONT}px ${DISPLAY}`;
	const inner = HOT_BADGE_MAX_W - HOT_BADGE_PAD_X * 2;
	const lines = clampLines(ctx, wrap(ctx, tier.label, inner), 3, inner);
	const w =
		Math.max(32, ...lines.map((l) => ctx.measureText(l).width)) +
		HOT_BADGE_PAD_X * 2;
	const h = lines.length * HOT_BADGE_LINE + HOT_BADGE_PAD_Y * 2;
	return { lines, w: Math.min(w, HOT_BADGE_MAX_W), h };
}

/** Draws a block badge centred on `cx`, with its top at `y`. */
function drawBlockBadge(
	ctx: CanvasRenderingContext2D,
	tier: Tier,
	cx: number,
	y: number
) {
	const { lines, w, h } = measureBlockBadge(ctx, tier);
	const x = cx - w / 2;
	ctx.fillStyle = tier.color;
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, 7);
	ctx.fill();
	ctx.fillStyle = textOn(tier.color);
	ctx.font = `800 ${HOT_BADGE_FONT}px ${DISPLAY}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	lines.forEach((line, i) =>
		ctx.fillText(
			line,
			cx,
			y + HOT_BADGE_PAD_Y + HOT_BADGE_LINE / 2 + i * HOT_BADGE_LINE + 1
		)
	);
	return { x, w, h };
}

/** The wide block arrow from the page, pointing up or down. */
function drawArrow(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	up: boolean
) {
	ctx.save();
	ctx.translate(x, y);
	if (!up) {
		ctx.translate(HOT_ARROW_W, HOT_ARROW_H);
		ctx.rotate(Math.PI);
	}
	ctx.scale(HOT_ARROW_W / 32, HOT_ARROW_H / 40);
	ctx.beginPath();
	ctx.moveTo(16, 2);
	ctx.lineTo(30, 18);
	ctx.lineTo(22, 18);
	ctx.lineTo(22, 38);
	ctx.lineTo(10, 38);
	ctx.lineTo(10, 18);
	ctx.lineTo(2, 18);
	ctx.closePath();
	ctx.fillStyle = COLORS.inkSoft;
	ctx.strokeStyle = COLORS.inkSoft;
	ctx.lineWidth = 2;
	ctx.lineJoin = "round";
	ctx.fill();
	ctx.stroke();
	ctx.restore();
}

/** One bar split into tier-coloured parts by how many people picked each tier. */
function drawVoteBar(
	ctx: CanvasRenderingContext2D,
	tiers: Tier[],
	distribution: number[],
	x: number,
	y: number,
	w: number,
	h: number
) {
	const total = distribution.reduce((a, b) => a + b, 0);
	if (!total) return;
	ctx.save();
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, h / 2);
	ctx.clip();
	ctx.fillStyle = COLORS.tileBg;
	ctx.fillRect(x, y, w, h);
	let cx = x;
	distribution.forEach((count, i) => {
		if (!count) return;
		const part = (count / total) * w;
		const tier = tiers[i];
		ctx.fillStyle = tier.color;
		ctx.fillRect(cx, y, part, h);
		// Write the tier name in the part when there's room for it
		ctx.font = `700 12px ${BODY}`;
		const text = count > 1 ? `${tier.label} ×${count}` : tier.label;
		if (ctx.measureText(text).width + 10 <= part) {
			ctx.fillStyle = textOn(tier.color);
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(text, cx + part / 2, y + h / 2 + 1);
		}
		cx += part;
	});
	ctx.restore();
}

function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number) {
	const bars: [number, string][] = [
		[26, "#ff7f7f"],
		[19, "#ffbf7f"],
		[13, "#ffdf7f"]
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
		document.fonts.load(`500 20px ${BODY}`)
	]).catch(() => undefined);

	const byId = new Map(opts.items.map((i) => [i.id, i]));
	const rows = opts.tiers.map((tier) => ({
		tier,
		ids: (opts.placements[tier.id] ?? []).filter((id) => byId.has(id))
	}));

	// Download all pictures that will be shown, in parallel
	const divisive = (opts.divisive ?? []).filter((d) => byId.has(d.item.id));
	const hotTakes = (opts.hotTakes?.rows ?? []).filter((t) =>
		byId.has(t.item.id)
	);
	const shown = [
		...new Set([
			...rows.flatMap((r) => r.ids),
			...divisive.map((d) => d.item.id),
			...hotTakes.map((t) => t.item.id)
		])
	];
	const pictures = new Map(
		await Promise.all(
			shown.map(
				async (id) => [id, await loadPicture(byId.get(id)!.image_path)] as const
			)
		)
	);

	// Measure: each tier is as tall as its wrapped rows of pictures
	const perLine = Math.max(
		1,
		Math.floor((WIDTH - PAD * 2 - LABEL_W - ROW_PAD * 2 + GAP) / (TILE + GAP))
	);
	const rowHeights = rows.map((r) => {
		const lines = Math.max(1, Math.ceil(r.ids.length / perLine));
		return lines * TILE + (lines - 1) * GAP + ROW_PAD * 2;
	});
	const boardH =
		rowHeights.reduce((a, b) => a + b, 0) + ROW_GAP * (rows.length - 1);
	// Hot takes: the tallest top badge and tallest bottom badge decide the row heights,
	// so all pictures line up (measured on a spare canvas before the real one is made)
	const measure = document.createElement("canvas").getContext("2d")!;
	const hotTopH = Math.max(
		0,
		...hotTakes.map((t) => measureBlockBadge(measure, t.mine).h)
	);
	const hotBottomH = Math.max(
		0,
		...hotTakes.map((t) => measureBlockBadge(measure, t.others).h)
	);
	const hotTakesH = hotTakes.length
		? DIV_HEAD_H + hotTopH + HOT_GAP + TILE + HOT_GAP + hotBottomH + 8
		: 0;

	// Extra sections share one layout: heading, then rows of a picture with text beside it
	const sectionH = (rows: number) =>
		rows ? DIV_HEAD_H + rows * (DIV_TILE + DIV_ROW_GAP) - DIV_ROW_GAP + 8 : 0;
	const height =
		PAD +
		HEADER_H +
		boardH +
		sectionH(divisive.length) +
		hotTakesH +
		FOOTER_H +
		PAD / 2;

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
		1.05
	);
	ctx.font = `800 ${title.size}px ${DISPLAY}`;
	ctx.fillText(
		title.lines[0] + (title.lines.length > 1 ? "…" : ""),
		PAD,
		PAD + title.size
	);
	ctx.font = `500 20px ${BODY}`;
	ctx.fillStyle = COLORS.inkSoft;
	const byline =
		opts.byline ??
		(opts.templateTitle
			? opts.author
				? `${opts.author}’s ranking of ${opts.templateTitle}`
				: `A ranking of ${opts.templateTitle}`
			: opts.author
				? `By ${opts.author}`
				: "");
	if (byline) ctx.fillText(byline, PAD, PAD + title.size + 34);

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
			1.05
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
				y + ROW_PAD + line * (TILE + GAP)
			);
		});

		y += h + ROW_GAP;
	});

	/** Heading + subheading of an extra section; moves y to where its rows start. */
	const sectionHead = (heading: string, sub: string) => {
		y += 24 - ROW_GAP;
		ctx.textAlign = "left";
		ctx.textBaseline = "alphabetic";
		ctx.fillStyle = COLORS.ink;
		ctx.font = `800 26px ${DISPLAY}`;
		ctx.fillText(heading, PAD, y + 24, WIDTH - PAD * 2);
		ctx.font = `500 16px ${BODY}`;
		ctx.fillStyle = COLORS.inkSoft;
		ctx.fillText(sub, PAD, y + 48, WIDTH - PAD * 2);
		y += DIV_HEAD_H - 16;
	};
	const textX = PAD + DIV_TILE + 16;
	const textW = WIDTH - PAD - textX;
	/** Picture + bold name of one row in an extra section. */
	const rowStart = (item: TemplateItem) => {
		drawItem(ctx, item, pictures.get(item.id) ?? null, PAD, y, DIV_TILE, false);
		ctx.textAlign = "left";
		ctx.textBaseline = "alphabetic";
		ctx.fillStyle = COLORS.ink;
		ctx.font = `700 18px ${BODY}`;
		ctx.fillText(item.label, textX, y + 20, textW);
	};

	// Most divisive (verdict images)
	if (divisive.length) {
		sectionHead("Most divisive", "The items people disagree about most");
		for (const row of divisive) {
			rowStart(row.item);
			ctx.fillStyle = COLORS.inkSoft;
			ctx.font = `500 15px ${BODY}`;
			ctx.fillText(row.summary, textX, y + 42, textW);
			drawVoteBar(
				ctx,
				opts.tiers,
				row.distribution,
				textX,
				y + DIV_TILE - DIV_BAR_H,
				textW,
				DIV_BAR_H
			);
			y += DIV_TILE + DIV_ROW_GAP;
		}
		y += 8 - DIV_ROW_GAP + ROW_GAP;
	}

	// Hot takes (ranking images): columns like the page, "who" tier on top,
	// the picture with an arrow beside it, everyone else's tier below
	if (hotTakes.length && opts.hotTakes) {
		sectionHead(
			opts.hotTakes.heading,
			"Where this ranking disagrees most with everyone else"
		);
		const colW = (WIDTH - PAD * 2) / 3;
		const tileY = y + hotTopH + HOT_GAP;
		const bottomY = tileY + TILE + HOT_GAP;
		hotTakes.forEach((take, i) => {
			// Centre the columns as a group when there are fewer than three
			const offset = ((3 - hotTakes.length) * colW) / 2;
			const cx = PAD + offset + colW * i + colW / 2;

			const top = measureBlockBadge(ctx, take.mine);
			const topBox = drawBlockBadge(
				ctx,
				take.mine,
				cx,
				tileY - HOT_GAP - top.h
			);
			const bottomBox = drawBlockBadge(ctx, take.others, cx, bottomY);

			// "Glaxer" / "Others" hang to the left of the badges, not counted when centring
			ctx.fillStyle = COLORS.inkSoft;
			ctx.font = `500 14px ${BODY}`;
			ctx.textAlign = "right";
			ctx.textBaseline = "middle";
			ctx.fillText(
				opts.hotTakes!.who,
				topBox.x - 8,
				tileY - HOT_GAP - top.h / 2
			);
			ctx.fillText("Others", bottomBox.x - 8, bottomY + bottomBox.h / 2);

			drawItem(
				ctx,
				take.item,
				pictures.get(take.item.id) ?? null,
				cx - TILE / 2,
				tileY
			);
			drawArrow(
				ctx,
				cx + TILE / 2 + 14,
				tileY + (TILE - HOT_ARROW_H) / 2,
				take.higher
			);
		});
		y = bottomY + hotBottomH + 8 + ROW_GAP;
	}

	// Footer
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.font = `500 15px ${BODY}`;
	ctx.fillStyle = COLORS.inkSoft;
	ctx.fillText(
		`Made with Hear Me Out · ${opts.link}`,
		PAD,
		y - ROW_GAP + FOOTER_H / 2 + 6
	);

	pictures.forEach((p) => p?.close());

	return new Promise((resolve, reject) =>
		canvas.toBlob(
			(b) => (b ? resolve(b) : reject(new Error("Could not create the image"))),
			"image/png"
		)
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
