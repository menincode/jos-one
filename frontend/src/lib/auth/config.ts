const DEFAULT_AUTH_API_URL =
  "https://script.google.com/macros/s/AKfycbwGM1AF_kjxu7XxY9WgOIetuehLxgvjwHmDk-cfxVz25We2PWUoW1a3zlmkPX2iHsry/exec";

export function getAuthApiUrl(): string {
  const fromEnv = (import.meta.env.VITE_AUTH_API_URL ?? "").trim();
  return fromEnv || DEFAULT_AUTH_API_URL;
}

export function authApiConfigError(): string | null {
  const url = getAuthApiUrl();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return "Auth API is not configured. Set VITE_AUTH_API_URL in frontend/.env.";
  }
  return null;
}
