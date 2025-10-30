// Google OAuth 2.0 Authentication for Drive API

export interface GoogleAuthConfig {
  clientId: string;
  scope: string;
}

export interface AuthResult {
  accessToken: string;
  expiresAt: number;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => any;
          revoke: (token: string, callback: () => void) => void;
        };
      };
    };
  }
}

export class GoogleAuthManager {
  private config: GoogleAuthConfig;
  private tokenClient: any = null;
  private accessToken: string | null = null;
  private expiresAt: number = 0;
  private tokenRequestInProgress: Promise<string> | null = null;

  constructor(config: GoogleAuthConfig) {
    this.config = config;
  }

  /**
   * Initialize OAuth client
   */
  async init(): Promise<void> {
    console.log('[GoogleAuth] Starting initialization...');
    console.log('[GoogleAuth] Waiting for Google Identity Services to load...');

    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 100; // 10 seconds (100 * 100ms)

      const checkGoogleLoaded = setInterval(() => {
        attempts++;

        if (window.google?.accounts?.oauth2) {
          clearInterval(checkGoogleLoaded);
          console.log(`[GoogleAuth] ✅ Google Identity Services loaded after ${attempts * 100}ms`);

          try {
            this.tokenClient = window.google.accounts.oauth2.initTokenClient({
              client_id: this.config.clientId,
              scope: this.config.scope,
              callback: '', // Will be set per request
            });

            console.log('[GoogleAuth] ✅ Token client initialized successfully');
            console.log('[GoogleAuth] Scope:', this.config.scope);
            resolve();
          } catch (error) {
            console.error('[GoogleAuth] ❌ Error initializing token client:', error);
            reject(error);
          }
        } else if (attempts >= maxAttempts) {
          clearInterval(checkGoogleLoaded);
          const error = new Error('Google Identity Services failed to load after 10 seconds');
          console.error('[GoogleAuth] ❌', error.message);
          console.error('[GoogleAuth] window.google:', window.google);
          reject(error);
        }
      }, 100);
    });
  }

  /**
   * Request access token (prompts user login if needed)
   */
  async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.expiresAt) {
      console.log('[GoogleAuth] Using cached access token');
      return this.accessToken;
    }

    // If a token request is already in progress, wait for it
    if (this.tokenRequestInProgress) {
      console.log('[GoogleAuth] Token request already in progress, waiting...');
      return this.tokenRequestInProgress;
    }

    // Request new token
    console.log('[GoogleAuth] Requesting new access token');

    this.tokenRequestInProgress = new Promise((resolve, reject) => {
      if (!this.tokenClient) {
        this.tokenRequestInProgress = null;
        reject(new Error('Token client not initialized'));
        return;
      }

      this.tokenClient.callback = (response: any) => {
        if (response.error) {
          this.tokenRequestInProgress = null;
          reject(new Error(response.error));
          return;
        }

        const token = response.access_token;
        this.accessToken = token;
        this.expiresAt = Date.now() + (response.expires_in * 1000) - 60000; // 1 min buffer

        console.log('[GoogleAuth] Access token obtained, expires in', response.expires_in, 'seconds');

        // Clear the in-progress flag
        this.tokenRequestInProgress = null;

        resolve(token);
      };

      // Request token without forcing consent every time
      // Only shows consent screen on first authorization or when token expires
      this.tokenClient.requestAccessToken({ prompt: '' });
    });

    return this.tokenRequestInProgress;
  }

  /**
   * Revoke access token
   */
  revokeToken(): void {
    if (this.accessToken) {
      window.google?.accounts.oauth2.revoke(this.accessToken, () => {
        console.log('[GoogleAuth] Token revoked');
      });
      this.accessToken = null;
      this.expiresAt = 0;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null && Date.now() < this.expiresAt;
  }
}

// Create default instance
export const googleAuth = new GoogleAuthManager({
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  scope: 'https://www.googleapis.com/auth/drive', // Changed from drive.file to allow access to existing folders
});
