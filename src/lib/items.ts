import { imageUrl } from "./images";
import type { TemplateItem } from "./types";
import {
	ImageError,
	labelFromFilename,
	processImage,
	uploadImageBlob
} from "./upload";

export const MAX_ITEMS = 100;

/** An item while a template is being created or edited in the browser. */
export interface EditableItem {
	key: string;
	/** Database id for items that already exist; null for new ones. */
	id: string | null;
	label: string;
	/** Stored thumbnail path for existing items (kept unless replaced). */
	imagePath: string | null;
	/** Stored large image path for existing items. */
	fullImagePath: string | null;
	/** A new thumbnail waiting to be uploaded. */
	blob: Blob | null;
	/** A new large image waiting to be uploaded. */
	fullBlob: Blob | null;
	/** What to show as the thumbnail. */
	preview: string | null;
}

export function newItem(
	label: string,
	image: { thumb: Blob; full: Blob } | null = null
): EditableItem {
	return {
		key: crypto.randomUUID(),
		id: null,
		label,
		imagePath: null,
		fullImagePath: null,
		blob: image?.thumb ?? null,
		fullBlob: image?.full ?? null,
		preview: image ? URL.createObjectURL(image.thumb) : null
	};
}

/**
 * Shrinks each image and turns it into an item named after its file. Items are handed over
 * one at a time through `onItem`, so they appear while the rest are still being processed.
 * Returns how many were added and what went wrong (too many files, unreadable images).
 */
export async function imagesToItems(
	files: File[],
	spaceLeft: number,
	onItem: (item: EditableItem) => void,
	onProgress?: (done: number, total: number) => void
): Promise<{ added: number; problems: string[] }> {
	const problems: string[] = [];
	const accepted = files.slice(0, Math.max(0, spaceLeft));
	if (accepted.length < files.length) {
		problems.push(
			`Only ${MAX_ITEMS} items fit, so ${files.length - accepted.length} file(s) were skipped.`
		);
	}

	let added = 0;
	for (const [done, file] of accepted.entries()) {
		onProgress?.(done, accepted.length);
		try {
			const image = await processImage(file);
			onItem(newItem(labelFromFilename(file.name) || "Untitled", image));
			added++;
		} catch (err) {
			const reason =
				err instanceof ImageError ? err.message : "something went wrong";
			problems.push(`${file.name}: ${reason}.`);
		}
	}
	return { added, problems };
}

export function fromTemplateItem(item: TemplateItem): EditableItem {
	return {
		key: item.id,
		id: item.id,
		label: item.label,
		imagePath: item.image_path,
		fullImagePath: item.full_image_path ?? null,
		blob: null,
		fullBlob: null,
		preview: imageUrl(item.image_path)
	};
}

/**
 * Uploads any new images and adds the items to the form as parallel fields:
 * item_id[], item_label[], item_image[] and item_full_image[] (in display order).
 */
export async function appendItemsToForm(
	formData: FormData,
	items: EditableItem[],
	userId: string,
	onProgress?: (done: number, total: number) => void
) {
	const total = items.filter((i) => i.blob).length;
	let done = 0;
	for (const item of items) {
		let path = item.imagePath ?? "";
		let fullPath = item.fullImagePath ?? "";
		if (item.blob) {
			onProgress?.(done, total);
			[path, fullPath] = await Promise.all([
				uploadImageBlob(userId, item.blob),
				item.fullBlob
					? uploadImageBlob(userId, item.fullBlob)
					: Promise.resolve("")
			]);
			done++;
		}
		formData.append("item_id", item.id ?? "");
		formData.append("item_label", item.label.trim());
		formData.append("item_image", path);
		formData.append("item_full_image", fullPath);
	}
}
