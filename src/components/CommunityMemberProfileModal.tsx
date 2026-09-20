import React, { useState } from 'react';
import {
  X,
  Shield,
  Crown,
  Calendar,
  Award,
  UserMinus,
  Check,
  AlertCircle,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { CommunityMember, CommunityRole, UserRole } from '../types';
import { VerifiedBadge } from './VerifiedBadge';
import { CommunityRoleBadge } from './CommunityRoleBadge';

interface CommunityMemberProfileModalProps {
  member: CommunityMember;
  communityName: string;
  availableRoles: CommunityRole[];
  viewerIsOwner: boolean;
  viewerCanModerate: boolean;
  onClose: () => void;
  onAssignRole?: (userId: string, roleId: string, assigned: boolean) => Promise<void>;
  onRemoveMember?: (userId: string) => Promise<void>;
  onNavigateProfile?: (username: string) => void;
}

export const CommunityMemberProfileModal: React.FC<CommunityMemberProfileModalProps> = ({
  member,
  communityName,
  availableRoles,
  viewerIsOwner,
  viewerCanModerate,
  onClose,
  onAssignRole,
  onRemoveMember,
  onNavigateProfile
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const isOwner = member.communityRole === 'owner';
  const assignedRoleIds = member.assignedRoleIds || [];

  const handleToggleRole = async (roleId: string) => {
    if (!onAssignRole || loading) return;
    setLoading(true);
    setError(null);
    try {
      const isAssigned = assignedRoleIds.includes(roleId);
      await onAssignRole(member.userId, roleId, !isAssigned);
    } catch (err: any) {
      setError(err?.message || 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  const handleKick = async () => {
    if (!onRemoveMember || loading) return;
    setLoading(true);
    setError(null);
    try {
      await onRemoveMember(member.userId);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to remove member');
      setLoading(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in text-left">
      <div className="bg-[#11141b] border border-[#212634] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl space-y-4 p-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono-code text-[#ff5500] font-bold">
            Community Member Profile
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#6b7280] hover:text-white hover:bg-[#1f2535] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3.5 p-3.5 bg-[#141822] border border-[#232938] rounded-xl">
          <img
            src={member.user?.avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80'}
            alt={member.user?.username}
            className="w-14 h-14 rounded-full object-cover border-2 border-[#2b3346]"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm font-bold text-white truncate">
                {member.user?.displayName || member.user?.username}
              </h3>
              {member.user?.isVerified && <VerifiedBadge size="sm" />}
            </div>
            <p className="text-xs font-mono-code text-[#ff5500]">
              @{member.user?.username}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] font-mono-code text-[#6b7280] mt-1">
              <Calendar size={11} />
              <span>Joined {formatDate(member.joinedAt)}</span>
            </div>
          </div>
        </div>

        {/* Community Badges Section */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-white block">
            Awarded Community Roles & Badges
          </label>
          <div className="flex items-center gap-1.5 flex-wrap p-2.5 bg-[#0d1017] border border-[#232938] rounded-xl min-h-[44px]">
            {isOwner && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono-code font-bold bg-[#ff5500]/20 text-[#ff5500] border border-[#ff5500]/40">
                <Crown size={12} />
                <span>Owner</span>
              </span>
            )}

            {availableRoles
              .filter(r => assignedRoleIds.includes(r.id))
              .map(role => (
                <CommunityRoleBadge
                  key={role.id}
                  role={role}
                  communityName={communityName}
                  size="sm"
                  interactive={true}
                />
              ))}

            {!isOwner && assignedRoleIds.length === 0 && (
              <span className="text-xs text-[#6b7280] italic">Standard Member (No custom roles yet)</span>
            )}
          </div>
        </div>

        {/* Leader Role Management Actions */}
        {(viewerIsOwner || viewerCanModerate) && !isOwner && (
          <div className="space-y-2 pt-2 border-t border-[#212634]">
            <label className="text-xs font-bold text-white block">
              Manage Member's Roles (Leader Controls)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableRoles.map(role => {
                const isAssigned = assignedRoleIds.includes(role.id);
                return (
                  <button
                    key={role.id}
                    onClick={() => handleToggleRole(role.id)}
                    disabled={loading}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs font-mono-code transition-all ${
                      isAssigned
                        ? 'border-[#ff5500] bg-[#ff5500]/15 text-[#ff5500]'
                        : 'border-[#232938] bg-[#141822] text-[#8e97a8] hover:text-white'
                    }`}
                  >
                    <span className="truncate">{role.name}</span>
                    {isAssigned && <Check size={12} className="text-[#ff5500] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Kick Member Option */}
        {(viewerIsOwner || viewerCanModerate) && !isOwner && onRemoveMember && (
          <div className="pt-2 border-t border-[#212634]">
            {confirmRemove ? (
              <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl space-y-2 text-center">
                <p className="text-xs text-red-300 font-bold">Remove this member from community?</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setConfirmRemove(false)}
                    className="px-3 py-1 bg-[#161a24] text-xs text-[#8e97a8] rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleKick}
                    disabled={loading}
                    className="px-3 py-1 bg-red-500 hover:bg-red-600 text-xs font-bold text-white rounded-lg flex items-center gap-1"
                  >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <UserMinus size={12} />}
                    <span>Confirm Remove</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmRemove(true)}
                className="w-full py-2 rounded-lg text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/30 flex items-center justify-center gap-1.5 transition-colors border border-transparent hover:border-red-500/20"
              >
                <UserMinus size={13} />
                <span>Remove Member from Community</span>
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="p-2 rounded-lg bg-red-950/50 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle size={13} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};
