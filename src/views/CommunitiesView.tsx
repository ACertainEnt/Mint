import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  MessageSquare,
  Share2,
  Settings,
  Globe,
  Twitter,
  MessageCircle,
  ExternalLink,
  Shield,
  Trash2,
  X,
  Check,
  AlertCircle,
  Clock,
  Lock,
  Loader2,
  ArrowLeft,
  Search,
  Pin,
  BarChart2,
  Image as ImageIcon,
  Link as LinkIcon,
  Sparkles,
  ChevronRight,
  Filter,
  UserPlus,
  Crown
} from 'lucide-react';
import { Community, CommunityMember, CommunityPost, CommunityRole, CommunitySpace } from '../types';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { PostCard } from '../components/PostCard';
import { ImageUploader } from '../components/ImageUploader';
import { CommunityRoleBadge } from '../components/CommunityRoleBadge';
import { CommunitySettingsModal } from '../components/CommunitySettingsModal';
import { CommunityMemberProfileModal } from '../components/CommunityMemberProfileModal';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { cooldownManager } from '../lib/cooldown';

interface CommunitiesViewProps {
  onNavigate: (path: string) => void;
  onSelectNft?: (nft: any) => void;
}

export const CommunitiesView: React.FC<CommunitiesViewProps> = ({ onNavigate, onSelectNft }) => {
  const { user, setShowAuthModal } = useAuth();

  // Navigation layers: 'home' (Feed) | 'members' (Member List layer)
  const [currentLayer, setCurrentLayer] = useState<'home' | 'members'>('home');

  // Main data states
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('all');

  // Feed & Member data
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Search & Filters in Member layer
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState<string>('all');

  // Selected Member for Profile Modal
  const [selectedMemberForProfile, setSelectedMemberForProfile] = useState<CommunityMember | null>(null);

  // Settings Modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Create Community Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityHandle, setNewCommunityHandle] = useState('');
  const [newCommunityDesc, setNewCommunityDesc] = useState('');
  const [newCommunityCategory, setNewCommunityCategory] = useState('Art');
  const [newCommunityAvatar, setNewCommunityAvatar] = useState<string | null>(null);
  const [newCommunityBanner, setNewCommunityBanner] = useState<string | null>(null);
  const [newAllowMemberPosts, setNewAllowMemberPosts] = useState(true);
  const [creatingCommunity, setCreatingCommunity] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Creation Cooldown status
  const [creationStatus, setCreationStatus] = useState<{
    canCreate: boolean;
    isOwnerExempt: boolean;
    remainingSeconds: number;
    cooldownEndsAt: string | null;
    cooldownHours: number;
  } | null>(null);
  const [checkingCreationStatus, setCheckingCreationStatus] = useState(false);

  // Post Composer state
  const [postContent, setPostContent] = useState('');
  const [postMediaUrl, setPostMediaUrl] = useState<string | null>(null);
  const [showMediaUploader, setShowMediaUploader] = useState(false);
  const [postSpaceId, setPostSpaceId] = useState<string>('');
  const [shareToHome, setShareToHome] = useState(false);
  
  // Link attachment state
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkInputValue, setLinkInputValue] = useState('');
  const [attachedLinks, setAttachedLinks] = useState<string[]>([]);

  // Poll composer state
  const [showPollComposer, setShowPollComposer] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  const [submittingPost, setSubmittingPost] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [postSuccessToast, setPostSuccessToast] = useState(false);

  // Join/Leave action loading
  const [joining, setJoining] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  // Post cooldown timer state for reactive updates
  const [postCooldownTimer, setPostCooldownTimer] = useState(0);

  // Ownership & Role checks
  const isPlatformOwner = user && (
    user.role === 'owner' ||
    user.role === 'platform_owner' ||
    user.role === 'admin' ||
    user.privilegedType === 'platform_owner' ||
    user.privilegedType === 'trusted_mint_account' ||
    user.isPrivileged === true
  );

  const isMintRestricted = useMemo(() => {
    if (isPlatformOwner) return false;
    const nameHasMint = newCommunityName.toLowerCase().includes('mint');
    const handleHasMint = newCommunityHandle.toLowerCase().includes('mint');
    return nameHasMint || handleHasMint;
  }, [newCommunityName, newCommunityHandle, isPlatformOwner]);
  const isCreator = selectedCommunity && user && (selectedCommunity.creatorId === user.id || selectedCommunity.creatorId === user.email);
  const isOwner = selectedCommunity && user && (selectedCommunity.creatorId === user.id || isPlatformOwner);
  const isModerator = selectedCommunity && user && members.some(m => m.communityId === selectedCommunity.id && m.userId === user.id && m.communityRole === 'moderator');
  const canManageCommunity = isOwner || isPlatformOwner;
  const canModerate = isOwner || isModerator || isPlatformOwner;

  // Post permissions in community
  const canPostInCommunity = useMemo(() => {
    if (!selectedCommunity) return true;
    if (selectedCommunity.postPermissionMode === 'leaders_only') {
      return canModerate;
    }
    if (selectedCommunity.allowMemberPosts === false) {
      return canModerate;
    }
    return true;
  }, [selectedCommunity, canModerate]);

  // Load communities on mount
  const loadCommunities = async () => {
    setLoading(true);
    try {
      const res = await api.getCommunities();
      const list = res?.communities || [];
      setCommunities(list);

      if (list.length > 0) {
        setSelectedCommunity(prev => {
          if (!prev) return list[0];
          const found = list.find(c => c.id === prev.id);
          return found || list[0];
        });
      }
    } catch (err) {
      console.warn('Notice: Communities list could not be refreshed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommunities();
  }, [user?.id]);

  // Load feed posts for selected community
  const loadPosts = async () => {
    if (!selectedCommunity) return;
    setLoadingPosts(true);
    try {
      const res = await api.getFeedPosts({
        communityId: selectedCommunity.id,
        spaceId: selectedSpaceId !== 'all' ? selectedSpaceId : undefined
      });
      setPosts(res?.posts || []);
    } catch (err) {
      console.warn('Notice: Community posts could not be refreshed:', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [selectedCommunity?.id, selectedSpaceId]);

  // Load members when selected community changes
  const loadMembers = async () => {
    if (!selectedCommunity) return;
    setLoadingMembers(true);
    try {
      const res = await api.getCommunityMembers(selectedCommunity.id);
      setMembers(res.members || []);
    } catch (err) {
      console.error('Failed to load community members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [selectedCommunity?.id]);

  // Handle post cooldown countdown
  useEffect(() => {
    if (!user || !selectedCommunity) return;
    const isExempt = isPlatformOwner || isOwner;
    const interval = setInterval(() => {
      const remaining = cooldownManager.getRemainingPostCooldown(selectedCommunity.id, selectedCommunity.postCooldownSeconds, isExempt);
      setPostCooldownTimer(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [user, selectedCommunity, isPlatformOwner, isOwner]);

  // Open Create Community Modal
  const handleOpenCreateModal = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setCreateError(null);
    setCheckingCreationStatus(true);
    setShowCreateModal(true);

    try {
      const status = await api.getCommunityCreationStatus();
      setCreationStatus(status);
    } catch (err) {
      console.error('Failed to check creation cooldown status', err);
    } finally {
      setCheckingCreationStatus(false);
    }
  };

  // Submit Create Community
  const handleCreateCommunitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommunityName.trim() || creatingCommunity) return;

    // Check for reserved community names
    if (isMintRestricted) {
      setCreateError("That community name is reserved by MINT.");
      return;
    }

    setCreatingCommunity(true);
    setCreateError(null);

    try {
      const res = await api.createCommunity({
        name: newCommunityName.trim(),
        handle: newCommunityHandle.trim() || undefined,
        description: newCommunityDesc.trim(),
        category: newCommunityCategory,
        avatar: newCommunityAvatar || undefined,
        banner: newCommunityBanner || undefined,
        allowMemberPosts: newAllowMemberPosts
      });

      setCommunities(prev => [res.community, ...prev]);
      setSelectedCommunity(res.community);
      setCurrentLayer('home');
      setShowCreateModal(false);
      setNewCommunityName('');
      setNewCommunityHandle('');
      setNewCommunityDesc('');
      setNewCommunityAvatar(null);
      setNewCommunityBanner(null);
    } catch (err: any) {
      console.error('Create community error:', err);
      setCreateError(err.message || 'Failed to create community.');
    } finally {
      setCreatingCommunity(false);
    }
  };

  // Handle Join / Leave
  const handleToggleJoin = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!selectedCommunity || joining) return;

    // The community creator cannot leave the community
    if (selectedCommunity.isJoined && (selectedCommunity.creatorId === user.id || selectedCommunity.creatorId === user.email)) {
      alert('The community creator cannot leave the community. You may delete it from settings if desired.');
      return;
    }

    setJoining(true);
    try {
      if (selectedCommunity.isJoined) {
        const res = await api.leaveCommunity(selectedCommunity.id);
        const updated = { ...selectedCommunity, isJoined: false, memberCount: res.memberCount };
        setSelectedCommunity(updated);
        setCommunities(prev => prev.map(c => c.id === updated.id ? updated : c));
      } else {
        const res = await api.joinCommunity(selectedCommunity.id);
        const updated = { ...selectedCommunity, isJoined: true, memberCount: res.memberCount };
        setSelectedCommunity(updated);
        setCommunities(prev => prev.map(c => c.id === updated.id ? updated : c));
      }
      loadMembers();
    } catch (err: any) {
      console.error('Join/Leave error:', err);
      alert(err.message || 'Failed to update membership status.');
    } finally {
      setJoining(false);
    }
  };

  // Share Community Link
  const handleShare = () => {
    if (!selectedCommunity) return;
    const url = window.location.origin + `?community=${selectedCommunity.slug || selectedCommunity.id}`;
    navigator.clipboard.writeText(url);
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2500);
  };

  // Add Link to post composer
  const handleAddLink = () => {
    if (!linkInputValue.trim()) return;
    let formatted = linkInputValue.trim();
    if (!/^https?:\/\//i.test(formatted)) {
      formatted = `https://${formatted}`;
    }
    setAttachedLinks(prev => [...prev, formatted]);
    setLinkInputValue('');
    setShowLinkInput(false);
  };

  const handleRemoveLink = (idx: number) => {
    setAttachedLinks(prev => prev.filter((_, i) => i !== idx));
  };

  // Poll options handler
  const handleAddPollOption = () => {
    if (pollOptions.length < 5) {
      setPollOptions(prev => [...prev, '']);
    }
  };

  const handleUpdatePollOption = (idx: number, val: string) => {
    setPollOptions(prev => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const handleRemovePollOption = (idx: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(prev => prev.filter((_, i) => i !== idx));
    }
  };

  // Submit Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!selectedCommunity || !postContent.trim() || submittingPost) return;

    // Check cooldown
    const isExempt = isPlatformOwner || isOwner;
    const remainingCooldown = cooldownManager.getRemainingPostCooldown(
      selectedCommunity.id,
      selectedCommunity.postCooldownSeconds,
      isExempt
    );

    if (remainingCooldown > 0) {
      setPostError(cooldownManager.formatCooldownMessage(remainingCooldown, 'post'));
      return;
    }

    setSubmittingPost(true);
    setPostError(null);

    try {
      let pollPayload = undefined;
      if (showPollComposer && pollQuestion.trim()) {
        const validOptions = pollOptions.map(o => o.trim()).filter(Boolean);
        if (validOptions.length >= 2) {
          pollPayload = {
            question: pollQuestion.trim(),
            options: validOptions
          };
        }
      }

      const res = await api.createPost({
        content: postContent.trim(),
        communityId: selectedCommunity.id,
        spaceId: postSpaceId || (selectedSpaceId !== 'all' ? selectedSpaceId : undefined),
        mediaUrl: postMediaUrl || undefined,
        links: attachedLinks.length > 0 ? attachedLinks : undefined,
        poll: pollPayload,
        shareToHome
      });

      // Record cooldown action
      cooldownManager.recordPost(selectedCommunity.id);

      setPosts(prev => [res.post, ...prev]);
      setPostContent('');
      setPostMediaUrl(null);
      setShowMediaUploader(false);
      setAttachedLinks([]);
      setShowLinkInput(false);
      setShowPollComposer(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      setShareToHome(false);

      setPostSuccessToast(true);
      setTimeout(() => setPostSuccessToast(false), 2500);
    } catch (err: any) {
      console.error('Failed to create post:', err);
      setPostError(err.message || 'Failed to publish post.');
    } finally {
      setSubmittingPost(false);
    }
  };

  // Pin / Unpin Post
  const handleTogglePinPost = async (postId: string, currentlyPinned?: boolean) => {
    try {
      const res = await api.pinPost(postId, !currentlyPinned);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, isPinned: res.post.isPinned } : p));
    } catch (err: any) {
      console.error('Failed to pin post:', err);
      alert(err.message || 'Failed to update post pin status.');
    }
  };

  // Delete Post (Callback when PostCard successfully deletes the post)
  const handleDeletePost = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  // Settings Actions
  const handleUpdateCommunitySettings = async (updatedData: Partial<Community>) => {
    if (!selectedCommunity) return;
    const res = await api.updateCommunity(selectedCommunity.id, updatedData);
    setSelectedCommunity(res.community);
    setCommunities(prev => prev.map(c => c.id === res.community.id ? res.community : c));
  };

  const handleDeleteCommunityConfirmed = async (communityId: string) => {
    await api.deleteCommunity(communityId);
    const remaining = communities.filter(c => c.id !== communityId);
    setCommunities(remaining);
    setSelectedCommunity(remaining[0] || null);
    setShowSettingsModal(false);
  };

  const handleSaveRole = async (roleData: Partial<CommunityRole>) => {
    if (!selectedCommunity) return;
    const res = await api.createCommunityRole(selectedCommunity.id, roleData);
    const updated = { ...selectedCommunity, roles: res.roles };
    setSelectedCommunity(updated);
    setCommunities(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!selectedCommunity) return;
    const res = await api.deleteCommunityRole(selectedCommunity.id, roleId);
    const updated = { ...selectedCommunity, roles: res.roles };
    setSelectedCommunity(updated);
    setCommunities(prev => prev.map(c => c.id === updated.id ? updated : c));
    loadMembers();
  };

  const handleAssignRole = async (userId: string, roleId: string, assigned: boolean) => {
    if (!selectedCommunity) return;
    await api.assignCommunityRole(selectedCommunity.id, userId, roleId, assigned);
    loadMembers();
  };

  const handleSaveSpace = async (spaceData: Partial<CommunitySpace>) => {
    if (!selectedCommunity) return;
    const res = await api.createCommunitySpace(selectedCommunity.id, spaceData);
    const updated = { ...selectedCommunity, spaces: res.spaces };
    setSelectedCommunity(updated);
    setCommunities(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const handleDeleteSpace = async (spaceId: string) => {
    if (!selectedCommunity) return;
    const res = await api.deleteCommunitySpace(selectedCommunity.id, spaceId);
    const updated = { ...selectedCommunity, spaces: res.spaces };
    setSelectedCommunity(updated);
    setCommunities(prev => prev.map(c => c.id === updated.id ? updated : c));
    if (selectedSpaceId === spaceId) {
      setSelectedSpaceId('all');
    }
  };

  // Filtered members in Member List layer
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchSearch =
        m.user.username.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
        (m.user.displayName && m.user.displayName.toLowerCase().includes(memberSearchQuery.toLowerCase()));

      if (!matchSearch) return false;

      if (memberRoleFilter === 'all') return true;
      if (memberRoleFilter === 'owner') return m.communityRole === 'owner' || m.userId === selectedCommunity?.creatorId;
      if (memberRoleFilter === 'moderator') return m.communityRole === 'moderator';
      if (memberRoleFilter === 'custom') return (m.assignedRoleIds && m.assignedRoleIds.length > 0);
      return true;
    });
  }, [members, memberSearchQuery, memberRoleFilter, selectedCommunity]);

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white pt-20 pb-24 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Toast Notifications */}
      {shareToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1e1e1e] border border-[#ff5500]/50 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in">
          <Check className="w-5 h-5 text-[#ff5500]" />
          <span className="text-sm font-medium">Community link copied to clipboard</span>
        </div>
      )}

      {postSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1e1e1e] border border-green-500/50 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in">
          <Check className="w-5 h-5 text-green-400" />
          <span className="text-sm font-medium">Post published successfully</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================
            LEFT COLUMN: COMMUNITY DISCOVERY & SELECTOR (3 cols)
        ======================================================== */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          <div className="pb-4 border-b border-[#212634] sm:border-b-0 sm:border-r sm:border-[#212634] sm:pr-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#ff5500]" />
                <h2 className="font-bold text-base tracking-wide">Communities</h2>
              </div>
              <button
                id="create-community-btn"
                onClick={handleOpenCreateModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff5500] hover:bg-[#ff661a] text-white text-xs font-semibold rounded-lg transition shadow-md shadow-[#ff5500]/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create</span>
              </button>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-500 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#ff5500]" />
                <span className="text-xs">Loading communities...</span>
              </div>
            ) : communities.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#ff5500]" />
                <p className="text-sm font-medium">No communities yet</p>
                <p className="text-xs text-gray-500 mt-1">Be the first to launch a community</p>
              </div>
            ) : (
              <div className="divide-y divide-[#1f2533] max-h-[calc(100vh-280px)] overflow-y-auto pr-1 custom-scrollbar">
                {communities.map(c => {
                  const isSelected = selectedCommunity?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      id={`community-item-${c.id}`}
                      onClick={() => {
                        setSelectedCommunity(c);
                        setSelectedSpaceId('all');
                        setCurrentLayer('home');
                      }}
                      className={`w-full flex items-center gap-3 py-3 px-2 text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#ff5500]/10 text-white font-semibold'
                          : 'hover:bg-[#161a24] text-gray-300'
                      }`}
                    >
                      <img
                        src={c.avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'}
                        alt={c.name}
                        className="w-10 h-10 rounded-xl object-cover border border-[#232938] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-sm text-white">{c.name}</span>
                          {c.isVerified && <VerifiedBadge size="sm" />}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5 flex-wrap">
                          <span className="text-[#ff5500] font-mono text-[11px]">
                            {c.handle || `@${c.slug?.replace(/-/g, '_') || 'community'}`}
                          </span>
                          <span>•</span>
                          <span className="shrink-0">{c.memberCount || 1} members</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            MAIN COLUMN: COMMUNITY HOME OR LAYERED MEMBERS VIEW (9 cols)
        ======================================================== */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          {!selectedCommunity ? (
            <div className="py-16 text-center text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 text-[#ff5500] opacity-50" />
              <h3 className="text-lg font-bold text-white mb-1">Select a Community</h3>
              <p className="text-sm text-gray-400">Choose a community from the list to enter its Home and feed.</p>
            </div>
          ) : (
            <>
              {/* ========================================================
                  COMMUNITY HEADER (No card framing, seamless full-width)
              ======================================================== */}
              <div className="w-full pb-6 border-b border-[#212634] space-y-4">
                {/* Banner */}
                <div className="h-32 sm:h-48 w-full bg-gradient-to-r from-[#1c1c1c] via-[#241712] to-[#1a1310] relative rounded-xl overflow-hidden">
                  {selectedCommunity.banner ? (
                    <img
                      src={selectedCommunity.banner}
                      alt={selectedCommunity.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20">
                      <Sparkles className="w-12 h-12 text-[#ff5500]" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090b0e] via-transparent to-transparent" />
                </div>

                {/* Header Information */}
                <div className="px-1 sm:px-2 pb-2 pt-0 relative -mt-10 sm:-mt-12">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    {/* Left: Avatar & Basic Info */}
                    <div className="flex items-end gap-3 sm:gap-4 flex-wrap sm:flex-nowrap min-w-0">
                      <img
                        src={selectedCommunity.avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80'}
                        alt={selectedCommunity.name}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-[#090b0e] shadow-2xl bg-[#1f1f1f] shrink-0"
                      />
                      <div className="mb-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight break-words">
                            {selectedCommunity.name}
                          </h1>
                          {selectedCommunity.isVerified && (
                            <VerifiedBadge size="md" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-400 mt-1 flex-wrap">
                          <span className="font-mono text-[#ff5500] font-medium break-all">
                            {selectedCommunity.handle || `@${selectedCommunity.slug?.replace(/-/g, '_') || 'community'}`}
                          </span>
                          <span>•</span>
                          <button
                            id="community-members-count-btn"
                            onClick={() => setCurrentLayer(currentLayer === 'members' ? 'home' : 'members')}
                            className="text-gray-300 hover:text-white underline underline-offset-4 decoration-[#ff5500]/60 transition cursor-pointer flex items-center gap-1.5 shrink-0"
                          >
                            <Users className="w-3.5 h-3.5 text-[#ff5500]" />
                            <span className="font-semibold text-white">{selectedCommunity.memberCount || 1}</span> members
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions (Join, Share, Settings) */}
                    <div className="flex items-center gap-2 self-start sm:self-end shrink-0">
                      <button
                        id="community-share-btn"
                        onClick={handleShare}
                        className="p-2.5 bg-[#141822] hover:bg-[#1a202c] text-gray-300 hover:text-white border border-[#212634] rounded-xl transition cursor-pointer"
                        title="Share Community Link"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>

                      {canManageCommunity && (
                        <button
                          id="community-settings-btn"
                          onClick={() => setShowSettingsModal(true)}
                          className="p-2.5 bg-[#141822] hover:bg-[#1a202c] text-gray-300 hover:text-white border border-[#212634] rounded-xl transition cursor-pointer flex items-center gap-1.5"
                          title="Community Settings"
                        >
                          <Settings className="w-4 h-4 text-[#ff5500]" />
                          <span className="text-xs font-semibold hidden sm:inline">Settings</span>
                        </button>
                      )}

                      {isCreator ? (
                        <div
                          className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#1a1f2c] text-[#ff5500] border border-[#ff5500]/30 flex items-center gap-1.5"
                          title="You created this community"
                        >
                          <Crown className="w-4 h-4" />
                          <span>Creator</span>
                        </div>
                      ) : (
                        <button
                          id="community-join-btn"
                          onClick={handleToggleJoin}
                          disabled={joining}
                          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md ${
                            selectedCommunity.isJoined
                              ? 'bg-[#141822] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 text-gray-300 border border-[#212634]'
                              : 'bg-[#ff5500] hover:bg-[#ff661a] text-white shadow-[#ff5500]/20'
                          }`}
                        >
                          {joining ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : selectedCommunity.isJoined ? (
                            <>
                              <Check className="w-4 h-4 text-green-400" />
                              <span>Joined</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4" />
                              <span>Join</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Description & Socials - Auto-wrap without truncation */}
                  {selectedCommunity.description && (
                    <p className="text-xs sm:text-sm text-gray-300 mt-4 leading-relaxed w-full break-words">
                      {selectedCommunity.description}
                    </p>
                  )}

                  {selectedCommunity.socialLinks && (
                    <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-[#212634] text-xs text-gray-400">
                      {selectedCommunity.socialLinks.website && (
                        <a
                          href={selectedCommunity.socialLinks.website}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 hover:text-[#ff5500] transition"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Website</span>
                        </a>
                      )}
                      {selectedCommunity.socialLinks.twitter && (
                        <a
                          href={`https://twitter.com/${selectedCommunity.socialLinks.twitter.replace('@', '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 hover:text-[#ff5500] transition"
                        >
                          <Twitter className="w-3.5 h-3.5" />
                          <span>Twitter</span>
                        </a>
                      )}
                      {selectedCommunity.socialLinks.discord && (
                        <a
                          href={selectedCommunity.socialLinks.discord}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 hover:text-[#ff5500] transition"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Discord</span>
                        </a>
                      )}
                      {selectedCommunity.socialLinks.telegram && (
                        <a
                          href={`https://t.me/${selectedCommunity.socialLinks.telegram.replace('@', '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 hover:text-[#ff5500] transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Telegram</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ========================================================
                  LAYER 2: MEMBERS LAYER (If user clicked member count)
              ======================================================== */}
              {currentLayer === 'members' ? (
                <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
                  {/* Layer Header with Back Button */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <button
                      id="back-to-community-home-btn"
                      onClick={() => setCurrentLayer('home')}
                      className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-[#ff5500] transition cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Community Home</span>
                    </button>
                    <span className="text-xs text-gray-400 font-mono">
                      {members.length} Total Members
                    </span>
                  </div>

                  {/* Search and Role Filter Bar */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search members by name or username..."
                        value={memberSearchQuery}
                        onChange={e => setMemberSearchQuery(e.target.value)}
                        className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-[#ff5500]"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                      <select
                        value={memberRoleFilter}
                        onChange={e => setMemberRoleFilter(e.target.value)}
                        className="bg-[#1c1c1c] border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-[#ff5500]"
                      >
                        <option value="all">All Roles</option>
                        <option value="owner">Community Leaders</option>
                        <option value="moderator">Moderators</option>
                        <option value="custom">Custom Badged</option>
                      </select>
                    </div>
                  </div>

                  {/* Member Rows List */}
                  {loadingMembers ? (
                    <div className="py-16 text-center text-gray-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#ff5500]" />
                      <p className="text-xs">Loading members...</p>
                    </div>
                  ) : filteredMembers.length === 0 ? (
                    <div className="py-12 text-center text-gray-400">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#ff5500]" />
                      <p className="text-sm font-medium">No members found</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#1f2533]">
                      {filteredMembers.map(m => {
                        const isMemberOwner = m.communityRole === 'owner' || m.userId === selectedCommunity.creatorId;
                        const assignedRoles = (selectedCommunity.roles || []).filter(r => (m.assignedRoleIds || []).includes(r.id));

                        return (
                          <div
                            key={m.id}
                            className="py-3.5 flex items-center justify-between gap-3 bg-transparent"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={m.user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                                alt={m.user.username}
                                className="w-10 h-10 rounded-full object-cover border border-[#232938] shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-sm text-white">
                                    {m.user.displayName || m.user.username}
                                  </span>
                                  {m.user.isVerified && <VerifiedBadge size="sm" isPlatformStaff={m.user.role === 'owner' || m.user.role === 'admin'} />}
                                  {isMemberOwner && (
                                    <span className="text-[#ff5500] font-mono-code font-bold text-xs">
                                      Owner
                                    </span>
                                  )}
                                  {m.communityRole === 'moderator' && !isMemberOwner && (
                                    <span className="text-blue-400 font-mono-code font-bold text-xs">
                                      Mod
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-400 font-mono">
                                  @{m.user.username}
                                </div>
                                {assignedRoles.length > 0 && (
                                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                                    {assignedRoles.map(r => (
                                      <CommunityRoleBadge key={r.id} role={r} size="sm" />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            <button
                              id={`view-member-profile-${m.userId}`}
                              onClick={() => setSelectedMemberForProfile(m)}
                              className="px-3 py-1.5 text-xs font-semibold text-gray-200 hover:text-white border border-[#232938] hover:border-[#ff5500] rounded-lg transition cursor-pointer shrink-0 bg-transparent"
                            >
                              Profile
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* ========================================================
                    LAYER 1: COMMUNITY HOME (Feed + Spaces + Composer)
                ======================================================== */
                <div className="space-y-6">
                  {/* Spaces Selector Pills (No '#' prefix) */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                    <button
                      id="space-pill-all"
                      onClick={() => setSelectedSpaceId('all')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        selectedSpaceId === 'all'
                          ? 'bg-[#ff5500] text-white shadow-md shadow-[#ff5500]/20'
                          : 'bg-[#181818] hover:bg-[#222] text-gray-400 hover:text-white border border-white/5'
                      }`}
                    >
                      All Feed
                    </button>

                    {(selectedCommunity.spaces || []).map(space => {
                      const isSelected = selectedSpaceId === space.id;
                      return (
                        <button
                          key={space.id}
                          id={`space-pill-${space.id}`}
                          onClick={() => setSelectedSpaceId(space.id)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-[#ff5500] text-white shadow-md shadow-[#ff5500]/20'
                              : 'bg-[#181818] hover:bg-[#222] text-gray-400 hover:text-white border border-white/5'
                          }`}
                        >
                          <span>{space.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Post Composer */}
                  {canPostInCommunity ? (
                    <div className="pb-4 border-b border-[#212634] space-y-3 bg-transparent">
                      <form onSubmit={handleCreatePost} className="space-y-3">
                        <textarea
                          placeholder={`Post something in ${selectedCommunity.name}...`}
                          value={postContent}
                          onChange={e => setPostContent(e.target.value)}
                          rows={3}
                          className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm text-white placeholder-[#525a6c] focus:outline-none resize-none"
                        />

                        {/* Attached Image Preview */}
                        {postMediaUrl && (
                          <div className="relative inline-block border border-white/10 rounded-xl overflow-hidden bg-black/40">
                            <img src={postMediaUrl} alt="Upload preview" className="max-h-48 object-cover rounded-xl" />
                            <button
                              type="button"
                              onClick={() => setPostMediaUrl(null)}
                              className="absolute top-2 right-2 p-1 bg-black/70 hover:bg-black text-white rounded-full transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Image Uploader Toggle */}
                        {showMediaUploader && !postMediaUrl && (
                          <div className="p-3 bg-[#1a1a1a] rounded-xl border border-white/10">
                            <ImageUploader
                              onImageUploaded={url => {
                                setPostMediaUrl(url);
                                setShowMediaUploader(false);
                              }}
                              label="Attach image"
                            />
                          </div>
                        )}

                        {/* Attached Links List */}
                        {attachedLinks.length > 0 && (
                          <div className="space-y-1.5">
                            {attachedLinks.map((link, idx) => (
                              <div key={idx} className="flex items-center justify-between px-3 py-1.5 bg-[#1a1a1a] rounded-lg border border-white/10 text-xs text-[#ff5500]">
                                <span className="truncate">{link}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLink(idx)}
                                  className="text-gray-400 hover:text-white p-1"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Link Input Box */}
                        {showLinkInput && (
                          <div className="flex items-center gap-2 p-2 bg-[#1a1a1a] rounded-xl border border-white/10">
                            <LinkIcon className="w-4 h-4 text-gray-400 ml-1 shrink-0" />
                            <input
                              type="text"
                              placeholder="Paste URL (e.g. https://...)"
                              value={linkInputValue}
                              onChange={e => setLinkInputValue(e.target.value)}
                              className="flex-1 bg-transparent text-xs text-white focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={handleAddLink}
                              className="px-2.5 py-1 bg-[#ff5500] hover:bg-[#ff661a] text-white text-xs font-semibold rounded-lg"
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowLinkInput(false)}
                              className="p-1 text-gray-400 hover:text-white"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Poll Composer Block */}
                        {showPollComposer && (
                          <div className="p-3.5 bg-[#181818] rounded-xl border border-white/10 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#ff5500] flex items-center gap-1.5">
                                <BarChart2 className="w-3.5 h-3.5" />
                                Create a Poll
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowPollComposer(false)}
                                className="text-gray-400 hover:text-white text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                            <input
                              type="text"
                              placeholder="Poll question..."
                              value={pollQuestion}
                              onChange={e => setPollQuestion(e.target.value)}
                              className="w-full bg-[#121212] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500]"
                            />
                            <div className="space-y-1.5">
                              {pollOptions.map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    placeholder={`Option ${idx + 1}`}
                                    value={opt}
                                    onChange={e => handleUpdatePollOption(idx, e.target.value)}
                                    className="flex-1 bg-[#121212] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff5500]"
                                  />
                                  {pollOptions.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemovePollOption(idx)}
                                      className="p-1 text-gray-400 hover:text-red-400"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                            {pollOptions.length < 5 && (
                              <button
                                type="button"
                                onClick={handleAddPollOption}
                                className="text-xs font-semibold text-[#ff5500] hover:underline"
                              >
                                + Add option
                              </button>
                            )}
                          </div>
                        )}

                        {postError && (
                          <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{postError}</span>
                          </div>
                        )}

                        {/* Action Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/5">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setShowMediaUploader(!showMediaUploader)}
                              className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition"
                              title="Attach Media"
                            >
                              <ImageIcon className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowLinkInput(!showLinkInput)}
                              className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition"
                              title="Add Link"
                            >
                              <LinkIcon className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowPollComposer(!showPollComposer)}
                              className="p-2 text-gray-400 hover:text-[#ff5500] hover:bg-white/5 rounded-lg transition"
                              title="Create Poll"
                            >
                              <BarChart2 className="w-4 h-4" />
                            </button>

                            {/* Space Selector for post */}
                            {selectedCommunity.spaces && selectedCommunity.spaces.length > 0 && (
                              <select
                                value={postSpaceId}
                                onChange={e => setPostSpaceId(e.target.value)}
                                className="bg-[#181818] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-gray-300 focus:outline-none focus:border-[#ff5500]"
                              >
                                <option value="">Post to Space...</option>
                                {selectedCommunity.spaces.map(s => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={shareToHome}
                                onChange={e => setShareToHome(e.target.checked)}
                                className="rounded bg-[#1a1a1a] border-white/20 text-[#ff5500] focus:ring-0"
                              />
                              <span>Share to Home</span>
                            </label>

                            <button
                              type="submit"
                              id="submit-community-post-btn"
                              disabled={!postContent.trim() || submittingPost || postCooldownTimer > 0}
                              className="px-4 py-2 bg-[#ff5500] hover:bg-[#ff661a] disabled:opacity-40 disabled:hover:bg-[#ff5500] text-white text-xs font-bold rounded-xl transition shadow-md shadow-[#ff5500]/20 flex items-center gap-1.5 cursor-pointer"
                            >
                              {submittingPost ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : postCooldownTimer > 0 ? (
                                <>
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>{postCooldownTimer}s</span>
                                </>
                              ) : (
                                <span>Post</span>
                              )}
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="py-4 border-b border-[#212634] text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                      <Lock className="w-4 h-4 text-[#ff5500]" />
                      <span>Posting in this community is restricted to community leaders.</span>
                    </div>
                  )}

                  {/* Community Posts Feed */}
                  <div className="space-y-4">
                    {loadingPosts ? (
                      <div className="py-16 text-center text-gray-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#ff5500]" />
                        <p className="text-xs">Loading feed...</p>
                      </div>
                    ) : posts.length === 0 ? (
                      <div className="py-16 text-center text-gray-400">
                        <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30 text-[#ff5500]" />
                        <h4 className="text-sm font-bold text-white mb-1">No posts yet</h4>
                        <p className="text-xs text-gray-500">Be the first to start a conversation in this community</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#1f2533]">
                        {posts.map(post => (
                          <PostCard
                            key={post.id}
                            post={post}
                            onDeletePost={handleDeletePost}
                            onUpdatePost={(updated) => setPosts(prev => prev.map(p => p.id === updated.id ? updated : p))}
                            onPinPost={canModerate ? (id, pin) => handleTogglePinPost(id, !pin) : undefined}
                            onNavigate={onNavigate}
                            onSelectNft={onSelectNft}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ========================================================
          CREATE COMMUNITY MODAL (With 10h cooldown verification)
      ======================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#141414] border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#ff5500]" />
                <h3 className="text-lg font-black text-white">Create a Community</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cooldown Status banner */}
            {checkingCreationStatus ? (
              <div className="p-3 bg-[#181818] rounded-xl border border-white/10 text-xs text-gray-400 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#ff5500]" />
                <span>Checking creation status...</span>
              </div>
            ) : creationStatus && !creationStatus.canCreate ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <Clock className="w-4 h-4" />
                  <span>Creation Cooldown Active</span>
                </div>
                <p>
                  To prevent spam, standard accounts may create one community every {creationStatus.cooldownHours} hours.
                  Remaining cooldown: {Math.ceil(creationStatus.remainingSeconds / 60)} minutes.
                </p>
              </div>
            ) : null}

            <form onSubmit={handleCreateCommunitySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Community Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Cyberpunk Creators"
                  value={newCommunityName}
                  onChange={e => {
                    setNewCommunityName(e.target.value);
                    if (!newCommunityHandle) {
                      setNewCommunityHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
                    }
                  }}
                  required
                  className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#ff5500]"
                />
                {isMintRestricted && (
                  <p className="text-xs text-red-400 font-mono mt-1">That community name is reserved by MINT.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Handle</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-xs">@</span>
                  <input
                    type="text"
                    placeholder="handle"
                    value={newCommunityHandle}
                    onChange={e => setNewCommunityHandle(e.target.value.replace(/^@+/, ''))}
                    className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl pl-8 pr-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#ff5500]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Description</label>
                <textarea
                  placeholder="What is this community about?"
                  value={newCommunityDesc}
                  onChange={e => setNewCommunityDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#ff5500] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Category</label>
                  <select
                    value={newCommunityCategory}
                    onChange={e => setNewCommunityCategory(e.target.value)}
                    className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500]"
                  >
                    <option value="Art">Art & Design</option>
                    <option value="Gaming">Gaming</option>
                    <option value="Collectibles">Collectibles</option>
                    <option value="Music">Music</option>
                    <option value="Photography">Photography</option>
                    <option value="Metaverse">Metaverse</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Avatar Image</label>
                  <ImageUploader
                    onImageUploaded={setNewCommunityAvatar}
                    label={newCommunityAvatar ? 'Change' : 'Upload'}
                  />
                </div>
              </div>

              {createError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-[#1f1f1f] hover:bg-[#282828] text-xs font-semibold text-gray-300 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="confirm-create-community-btn"
                  disabled={creatingCommunity || !newCommunityName.trim() || isMintRestricted || (creationStatus !== null && !creationStatus.canCreate)}
                  className="px-5 py-2 bg-[#ff5500] hover:bg-[#ff661a] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-[#ff5500]/25 flex items-center gap-2"
                >
                  {creatingCommunity ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Create Community</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          COMMUNITY SETTINGS MODAL (Roles, Spaces, Permissions, General)
      ======================================================== */}
      {showSettingsModal && selectedCommunity && (
        <CommunitySettingsModal
          community={selectedCommunity}
          members={members}
          onClose={() => setShowSettingsModal(false)}
          onUpdateCommunity={handleUpdateCommunitySettings}
          onDeleteCommunity={handleDeleteCommunityConfirmed}
          onSaveRole={handleSaveRole}
          onDeleteRole={handleDeleteRole}
          onAssignRole={handleAssignRole}
          onSaveSpace={handleSaveSpace}
          onDeleteSpace={handleDeleteSpace}
        />
      )}

      {/* ========================================================
          COMMUNITY MEMBER PROFILE MODAL (Inspect & manage member)
      ======================================================== */}
      {selectedMemberForProfile && selectedCommunity && (
        <CommunityMemberProfileModal
          member={selectedMemberForProfile}
          communityName={selectedCommunity.name}
          availableRoles={selectedCommunity.roles || []}
          viewerIsOwner={isOwner || false}
          viewerCanModerate={canModerate || false}
          onClose={() => setSelectedMemberForProfile(null)}
          onAssignRole={handleAssignRole}
          onRemoveMember={async userId => {
            await api.removeCommunityMember(selectedCommunity.id, userId);
            setMembers(prev => prev.filter(m => m.userId !== userId));
            setSelectedMemberForProfile(null);
          }}
          onNavigateProfile={username => {
            setSelectedMemberForProfile(null);
            onNavigate(`/profile/${username}`);
          }}
        />
      )}
    </div>
  );
};
