import { dev } from "$app/environment";
import { injectAnalytics } from "@vercel/analytics/sveltekit";
import { injectSpeedInsights } from "@vercel/speed-insights/sveltekit";

// Vercel Web Analytics: anonymous page views, no cookies (see the privacy page).
// Speed Insights: how fast pages load for real visitors. Both are free on the Hobby plan;
// when the free limit is reached, Vercel pauses collecting instead of charging.
injectAnalytics({ mode: dev ? "development" : "production" });
injectSpeedInsights();
