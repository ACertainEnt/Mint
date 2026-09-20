import React, { useState } from 'react';
import {
  X,
  Settings,
  Shield,
  Layers,
  Palette,
  Clock,
  Trash2,
  Check,
  AlertCircle,
  Link as LinkIcon,
  Sparkles,
  Loader2,
  Lock,
  Globe,
  Plus,
  Radio
} from 'lucide-react';
import {
  Community,
  CommunityRole,
  CommunitySpace,
  CommunityMember,
  RoleAnimation
} from '../types';
import { CommunityRoleManager } from './CommunityRoleManager';
import { CommunitySpacesManager } from './CommunitySpacesManager';
import { ANIMATION_OPTIONS } from './CommunityRoleBadge';

interface CommunitySettingsModalProps {
  community: Community;
  members: CommunityMember[];
  isEligibleForAnimations?: boolean;
  onClose: () => void;
  onUpdateCommunity: (updatedData: Partial<Community>) => Promise<void>;
  onDeleteCommunity: (communityId: string) => Promise<void>;
  onSaveRole: (role: Partial<CommunityRole>) => Promise<void>;
  onDeleteRole: (roleId: string) => Promise<void>;
  onAssignRole: (userId: string, roleId: string, assigned: boolean) => Promise<void>;
  onSaveSpace: (space: Partial<CommunitySpace>) => Promise<void>;
  onDeleteSpace: (spaceId: string) => Promise<void>;
}

