import React, { useState } from 'react';
import {
  Shield,
  Crown,
  Sparkles,
  Award,
  Star,
  Flame,
  Zap,
  Palette,
  Layers,
  Heart,
  Gem,
  Info,
  X
} from 'lucide-react';
import { CommunityRole, RoleFontStyle, RoleAnimation } from '../types';

interface CommunityRoleBadgeProps {
  role?: CommunityRole;
  roleName?: string;
  communityName?: string;
  color?: string;
  fontStyle?: RoleFontStyle;
  badgeUrl?: string;
  animation?: RoleAnimation;
  size?: 'xs' | 'sm' | 'md';
  showCommunityName?: boolean;
  interactive?: boolean;
  isOwnerRole?: boolean;
}

export const ROLE_PRESETS = [
  { name: 'Owner', color: '#ff5500', icon: 'crown', font: 'modern', permissions: { canManageCommunity: true, canManageRoles: true, canManageSpaces: true, canModerateMembers: true, canDeletePosts: true, canPinPosts: true, canPostContent: true } },
  { name: 'Admin', color: '#f59e0b', icon: 'shield', font: 'modern', permissions: { canManageRoles: true, canManageSpaces: true, canModerateMembers: true, canDeletePosts: true, canPinPosts: true, canPostContent: true } },
  { name: 'Moderator', color: '#3b82f6', icon: 'shield', font: 'default', permissions: { canModerateMembers: true, canDeletePosts: true, canPinPosts: true, canPostContent: true } },
  { name: 'Founder', color: '#eab308', icon: 'star', font: 'cooper', permissions: { canPostContent: true } },
  { name: 'VIP', color: '#8b5cf6', icon: 'gem', font: 'display', permissions: { canPostContent: true } },
  { name: 'Artist', color: '#ec4899', icon: 'palette', font: 'handwritten', permissions: { canPostContent: true } },
  { name: 'Creator', color: '#10b981', icon: 'sparkles', font: 'modern', permissions: { canPostContent: true } },
  { name: 'Collector', color: '#06b6d4', icon: 'layers', font: 'serif', permissions: { canPostContent: true } },
  { name: 'OG', color: '#f97316', icon: 'flame', font: 'pixel', permissions: { canPostContent: true } },
  { name: 'Community Booster', color: '#ec4899', icon: 'zap', font: 'comic', permissions: { canPostContent: true } },
  { name: 'Community Upgrader', color: '#6366f1', icon: 'award', font: 'modern', permissions: { canPostContent: true } },
  { name: 'NFT Holder', color: '#14b8a6', icon: 'gem', font: 'monospace', permissions: { canPostContent: true } },
  { name: 'Supporter', color: '#f43f5e', icon: 'heart', font: 'default', permissions: { canPostContent: true } },
  { name: 'Member', color: '#737373', icon: 'award', font: 'default', permissions: { canPostContent: true } },
];

export const FONT_STYLE_OPTIONS: { id: RoleFontStyle; label: string; preview: string; className: string }[] = [
  { id: 'default', label: 'DM Sans / Clean Sans', preview: 'Clean Sans', className: 'font-sans font-medium' },
  { id: 'modern', label: 'Modern Geometric', preview: 'MODERN GEOMETRIC', className: 'font-sans font-bold tracking-wider uppercase' },
  { id: 'comic', label: 'Comic / Playful', preview: 'Playful Comic', className: 'font-[cursive] font-bold tracking-tight' },
  { id: 'cooper', label: 'Cooper Black / Rounded', preview: 'Cooper Black', className: 'font-serif font-black tracking-tight' },
  { id: 'memphis', label: 'Memphis / Retro Slab', preview: 'Memphis Slab', className: 'font-serif font-bold tracking-wide' },
  { id: 'serif', label: 'Editorial Serif', preview: 'Editorial Serif', className: 'font-serif italic font-semibold' },
  { id: 'monospace', label: 'Tech Monospace', preview: 'mono_code', className: 'font-mono font-bold tracking-tight' },
  { id: 'display', label: 'Heavy Display', preview: 'IMPACT DISPLAY', className: 'font-black tracking-widest uppercase text-xs' },
  { id: 'handwritten', label: 'Handwritten Script', preview: 'Handwritten', className: 'font-[cursive] font-medium tracking-wide' },
  { id: 'pixel', label: '8-Bit Pixel', preview: '8-BIT PIXEL', className: 'font-mono font-bold tracking-widest uppercase text-[10px]' },
];

