import { auth } from "../firebase";

// Only these Google accounts can open the admin panel or upload to storage.
// The server enforces the same list — this copy just keeps the UI honest.
export const ADMIN_EMAILS = ["youreditorfriend@gmail.com"];

export const isAdminEmail = (email?: string | null) =>
  !!email && ADMIN_EMAILS.includes(email.toLowerCase());

// Fresh Firebase ID token for admin-only API calls. The server verifies the
// signature and the email, so a stolen request body proves nothing on its own.
export async function adminAuthBody() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in — sign in with Google again");
  return { idToken: await user.getIdToken() };
}
