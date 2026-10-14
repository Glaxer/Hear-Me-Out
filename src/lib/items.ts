import { imageUrl } from './images';
import type { TemplateItem } from './types';
import { uploadImageBlob } from './upload';

export const MAX_ITEMS = 100;

/** An item while a template is being created or edited in the browser. */
export interface EditableItem {
	key: string;
	/** Database id for items that already exist; null for new ones. */
	id: string | null;
	label: string;
	/** Stored image path for existing items (kept unless replaced). */
	imagePath: string | null;
	/** A new, already shrunk image waiting to be uploaded. */
	blob: Blob | null;
	/** What to show as the thumbnail. */
	preview: string | null;
}

export function newItem(label: string, blob: Blob | null = null): EditableItem {
	return {
		key: crypto.randomUUID(),
		id: null,
		label,
		imagePath: null,
		blob,
		preview: blob ? URL.createObjectURL(blob) : null
	};
}

export function fromTemplateItem(item: TemplateItem): EditableItem {
	return {
		key: item.id,
		id: item.id,
		label: item.label,
		imagePath: item.image_path,
		blob: null,
		preview: imageUrl(item.image_path)
	};
}

/**
 * Uploads any new images and adds the items to the form as parallel fields:
 * item_id[], item_label[] and item_image[] (in display order).
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
		let path = item.imagePath ?? '';
		if (item.blob) {
			onProgress?.(done, total);
			path = await uploadImageBlob(userId, item.blob);
			done++;
		}
		formData.append('item_id', item.id ?? '');
		formData.append('item_label', item.label.trim());
		formData.append('item_image', path);
	}
}
