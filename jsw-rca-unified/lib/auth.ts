// SSO Authentication — IOsense portal flow
// Flow: IOsense portal → Profile → generate SSO token → appended to URL as ?token=xxx
// App extracts token → calls validate API → receives Bearer JWT + userId + orgId
// Store in localStorage → use Bearer JWT for all subsequent API calls

const AUTH_STORAGE_KEY = 'iosense_auth';
const SSO_VALIDATE_URL = 'https://connector.iosense.io/api/retrieve-sso-token';

export interface AuthData {
  token: string;   // Bearer JWT (format: "Bearer <JWT>")
  userId: string;
  orgId: string;
}

export function getStoredAuth(): AuthData | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as AuthData;
  } catch {
    return null;
  }
}

export function storeAuth(data: AuthData): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getSSOTokenFromURL(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('token');
}

export async function validateSSOToken(ssoToken: string): Promise<AuthData> {
  const res = await fetch(`${SSO_VALIDATE_URL}/${ssoToken}`, {
    method: 'GET',
    headers: {
      organisation: 'https://iosense.io',
      'ngsw-bypass': 'true',
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`SSO validation failed: ${res.status}`);
  const data = await res.json();
  if (!data.success || !data.token)
    throw new Error(data.errors?.join(', ') || 'SSO validation failed');
  return { token: data.token, userId: data.userId, orgId: data.organisation };
}
