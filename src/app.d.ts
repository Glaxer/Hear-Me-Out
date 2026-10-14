import type { SupabaseClient, User } from "@supabase/supabase-js";

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient;
			/** The signed-in user, verified with the Supabase Auth server (null if not signed in). */
			getVerifiedUser: () => Promise<User | null>;
			user: User | null;
		}
		interface PageData {
			user: User | null;
		}
	}
}

export {};
