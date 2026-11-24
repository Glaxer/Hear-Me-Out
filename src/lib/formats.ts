import type { TemplateFormat } from "./types";

/** What one filled-out template is called, in a sentence: "Save your bracket". */
export function formatNoun(format: TemplateFormat | null | undefined): string {
	if (format === "bracket") return "bracket";
	if (format === "blind") return "blind ranking";
	return "tier list";
}

/** Short label for a chip on template cards ("Tier list" templates get none). */
export function formatChip(
	format: TemplateFormat | null | undefined
): string | null {
	if (format === "bracket") return "Bracket";
	if (format === "blind") return "Blind ranking";
	return null;
}