export const CommunitySettingsModal: React.FC<CommunitySettingsModalProps> = ({
  community,
  members,
  isEligibleForAnimations = true,
  onClose,
  onUpdateCommunity,
  onDeleteCommunity,
  onSaveRole,
  onDeleteRole,
  onAssignRole,
  onSaveSpace,
  onDeleteSpace
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'permissions' | 'roles' | 'spaces' | 'danger'>('general');

  // Form states for general
  const [name, setName] = useState(community.name || '');
  const [handle, setHandle] = useState(community.handle?.replace(/^@+/, '') || community.slug || '');
  const [description, setDescription] = useState(community.description || '');
  const [avatar, setAvatar] = useState(community.avatar || '');
  const [banner, setBanner] = useState(community.banner || '');
  const [category, setCategory] = useState(community.category || 'General');
  const [aboutAnimation, setAboutAnimation] = useState<RoleAnimation>(community.aboutAnimation || 'none');
  const [rules, setRules] = useState<string[]>(community.rules || ['Be respectful to fellow members', 'No spam or unauthorized promotional links', 'Keep conversations constructive']);
  const [newRuleInput, setNewRuleInput] = useState('');

  // Social & Custom links
  const [twitter, setTwitter] = useState(community.socialLinks?.twitter || '');
  const [discord, setDiscord] = useState(community.socialLinks?.discord || '');
  const [telegram, setTelegram] = useState(community.socialLinks?.telegram || '');
  const [website, setWebsite] = useState(community.socialLinks?.website || '');

  // Permissions & Cooldowns
  const [postPermissionMode, setPostPermissionMode] = useState(community.postPermissionMode || 'everyone');
  const [postCooldownSeconds, setPostCooldownSeconds] = useState(community.postCooldownSeconds ?? 0);
  const [joiningMode, setJoiningMode] = useState(community.joiningMode || 'open');

  // Danger zone
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingCommunity, setIsDeletingCommunity] = useState(false);

  // Status states
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddRule = () => {
    if (!newRuleInput.trim()) return;
    setRules([...rules, newRuleInput.trim()]);
    setNewRuleInput('');
  };

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleSaveGeneralOrPermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      const cleanHandle = handle.trim().replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9_]+/g, '');
      await onUpdateCommunity({
        name: name.trim(),
        handle: cleanHandle ? `@${cleanHandle}` : community.handle,
        description: description.trim(),
        avatar: avatar.trim(),
        banner: banner.trim() || undefined,
        category,
        aboutAnimation,
        rules,
        postPermissionMode,
        postCooldownSeconds,
        joiningMode,
        socialLinks: {
          twitter: twitter.trim() || undefined,
          discord: discord.trim() || undefined,
          telegram: telegram.trim() || undefined,
          website: website.trim() || undefined,
        }
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update community settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCommunityExec = async () => {
    if (deleteConfirmText.trim() !== community.name) {
      setError(`Please type "${community.name}" exactly to confirm.`);
      return;
    }
    setIsDeletingCommunity(true);
    setError(null);

    try {
      await onDeleteCommunity(community.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete community');
      setIsDeletingCommunity(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in text-left">
      <div className="bg-[#11141b] border border-[#212634] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#212634] shrink-0 bg-[#0d1017]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#ff5500]/15 text-[#ff5500] border border-[#ff5500]/30 flex items-center justify-center">
              <Settings size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Manage Community</span>
                <span className="text-xs font-mono-code text-[#ff5500]">
                  {community.handle || `@${community.slug}`}
                </span>
              </h3>
              <p className="text-[10px] text-[#8e97a8] font-mono-code">Owner Controls & MINT Settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#6b7280] hover:text-white hover:bg-[#1f2535] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-2 bg-[#0d1017] border-b border-[#212634] overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => { setActiveTab('general'); setError(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'general'
                ? 'bg-[#ff5500] text-white shadow-lg shadow-[#ff5500]/20'
                : 'text-[#8e97a8] hover:text-white hover:bg-[#161a24]'
            }`}
          >
            General & About
          </button>

          <button
            onClick={() => { setActiveTab('permissions'); setError(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'permissions'
                ? 'bg-[#ff5500] text-white shadow-lg shadow-[#ff5500]/20'
                : 'text-[#8e97a8] hover:text-white hover:bg-[#161a24]'
            }`}
          >
            <Clock size={12} />
            <span>Permissions & Cooldowns</span>
          </button>

          <button
            onClick={() => { setActiveTab('roles'); setError(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'roles'
                ? 'bg-[#ff5500] text-white shadow-lg shadow-[#ff5500]/20'
                : 'text-[#8e97a8] hover:text-white hover:bg-[#161a24]'
            }`}
          >
            <Palette size={12} />
            <span>Roles & Badges ({community.roles?.length || 0})</span>
          </button>

          <button
            onClick={() => { setActiveTab('spaces'); setError(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'spaces'
                ? 'bg-[#ff5500] text-white shadow-lg shadow-[#ff5500]/20'
                : 'text-[#8e97a8] hover:text-white hover:bg-[#161a24]'
            }`}
          >
            <Layers size={12} />
            <span>Spaces ({community.spaces?.length || 1})</span>
          </button>

          <button
            onClick={() => { setActiveTab('danger'); setError(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ml-auto ${
              activeTab === 'danger'
                ? 'bg-red-500 text-white'
                : 'text-red-400 hover:text-red-300 hover:bg-red-950/30'
            }`}
          >
            Danger Zone
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {activeTab === 'general' && (
            <form onSubmit={handleSaveGeneralOrPermissions} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Community Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#141822] border border-[#232938] rounded-lg text-xs text-white focus:outline-none focus:border-[#ff5500]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white block mb-1">
                    Community Handle * <span className="text-[10px] font-mono-code text-[#ff5500]">(@unique)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-xs text-[#8e97a8] font-mono-code">@</span>
                    <input
                      type="text"
                      required
                      value={handle}
                      onChange={e => setHandle(e.target.value.replace(/^@+/, ''))}
                      className="w-full pl-6 pr-3 py-1.5 bg-[#141822] border border-[#232938] rounded-lg text-xs text-white font-mono-code focus:outline-none focus:border-[#ff5500]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-white block mb-1">About / Lore / Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Tell the story of your community..."
                  className="w-full px-3 py-2 bg-[#141822] border border-[#232938] rounded-lg text-xs text-white focus:outline-none focus:border-[#ff5500]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Avatar / Icon URL</label>
                  <input
                    type="url"
                    value={avatar}
                    onChange={e => setAvatar(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#141822] border border-[#232938] rounded-lg text-xs text-white focus:outline-none focus:border-[#ff5500]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white block mb-1">Banner Cover Image URL</label>
                  <input
                    type="url"
                    value={banner}
                    onChange={e => setBanner(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-1.5 bg-[#141822] border border-[#232938] rounded-lg text-xs text-white focus:outline-none focus:border-[#ff5500]"
                  />
                </div>
              </div>

              {/* Social Links */}
              <div>
                <label className="text-xs font-bold text-white block mb-2 flex items-center gap-1.5">
                  <LinkIcon size={13} className="text-[#ff5500]" />
                  <span>External Community Links</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                    placeholder="Website (e.g. https://mint.xyz)"
                    className="px-3 py-1.5 bg-[#141822] border border-[#232938] rounded-lg text-xs text-white focus:outline-none focus:border-[#ff5500]"
                  />
                  <input
                    type="text"
                    value={twitter}
                    onChange={e => setTwitter(e.target.value)}
                    placeholder="X / Twitter (e.g. @MINT_xyz)"
                    className="px-3 py-1.5 bg-[#141822] border border-[#232938] rounded-lg text-xs text-white focus:outline-none focus:border-[#ff5500]"
                  />
                  <input
                    type="text"
                    value={discord}
                    onChange={e => setDiscord(e.target.value)}
                    placeholder="Discord Invite Link"
                    className="px-3 py-1.5 bg-[#141822] border border-[#232938] rounded-lg text-xs text-white focus:outline-none focus:border-[#ff5500]"
                  />
                  <input
                    type="text"
                    value={telegram}
                    onChange={e => setTelegram(e.target.value)}
                    placeholder="Telegram Group Link"
                    className="px-3 py-1.5 bg-[#141822] border border-[#232938] rounded-lg text-xs text-white focus:outline-none focus:border-[#ff5500]"
                  />
                </div>
              </div>

              {/* Community Rules Builder */}
              <div>
                <label className="text-xs font-bold text-white block mb-2">
                  Community Rules ({rules.length})
                </label>
                <div className="space-y-1.5 mb-2">
                  {rules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-[#141822] border border-[#232938] text-xs text-[#c3c8d4]"
                    >
                      <span className="truncate">
                        <span className="font-mono-code text-[#ff5500] mr-1.5">{idx + 1}.</span>
                        {rule}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRule(idx)}
                        className="text-[#6b7280] hover:text-red-400 p-0.5"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRuleInput}
                    onChange={e => setNewRuleInput(e.target.value)}
                    placeholder="Add a community guideline or rule..."
                    className="flex-1 px-3 py-1.5 bg-[#141822] border border-[#232938] rounded-lg text-xs text-white focus:outline-none focus:border-[#ff5500]"
                  />
                  <button
                    type="button"
                    onClick={handleAddRule}
                    disabled={!newRuleInput.trim()}
                    className="px-3 py-1.5 bg-[#1d2331] hover:bg-[#ff5500] disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Add Rule
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-3 border-t border-[#212634]">
                {savedSuccess && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono-code">
                    <Check size={13} /> Settings saved successfully!
                  </span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#ff5500] hover:bg-[#e64d00] text-white flex items-center gap-1.5 transition-colors shadow-lg shadow-[#ff5500]/20"
                  >
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'permissions' && (
            <form onSubmit={handleSaveGeneralOrPermissions} className="space-y-4">
              {/* Post Permission Mode */}
              <div>
                <label className="text-xs font-bold text-white block mb-1.5">
                  Who Can Post in this Community?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'everyone', label: 'Everyone', desc: 'Any member can post' },
                    { id: 'approved', label: 'Approved Roles Only', desc: 'Members with posting roles' },
                    { id: 'leaders_only', label: 'Leaders Only', desc: 'Only Owner & Mods can post' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPostPermissionMode(opt.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        postPermissionMode === opt.id
                          ? 'border-[#ff5500] bg-[#ff5500]/10 text-white'
                          : 'border-[#232938] bg-[#141822] text-[#8e97a8] hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold mb-0.5">{opt.label}</div>
                      <div className="text-[10px] text-[#6b7280]">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cooldown Settings */}
              <div>
                <label className="text-xs font-bold text-white block mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} className="text-[#ff5500]" />
                    <span>Community Post Cooldown (Slow Mode)</span>
                  </span>
                  <span className="text-[10px] font-mono-code text-[#ff5500]">
                    {postCooldownSeconds === 0 ? 'Disabled (0s)' : `${postCooldownSeconds} seconds`}
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { sec: 0, label: 'Off (0s)' },
                    { sec: 15, label: '15 seconds' },
                    { sec: 30, label: '30 seconds' },
                    { sec: 60, label: '1 minute' },
                    { sec: 120, label: '2 minutes' },
                    { sec: 300, label: '5 minutes' },
                    { sec: 600, label: '10 minutes' },
                  ].map(c => (
                    <button
                      key={c.sec}
                      type="button"
                      onClick={() => setPostCooldownSeconds(c.sec)}
                      className={`py-2 px-2.5 rounded-lg border text-xs font-mono-code transition-all ${
                        postCooldownSeconds === c.sec
                          ? 'border-[#ff5500] bg-[#ff5500]/15 text-[#ff5500] font-bold'
                          : 'border-[#232938] bg-[#141822] text-[#8e97a8] hover:text-white'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[#6b7280] mt-1.5">
                  When enabled, normal members must wait this duration between consecutive posts. Community leaders & verified creators are exempt.
                </p>
              </div>

              {/* Joining Mode */}
              <div>
                <label className="text-xs font-bold text-white block mb-1.5">Community Joining Mode</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'open', label: 'Open', desc: 'Instant join for all users' },
                    { id: 'approval', label: 'Approval Required', desc: 'Requires owner review' },
                    { id: 'invite', label: 'Invite Only', desc: 'Only via direct invite' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setJoiningMode(m.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        joiningMode === m.id
                          ? 'border-[#ff5500] bg-[#ff5500]/10 text-white'
                          : 'border-[#232938] bg-[#141822] text-[#8e97a8] hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold mb-0.5">{m.label}</div>
                      <div className="text-[10px] text-[#6b7280]">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-3 border-t border-[#212634]">
                {savedSuccess && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono-code">
                    <Check size={13} /> Settings saved!
                  </span>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="ml-auto px-4 py-1.5 rounded-lg text-xs font-bold bg-[#ff5500] hover:bg-[#e64d00] text-white flex items-center gap-1.5 transition-colors shadow-lg shadow-[#ff5500]/20"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Save Permissions</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'roles' && (
            <CommunityRoleManager
              communityId={community.id}
              communityName={community.name}
              roles={community.roles || []}
              members={members}
              isEligibleForAnimations={isEligibleForAnimations}
              onSaveRole={onSaveRole}
              onDeleteRole={onDeleteRole}
              onAssignRole={onAssignRole}
            />
          )}

          {activeTab === 'spaces' && (
            <CommunitySpacesManager
              communityId={community.id}
              spaces={community.spaces || []}
              onSaveSpace={onSaveSpace}
              onDeleteSpace={onDeleteSpace}
            />
          )}

          {activeTab === 'danger' && (
            <div className="space-y-4 p-4 bg-red-950/20 border border-red-500/30 rounded-xl">
              <div className="flex items-center gap-2 text-red-400">
                <Trash2 size={16} />
                <h4 className="text-xs font-bold">Delete Community (Permanent)</h4>
              </div>
              <p className="text-xs text-[#c3c8d4] leading-relaxed">
                Deleting this community will permanently remove all associated spaces, roles, feed posts, and member affiliations. This action cannot be reversed.
              </p>

              <div>
                <label className="text-xs font-mono-code text-red-300 block mb-1">
                  Please type <span className="font-bold text-white">"{community.name}"</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder={community.name}
                  className="w-full px-3 py-1.5 bg-[#0d1017] border border-red-500/40 rounded-lg text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleDeleteCommunityExec}
                  disabled={deleteConfirmText.trim() !== community.name || isDeletingCommunity}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-30 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  {isDeletingCommunity ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  <span>Permanently Delete Community</span>
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
