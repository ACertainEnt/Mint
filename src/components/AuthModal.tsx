import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User as UserIcon, Wallet, ArrowRight, Shield, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { api } from '../lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { loginWithEmail, registerWithEmail, loginWithProvider } = useAuth();
  const { connect } = useWallet();

  const [mode, setMode] = useState<'login' | 'register' | 'wallet'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Username live check states
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<{
    available: boolean;
    message?: string;
    code?: string;
  } | null>(null);

  useEffect(() => {
    if (mode !== 'register' || !username || username.trim().length < 3) {
      setUsernameStatus(null);
      setCheckingUsername(false);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const res = await api.checkUsername(username.trim());
        setUsernameStatus({
          available: res.available,
          message: res.message,
          code: res.code
        });
      } catch (err: any) {
        setUsernameStatus({
          available: false,
          message: err.message || 'Error validating username'
        });
      } finally {
        setCheckingUsername(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username, mode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (usernameStatus && !usernameStatus.available) {
        setError(usernameStatus.message || 'Please choose an available username.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password, username, displayName);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleProvider = async (provider: 'google' | 'github' | 'x') => {
    setError(null);
    setLoading(true);
    try {
      await loginWithProvider(provider);
      onClose();
    } catch (err: any) {
      if (err.message && (err.message.includes('closed') || err.message.includes('cancelled'))) {
        // User closed the popup intentionally
      } else {
        setError(err.message || `${provider} authentication failed`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWalletConnect = async (type: 'pera' | 'defly' | 'algosigner' | 'testnet_account') => {
    setLoading(true);
    setError(null);
    try {
      const pubkey = await connect(type);
      if (pubkey) {
        onClose();
      } else {
        setError('Wallet connection cancelled or rejected.');
      }
    } catch (err: any) {
      setError(err.message || 'Wallet error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#11141a] border border-[#212634] rounded-xl p-6 shadow-2xl text-left">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#6b7280] hover:text-white hover:bg-[#1a1f2c] transition-colors"
        >
          <X size={18} />
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-display font-bold text-white">
            {mode === 'wallet' ? 'Connect Algorand Wallet' : mode === 'login' ? 'Sign in to MINT' : 'Create an Account'}
          </h2>
          <p className="text-xs text-[#9ca3af] mt-1">
            {mode === 'wallet'
              ? 'Select your Algorand wallet to trade NFTs and sign transactions'
              : 'Access collections, bidding, bounties, and creator tools'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400 text-xs flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab switch */}
        <div className="flex bg-[#0b0d12] p-1 rounded-lg border border-[#1b202c] mb-5">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
              mode === 'login' ? 'bg-[#ff5500] text-white shadow-sm' : 'text-[#8e97a8] hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
              mode === 'register' ? 'bg-[#ff5500] text-white shadow-sm' : 'text-[#8e97a8] hover:text-white'
            }`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => setMode('wallet')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
              mode === 'wallet' ? 'bg-[#ff5500] text-white shadow-sm' : 'text-[#8e97a8] hover:text-white'
            }`}
          >
            Wallet
          </button>
        </div>

        {mode === 'wallet' ? (
          <div className="space-y-2.5">
            <button
              onClick={() => handleWalletConnect('pera')}
              disabled={loading}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-[#161a22] hover:bg-[#1d222e] border border-[#232938] text-white transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-[#ffe000]/15 flex items-center justify-center text-[#ffe000] font-mono-code font-bold text-sm">
                  🟡
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold">Pera Wallet</div>
                  <div className="text-[11px] text-[#8e97a8]">Official Algorand mobile & web wallet</div>
                </div>
              </div>
              <ArrowRight size={16} className="text-[#6b7280] group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              onClick={() => handleWalletConnect('defly')}
              disabled={loading}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-[#161a22] hover:bg-[#1d222e] border border-[#232938] text-white transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-[#00d2ff]/15 flex items-center justify-center text-[#00d2ff] font-mono-code font-bold text-sm">
                  🪰
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold">Defly Wallet</div>
                  <div className="text-[11px] text-[#8e97a8]">Algorand DeFi & NFT ecosystem wallet</div>
                </div>
              </div>
              <ArrowRight size={16} className="text-[#6b7280] group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              onClick={() => handleWalletConnect('algosigner')}
              disabled={loading}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-[#161a22] hover:bg-[#1d222e] border border-[#232938] text-white transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-[#ff5500]/15 flex items-center justify-center text-[#ff5500] font-mono-code font-bold text-sm">
                  🅰️
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold">AlgoSigner</div>
                  <div className="text-[11px] text-[#8e97a8]">Algorand browser extension</div>
                </div>
              </div>
              <ArrowRight size={16} className="text-[#6b7280] group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              onClick={() => handleWalletConnect('testnet_account')}
              disabled={loading}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-[#ff5500]/10 hover:bg-[#ff5500]/15 border border-[#ff5500]/30 text-white transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-[#ff5500]/20 flex items-center justify-center text-[#ff5500]">
                  <Wallet size={16} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-[#ff8c4d]">Algorand Testnet Account</div>
                  <div className="text-[11px] text-[#ff8c4d]/80">Instant Algorand Testnet address for testing</div>
                </div>
              </div>
              <ArrowRight size={16} className="text-[#ff5500] group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        ) : (
          <div>
            {/* Social / OAuth Providers */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                type="button"
                onClick={() => handleProvider('google')}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-[#161a22] hover:bg-[#1d222e] border border-[#232938] text-xs font-semibold text-white transition-colors"
                title="Sign in with Google"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.8z"/>
                  <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2c0 2.8.7 5.5 1.9 7.8l3.7-2.9z"/>
                  <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.9C3.7 20.6 7.5 23.5 12 23.5z"/>
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleProvider('github')}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-[#161a22] hover:bg-[#1d222e] border border-[#232938] text-xs font-semibold text-white transition-colors"
                title="Sign in with GitHub"
              >
                <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
                <span>GitHub</span>
              </button>

              <button
                type="button"
                onClick={() => handleProvider('x')}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-[#161a22] hover:bg-[#1d222e] border border-[#232938] text-xs font-semibold text-white transition-colors"
                title="Sign in with X / Twitter"
              >
                <span className="font-bold text-sm leading-none shrink-0">𝕏</span>
                <span>X</span>
              </button>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#1e2330]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#11141a] px-2 text-[#6b7280]">or email</span>
              </div>
            </div>

            {/* Email form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                      Display Name
                    </label>
                    <div className="relative">
                      <UserIcon size={14} className="absolute left-3 top-3 text-[#6b7280]" />
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        placeholder="e.g. Satoshi Nakamoto"
                        className="w-full bg-[#161a22] border border-[#232938] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#525a6c] focus:outline-none focus:border-[#ff5500]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-[#8e97a8]">
                        Username (@handle)
                      </label>
                      {checkingUsername && (
                        <span className="text-[10px] font-mono-code text-[#8e97a8] flex items-center gap-1">
                          <RefreshCw size={10} className="animate-spin text-[#ff5500]" />
                          <span>Checking...</span>
                        </span>
                      )}
                      {!checkingUsername && usernameStatus && (
                        <span className={`text-[10px] font-mono-code font-bold flex items-center gap-1 ${
                          usernameStatus.available ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {usernameStatus.available ? (
                            <>
                              <CheckCircle2 size={11} />
                              <span>Available</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle size={11} />
                              <span>{usernameStatus.code === 'RESERVED_USERNAME' ? 'Reserved Official Handle' : usernameStatus.message || 'Unavailable'}</span>
                            </>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-[#6b7280] font-mono-code text-sm">@</span>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                        placeholder="sol_collector"
                        className={`w-full bg-[#161a22] border rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-[#525a6c] focus:outline-none transition-colors ${
                          usernameStatus && !usernameStatus.available
                            ? 'border-red-600/70 focus:border-red-500'
                            : usernameStatus && usernameStatus.available
                            ? 'border-emerald-600/60 focus:border-emerald-500'
                            : 'border-[#232938] focus:border-[#ff5500]'
                        }`}
                      />
                    </div>
                    {usernameStatus && !usernameStatus.available && (
                      <p className="text-[11px] text-red-400/90 mt-1 font-mono-code">
                        {usernameStatus.message}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-3 text-[#6b7280]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full bg-[#161a22] border border-[#232938] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#525a6c] focus:outline-none focus:border-[#ff5500]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-3 text-[#6b7280]" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#161a22] border border-[#232938] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#525a6c] focus:outline-none focus:border-[#ff5500]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-[#ff5500] hover:bg-[#e64d00] text-white font-semibold text-sm transition-colors shadow-md shadow-[#ff5500]/20 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </div>
        )}

        <div className="mt-5 text-center flex items-center justify-center gap-1.5 text-[11px] text-[#6b7280]">
          <Shield size={12} className="text-[#ff5500]" />
          <span>Non-custodial. We never request or store private keys.</span>
        </div>
      </div>
    </div>
  );
};
