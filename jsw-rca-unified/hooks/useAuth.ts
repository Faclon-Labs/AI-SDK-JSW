"use client";

import { useState, useEffect } from 'react';
import {
  AuthData,
  getStoredAuth,
  storeAuth,
  clearAuth,
  getSSOTokenFromURL,
  validateSSOToken,
} from '../lib/auth';

export type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; auth: AuthData }
  | { status: 'unauthenticated'; error?: string };

export function useAuth(): AuthState & { logout: () => void } {
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    async function initAuth() {
      // 1. Check URL for SSO token (?token=xxx) — always re-validate and replace stored auth
      const ssoToken = getSSOTokenFromURL();
      if (ssoToken) {
        try {
          clearAuth(); // Clear old session before validating new token
          const auth = await validateSSOToken(ssoToken);
          storeAuth(auth); // Overwrite any existing session in localStorage
          // Remove token from URL to avoid re-use (SSO tokens are one-time use)
          const url = new URL(window.location.href);
          url.searchParams.delete('token');
          window.history.replaceState({}, '', url.toString());
          setAuthState({ status: 'authenticated', auth });
        } catch (err) {
          setAuthState({
            status: 'unauthenticated',
            error: err instanceof Error ? err.message : 'SSO validation failed',
          });
        }
        return;
      }

      // 2. Fall back to localStorage for existing session (no URL token present)
      const stored = getStoredAuth();
      if (stored) {
        setAuthState({ status: 'authenticated', auth: stored });
        return;
      }

      // 3. No auth found
      setAuthState({ status: 'unauthenticated' });
    }

    initAuth();
  }, []);

  const logout = () => {
    clearAuth();
    setAuthState({ status: 'unauthenticated' });
  };

  return { ...authState, logout };
}
