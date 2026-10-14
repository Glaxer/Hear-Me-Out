import { fail, redirect } from "@sveltejs/kit";
import {
  MIN_PASSWORD_LENGTH,
  USERNAME_HINT,
  USERNAME_PATTERN,
} from "$lib/validation";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) redirect(303, "/me");
};

export const actions: Actions = {
  default: async ({ request, locals, url }) => {
    const form = await request.formData();
    const email = String(form.get("email") ?? "").trim();
    const username = String(form.get("username") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const captchaToken = String(form.get("captcha_token") ?? "") || undefined;

    const values = { email, username };

    if (!email || !username || !password) {
      return fail(400, { ...values, error: "Please fill in all fields." });
    }
    if (!USERNAME_PATTERN.test(username)) {
      return fail(400, { ...values, error: USERNAME_HINT });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return fail(400, {
        ...values,
        error: "Password must be at least 8 characters.",
      });
    }

    const { data: taken } = await locals.supabase
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .maybeSingle();
    if (taken) {
      return fail(400, { ...values, error: "That username is already taken." });
    }

    const { data, error } = await locals.supabase.auth.signUp({
      email,
      password,
      options: {
        captchaToken,
        data: { username },
        emailRedirectTo: `${url.origin}/auth/confirm`,
      },
    });

    if (error) {
      const message =
        error.code === "captcha_failed"
          ? "We couldn’t verify that you’re human. Please try again."
          : error.message;
      return fail(400, { ...values, error: message });
    }

    // If email confirmation is turned off in Supabase, the user is signed in right away.
    if (data.session) redirect(303, "/me");

    return { ...values, checkEmail: true };
  },
};
