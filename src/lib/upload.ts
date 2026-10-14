import { IMAGE_BUCKET } from './images';
import { getBrowserClient } from './supabase-browser';

const MAX_SIDE = 256;

/**
 * Shrinks an image to at most 256px on its longest side and converts it to WebP,
 * so tier list pages stay fast and uploads stay tiny.
 */
async function shrink(file: File): Promise<Blob> {
	const bitmap = await createImageBitmap(file);
	const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
	const width = Math.round(bitmap.width * scale);
	const height = Math.round(bitmap.height * scale);

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
	bitmap.close();

	return new Promise((resolve, reject) =>
		canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process image'))), 'image/webp', 0.85)
	);
}

/** Uploads an item image into the user's own folder and returns its storage path. */
export async function uploadItemImage(userId: string, file: File): Promise<string> {
	const blob = await shrink(file);
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
		.trim()
		.slice(0, 80);
}
