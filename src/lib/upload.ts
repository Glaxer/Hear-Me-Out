import { IMAGE_BUCKET } from "./images";
import { getBrowserClient } from "./supabase-browser";

const THUMB_SIDE = 256;
const FULL_SIDE = 1920;
/** Storage bucket limit is 2 MB; stay safely below it. */
const FULL_MAX_BYTES = 1.8 * 1024 * 1024;
/** Thumbnails are shown many at a time, so keep them light. */
const THUMB_MAX_BYTES = 300 * 1024;
/** Raw files can be big (phone photos); they're shrunk in the browser before upload. */
export const MAX_SOURCE_MB = 40;

export class ImageError extends Error {}

export interface ProcessedImage {
	/** 256px thumbnail for tier lists. */
	thumb: Blob;
	/** Large version (up to 1920px) for the image viewer. */
	full: Blob;
}

/**
 * Turns an uploaded file into a small thumbnail and a large viewer image (WebP, or PNG/JPEG in
 * browsers that can't make WebP). Throws an ImageError with a message that can be shown to the user.
 */
export async function processImage(file: File): Promise<ProcessedImage> {
	const isHeic =
		/\.(heic|heif)$/i.test(file.name) || /hei[cf]/i.test(file.type);
	if (!file.type.startsWith("image/") && !isHeic) {
		throw new ImageError("not an image");
	}
	if (file.size > MAX_SOURCE_MB * 1024 * 1024) {
		throw new ImageError(`larger than ${MAX_SOURCE_MB} MB`);
	}

	let source: ImageBitmap | HTMLImageElement;
	try {
		source = await decode(file);
	} catch {
		throw new ImageError(
			isHeic
				? "HEIC photos can’t be read by most browsers. Save it as JPG or PNG first"
				: "your browser couldn’t read this image"
		);
	}

	try {
		const thumb = await resize(source, THUMB_SIDE, 0.85, THUMB_MAX_BYTES);
		// Try progressively smaller/lighter versions until the large image fits the size limit
		let full = await resize(source, FULL_SIDE, 0.82, FULL_MAX_BYTES);
		if (full.size > FULL_MAX_BYTES)
			full = await resize(source, FULL_SIDE, 0.65, FULL_MAX_BYTES);
		if (full.size > FULL_MAX_BYTES)
			full = await resize(source, 1280, 0.7, FULL_MAX_BYTES);
		if (full.size > FULL_MAX_BYTES)
			throw new ImageError("the image is too detailed to shrink enough");
		return { thumb, full };
	} finally {
		if ("close" in source) source.close();
	}
}

/**
 * Draws the image at most `maxSide` px on its longest side and encodes it, preferably as WebP.
 * Safari (and so every browser on iPhone and iPad) can't make WebP and quietly returns a PNG
 * instead, which is far too big for photos. Then: PNG if it fits `maxBytes` (keeps transparency),
 * otherwise JPEG.
 */
async function resize(
	source: ImageBitmap | HTMLImageElement,
	maxSide: number,
	quality: number,
	maxBytes: number
): Promise<Blob> {
	const sourceWidth = source.width || maxSide;
	const sourceHeight = source.height || maxSide;
	const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
	const width = Math.max(1, Math.round(sourceWidth * scale));
	const height = Math.max(1, Math.round(sourceHeight * scale));

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d")!;
	ctx.drawImage(source, 0, 0, width, height);

	const webp = await toBlob(canvas, "image/webp", quality);
	if (webp.type === "image/webp") return webp;

	const png =
		webp.type === "image/png" ? webp : await toBlob(canvas, "image/png");
	if (png.size <= maxBytes) return png;

	// JPEG has no transparency: put a white background behind see-through parts (instead of black)
	ctx.globalCompositeOperation = "destination-over";
	ctx.fillStyle = "#fff";
	ctx.fillRect(0, 0, width, height);
	return toBlob(canvas, "image/jpeg", quality);
}

function toBlob(
	canvas: HTMLCanvasElement,
	type: string,
	quality?: number
): Promise<Blob> {
	return new Promise((resolve, reject) =>
		canvas.toBlob(
			(b) =>
				b
					? resolve(b)
					: reject(new ImageError("the image couldn’t be processed")),
			type,
			quality
		)
	);
}

/**
 * Decodes an image file. createImageBitmap is fast but can't read some formats (e.g. SVG),
 * so fall back to a regular <img> element.
 */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
	try {
		return await createImageBitmap(file);
	} catch {
		const url = URL.createObjectURL(file);
		try {
			const img = new Image();
			img.src = url;
			await img.decode();
			return img;
		} finally {
			URL.revokeObjectURL(url);
		}
	}
}

/** Uploads an already shrunk image into the user's own folder and returns its storage path. */
export async function uploadImageBlob(
	userId: string,
	blob: Blob
): Promise<string> {
	const type = blob.type || "image/webp";
	const extension = { "image/png": "png", "image/jpeg": "jpg" }[type] ?? "webp";
	const path = `${userId}/${crypto.randomUUID()}.${extension}`;
	const { error } = await getBrowserClient()
		.storage.from(IMAGE_BUCKET)
		.upload(path, blob, { contentType: type, upsert: false });
	if (error) throw new Error(error.message);
	return path;
}

/** Turns "chili_con_carne.jpg" into "chili con carne". */
export function labelFromFilename(name: string): string {
	return name
		.replace(/\.[^.]+$/, "")
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 80);
}
