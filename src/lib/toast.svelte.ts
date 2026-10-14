export type ToastKind = 'success' | 'info' | 'error';

export interface Toast {
	id: number;
	message: string;
	kind: ToastKind;
}

let nextId = 1;

/** Toasts currently on screen. Rendered by <Toaster /> in the root layout. */
export const toasts = $state<Toast[]>([]);

export function dismissToast(id: number) {
	const index = toasts.findIndex((t) => t.id === id);
	if (index >= 0) toasts.splice(index, 1);
}

/** Shows a short message in the corner of the screen. */
export function toast(message: string, kind: ToastKind = 'success', durationMs = 5000) {
	const id = nextId++;
	toasts.push({ id, message, kind });
	setTimeout(() => dismissToast(id), durationMs);
}

/**
 * Messages that a server redirect can trigger with `?toast=<key>`,
 * e.g. redirect(303, '/me?toast=welcome').
 */
export const REDIRECT_TOASTS: Record<string, { message: string; kind: ToastKind }> = {
	welcome: { message: 'Your email is confirmed and you’re logged in. Welcome to Hear Me Out!', kind: 'success' },
	confirmed: { message: 'Your email is confirmed. Log in to get started.', kind: 'success' },
	'logged-in': { message: 'You’re logged in.', kind: 'success' },
	'username-picked': { message: 'All set. Welcome to Hear Me Out!', kind: 'success' },
	'template-saved': { message: 'Template saved.', kind: 'success' },
	'template-deleted': { message: 'Template deleted.', kind: 'info' },
	'list-deleted': { message: 'Tier list deleted.', kind: 'info' },
	'account-deleted': { message: 'Your account and everything in it has been deleted. Bye for now!', kind: 'info' }
};
