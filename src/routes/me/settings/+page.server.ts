import { fail, redirect } from "@sveltejs/kit";
import { IMAGE_BUCKET } from "$lib/images";
import { hasPassword } from "$lib/server/auth";
import { isPwnedPassword, PWNED_MESSAGE } from "$lib/server/pwned";
import {
	MIN_PASSWORD_LENGTH,
	USERNAME_HINT,
	USERNAME_PATTERN
} from "$lib/validation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, "/login?redirectTo=/me/settings");
	return {
		email: locals.user.email ?? null,
		hasPassword: hasPassword(locals.user)
	};
};

/** Removes every image in the user's storage folder (best effort, in pages of 1000). */
async function deleteAllImages(supabase: SupabaseClient, userId: string) {
	const bucket = supabase.storage.from(IMAGE_BUCKET);
	for (let round = 0; round < 50; round++) {
		const { data, error } = await bucket.list(userId, { limit: 1000 });
		if (error || !data || data.length === 0) return;
		const { error: removeError } = await bucket.remove(
			data.map((f) => `${userId}/${f.name}`)
		);
		if (removeError) return;
	}
}

export const actions: Actions = {
	username: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) redirect(303, "/login?redirectTo=/me/settings");

		const username = String(
			(await request.formData()).get("username") ?? ""
		).trim();
		if (!USERNAME_PATTERN.test(username)) {
			return fail(400, { section: "username", username, error: USERNAME_HINT });
		}

		// Usernames are unique regardless of upper/lower case
		const { data: taken } = await locals.supabase
			.from("profiles")
			.select("id")
			.ilike("username", username)
			.neq("id", user.id)
			.maybeSingle();
		if (taken)
			return fail(400, {
				section: "username",
				username,
				error: "That username is already taken."
			});

		const { error } = await locals.supabase
			.from("profiles")
			.update({ username, needs_username: false })
			.eq("id", user.id);
		if (error) {
			const message =
				error.code === "23505"
					? "That username is already taken."
					: "Could not save your username. Please try again.";
			return fail(400, { section: "username", username, error: message });
		}
		return { section: "username", success: "Username updated." };
	},

	password: async ({ request, locals }) => {
		if (!locals.user) redirect(303, "/login?redirectTo=/me/settings");

		const form = await request.formData();
		const password = String(form.get("password") ?? "");
		const confirm = String(form.get("confirm") ?? "");

		if (password.length < MIN_PASSWORD_LENGTH) {
			return fail(400, {
				section: "password",
				error: `Your new password needs at least ${MIN_PASSWORD_LENGTH} characters.`
			});
		}
		if (password !== confirm) {
			return fail(400, {
				section: "password",
				error: "The two passwords don’t match."
			});
		}
		if (await isPwnedPassword(password)) {
			return fail(400, { section: "password", error: PWNED_MESSAGE });
		}

		const { error } = await locals.supabase.auth.updateUser({ password });
		if (error) {
			const message =
				error.code === "same_password"
					? "That’s already your password. Pick a different one."
					: error.code === "weak_password"
						? "That password is too weak. Try a longer one."
						: "Could not change your password. Please try again.";
			return fail(400, { section: "password", error: message });
		}
		return {
			section: "password",
			success: hasPassword(locals.user)
				? "Password changed."
				: "Password set. You can now also log in with your email and password."
		};
	},

	delete: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) redirect(303, "/login?redirectTo=/me/settings");

		const { data: profile } = await locals.supabase
			.from("profiles")
			.select("username")
			.eq("id", user.id)
			.single();
		const typed = String(
			(await request.formData()).get("confirm") ?? ""
		).trim();
		if (!profile || typed.toLowerCase() !== profile.username.toLowerCase()) {
			return fail(400, {
				section: "delete",
				error: "Type your username exactly to confirm."
			});
		}

		// Account first, so a failure here leaves everything untouched
		const { error } = await locals.supabase.rpc("delete_my_account");
		if (error) {
			const missing =
				error.code === "PGRST202" ||
				/function.*does not exist|could not find the function/i.test(
					error.message
				);
			return fail(500, {
				section: "delete",
				error: missing
					? "Account deletion isn’t set up in the database yet (the delete_my_account function is missing)."
					: "Could not delete your account. Please try again."
			});
		}

		// Then the images: the login token stays valid for a short while after the account is gone,
		// which is enough to clear the user's own storage folder (the database can't remove storage files)
		await deleteAllImages(locals.supabase, user.id);

		// Clear the login cookies on this device
		await locals.supabase.auth.signOut({ scope: "local" });
		redirect(303, "/?toast=account-deleted");
	}
};