export const COLOR_OPTIONS = [
  { id: 'orange', label: 'MINT Orange', hex: '#ff5500' },
  { id: 'red', label: 'Crimson Red', hex: '#ef4444' },
  { id: 'amber', label: 'Warm Amber', hex: '#f59e0b' },
  { id: 'yellow', label: 'Bright Gold', hex: '#eab308' },
  { id: 'emerald', label: 'Emerald Green', hex: '#10b981' },
  { id: 'cyan', label: 'Cyan Blue', hex: '#06b6d4' },
  { id: 'blue', label: 'Cobalt Blue', hex: '#3b82f6' },
  { id: 'indigo', label: 'Royal Indigo', hex: '#6366f1' },
  { id: 'purple', label: 'Vibrant Purple', hex: '#8b5cf6' },
  { id: 'pink', label: 'Hot Pink', hex: '#ec4899' },
  { id: 'rose', label: 'Rose Pink', hex: '#f43f5e' },
  { id: 'neutral', label: 'Slate Neutral', hex: '#737373' },
];

export const ANIMATION_OPTIONS: { id: RoleAnimation; label: string; desc: string }[] = [
  { id: 'none', label: 'None (Standard)', desc: 'Static clean display' },
  { id: 'fade', label: 'Soft Fade', desc: 'Gentle opacity breathe' },
  { id: 'pulse', label: 'Soft Pulse', desc: 'Subtle scale heartbeat' },
  { id: 'shimmer', label: 'Gentle Shimmer', desc: 'Sleek light passing effect' },
  { id: 'glow', label: 'Subtle Glow', desc: 'Warm soft outer luminescence' },
  { id: 'slide', label: 'Slight Slide', desc: 'Smooth horizontal glide' },
  { id: 'float', label: 'Slow Float', desc: 'Gentle vertical hovering' },
  { id: 'color_shift', label: 'Subtle Color Shift', desc: 'Mild gradient transition' },
];

function getRoleIcon(iconName?: string, size = 11) {
  switch (iconName?.toLowerCase()) {
    case 'crown': return <Crown size={size} />;
    case 'shield': return <Shield size={size} />;
    case 'sparkles': return <Sparkles size={size} />;
    case 'star': return <Star size={size} />;
    case 'flame': return <Flame size={size} />;
    case 'zap': return <Zap size={size} />;
    case 'palette': return <Palette size={size} />;
    case 'layers': return <Layers size={size} />;
    case 'heart': return <Heart size={size} />;
    case 'gem': return <Gem size={size} />;
    default: return <Award size={size} />;
  }
}

function getFontClass(fontStyle?: RoleFontStyle): string {
  const match = FONT_STYLE_OPTIONS.find(f => f.id === fontStyle);
  return match ? match.className : 'font-sans font-medium';
}

function getAnimationClass(anim?: RoleAnimation): string {
  switch (anim) {
    case 'fade': return 'animate-pulse';
    case 'pulse': return 'animate-[pulse_3s_ease-in-out_infinite]';
    case 'shimmer': return 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent';
    case 'glow': return 'shadow-[0_0_8px_rgba(255,85,0,0.35)]';
    case 'float': return 'animate-[bounce_3s_ease-in-out_infinite]';
    case 'slide': return 'animate-[pulse_4s_ease-in-out_infinite]';
    case 'color_shift': return 'transition-colors duration-1000';
    default: return '';
  }
}

