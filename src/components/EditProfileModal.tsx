import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const USERNAME_COLOR_PALETTE = [
  { label: 'MINT Orange', value: '#ff5500' },
  { label: 'MINT Peach', value: '#ff8c4d' },
  { label: 'Algorand Emerald', value: '#00FFA3' },
  { label: 'Algorand Purple', value: '#DC1FFF' },
  { label: 'Sky Blue', value: '#38bdf8' },
  { label: 'Gold Amber', value: '#fbbf24' },
  { label: 'Default', value: '' }
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();

  const [username, setUsername] = useState(user?.username || '');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar || null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(user?.banner || null);
  const [usernameColor, setUsernameColor] = useState<string>(user?.usernameColor || '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Live username validation
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<{
    available: boolean;
    message?: string;
    code?: string;
  } | null>(null);

  // Privileged & owner account exemptions
  const isPrivilegedUser =
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

  const isAdminExempt = isPrivilegedUser;

  let isCooldownActive = false;
  let cooldownTimeText = '';
  if (!isAdminExempt && user?.lastUsernameChangedAt) {
    const elapsed = Date.now() - new Date(user.lastUsernameChangedAt).getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (elapsed < sevenDaysMs) {
      isCooldownActive = true;
      const remainingMs = sevenDaysMs - elapsed;
      const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
      const hours = Math.ceil((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      cooldownTimeText = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
    }
  }

  useEffect(() => {
    if (isOpen && user) {
      setUsername(user.username || '');
      setDisplayName(user.displayName || '');
      setBio(user.bio || '');
      setAvatarUrl(user.avatar || null);
      setBannerUrl(user.banner || null);
      setUsernameColor(user.usernameColor || '');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (!user) return;
    const cleanUsername = username.trim().toLowerCase();
    const currentUsername = (user.username || '').toLowerCase();

    if (cleanUsername === currentUsername) {
      setUsernameStatus(null);
      setCheckingUsername(false);
      return;
    }

    const minLength = isOwner ? 1 : 3;
    if (cleanUsername.length < minLength) {
      setUsernameStatus({
        available: false,
        message: isOwner ? 'Must be at least 1 character' : 'Must be at least 3 characters'
      });
      setCheckingUsername(false);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const res = await api.checkUsername(cleanUsername);
        setUsernameStatus({
          available: res.available,
          message: res.message,
          code: res.code
        });
      } catch (err: any) {
        setUsernameStatus({
          available: false,
          message: err.message || 'Error checking username'
        });
      } finally {
        setCheckingUsername(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username, user, isOwner]);

  const MAX_BIO_LENGTH = 160;

  if (!isOpen || !user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const isUsernameModified = username.trim().toLowerCase() !== (user.username || '').toLowerCase();

    if (isUsernameModified && isCooldownActive && !isAdminExempt) {
      setError(`Username can only be changed once every 7 days. Remaining cooldown: ${cooldownTimeText}.`);
      return;
    }

    if (usernameStatus && !usernameStatus.available && isUsernameModified) {
      setError(usernameStatus.message || 'Selected username is not available.');
      return;
    }

    if (bio.length > MAX_BIO_LENGTH) {
      setError(`Bio exceeds limit of ${MAX_BIO_LENGTH} characters.`);
      return;
    }

    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        username: username.trim(),
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatar: avatarUrl || user.avatar,
        banner: bannerUrl || undefined,
        usernameColor: usernameColor || undefined
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file must be smaller than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'avatar') {
        setAvatarUrl(reader.result as string);
      } else {
        setBannerUrl(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0e1117] border border-[#1f2430] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1b202c]">
          <h2 className="text-sm font-bold text-white font-mono-code uppercase tracking-wider">
            Edit Profile
          </h2>
          <button
            onClick={onClose}
            className="text-xs font-mono-code text-[#8e97a8] hover:text-white transition-colors cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1 text-left custom-scrollbar">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs font-semibold">
              Profile updated successfully
            </div>
          )}

          {/* Banner Upload */}
          <div>
            <label className="block text-xs font-mono-code text-[#8e97a8] uppercase mb-1.5">
              Banner
            </label>
            <div className="relative w-full h-28 bg-[#141822] border border-[#232a3a] rounded-xl overflow-hidden group">
              {bannerUrl ? (
                <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-[#525a6c]">
                  No banner set
                </div>
              )}
              <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-semibold text-white cursor-pointer transition-opacity">
                Change Banner
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'banner')}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Avatar Upload */}
          <div>
            <label className="block text-xs font-mono-code text-[#8e97a8] uppercase mb-1.5">
              Avatar
            </label>
            <div className="flex items-center gap-4">
              <img
                src={avatarUrl || user.avatar}
                alt={displayName || 'Avatar'}
                className="w-16 h-16 rounded-full object-cover border border-[#232a3a] bg-[#141822]"
              />
              <label className="px-3.5 py-2 rounded-xl bg-[#181d28] hover:bg-[#202738] border border-[#2d3748] text-xs font-semibold text-white cursor-pointer transition-colors">
                Upload New Avatar
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'avatar')}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-mono-code text-[#8e97a8] uppercase mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              placeholder="Display Name"
              className="w-full bg-[#141822] border border-[#232a3a] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#525a6c] focus:outline-none focus:border-[#ff5500] transition-colors"
              required
            />
          </div>

          {/* Username */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
              <label className="text-xs font-mono-code text-[#8e97a8] uppercase">
                Username
              </label>
              {isAdminExempt ? (
                <span className="text-[10px] font-mono-code font-bold text-emerald-400">
                  Privileged Override: Unlimited changes
                </span>
              ) : isCooldownActive ? (
                <span className="text-[10px] font-mono-code text-amber-400 font-bold">
                  Cooldown: {cooldownTimeText} left
                </span>
              ) : (
                <span className="text-[10px] font-mono-code text-[#6b7280]">
                  1 week cooldown on change
                </span>
              )}
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              maxLength={20}
              placeholder="username"
              disabled={isCooldownActive && !isAdminExempt}
              className={`w-full bg-[#141822] border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#525a6c] focus:outline-none font-mono-code transition-colors ${
                isCooldownActive && !isAdminExempt
                  ? 'opacity-60 cursor-not-allowed border-[#232a3a]'
                  : usernameStatus && !usernameStatus.available
                  ? 'border-red-600/70 focus:border-red-500'
                  : usernameStatus && usernameStatus.available
                  ? 'border-emerald-600/60 focus:border-emerald-500'
                  : 'border-[#232a3a] focus:border-[#ff5500]'
              }`}
              required
            />
            {checkingUsername && (
              <p className="text-[10px] text-[#8e97a8] mt-1 font-mono-code">Checking availability...</p>
            )}
            {!checkingUsername && usernameStatus && (
              <p
                className={`text-[10px] mt-1 font-mono-code font-semibold ${
                  usernameStatus.available ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {usernameStatus.available ? 'Username available' : usernameStatus.message || 'Unavailable'}
              </p>
            )}
            {isCooldownActive && !isAdminExempt && (
              <p className="text-[11px] text-amber-400/90 mt-1 font-mono-code">
                Username locked for 7 days after update. Next change available in {cooldownTimeText}.
              </p>
            )}
          </div>

          {/* Username Color Customization (Verified Accounts Only) */}
          {(user.isVerified || isPrivilegedUser) && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono-code text-[#8e97a8] uppercase">
                  Username Accent Color
                </label>
                <span className="text-[10px] font-mono-code text-[#ff5500] font-bold">
                  Verified Perk
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {USERNAME_COLOR_PALETTE.map((c) => {
                  const isSelected = (usernameColor || '') === c.value;
                  return (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => setUsernameColor(c.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono-code transition-all cursor-pointer flex items-center gap-1.5 border ${
                        isSelected
                          ? 'border-white/40 bg-white/10 ring-1 ring-white/30'
                          : 'border-white/5 bg-[#141822] hover:bg-[#1a202d]'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                        style={{ backgroundColor: c.value || '#e2e8f0' }}
                      />
                      <span style={{ color: c.value || '#e2e8f0' }}>{c.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-[#6b7280] font-mono-code mt-1.5">
                Preview: <span style={{ color: usernameColor || '#e2e8f0' }} className="font-bold">@{username || user.username}</span>
              </p>
            </div>
          )}

          {/* Bio */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono-code text-[#8e97a8] uppercase">
                Bio
              </label>
              <span className={`text-[11px] font-mono-code ${bio.length > MAX_BIO_LENGTH ? 'text-red-400 font-bold' : 'text-[#6b7280]'}`}>
                {bio.length} / {MAX_BIO_LENGTH}
              </span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={MAX_BIO_LENGTH}
              rows={3}
              placeholder="Bio"
              className="w-full bg-[#141822] border border-[#232a3a] rounded-xl p-3 text-xs text-white placeholder-[#525a6c] focus:outline-none focus:border-[#ff5500] resize-none transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1b202c]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#141822] hover:bg-[#1a202d] text-xs text-[#8e97a8] hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || bio.length > MAX_BIO_LENGTH}
              className="px-5 py-2 rounded-xl bg-[#ff5500] hover:bg-[#e64d00] disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
