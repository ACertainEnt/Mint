import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2, Sparkles, User, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=240&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=240&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=240&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1633167606207-d840b5070fc2?w=240&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=240&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=240&auto=format&fit=crop&q=80'
];

export const OnboardingModal: React.FC = () => {
  const { user, completeProfile, showOnboardingModal } = useAuth();

  const [username, setUsername] = useState(user?.username || '');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || DEFAULT_AVATARS[0]);

  const [checking, setChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Debounced username availability check
  useEffect(() => {
    if (!username || username.trim().length < 3) {
      setIsAvailable(null);
      setErrorMsg(null);
      return;
    }

    const timer = setTimeout(async () => {
      setChecking(true);
      setErrorMsg(null);
      try {
        const res = await api.checkUsername(username);
        setIsAvailable(res.available);
        if (!res.available && res.error) {
          setErrorMsg(res.error);
        }
      } catch (err: any) {
        setIsAvailable(false);
        setErrorMsg(err.message || 'Error checking username');
      } finally {
        setChecking(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username]);

  if (!showOnboardingModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || isAvailable === false) return;

    setSubmitting(true);
    try {
      await completeProfile(username.trim(), displayName.trim() || username.trim(), avatar, bio.trim());
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#11141a] border border-[#212634] rounded-2xl p-6 shadow-2xl text-left">
        <div className="flex items-center gap-2 mb-2 text-[#ff5500]">
          <Sparkles size={18} />
          <span className="text-xs font-mono-code font-bold uppercase tracking-wider">
            Identity Setup
          </span>
        </div>

        <h2 className="text-xl font-display font-bold text-white">
          Claim Your Creator & Collector Handle
        </h2>
        <p className="text-xs text-[#9ca3af] mt-1 mb-6">
          Every participant in the MINT Algorand ecosystem has a unique handle. Choose yours to proceed.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar selector */}
          <div>
            <label className="block text-xs font-semibold text-[#8e97a8] mb-2">
              Choose an Avatar
            </label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {DEFAULT_AVATARS.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAvatar(url)}
                  className={`relative shrink-0 w-11 h-11 rounded-full overflow-hidden border-2 transition-all ${
                    avatar === url ? 'border-[#ff5500] scale-105 shadow-md shadow-[#ff5500]/30' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt="Avatar" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Username handle */}
          <div>
            <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
              Unique Handle (@username) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-[#ff5500] font-mono-code font-bold text-sm">@</span>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                placeholder="algo_collector"
                maxLength={20}
                className="w-full bg-[#161a22] border border-[#232938] rounded-lg pl-8 pr-10 py-2.5 text-sm text-white font-mono-code focus:outline-none focus:border-[#ff5500]"
              />
              <div className="absolute right-3 top-2.5">
                {checking && <Loader2 size={18} className="animate-spin text-[#8e97a8]" />}
                {!checking && isAvailable === true && (
                  <CheckCircle2 size={18} className="text-emerald-400" />
                )}
                {!checking && isAvailable === false && (
                  <XCircle size={18} className="text-red-400" />
                )}
              </div>
            </div>
            {errorMsg && (
              <p className="text-[11px] text-red-400 mt-1 font-mono-code">{errorMsg}</p>
            )}
            {!checking && isAvailable === true && (
              <p className="text-[11px] text-emerald-400 mt-1 font-mono-code">
                @{username} is available!
              </p>
            )}
            <p className="text-[11px] text-[#6b7280] mt-1">
              3-20 characters, alphanumeric & underscores only.
            </p>
          </div>

          {/* Display name */}
          <div>
            <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
              Display Name
            </label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-3 text-[#6b7280]" />
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="e.g. Silvio"
                maxLength={40}
                className="w-full bg-[#161a22] border border-[#232938] rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#ff5500]"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
              Short Bio (Optional)
            </label>
            <div className="relative">
              <FileText size={14} className="absolute left-3 top-3 text-[#6b7280]" />
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Digital artisan, Algorand NFT enthusiast..."
                rows={2}
                maxLength={160}
                className="w-full bg-[#161a22] border border-[#232938] rounded-lg pl-9 pr-3 py-2 text-xs text-white resize-none focus:outline-none focus:border-[#ff5500]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || checking || isAvailable === false || username.length < 3}
            className="w-full py-2.5 rounded-lg bg-[#ff5500] hover:bg-[#e64d00] disabled:opacity-40 disabled:hover:bg-[#ff5500] text-white font-semibold text-sm transition-colors shadow-lg shadow-[#ff5500]/25 flex items-center justify-center gap-2 mt-4"
          >
            {submitting ? 'Setting up Profile...' : 'Complete Setup & Enter MINT'}
          </button>
        </form>
      </div>
    </div>
  );
};
