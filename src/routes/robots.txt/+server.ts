import type { RequestHandler } from "@sveltejs/kit";

/**
 * Tells search engines what to skip (account pages, forms, login steps) and where the
 * sitemap is. Templates and public rankings stay crawlable; unlisted ones carry a
 * "noindex" tag on the page itself instead, which search engines can only see if they
 * may visit it.
 */
const DISALLOW = [
	"/me",
	"/lists$", // your own lists; single lists stay crawlable
	"/login",
	"/signup",
	"/logout",
	"/welcome",
	"/auth/",
	"/forgot-password",
	"/reset-password",
	"/templates/new",
	"/templates/*/edit",
	"/templates/*/rank",
	"/lists/*/edit",
	"/lists/*/items/"
];

export const GET: RequestHandler = ({ url, setHeaders }) => {
	setHeaders({
		"Content-Type": "text/plain; charset=utf-8",
		"Cache-Control": "public, max-age=86400"
	});
	return new Response(
		[
			"User-agent: *",
			...DISALLOW.map((path) => `Disallow: ${path}`),
			"",
			`Sitemap: ${url.origin}/sitemap.xml`,
			""
		].join("\n")
	);
};
