import type { ListVisibility, Placements, Tier } from "./types";

/**
 * The quick tier list draft, kept in this browser only (one at a time).
 * Pictures are too big for localStorage, so it lives in IndexedDB, which can store image files
 * directly. Every function fails quietly: without browser storage the quick list still works,
 * it just isn't kept after closing the tab.
 */
export interface QuickDraftItem {
	key: string;
	label: string;
	thumb: Blob | null;
	full: Blob | null;
}

export interface QuickDraft {
	title: string;
	visibility: ListVisibility;
	tiers: Tier[];
	/** tierId -> item keys */
	placements: Placements;
	items: QuickDraftItem[];
	updatedAt: number;
}

const DB_NAME = "hear-me-out";
const STORE = "quick";
const KEY = "draft";

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, 1);
		request.onupgradeneeded = () => request.result.createObjectStore(STORE);
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function run<T>(
	mode: IDBTransactionMode,
	action: (store: IDBObjectStore) => IDBRequest
): Promise<T | null> {
	try {
		const db = await openDb();
		try {
			return await new Promise<T>((resolve, reject) => {
				const request = action(db.transaction(STORE, mode).objectStore(STORE));
				request.onsuccess = () => resolve(request.result as T);
				request.onerror = () => reject(request.error);
			});
		} finally {
			db.close();
		}
	} catch {
		return null;
	}
}

export async function loadQuickDraft(): Promise<QuickDraft | null> {
	const draft = await run<QuickDraft>("readonly", (s) => s.get(KEY));
	return draft && Array.isArray(draft.items) ? draft : null;
}

export async function saveQuickDraft(
	draft: Omit<QuickDraft, "updatedAt">
): Promise<void> {
	await run("readwrite", (s) =>
		s.put({ ...draft, updatedAt: Date.now() }, KEY)
	);
}

export async function clearQuickDraft(): Promise<void> {
	await run("readwrite", (s) => s.delete(KEY));
}
