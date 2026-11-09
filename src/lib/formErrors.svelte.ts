import { untrack } from "svelte";
import type { ActionResult } from "@sveltejs/kit";
import { toast } from "./toast.svelte";

/**
 * Form errors are shown as toasts, so they're seen wherever the page is scrolled to
 * (an error at the top of a long form looked like "nothing happened" when pressing save).
 */

/** Errors stay up a bit longer than other toasts, so there's time to read them. */
const ERROR_MS = 10000;

/** Shows an error message as a toast. */
export function showError(message: string) {
	toast(message, "error", ERROR_MS);
}

/**
 * Shows the error from a form action's response. Every response is a new `form` object, so the
 * toast shows again even when the same message comes back twice in a row.
 * Call it once in a component's script: `toastFormError(() => form)`.
 * Works for forms with and without use:enhance (without it, the page reloads with `form` set).
 */
export function toastFormError(getForm: () => unknown) {
	$effect(() => {
		const form = getForm();
		const error =
			form && typeof form === "object" && "error" in form ? form.error : null;
		if (typeof error === "string" && error) untrack(() => showError(error));
	});
}

/** For use:enhance callbacks in components that don't get `form`: shows a failed response's error. */
export function toastFailure(result: ActionResult) {
	if (result.type === "failure" && typeof result.data?.error === "string")
		showError(result.data.error);
}
