import adapter from "@sveltejs/adapter-vercel";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			// Run server code in Frankfurt, next to the Supabase project (create Supabase in "Central EU (Frankfurt)").
			// Every page load talks to Supabase, so keeping them in the same region keeps pages fast.
			regions: ["fra1"]
		})
	}
};

export default config;
