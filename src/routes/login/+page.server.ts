import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

/** Only allow relative redirects so the login page can't send people to other sites. */
function safeRedirect(target: string | null): string {
  if (target && target.startsWith("/") && !target.startsWith("//"))
    return target;
  return "/me";
}

export const load: PageServerLoad = async ({ locals, url }) => {
  if (locals.user)
    redirect(303, safeRedirect(url.searchParams.get("redirectTo")));
};

export const actions: Actions = {
  default: async ({ request, locals, url }) => {
    const form = await request.formData();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const captchaToken = String(form.get("captcha_token") ?? "") || undefined;

    if (!email || !password) {
      return fail(400, {
        email,
        error: "Please enter your email and password.",
      });
    }

    const { error } = await locals.supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    });
    if (error) {
      const message =
        error.code === "captcha_failed"
          ? "We couldn’t verify that you’re human. Please try again."
          : error.code === "email_not_confirmed"
            ? "Please confirm your email first — check your inbox."
            : "Wrong email or password.";
      return fail(400, { email, error: message });
    }

    redirect(303, safeRedirect(url.searchParams.get("redirectTo")));
  },
};
