import { env } from '../config/env.js';

// A GitHub username is an admin if it appears in ADMIN_LOGINS (case-insensitive).
export function isAdminLogin(githubUsername) {
  return env.adminLogins.includes((githubUsername || '').toLowerCase());
}
