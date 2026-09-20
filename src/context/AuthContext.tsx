import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, StoredAccount } from '../types';
import { api, getStoredToken, setStoredToken, clearStoredToken } from '../lib/api';

const ACCOUNTS_STORAGE_KEY = 'mint_auth_accounts';
const MAX_ACCOUNTS_PER_DEVICE = 3;

interface AuthContextType {
  user: User | null;
  accounts: StoredAccount[];
  loading: boolean;
  isAdmin: boolean;
  isVerified: boolean;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  isAddingAccount: boolean;
  setIsAddingAccount: (isAdding: boolean) => void;
  showOnboardingModal: boolean;
  setShowOnboardingModal: (show: boolean) => void;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, username?: string, displayName?: string) => Promise<void>;
  loginWithProvider: (provider: string, email?: string, displayName?: string, avatar?: string) => Promise<void>;
  loginWithWallet: (walletAddress: string) => Promise<void>;
  completeProfile: (username: string, displayName?: string, avatar?: string, bio?: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
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

  // Sync and validate saved accounts on mount
  useEffect(() => {
    const saved = getSavedAccounts();
    const token = getStoredToken();

    if (saved.length > 0) {
      const tokens = saved.map(a => a.token);
      api.validateDeviceSessions(tokens)
        .then(res => {
          const validated = res.accounts.map(acc => ({
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
            setStoredToken(active.token);
          }

          if (active) {
            setUser(active.user);
          } else {
            clearStoredToken();
            setUser(null);
          }
        })
        .catch(() => {
          if (token) {
            api.getCurrentUser()
              .then(res => setUser(res.user))
              .catch(() => {
                clearStoredToken();
                setUser(null);
              });
          }
        })
        .finally(() => setLoading(false));
    } else if (token) {
      api.getCurrentUser()
        .then(res => {
          setUser(res.user);
          const initialAcc: StoredAccount = {
            token,
            user: res.user,
            lastActive: new Date().toISOString()
          };
          const updated = [initialAcc];
          setAccounts(updated);
          saveAccounts(updated);
        })
        .catch(() => {
          clearStoredToken();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const registerSession = (token: string, newUser: User) => {
    setStoredToken(token);
    setUser(newUser);

    setAccounts(prev => {
      const filtered = prev.filter(a => a.user.id !== newUser.id);
      if (filtered.length >= MAX_ACCOUNTS_PER_DEVICE) {
        // Drop oldest account if limit exceeded
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

  const loginWithEmail = async (email: string, pass: string) => {
    const res = await api.login({ email, password: pass });
    registerSession(res.token, res.user);
  };

  const registerWithEmail = async (email: string, pass: string, username?: string, displayName?: string) => {
    const res = await api.register({ email, password: pass, username, displayName });
    registerSession(res.token, res.user);
  };

  const loginWithProvider = async (provider: string, email?: string, displayName?: string, avatar?: string) => {
    const res = await api.providerLogin({ provider, email, displayName, avatar });
    registerSession(res.token, res.user);
  };

  const loginWithWallet = async (walletAddress: string) => {
    const res = await api.walletLogin(walletAddress);
    registerSession(res.token, res.user);
  };

  const completeProfile = async (username: string, displayName?: string, avatar?: string, bio?: string) => {
    const res = await api.completeProfile({ username, displayName, avatar, bio });
    setUser(res.user);
    setAccounts(prev => {
      const updated = prev.map(a => a.user.id === res.user.id ? { ...a, user: res.user } : a);
      saveAccounts(updated);
      return updated;
    });
    setShowOnboardingModal(false);
  };

  const updateProfile = async (data: Partial<User>) => {
    const res = await api.updateProfile(data);
    setUser(res.user);
    setAccounts(prev => {
      const updated = prev.map(a => a.user.id === res.user.id ? { ...a, user: res.user } : a);
      saveAccounts(updated);
      return updated;
    });
  };

  const switchAccount = async (userId: string) => {
    const target = accounts.find(a => a.user.id === userId);
    if (!target) return;

    setStoredToken(target.token);
    setUser(target.user);

    // Refresh user state from server
    try {
      const fresh = await api.getCurrentUser();
      setUser(fresh.user);
      setAccounts(prev => {
        const updated = prev.map(a => a.user.id === userId ? { ...a, user: fresh.user, lastActive: new Date().toISOString() } : a);
        saveAccounts(updated);
        return updated;
      });
    } catch {
      // Keep target user
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
        setStoredToken(next.token);
        setUser(next.user);
        window.dispatchEvent(new CustomEvent('mint:account-switched', { detail: { user: next.user } }));
      } else {
        clearStoredToken();
        setUser(null);
        window.dispatchEvent(new CustomEvent('mint:account-switched', { detail: { user: null } }));
      }
    }
  };

  const logoutCurrentAccount = () => {
    if (user) {
      removeAccount(user.id);
    } else {
      clearStoredToken();
      setUser(null);
    }
  };

  const logoutAllAccounts = () => {
    setAccounts([]);
    saveAccounts([]);
    clearStoredToken();
    setUser(null);
    window.dispatchEvent(new CustomEvent('mint:account-switched', { detail: { user: null } }));
  };

  const logout = logoutCurrentAccount;

  const isAdmin = user?.role === 'admin';
  const isVerified = !!user?.isVerified;
  const maxAccountsReached = accounts.length >= MAX_ACCOUNTS_PER_DEVICE;

  return (
    <AuthContext.Provider
      value={{
        user,
        accounts,
        loading,
        isAdmin,
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
