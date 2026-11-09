import type { RequestHandler } from "@sveltejs/kit";

/**
 * The list of pages search engines should know about: the fixed pages, every public template
 * and every public ranking of a public template. Unlisted and private things are left out
 * (their pages also tell search engines not to index them).
 * Submitted to Google Search Console as https://hearmeout.page/sitemap.xml
 */

/** Supabase returns at most 1000 rows per request; plenty for now. */
const LIMIT = 1000;

const STATIC_PAGES = ["/", "/templates", "/quick", "/privacy"];

interface Entry {
	path: string;
	lastmod?: string;
}

export const GET: RequestHandler = async ({ locals, url, setHeaders }) => {
	const [templates, lists] = await Promise.all([
		locals.supabase
			.from("templates")
			.select("id, created_at")
			.eq("visibility", "public")
			.order("list_count", { ascending: false })
			.limit(LIMIT),
		locals.supabase
			.from("tier_lists")
			.select("id, updated_at, templates!inner(visibility)")
			.eq("visibility", "public")
			.eq("templates.visibility", "public")
			.order("updated_at", { ascending: false })
			.limit(LIMIT)
	]);

	const entries: Entry[] = [
		...STATIC_PAGES.map((path) => ({ path })),
		...(templates.data ?? []).map((t) => ({
			path: `/templates/${t.id}`,
			lastmod: t.created_at
		})),
		...(lists.data ?? []).map((l) => ({
			path: `/lists/${l.id}`,
			lastmod: l.updated_at
		}))
	];

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
	.map(
		(e) =>
			`  <url><loc>${url.origin}${e.path}</loc>${
				e.lastmod ? `<lastmod>${e.lastmod.slice(0, 10)}</lastmod>` : ""
			}</url>`
	)
	.join("\n")}
</urlset>
`;

	// Search engines don't need it fresher than hourly
	setHeaders({
		"Content-Type": "application/xml; charset=utf-8",
		"Cache-Control": "public, max-age=3600"
	});
	return new Response(body);
};
