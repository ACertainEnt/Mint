import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, StoredAccount } from '../types';
import { authClient, OAuthProvider } from '../lib/authClient';
import { api, getStoredToken, setStoredToken, clearStoredToken } from '../lib/api';
import {
  auth,
  googleProvider,
  githubProvider,
  twitterProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail
} from '../lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';

const ACCOUNTS_STORAGE_KEY = 'mint_auth_accounts';
const MAX_ACCOUNTS_PER_DEVICE = 3;

interface AuthContextType {
  user: User | null;
  accounts: StoredAccount[];
  loading: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isPrivileged: boolean;
  isVerified: boolean;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  isAddingAccount: boolean;
  setIsAddingAccount: (isAdding: boolean) => void;
  showOnboardingModal: boolean;
  setShowOnboardingModal: (show: boolean) => void;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, username?: string, displayName?: string) => Promise<void>;
  loginWithProvider: (provider: OAuthProvider | string, email?: string, displayName?: string, avatar?: string) => Promise<void>;
  loginWithWallet: (walletAddress: string) => Promise<void>;
  completeProfile: (username: string, displayName?: string, avatar?: string, bio?: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  redeemBetaCode: (code: string) => Promise<string>;
  switchAccount: (userId: string) => Promise<void>;
  addAccount: () => void;
  removeAccount: (userId: string) => void;
  logoutCurrentAccount: () => void;
  logoutAllAccounts: () => void;
  logout: () => void;
  maxAccountsReached: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getSavedAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveAccounts(accounts: StoredAccount[]) {
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.error('Failed to save accounts to storage:', err);
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<StoredAccount[]>(getSavedAccounts);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [isAddingAccount, setIsAddingAccount] = useState<boolean>(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(false);

  const registerSession = (token: string, newUser: User) => {
    authClient.setToken(token);
    setStoredToken(token);
    setUser(newUser);

    setAccounts(prev => {
      const filtered = prev.filter(a => a.user.id !== newUser.id);
      if (filtered.length >= MAX_ACCOUNTS_PER_DEVICE) {
        filtered.pop();
      }
      const updated: StoredAccount[] = [
        { token, user: newUser, lastActive: new Date().toISOString() },
        ...filtered
      ];
      saveAccounts(updated);
      return updated;
    });

    setShowAuthModal(false);
    setIsAddingAccount(false);
    setShowOnboardingModal(false);
    window.dispatchEvent(new CustomEvent('mint:account-switched', { detail: { user: newUser } }));
  };

  // Sync and validate saved accounts with real backend sessions on mount
  useEffect(() => {
    const saved = getSavedAccounts();
    const token = authClient.getToken() || getStoredToken();

    if (saved.length > 0) {
      const tokens = saved.map(a => a.token);
      authClient.validateDeviceSessions(tokens)
        .then(validatedList => {
          const validated = validatedList.map(acc => ({
            token: acc.token,
            user: acc.user,
            lastActive: new Date().toISOString()
          }));
          setAccounts(validated);
          saveAccounts(validated);

          // Find current active user
          let active = validated.find(a => a.token === token);
          if (!active && validated.length > 0) {
            active = validated[0];
            authClient.setToken(active.token);
            setStoredToken(active.token);
          }

          if (active) {
            setUser(active.user);
          } else {
            authClient.clearToken();
            clearStoredToken();
            setUser(null);
          }
        })
        .catch(() => {
          if (token) {
            authClient.validateSession(token)
              .then(validUser => setUser(validUser))
              .catch(() => {
                authClient.clearToken();
                clearStoredToken();
                setUser(null);
              });
          }
        })
        .finally(() => setLoading(false));
    } else if (token) {
      authClient.validateSession(token)
        .then(validUser => {
          setUser(validUser);
          const initialAcc: StoredAccount = {
            token,
            user: validUser,
            lastActive: new Date().toISOString()
          };
          const updated = [initialAcc];
          setAccounts(updated);
          saveAccounts(updated);
        })
        .catch(() => {
          authClient.clearToken();
          clearStoredToken();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Listen for OAuth postMessage events from backend authorization windows
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      const isAllowedOrigin =
        origin === window.location.origin ||
        origin.endsWith('.run.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1');

      if (!isAllowedOrigin) return;

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data.token && event.data.user) {
        registerSession(event.data.token, event.data.user);
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const session = await exchangeFirebaseSession(cred.user, 'email');
      registerSession(session.token, session.user);
    } catch (firebaseErr: any) {
      const code = firebaseErr?.code;
      // If wrong password or invalid credential in Firebase, also verify with backend database
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        try {
          const res = await authClient.loginWithEmail(email, pass);
          registerSession(res.token, res.user);
          return;
        } catch {
          throw new Error('Invalid email or password.');
        }
      }
      // If user not found in Firebase or provider not toggled, check local database
      if (code === 'auth/user-not-found' || code === 'auth/operation-not-allowed') {
        try {
          const res = await authClient.loginWithEmail(email, pass);
          registerSession(res.token, res.user);
          return;
        } catch (backendErr: any) {
          throw backendErr;
        }
      }
      // Fallback to local auth client
      try {
        const res = await authClient.loginWithEmail(email, pass);
        registerSession(res.token, res.user);
      } catch {
        throw formatFirebaseError(firebaseErr, 'email');
      }
    }
  };

  const registerWithEmail = async (email: string, pass: string, username?: string, displayName?: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      // Attempt to send email verification if configured
      try {
        await sendEmailVerification(cred.user);
      } catch (verifyErr) {
        console.warn('[Firebase Auth] Verification email could not be sent immediately:', verifyErr);
      }
      const session = await exchangeFirebaseSession(cred.user, 'email', { username, displayName });
      registerSession(session.token, session.user);
    } catch (firebaseErr: any) {
      const code = firebaseErr?.code;
      if (code === 'auth/email-already-in-use') {
        throw new Error('An account with this email address already exists. Please sign in instead.');
      }
      if (code === 'auth/weak-password') {
        throw new Error('Password should be at least 6 characters.');
      }
      if (code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      }
      // If Firebase Auth operation-not-allowed or network/config, fall back to backend registration
      try {
        const res = await authClient.registerWithEmail(email, pass, username, displayName);
        registerSession(res.token, res.user);
      } catch (backendErr: any) {
        throw backendErr;
      }
    }
  };

  const getFirebaseProvider = (prov: string) => {
    const normalized = prov.toLowerCase() === 'twitter' ? 'x' : prov.toLowerCase();
    switch (normalized) {
      case 'google':
        return googleProvider;
      case 'github':
        return githubProvider;
      case 'x':
        return twitterProvider;
      case 'apple':
        throw new Error('Apple Sign-In is disabled and not configured.');
      default:
        throw new Error(`Unsupported provider: ${prov}`);
    }
  };

  const formatFirebaseError = (error: any, provider: string): Error => {
    const code = error?.code || '';
    const provTitle = provider === 'x' ? 'X (Twitter)' : provider.charAt(0).toUpperCase() + provider.slice(1);

    if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation') {
      return new Error(
        `${provTitle} sign-in is not yet enabled in the Firebase Console. Please sign in with Email & Password or an enabled provider.`
      );
    }
    if (code === 'auth/configuration-not-found') {
      return new Error(
        `${provTitle} sign-in configuration was not found in Firebase. Please configure it in the Firebase Console.`
      );
    }
    if (code === 'auth/unauthorized-domain') {
      return new Error(
        `This domain (${typeof window !== 'undefined' ? window.location.hostname : 'current'}) is not authorized in Firebase. Add it under Firebase Console > Authentication > Settings > Authorized domains.`
      );
    }
    if (code === 'auth/popup-closed-by-user') {
      return new Error('Sign-in cancelled. Window was closed.');
    }
    if (code === 'auth/popup-blocked') {
      return new Error('Popup was blocked by the browser. Please allow popups or use redirect sign-in.');
    }
    if (code === 'auth/account-exists-with-different-credential') {
      return new Error('An account already exists with this email using a different sign-in method. Please sign in using your existing provider.');
    }
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
      return new Error('Invalid email or password.');
    }
    if (error?.message) {
      return new Error(error.message);
    }
    return new Error(`${provTitle} authentication failed`);
  };

  const exchangeFirebaseSession = async (
    firebaseUser: FirebaseUser,
    providerName: string,
    metadata?: { username?: string; displayName?: string }
  ): Promise<{ token: string; user: User; isNewUser?: boolean }> => {
    const idToken = await firebaseUser.getIdToken();
    const response = await fetch('/api/auth/firebase-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: metadata?.displayName || firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        provider: providerName,
        idToken,
        emailVerified: firebaseUser.emailVerified,
        username: metadata?.username
      })
    });

    if (!response.ok) {
      let errorMsg = `Authentication error (${response.status})`;
      try {
        const errorJson = await response.json();
        if (errorJson.error) errorMsg = errorJson.error;
      } catch {}
      throw new Error(errorMsg);
    }

    return await response.json();
  };

  // Check for redirect result from mobile or fallback OAuth flow
  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user) {
          const pending = sessionStorage.getItem('mint_pending_provider') || 'google';
          sessionStorage.removeItem('mint_pending_provider');
          const session = await exchangeFirebaseSession(result.user, pending);
          registerSession(session.token, session.user);
        }
      })
      .catch((err) => {
        console.warn('[Firebase Auth] Redirect result handling:', err);
      });
  }, []);

  // Real Firebase Authentication session flow for Google, GitHub, and X/Twitter
  const loginWithProvider = async (
    provider: OAuthProvider | string,
    email?: string,
    displayName?: string,
    avatar?: string
  ) => {
    const normalized = provider.toLowerCase() === 'twitter' ? 'x' : provider.toLowerCase();

    if (normalized === 'apple') {
      throw new Error('Apple Sign-In is not configured.');
    }

    // Direct provider payload authentication if explicit parameters provided without OAuth flow
    if (email && !['google', 'github', 'x'].includes(normalized)) {
      const res = await api.providerLogin({
        provider: normalized,
        email,
        displayName,
        avatar
      });
      registerSession(res.token, res.user);
      return;
    }

    const providerInstance = getFirebaseProvider(normalized);
    const isMobile = typeof navigator !== 'undefined' &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      // Mobile web authentication: prefer redirect-based flow
      sessionStorage.setItem('mint_pending_provider', normalized);
      await signInWithRedirect(auth, providerInstance);
      return;
    }

    try {
      const cred = await signInWithPopup(auth, providerInstance);
      const session = await exchangeFirebaseSession(cred.user, normalized);
      registerSession(session.token, session.user);
    } catch (err: any) {
      if (err?.code === 'auth/popup-blocked') {
        sessionStorage.setItem('mint_pending_provider', normalized);
        await signInWithRedirect(auth, providerInstance);
        return;
      }
      throw formatFirebaseError(err, normalized);
    }
  };

  const loginWithWallet = async (walletAddress: string) => {
    const res = await authClient.loginWithWallet(walletAddress);
    registerSession(res.token, res.user);
  };

  const completeProfile = async (username: string, displayName?: string, avatar?: string, bio?: string) => {
    const res = await authClient.completeProfile({ username, displayName, avatar, bio });
    setUser(res.user);
    setAccounts(prev => {
      const updated = prev.map(a => (a.user.id === res.user.id ? { ...a, user: res.user } : a));
      saveAccounts(updated);
      return updated;
    });
    setShowOnboardingModal(false);
  };

  const updateProfile = async (data: Partial<User>) => {
    const res = await authClient.updateProfile(data);
    setUser(res.user);
    setAccounts(prev => {
      const updated = prev.map(a => (a.user.id === res.user.id ? { ...a, user: res.user } : a));
      saveAccounts(updated);
      return updated;
    });
  };

  const redeemBetaCode = async (code: string): Promise<string> => {
    const res = await api.redeemBetaCode(code);
    if (res.user) {
      setUser(res.user);
      setAccounts(prev => {
        const updated = prev.map(a => (a.user.id === res.user.id ? { ...a, user: res.user } : a));
        saveAccounts(updated);
        return updated;
      });
    }
    return res.message;
  };

  const switchAccount = async (userId: string) => {
    const target = accounts.find(a => a.user.id === userId);
    if (!target) return;

    authClient.setToken(target.token);
    setStoredToken(target.token);
    setUser(target.user);

    // Refresh user state from backend session
    try {
      const freshUser = await authClient.validateSession(target.token);
      setUser(freshUser);
      setAccounts(prev => {
        const updated = prev.map(a =>
          a.user.id === userId
            ? { ...a, user: freshUser, lastActive: new Date().toISOString() }
            : a
        );
        saveAccounts(updated);
        return updated;
      });
    } catch {
      // Keep target user on network blip
    }

    window.dispatchEvent(new CustomEvent('mint:account-switched', { detail: { user: target.user } }));
  };

  const addAccount = () => {
    setIsAddingAccount(true);
    setShowAuthModal(true);
  };

  const removeAccount = (userId: string) => {
    const updated = accounts.filter(a => a.user.id !== userId);
    setAccounts(updated);
    saveAccounts(updated);

    if (user?.id === userId) {
      if (updated.length > 0) {
        const next = updated[0];
        authClient.setToken(next.token);
        setStoredToken(next.token);
        setUser(next.user);
        window.dispatchEvent(new CustomEvent('mint:account-switched', { detail: { user: next.user } }));
      } else {
        authClient.clearToken();
        clearStoredToken();
        setUser(null);
        signOut(auth).catch(() => {});
        window.dispatchEvent(new CustomEvent('mint:account-switched', { detail: { user: null } }));
      }
    }
  };

  const logoutCurrentAccount = () => {
    signOut(auth).catch(() => {});
    if (user) {
      removeAccount(user.id);
    } else {
      authClient.clearToken();
      clearStoredToken();
      setUser(null);
    }
  };

  const logoutAllAccounts = () => {
    signOut(auth).catch(() => {});
    setAccounts([]);
    saveAccounts([]);
    authClient.clearToken();
    clearStoredToken();
    setUser(null);
    window.dispatchEvent(new CustomEvent('mint:account-switched', { detail: { user: null } }));
  };

  const logout = logoutCurrentAccount;

  const isPrivileged =
    user?.isPrivileged === true ||
    user?.privilegedType === 'platform_owner' ||
    user?.privilegedType === 'trusted_mint_account' ||
    user?.privilegedType === 'privileged_account' ||
    user?.role === 'owner' ||
    user?.role === 'platform_owner' ||
    user?.role === 'trusted_mint_account' ||
    user?.role === 'privileged_account';

  const isOwner =
    user?.role === 'owner' ||
    user?.role === 'platform_owner' ||
    user?.privilegedType === 'platform_owner';

  const isAdmin = user?.role === 'admin' || isOwner;
  const isVerified = !!user?.isVerified;
  const maxAccountsReached = accounts.length >= MAX_ACCOUNTS_PER_DEVICE;

  return (
    <AuthContext.Provider
      value={{
        user,
        accounts,
        loading,
        isAdmin,
        isOwner,
        isPrivileged,
        isVerified,
        showAuthModal,
        setShowAuthModal,
        isAddingAccount,
        setIsAddingAccount,
        showOnboardingModal,
        setShowOnboardingModal,
        loginWithEmail,
        registerWithEmail,
        loginWithProvider,
        loginWithWallet,
        completeProfile,
        updateProfile,
        redeemBetaCode,
        switchAccount,
        addAccount,
        removeAccount,
        logoutCurrentAccount,
        logoutAllAccounts,
        logout,
        maxAccountsReached
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
