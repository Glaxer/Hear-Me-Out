/** Usernames: 3–30 letters, numbers or underscores (same rule as the database check). */
export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/;
export const USERNAME_HINT =
	"Username must be 3–30 characters: letters, numbers and underscores.";

export const MIN_PASSWORD_LENGTH = 8;
