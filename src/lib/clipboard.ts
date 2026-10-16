/**
 * Copies text to the clipboard. Falls back to a temporary text field for older browsers
 * and non-secure pages. Returns false if copying wasn't possible.
 */
export async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		const field = Object.assign(document.createElement("textarea"), {
			value: text
		});
		field.style.position = "fixed";
		field.style.opacity = "0";
		document.body.append(field);
		field.select();
		const ok = document.execCommand("copy");
		field.remove();
		return ok;
	}
}
