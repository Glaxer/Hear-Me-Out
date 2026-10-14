import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
  const { user } = locals;
  let username: string | null = null;

  if (user) {
    const { data } = await locals.supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();
    username = data?.username ?? null;
  }

  // Only the verified user is sent to the browser (not the raw session from the cookie)
  return { user, username };
};
