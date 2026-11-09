/** From mildest to most serious; each has its own colour and icon. */
export type ToastKind = "success" | "info" | "warning" | "error";

export interface Toast {
	id: number;
	title: string;
	message: string;
	kind: ToastKind;
}

/** The bold first line, when a toast doesn't bring its own. */
export const DEFAULT_TITLES: Record<ToastKind, string> = {
	success: "Done!",
	info: "Good to know",
	warning: "Heads up",
	error: "Something went wrong"
};

let nextId = 1;

/** Toasts currently on screen. Rendered by <Toaster /> in the root layout. */
export const toasts = $state<Toast[]>([]);

export function dismissToast(id: number) {
	const index = toasts.findIndex((t) => t.id === id);
	if (index >= 0) toasts.splice(index, 1);
}

/** Shows a short message in the corner of the screen, with an optional title. */
export function toast(
	message: string,
	kind: ToastKind = "success",
	durationMs = 5000,
	title = DEFAULT_TITLES[kind]
) {
	const id = nextId++;
	toasts.push({ id, title, message, kind });
	setTimeout(() => dismissToast(id), durationMs);
}

/**
 * Messages that a server redirect can trigger with `?toast=<key>`,
 * e.g. redirect(303, '/me?toast=welcome').
 */
export const REDIRECT_TOASTS: Record<
	string,
	{ message: string; kind: ToastKind; durationMs?: number; title?: string }
> = {
	welcome: {
		title: "Welcome to Hear Me Out!",
		message: "Your email is confirmed and you’re logged in.",
		kind: "success"
	},
	confirmed: {
		message: "Your email is confirmed. Log in to get started.",
		kind: "success"
	},
	"logged-in": { message: "You’re logged in.", kind: "success" },
	"username-picked": {
		message: "All set. Welcome to Hear Me Out!",
		kind: "success"
	},
	"pwned-password": {
		message:
			"You’re logged in, but your password has appeared in a data breach (found on Have I Been Pwned), so it’s easy for others to guess. We recommend changing it in Settings.",
		kind: "warning",
		title: "Your password isn’t safe",
		durationMs: 15000
	},
	"password-reset": {
		message: "Your new password is saved, and you’re logged in.",
		kind: "success"
	},
	"template-saved": { message: "Template saved.", kind: "success" },
	"template-deleted": {
		title: "Template deleted",
		message: "It’s gone, along with every ranking made from it.",
		kind: "success"
	},
	"list-deleted": {
		title: "Ranking deleted",
		message: "It’s gone for good.",
		kind: "success"
	},
	"account-deleted": {
		title: "Account deleted",
		message: "Everything in it has been deleted too. Bye for now!",
		kind: "success"
	}
};
