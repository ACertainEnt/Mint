import { User } from '../types';

export const AUTH_TOKEN_KEY = 'mint_auth_token';

export interface AuthSession {
  token: string;
  user: User;
  isNewUser?: boolean;
}

export type OAuthProvider = 'google' | 'github' | 'x';

export class AuthClient {
  private tokenKey = AUTH_TOKEN_KEY;

  /**
   * Retrieves current session token from client storage
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Persists session token in client storage
   */
  setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.tokenKey, token);
  }

  /**
   * Clears session token from client storage
   */
  clearToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.tokenKey);
  }

  /**
   * Common request helper with bearer token attachment and JSON parsing
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers
    });

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error) errorMsg = errorData.error;
      } catch {
        // use default error message
      }
      throw new Error(errorMsg);
    }

    return await response.json();
  }

  /**
   * Initiates real backend OAuth session flow for Google, GitHub, or X.
   * Opens popup directly to OAuth authorization endpoint and communicates
   * back via secure postMessage.
   */
  async startOAuth(provider: OAuthProvider): Promise<AuthSession> {
    if (typeof window === 'undefined') {
      throw new Error('OAuth flow must be initiated in a browser window.');
    }

    const redirectUri = `${window.location.origin}/api/auth/oauth/callback`;

    // 1. Query server for OAuth authorization URL
    const configRes = await this.request<{ url: string; configured: boolean }>(
      `/api/auth/oauth/url?provider=${encodeURIComponent(provider)}&redirect_uri=${encodeURIComponent(redirectUri)}`
    );

    const authUrl = configRes.url;

    return new Promise<AuthSession>((resolve, reject) => {
      // 2. Center popup window on screen
      const width = 500;
      const height = 660;
      const left = Math.max(0, (window.screen.width - width) / 2);
      const top = Math.max(0, (window.screen.height - height) / 2);

      const popup = window.open(
        authUrl,
        `mint_oauth_${provider}`,
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=no,resizable=yes`
      );

      if (!popup) {
        return reject(
          new Error('Popup blocked by browser. Please enable popups for this site to complete authentication.')
        );
      }

      let completed = false;

      // 3. Listen for postMessage from callback or interactive session exchange
      const handleMessage = (event: MessageEvent) => {
        const origin = event.origin;
        const isAllowedOrigin =
          origin === window.location.origin ||
          origin.endsWith('.run.app') ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1');

        if (!isAllowedOrigin) return;

        if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data.token && event.data.user) {
          completed = true;
          cleanup();
          this.setToken(event.data.token);
          resolve({
            token: event.data.token,
            user: event.data.user,
            isNewUser: !!event.data.isNewUser
          });
        } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
          completed = true;
          cleanup();
          reject(new Error(event.data.error || `${provider} authentication failed.`));
        }
      };

      // 4. Poll for user closing the popup window manually
      const checkTimer = setInterval(() => {
        if (popup.closed) {
          cleanup();
          if (!completed) {
            reject(new Error('Authentication window was closed before completing sign-in.'));
          }
        }
      }, 500);

      const cleanup = () => {
        clearInterval(checkTimer);
        window.removeEventListener('message', handleMessage);
      };

      window.addEventListener('message', handleMessage);
    });
  }

  /**
   * Validates active session token with backend and returns current user
   */
  async validateSession(explicitToken?: string): Promise<User> {
    const token = explicitToken || this.getToken();
    if (!token) {
      throw new Error('No active session token');
    }

    const res = await this.request<{ user: User }>('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return res.user;
  }

  /**
   * Validates a batch of device tokens (used for multi-account switching)
   */
  async validateDeviceSessions(tokens: string[]): Promise<{ token: string; user: User }[]> {
    if (!tokens || tokens.length === 0) return [];

    const res = await this.request<{ accounts: { token: string; user: User }[] }>(
      '/api/auth/validate-device-sessions',
      {
        method: 'POST',
        body: JSON.stringify({ tokens })
      }
    );

    return res.accounts || [];
  }

  /**
   * Authenticate with email and password
   */
  async loginWithEmail(email: string, pass: string): Promise<AuthSession> {
    const res = await this.request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass })
    });
    this.setToken(res.token);
    return res;
  }

  /**
   * Register with email, password, and chosen handle
   */
  async registerWithEmail(
    email: string,
    pass: string,
    username?: string,
    displayName?: string
  ): Promise<AuthSession> {
    const res = await this.request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass, username, displayName })
    });
    this.setToken(res.token);
    return res;
  }

  /**
   * Fetch challenge nonce for wallet cryptographic signature
   */
  async getWalletNonce(walletAddress: string): Promise<{ nonce: string; message: string }> {
    return this.request<{ nonce: string; message: string }>('/api/auth/wallet-nonce', {
      method: 'POST',
      body: JSON.stringify({ walletAddress })
    });
  }

  /**
   * Authenticate with wallet address & cryptographic signature
   */
  async loginWithWallet(
    walletAddress: string,
    signature?: string,
    message?: string
  ): Promise<AuthSession> {
    const res = await this.request<{ token: string; user: User; isNewUser: boolean }>(
      '/api/auth/wallet-login',
      {
        method: 'POST',
        body: JSON.stringify({ walletAddress, signature, message })
      }
    );
    this.setToken(res.token);
    return res;
  }

  /**
   * Check real-time username availability against reserved handles and rules
   */
  async checkUsername(username: string): Promise<{
    available: boolean;
    code?: string;
    message?: string;
    username?: string;
    normalized?: string;
  }> {
    return this.request(`/api/users/check-username?username=${encodeURIComponent(username)}`);
  }

  /**
   * Complete user onboarding profile
   */
  async completeProfile(data: {
    username: string;
    displayName?: string;
    avatar?: string;
    bio?: string;
  }): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/complete-profile', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Update profile fields (bio, display name, avatar, username, usernameColor)
   */
  async updateProfile(data: Partial<User>): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * Query backend status for OAuth credentials
   */
  async getOAuthConfig(): Promise<{
    google: boolean;
    github: boolean;
    apple: boolean;
    x: boolean;
  }> {
    return this.request<{
      google: boolean;
      github: boolean;
      apple: boolean;
      x: boolean;
    }>('/api/auth/oauth/config');
  }
}

export const authClient = new AuthClient();
