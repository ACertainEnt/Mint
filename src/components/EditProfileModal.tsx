import React, { useState, useRef } from 'react';
import { X, Camera, Image as ImageIcon, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { ImageUploader } from './ImageUploader';

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

  const MAX_BIO_LENGTH = 160;

  if (!isOpen || !user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

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
      }, 1000);
    } catch (err: any) {
      console.error('Update profile error:', err);
      setError(err.message || 'Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in text-left">
      <div className="relative w-full max-w-lg bg-[#0f1218] border border-[#212634] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#1b202c] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">Edit Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#6b7280] hover:text-white hover:bg-[#181d28] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-5 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
              <Check size={15} className="shrink-0" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          {/* Banner Upload */}
          <div>
            <ImageUploader
              id="edit-profile-banner"
              label="Header Banner Image"
              value={bannerUrl}
              onChange={(url) => setBannerUrl(url)}
              aspectRatio="banner"
              maxSizeMB={5}
              recommendation="1200 x 400 recommended PNG or JPG"
              description="Upload a landscape cover banner from your device"
            />
          </div>

          {/* Avatar Upload */}
          <div>
            <ImageUploader
              id="edit-profile-avatar"
              label="Profile Avatar"
              value={avatarUrl}
              onChange={(url) => setAvatarUrl(url)}
              aspectRatio="square"
              maxSizeMB={3}
              recommendation="500 x 500 square avatar"
              description="Upload a high-resolution profile picture from your device"
            />
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
              placeholder="e.g. Satoshi Creator"
              className="w-full bg-[#141822] border border-[#232a3a] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#525a6c] focus:outline-none focus:border-[#ff5500] transition-colors"
              required
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-mono-code text-[#8e97a8] uppercase mb-1.5">
              Username Handle
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-mono-code text-[#6b7280]">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                maxLength={20}
                placeholder="username"
                className="w-full bg-[#141822] border border-[#232a3a] rounded-xl pl-8 pr-3.5 py-2.5 text-xs text-white placeholder-[#525a6c] focus:outline-none focus:border-[#ff5500] font-mono-code transition-colors"
                required
              />
            </div>
          </div>

          {/* Bio with Live Character Counter */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono-code text-[#8e97a8] uppercase">
                Bio
              </label>
              <span className={`text-[11px] font-mono-code ${
                bio.length > MAX_BIO_LENGTH ? 'text-red-400 font-bold' : 'text-[#6b7280]'
              }`}>
                {bio.length} / {MAX_BIO_LENGTH}
              </span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={MAX_BIO_LENGTH}
              rows={3}
              placeholder="Tell the Mint community about your art, collections, or vision..."
              className="w-full bg-[#141822] border border-[#232a3a] rounded-xl p-3 text-xs text-white placeholder-[#525a6c] focus:outline-none focus:border-[#ff5500] resize-none transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1b202c]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#141822] hover:bg-[#1a202d] text-xs text-[#8e97a8] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || bio.length > MAX_BIO_LENGTH}
              className="px-5 py-2 rounded-xl bg-[#ff5500] hover:bg-[#e64d00] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              {saving ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Profile</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
