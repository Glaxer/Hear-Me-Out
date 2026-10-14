import { PUBLIC_SUPABASE_URL } from '$env/static/public';

export const IMAGE_BUCKET = 'item-images';

/** Public URL for an image stored in the item-images bucket. */
export function imageUrl(path: string | null): string | null {
	if (!path) return null;
	return `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${path}`;
}
