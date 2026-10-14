import { IMAGE_BUCKET } from './images';
import { getBrowserClient } from './supabase-browser';

const MAX_SIDE = 256;
/** Raw files can be big (phone photos); they're shrunk in the browser before upload. */
export const MAX_SOURCE_MB = 40;

export class ImageError extends Error {}

/**
 * Shrinks an image to at most 256px on its longest side and converts it to WebP,
 * so tier list pages stay fast and uploads stay tiny.
 * Throws an ImageError with a message that can be shown to the user.
 */
export async function shrinkImage(file: File): Promise<Blob> {
	const isHeic = /\.(heic|heif)$/i.test(file.name) || /hei[cf]/i.test(file.type);
	if (!file.type.startsWith('image/') && !isHeic) {
		throw new ImageError('not an image');
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
				? 'HEIC photos can’t be read by most browsers. Save it as JPG or PNG first'
				: 'your browser couldn’t read this image'
		);
	}

	const sourceWidth = source.width || MAX_SIDE;
	const sourceHeight = source.height || MAX_SIDE;
	const scale = Math.min(1, MAX_SIDE / Math.max(sourceWidth, sourceHeight));
	const width = Math.max(1, Math.round(sourceWidth * scale));
	const height = Math.max(1, Math.round(sourceHeight * scale));

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	canvas.getContext('2d')!.drawImage(source, 0, 0, width, height);
	if ('close' in source) source.close();

	return new Promise((resolve, reject) =>
		canvas.toBlob(
			(b) => (b ? resolve(b) : reject(new ImageError('the image couldn’t be processed'))),
			'image/webp',
			0.85
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
export async function uploadImageBlob(userId: string, blob: Blob): Promise<string> {
	const path = `${userId}/${crypto.randomUUID()}.webp`;
	const { error } = await getBrowserClient()
		.storage.from(IMAGE_BUCKET)
		.upload(path, blob, { contentType: 'image/webp', upsert: false });
	if (error) throw new Error(error.message);
	return path;
}

/** Turns "chili_con_carne.jpg" into "chili con carne". */
export function labelFromFilename(name: string): string {
	return name
		.replace(/\.[^.]+$/, '')
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 80);
}
