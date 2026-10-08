// Capture errors before Supabase processes the URL. Never echo provider text or tokens.
export function authLinkIssue(url: string) {
  const location = new URL(url);
  const hash = new URLSearchParams(location.hash.slice(1));
  const code = hash.get('error_code') || location.searchParams.get('error_code');
  const error = hash.get('error') || location.searchParams.get('error');
  if (!code && !error && !hash.has('error_description') && !location.searchParams.has('error_description')) return '';
  return code === 'otp_expired'
    ? 'This sign-in link has expired or was already used. Request a fresh link on this device. If this browser was already signed in, that existing session may still be active.'
    : 'This sign-in link did not complete. Request a fresh link on this device. No new sign-in was accepted from this link.';
}
export const initialAuthLinkIssue = authLinkIssue(window.location.href);
