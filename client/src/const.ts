export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// SECURITY FIX: Sentinel uses Supabase OTP auth, not Manus OAuth.
// Always redirect to /login (Supabase magic link page).
export const getLoginUrl = () => "/login";
