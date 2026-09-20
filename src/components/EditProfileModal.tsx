import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();

  const [username, setUsername] = useState(user?.username || '');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar || null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(user?.banner || null);

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

  // Cooldown calculation
  const isAdminExempt =
    user?.email?.toLowerCase() === 'pervercy23@gmail.com' ||
    user?.id === 'usr_ace_admin' ||
    user?.role === 'owner';

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

    if (cleanUsername.length < 3) {
      setUsernameStatus({
        available: false,
        message: 'Must be at least 3 characters'
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
  }, [username, user]);

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
        banner: bannerUrl || undefined
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Update profile error:', err);
      setError(err.message || 'Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const res = await api.uploadImage({
          dataUrl,
          filename: file.name,
          mimeType: file.type
        });
        if (type === 'avatar') {
          setAvatarUrl(res.url);
        } else {
          setBannerUrl(res.url);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to upload image');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in text-left">
      <div className="relative w-full max-w-lg bg-[#0d0f14] border border-[#212634] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1b202c] flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Edit Profile</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[#8e97a8] hover:text-white px-2 py-1 rounded transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1 text-left">
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
                  Admin Override: Unlimited changes
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
