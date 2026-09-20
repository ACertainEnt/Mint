import React, { useState } from 'react';
import {
  Shield,
  Plus,
  Trash2,
  Edit2,
  Check,
  Sparkles,
  AlertCircle,
  Crown,
  Award,
  Layers,
  Palette,
  Type,
  Lock,
  Loader2,
  Upload,
  Eye
} from 'lucide-react';
import {
  CommunityRole,
  RoleFontStyle,
  RoleAnimation,
  RolePermissions,
  CommunityMember
} from '../types';
import {
  ROLE_PRESETS,
  FONT_STYLE_OPTIONS,
  COLOR_OPTIONS,
  ANIMATION_OPTIONS,
  CommunityRoleBadge
} from './CommunityRoleBadge';

interface CommunityRoleManagerProps {
  communityId: string;
  communityName: string;
  roles: CommunityRole[];
  members: CommunityMember[];
  isEligibleForAnimations?: boolean;
  onSaveRole: (role: Partial<CommunityRole>) => Promise<void>;
  onDeleteRole: (roleId: string) => Promise<void>;
  onAssignRole: (userId: string, roleId: string, assigned: boolean) => Promise<void>;
}

export const CommunityRoleManager: React.FC<CommunityRoleManagerProps> = ({
  communityId,
  communityName,
  roles,
  members,
  isEligibleForAnimations = true,
  onSaveRole,
  onDeleteRole,
  onAssignRole
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  // Role Form State
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [roleColor, setRoleColor] = useState('#ff5500');
  const [roleFont, setRoleFont] = useState<RoleFontStyle>('default');
  const [roleIcon, setRoleIcon] = useState('award');
  const [roleBadgeUrl, setRoleBadgeUrl] = useState('');
  const [roleAnimation, setRoleAnimation] = useState<RoleAnimation>('none');
  const [permissions, setPermissions] = useState<RolePermissions>({
    canPostContent: true,
    canCreatePolls: true,
    canPinPosts: false,
    canDeletePosts: false,
    canModerateMembers: false,
    canManageSpaces: false,
    canManageRoles: false,
    canManageCommunity: false,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'roles' | 'assignments'>('roles');

  const resetForm = () => {
    setRoleName('');
    setRoleDescription('');
    setRoleColor('#ff5500');
    setRoleFont('default');
    setRoleIcon('award');
    setRoleBadgeUrl('');
    setRoleAnimation('none');
    setPermissions({
      canPostContent: true,
      canCreatePolls: true,
      canPinPosts: false,
      canDeletePosts: false,
      canModerateMembers: false,
      canManageSpaces: false,
      canManageRoles: false,
      canManageCommunity: false,
    });
    setEditingRoleId(null);
    setIsEditing(false);
    setError(null);
  };

  const handleApplyPreset = (preset: typeof ROLE_PRESETS[0]) => {
    setRoleName(preset.name);
    setRoleColor(preset.color);
    setRoleIcon(preset.icon);
    setRoleFont(preset.font as RoleFontStyle);
    setPermissions({
      canPostContent: true,
      canCreatePolls: true,
      ...preset.permissions
    });
  };

  const handleStartEdit = (role: CommunityRole) => {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    setRoleColor(role.color);
    setRoleFont(role.fontStyle);
    setRoleIcon(role.icon || 'award');
    setRoleBadgeUrl(role.badgeUrl || '');
    setRoleAnimation(role.animation || 'none');
    setPermissions(role.permissions || { canPostContent: true });
    setIsEditing(true);
  };

  const handleSubmitRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim() || saving) return;

    setSaving(true);
    setError(null);

    try {
      const payload: Partial<CommunityRole> = {
        id: editingRoleId || `role_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        communityId,
        name: roleName.trim(),
        description: roleDescription.trim() || undefined,
        color: roleColor,
        fontStyle: roleFont,
        icon: roleIcon,
        badgeUrl: roleBadgeUrl.trim() || undefined,
        animation: roleAnimation,
        permissions,
        createdAt: new Date().toISOString()
      };

      await onSaveRole(payload);
      resetForm();
    } catch (err: any) {
      setError(err?.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 text-left">
      {/* Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-[#212634] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('roles')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'roles'
              ? 'bg-[#ff5500] text-white shadow-lg shadow-[#ff5500]/20'
              : 'text-[#8e97a8] hover:text-white bg-[#141822]'
          }`}
        >
          Roles & Permissions ({roles.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('assignments')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'assignments'
              ? 'bg-[#ff5500] text-white shadow-lg shadow-[#ff5500]/20'
              : 'text-[#8e97a8] hover:text-white bg-[#141822]'
          }`}
        >
          Member Role Assignments
        </button>

        {!isEditing && activeTab === 'roles' && (
          <button
            type="button"
            onClick={() => { resetForm(); setIsEditing(true); }}
            className="ml-auto px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#1d2331] hover:bg-[#ff5500] text-white flex items-center gap-1.5 transition-colors"
          >
            <Plus size={13} />
            <span>Create Role</span>
          </button>
        )}
      </div>

      {activeTab === 'roles' ? (
        <>
          {isEditing ? (
            <form onSubmit={handleSubmitRole} className="p-4 bg-[#0d1017] border border-[#232938] rounded-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#212634]">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Palette size={14} className="text-[#ff5500]" />
                  <span>{editingRoleId ? 'Edit Custom Role' : 'Create Custom Community Role'}</span>
                </h4>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-[#8e97a8] hover:text-white"
                >
                  Cancel
                </button>
              </div>

              {/* Starting Presets */}
              {!editingRoleId && (
                <div>
                  <label className="text-[11px] font-bold text-[#8e97a8] block mb-1.5 font-mono-code">
                    Quick Starting Presets (Click to Load)
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {ROLE_PRESETS.map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className="px-2 py-1 rounded-md text-[10px] font-mono-code bg-[#161a24] hover:bg-[#ff5500]/20 hover:border-[#ff5500]/50 border border-[#232938] text-[#c3c8d4] transition-all"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Preview Box */}
              <div className="p-3 bg-[#141822] border border-[#232938] rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono-code text-[#6b7280] block mb-1">Live Role Presentation</span>
                  <CommunityRoleBadge
                    roleName={roleName || 'Custom Role'}
                    communityName={communityName}
                    color={roleColor}
                    fontStyle={roleFont}
                    badgeUrl={roleBadgeUrl}
                    animation={roleAnimation}
                    size="md"
                    showCommunityName={true}
                    interactive={false}
                  />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono-code text-[#ff5500] font-bold">MINT Design System</span>
                </div>
              </div>

              {/* Role Name & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Role Name *</label>
                  <input
                    type="text"
                    required
                    value={roleName}
                    onChange={e => setRoleName(e.target.value)}
                    placeholder="e.g. Genesis Artist, OG Holder"
                    className="w-full px-3 py-1.5 bg-[#141822] border border-[#232938] rounded-lg text-xs text-white focus:outline-none focus:border-[#ff5500]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white block mb-1">Role Description / Lore</label>
                  <input
                    type="text"
                    value={roleDescription}
                    onChange={e => setRoleDescription(e.target.value)}
                    placeholder="e.g. Awarded to verified community creators"
                    className="w-full px-3 py-1.5 bg-[#141822] border border-[#232938] rounded-lg text-xs text-white focus:outline-none focus:border-[#ff5500]"
                  />
                </div>
              </div>

              {/* Color Selector (Orange prioritized first) */}
              <div>
                <label className="text-xs font-bold text-white block mb-1.5 flex items-center justify-between">
                  <span>Role Color (Orange Prioritized)</span>
                  <span className="text-[10px] font-mono-code text-[#8e97a8]">{roleColor}</span>
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setRoleColor(c.hex)}
                      title={c.label}
                      style={{ backgroundColor: c.hex }}
                      className={`w-7 h-7 rounded-lg transition-transform flex items-center justify-center ${
                        roleColor === c.hex ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      {roleColor === c.hex && <Check size={12} className="text-black font-bold" />}
                    </button>
                  ))}
                  <div className="flex items-center gap-1 bg-[#141822] px-2 py-1 rounded-lg border border-[#232938]">
                    <span className="text-[10px] font-mono-code text-[#6b7280]">Hex:</span>
                    <input
                      type="text"
                      value={roleColor}
                      onChange={e => setRoleColor(e.target.value)}
                      className="w-16 bg-transparent text-[11px] font-mono-code text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Role Font Style (with visual previews) */}
              <div>
                <label className="text-xs font-bold text-white block mb-1.5 flex items-center gap-1.5">
                  <Type size={13} className="text-[#ff5500]" />
                  <span>Role Font Style (Visual Typography Selector)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FONT_STYLE_OPTIONS.map(fontOpt => (
                    <button
                      key={fontOpt.id}
                      type="button"
                      onClick={() => setRoleFont(fontOpt.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        roleFont === fontOpt.id
                          ? 'border-[#ff5500] bg-[#ff5500]/10 text-white'
                          : 'border-[#232938] bg-[#141822] text-[#8e97a8] hover:border-[#384259]'
                      }`}
                    >
                      <div className="text-[10px] text-[#6b7280] mb-0.5">{fontOpt.label}</div>
                      <div className={`text-xs ${fontOpt.className} ${roleFont === fontOpt.id ? 'text-[#ff5500]' : 'text-white'}`}>
                        {fontOpt.preview}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Badge URL / SVG */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Custom SVG / Image Badge URL</label>
                  <input
                    type="url"
                    value={roleBadgeUrl}
                    onChange={e => setRoleBadgeUrl(e.target.value)}
                    placeholder="https://... / custom-badge.svg"
                    className="w-full px-3 py-1.5 bg-[#141822] border border-[#232938] rounded-lg text-xs text-white focus:outline-none focus:border-[#ff5500]"
                  />
                  <span className="text-[10px] text-[#6b7280] mt-0.5 block">
                    Displays custom visual emblem next to role throughout MINT.
                  </span>
                </div>

                {/* Subtle Animation (Eligible Only) */}
                <div>
                  <label className="text-xs font-bold text-white block mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Sparkles size={12} className="text-[#ff5500]" />
                      Subtle Role Animation
                    </span>
                    {!isEligibleForAnimations && (
                      <span className="text-[10px] text-amber-400 font-mono-code flex items-center gap-1">
                        <Lock size={10} /> Verified / Upgraded Only
                      </span>
                    )}
                  </label>
                  <select
                    value={roleAnimation}
                    disabled={!isEligibleForAnimations}
                    onChange={e => setRoleAnimation(e.target.value as RoleAnimation)}
                    className="w-full px-3 py-1.5 bg-[#141822] border border-[#232938] rounded-lg text-xs text-white focus:outline-none focus:border-[#ff5500] disabled:opacity-50"
                  >
                    {ANIMATION_OPTIONS.map(opt => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label} — {opt.desc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Permissions Checklist */}
              <div>
                <label className="text-xs font-bold text-white block mb-2">
                  Role Permissions (Appearance & Permissions Separated)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-[#141822] border border-[#232938] cursor-pointer hover:border-[#384259]">
                    <input
                      type="checkbox"
                      checked={permissions.canPostContent}
                      onChange={e => setPermissions(p => ({ ...p, canPostContent: e.target.checked }))}
                      className="accent-[#ff5500]"
                    />
                    <span className="text-xs text-[#c3c8d4]">Post Content in Community</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-[#141822] border border-[#232938] cursor-pointer hover:border-[#384259]">
                    <input
                      type="checkbox"
                      checked={permissions.canCreatePolls}
                      onChange={e => setPermissions(p => ({ ...p, canCreatePolls: e.target.checked }))}
                      className="accent-[#ff5500]"
                    />
                    <span className="text-xs text-[#c3c8d4]">Create Community Polls</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-[#141822] border border-[#232938] cursor-pointer hover:border-[#384259]">
                    <input
                      type="checkbox"
                      checked={permissions.canPinPosts}
                      onChange={e => setPermissions(p => ({ ...p, canPinPosts: e.target.checked }))}
                      className="accent-[#ff5500]"
                    />
                    <span className="text-xs text-[#c3c8d4]">Pin / Unpin Posts</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-[#141822] border border-[#232938] cursor-pointer hover:border-[#384259]">
                    <input
                      type="checkbox"
                      checked={permissions.canDeletePosts}
                      onChange={e => setPermissions(p => ({ ...p, canDeletePosts: e.target.checked }))}
                      className="accent-[#ff5500]"
                    />
                    <span className="text-xs text-[#c3c8d4]">Delete Any Member Post</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-[#141822] border border-[#232938] cursor-pointer hover:border-[#384259]">
                    <input
                      type="checkbox"
                      checked={permissions.canModerateMembers}
                      onChange={e => setPermissions(p => ({ ...p, canModerateMembers: e.target.checked }))}
                      className="accent-[#ff5500]"
                    />
                    <span className="text-xs text-[#c3c8d4]">Moderate / Remove Members</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-[#141822] border border-[#232938] cursor-pointer hover:border-[#384259]">
                    <input
                      type="checkbox"
                      checked={permissions.canManageSpaces}
                      onChange={e => setPermissions(p => ({ ...p, canManageSpaces: e.target.checked }))}
                      className="accent-[#ff5500]"
                    />
                    <span className="text-xs text-[#c3c8d4]">Manage Community Spaces</span>
                  </label>
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#212634]">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#8e97a8] hover:text-white bg-[#161a24]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !roleName.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#ff5500] hover:bg-[#e64d00] text-white flex items-center gap-1.5 transition-colors"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>{editingRoleId ? 'Update Role' : 'Save Role'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2">
              {roles.length === 0 ? (
                <div className="p-6 text-center bg-[#0d1017] border border-[#232938] rounded-xl">
                  <Award size={24} className="mx-auto text-[#6b7280] mb-2" />
                  <h4 className="text-xs font-bold text-white">No Custom Roles Yet</h4>
                  <p className="text-[11px] text-[#8e97a8] mt-1 mb-3">
                    Create custom roles with distinct fonts, colors, badges, and permissions.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#ff5500] text-white inline-flex items-center gap-1.5"
                  >
                    <Plus size={13} />
                    <span>Create First Role</span>
                  </button>
                </div>
              ) : (
                roles.map(role => (
                  <div
                    key={role.id}
                    className="p-3 bg-[#0d1017] border border-[#232938] hover:border-[#384259] rounded-xl flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <CommunityRoleBadge
                        role={role}
                        communityName={communityName}
                        size="md"
                        interactive={false}
                      />
                      <div>
                        {role.description && (
                          <p className="text-[11px] text-[#8e97a8] truncate max-w-[200px] sm:max-w-xs">
                            {role.description}
                          </p>
                        )}
                        <span className="text-[10px] font-mono-code text-[#6b7280]">
                          Font: {role.fontStyle} • Anim: {role.animation || 'none'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(role)}
                        className="p-1.5 rounded-lg text-[#8e97a8] hover:text-white bg-[#141822] hover:bg-[#202737] transition-colors"
                        title="Edit Role"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteRole(role.id)}
                        className="p-1.5 rounded-lg text-[#8e97a8] hover:text-red-400 bg-[#141822] hover:bg-red-950/30 transition-colors"
                        title="Delete Role"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      ) : (
        /* Member Role Assignments View */
        <div className="space-y-2">
          {members.map(member => (
            <div
              key={member.userId}
              className="p-3 bg-[#0d1017] border border-[#232938] rounded-xl flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={member.user?.avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80&auto=format&fit=crop&q=80'}
                  alt={member.user?.username}
                  className="w-7 h-7 rounded-full object-cover border border-[#232938]"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate">
                      {member.user?.displayName || member.user?.username}
                    </span>
                    <span className="text-[10px] font-mono-code text-[#ff5500]">
                      @{member.user?.username}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap mt-0.5">
                    {member.communityRole === 'owner' ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono-code bg-[#ff5500]/20 text-[#ff5500] font-bold">
                        Owner
                      </span>
                    ) : (
                      (member.assignedRoleIds || []).map(rId => {
                        const matched = roles.find(r => r.id === rId);
                        return matched ? (
                          <CommunityRoleBadge key={rId} role={matched} size="xs" interactive={false} />
                        ) : null;
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Role Toggle Selector */}
              {member.communityRole !== 'owner' && (
                <div className="flex items-center gap-1.5">
                  <select
                    onChange={e => {
                      if (e.target.value) {
                        const isAssigned = (member.assignedRoleIds || []).includes(e.target.value);
                        onAssignRole(member.userId, e.target.value, !isAssigned);
                      }
                    }}
                    value=""
                    className="px-2 py-1 bg-[#141822] border border-[#232938] rounded-lg text-[11px] text-[#c3c8d4] focus:outline-none focus:border-[#ff5500]"
                  >
                    <option value="">+ Assign/Toggle Role</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>
                        {(member.assignedRoleIds || []).includes(r.id) ? `✓ ${r.name} (Remove)` : `+ ${r.name}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