export const CommunityRoleBadge: React.FC<CommunityRoleBadgeProps> = ({
  role,
  roleName,
  communityName,
  color,
  fontStyle,
  badgeUrl,
  animation,
  size = 'sm',
  showCommunityName = false,
  interactive = true,
  isOwnerRole = false
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const name = role?.name || roleName || (isOwnerRole ? 'Owner' : 'Member');
  const roleColor = role?.color || color || (isOwnerRole ? '#ff5500' : '#737373');
  const roleFont = role?.fontStyle || fontStyle || 'default';
  const roleAnim = role?.animation || animation || 'none';
  const customBadge = role?.badgeUrl || badgeUrl;
  const cName = communityName || role?.description;

  const fontClass = getFontClass(roleFont);
  const animClass = getAnimationClass(roleAnim);

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-1',
    sm: 'text-[10px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5'
  };

  const iconSize = size === 'xs' ? 9 : size === 'sm' ? 11 : 13;

  return (
    <div className="relative inline-flex items-center">
      <span
        onClick={interactive ? (e) => { e.stopPropagation(); setShowTooltip(!showTooltip); } : undefined}
        style={{
          borderColor: `${roleColor}40`,
          backgroundColor: `${roleColor}14`,
          color: roleColor
        }}
        className={`inline-flex items-center rounded-md border font-mono-code transition-all select-none ${sizeClasses[size]} ${fontClass} ${animClass} ${
          interactive ? 'cursor-pointer hover:opacity-90 active:scale-95' : ''
        }`}
        title={`${name}${cName ? ` · ${cName}` : ''}`}
      >
        {customBadge ? (
          <img
            src={customBadge}
            alt={name}
            className="w-3 h-3 rounded-sm object-contain"
          />
        ) : (
          getRoleIcon(role?.icon || (isOwnerRole ? 'crown' : 'award'), iconSize)
        )}
        <span className="truncate max-w-[110px]">{name}</span>
        {showCommunityName && cName && (
          <span className="opacity-60 text-[9px] font-sans font-normal truncate max-w-[80px]">
            · {cName}
          </span>
        )}
      </span>

      {/* Expanded Badge Detail Modal / Popover */}
      {showTooltip && interactive && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => { e.stopPropagation(); setShowTooltip(false); }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-full mt-1.5 w-64 bg-[#161a24] border border-[#282f42] rounded-xl p-3 shadow-2xl z-50 text-left animate-fade-in"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div
                  style={{ backgroundColor: `${roleColor}25`, color: roleColor, borderColor: `${roleColor}50` }}
                  className="w-7 h-7 rounded-lg border flex items-center justify-center"
                >
                  {customBadge ? (
                    <img src={customBadge} alt={name} className="w-4 h-4 object-contain" />
                  ) : (
                    getRoleIcon(role?.icon || (isOwnerRole ? 'crown' : 'award'), 14)
                  )}
                </div>
                <div>
                  <h4 className={`text-xs font-bold text-white ${fontClass}`}>{name}</h4>
                  <p className="text-[10px] text-[#8e97a8] font-mono-code">
                    {cName ? `Role awarded by ${cName}` : 'Community Role'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTooltip(false)}
                className="text-[#6b7280] hover:text-white p-0.5"
              >
                <X size={12} />
              </button>
            </div>

            {role?.description && (
              <p className="text-[11px] text-[#c3c8d4] mb-2.5 leading-relaxed bg-[#10131a] p-2 rounded-lg border border-[#1f2533]">
                {role.description}
              </p>
            )}

            <div className="pt-2 border-t border-[#232938] flex items-center justify-between text-[10px] text-[#6b7280]">
              <span className="font-mono-code">Custom Badge</span>
              <span className="text-[#8e97a8]">Separate from MINT ✓</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
