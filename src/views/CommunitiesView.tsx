import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  MessageSquare,
  Heart,
  Send,
  ShieldCheck,
  Settings,
  Globe,
  Twitter,
  MessageCircle,
  SendHorizontal,
  ExternalLink,
  UserCheck,
  UserX,
  Shield,
  Trash2,
  X,
  Info,
  Check,
  AlertCircle
} from 'lucide-react';
import { Community, CommunityMember, CommunityPost } from '../types';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { ImageUploader } from '../components/ImageUploader';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface CommunitiesViewProps {
  onNavigate: (path: string) => void;
}

export const CommunitiesView: React.FC<CommunitiesViewProps> = ({ onNavigate }) => {
  const { user, setShowAuthModal } = useAuth();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [activeTab, setActiveTab] = useState<'discussions' | 'members' | 'about'>('discussions');

  // Posts & Members data
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // New Community modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityDesc, setNewCommunityDesc] = useState('');
  const [newCommunityCategory, setNewCommunityCategory] = useState('Art');
  const [newCommunityAvatar, setNewCommunityAvatar] = useState<string | null>(null);
  const [newCommunityBanner, setNewCommunityBanner] = useState<string | null>(null);
  const [creatingCommunity, setCreatingCommunity] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Settings Modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('Art');
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const [editBanner, setEditBanner] = useState<string | null>(null);
  const [editWebsite, setEditWebsite] = useState('');
  const [editTwitter, setEditTwitter] = useState('');
  const [editDiscord, setEditDiscord] = useState('');
  const [editTelegram, setEditTelegram] = useState('');
  const [editRules, setEditRules] = useState<string[]>([]);
  const [newRuleInput, setNewRuleInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Verification Request Modal
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyJustification, setVerifyJustification] = useState('');
  const [submittingVerify, setSubmittingVerify] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState(false);

  // Post composer
  const [postContent, setPostContent] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);
  const [likedIds, setLikedIds] = useState<string[]>([]);

  // Join/Leave loading
  const [joining, setJoining] = useState(false);

  const isOwner = selectedCommunity && user && selectedCommunity.creatorId === user.id;
  const isAdmin = user && user.role === 'admin';
  const canManage = isOwner || isAdmin;

  const loadData = async () => {
    setLoading(true);
    try {
      const [comRes, myLikesRes] = await Promise.all([
        api.getCommunities(),
        api.getMyLikes().catch(() => ({ likedIds: [] }))
      ]);
      const list = comRes.communities || [];
      setCommunities(list);
      setLikedIds(myLikesRes.likedIds || []);

      if (list.length > 0) {
        setSelectedCommunity(prev => {
          if (!prev) return list[0];
          const found = list.find(c => c.id === prev.id);
          return found || list[0];
        });
      }
    } catch (err) {
      console.error('Failed to load communities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  // Load posts whenever selected community changes
  useEffect(() => {
    if (!selectedCommunity) return;

    const loadPosts = async () => {
      try {
        const res = await api.getFeedPosts({
          communityId: selectedCommunity.id
        });
        setPosts(res.posts || []);
      } catch (err) {
        console.error('Failed to load community posts:', err);
      }
    };
    loadPosts();
  }, [selectedCommunity?.id]);

  // Load members whenever members tab is opened
  useEffect(() => {
    if (!selectedCommunity || activeTab !== 'members') return;

    const loadMembers = async () => {
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
    loadMembers();
  }, [selectedCommunity?.id, activeTab]);

  const handleOpenSettings = () => {
    if (!selectedCommunity) return;
    setEditName(selectedCommunity.name);
    setEditDesc(selectedCommunity.description || '');
    setEditCategory(selectedCommunity.category || 'Art');
    setEditAvatar(selectedCommunity.avatar || null);
    setEditBanner(selectedCommunity.banner || null);
    setEditWebsite(selectedCommunity.socialLinks?.website || '');
    setEditTwitter(selectedCommunity.socialLinks?.twitter || '');
    setEditDiscord(selectedCommunity.socialLinks?.discord || '');
    setEditTelegram(selectedCommunity.socialLinks?.telegram || '');
    setEditRules(selectedCommunity.rules || []);
    setSettingsError(null);
    setShowSettingsModal(true);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommunity || savingSettings) return;

    setSavingSettings(true);
    setSettingsError(null);
    try {
      const res = await api.updateCommunity(selectedCommunity.id, {
        name: editName.trim(),
        description: editDesc.trim(),
        category: editCategory,
        avatar: editAvatar || selectedCommunity.avatar,
        banner: editBanner || undefined,
        socialLinks: {
          website: editWebsite.trim() || undefined,
          twitter: editTwitter.trim() || undefined,
          discord: editDiscord.trim() || undefined,
          telegram: editTelegram.trim() || undefined
        },
        rules: editRules
      });

      setSelectedCommunity(res.community);
      setCommunities(prev => prev.map(c => c.id === res.community.id ? res.community : c));
      setShowSettingsModal(false);
    } catch (err: any) {
      console.error('Update community error:', err);
      setSettingsError(err.message || 'Failed to update community settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddRule = () => {
    if (!newRuleInput.trim()) return;
    setEditRules(prev => [...prev, newRuleInput.trim()]);
    setNewRuleInput('');
  };

  const handleRemoveRule = (index: number) => {
    setEditRules(prev => prev.filter((_, i) => i !== index));
  };

  const handleJoinLeave = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!selectedCommunity || joining) return;

    setJoining(true);
    try {
      if (selectedCommunity.isJoined) {
        const res = await api.leaveCommunity(selectedCommunity.id);
        setSelectedCommunity(res.community);
        setCommunities(prev => prev.map(c => c.id === res.community.id ? res.community : c));
      } else {
        const res = await api.joinCommunity(selectedCommunity.id);
        setSelectedCommunity(res.community);
        setCommunities(prev => prev.map(c => c.id === res.community.id ? res.community : c));
      }
      if (activeTab === 'members') {
        const memRes = await api.getCommunityMembers(selectedCommunity.id);
        setMembers(memRes.members || []);
      }
    } catch (err: any) {
      console.error('Join/Leave error:', err);
      alert(err.message || 'Failed to update membership status.');
    } finally {
      setJoining(false);
    }
  };

  const handleUpdateMemberRole = async (targetUserId: string, currentRole: 'owner' | 'moderator' | 'member') => {
    if (!selectedCommunity || !canManage) return;
    const nextRole = currentRole === 'moderator' ? 'member' : 'moderator';
    try {
      await api.updateCommunityMemberRole(selectedCommunity.id, targetUserId, nextRole);
      setMembers(prev => prev.map(m => m.userId === targetUserId ? { ...m, communityRole: nextRole } : m));
    } catch (err: any) {
      console.error('Role update error:', err);
      alert(err.message || 'Failed to update member role.');
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!selectedCommunity || !canManage) return;
    try {
      await api.removeCommunityMember(selectedCommunity.id, targetUserId);
      setMembers(prev => prev.filter(m => m.userId !== targetUserId));
      setSelectedCommunity(prev => prev ? { ...prev, memberCount: Math.max(1, prev.memberCount - 1) } : null);
      setCommunities(prev => prev.map(c => c.id === selectedCommunity.id ? { ...c, memberCount: Math.max(1, c.memberCount - 1) } : c));
    } catch (err: any) {
      console.error('Remove member error:', err);
      alert(err.message || 'Failed to remove member.');
    }
  };

  const handleRequestVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommunity || submittingVerify) return;

    setSubmittingVerify(true);
    setVerifyError(null);
    try {
      await api.requestCommunityVerification(selectedCommunity.id, verifyJustification);
      setVerifySuccess(true);
      setTimeout(() => {
        setShowVerifyModal(false);
        setVerifySuccess(false);
        setVerifyJustification('');
      }, 2000);
    } catch (err: any) {
      console.error('Verification request error:', err);
      setVerifyError(err.message || 'Failed to submit verification request.');
    } finally {
      setSubmittingVerify(false);
    }
  };

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!newCommunityName.trim() || creatingCommunity) return;

    setCreatingCommunity(true);
    setCreateError(null);
    try {
      const res = await api.createCommunity({
        name: newCommunityName.trim(),
        description: newCommunityDesc.trim(),
        category: newCommunityCategory,
        avatar: newCommunityAvatar || undefined,
        banner: newCommunityBanner || undefined
      });
      setCommunities(prev => [res.community, ...prev]);
      setSelectedCommunity(res.community);
      setShowCreateModal(false);
      setNewCommunityName('');
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

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!postContent.trim() || submittingPost || !selectedCommunity) return;

    setSubmittingPost(true);
    try {
      const res = await api.createPost({
        content: postContent.trim(),
        communityId: selectedCommunity.id
      });
      setPosts(prev => [res.post, ...prev]);
      setPostContent('');
      setSelectedCommunity(prev => prev ? { ...prev, postCount: prev.postCount + 1 } : null);
      setCommunities(prev => prev.map(c => c.id === selectedCommunity.id ? { ...c, postCount: c.postCount + 1 } : c));
    } catch (err) {
      console.error('Create post error:', err);
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    try {
      const res = await api.toggleLike('post', postId);
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            likes: res.likes,
            likedByMe: res.liked
          };
        }
        return p;
      }));
      if (res.liked) {
        setLikedIds(prev => [...prev, postId]);
      } else {
        setLikedIds(prev => prev.filter(id => id !== postId));
      }
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white">
            Communities
          </h1>
          <p className="text-xs sm:text-sm text-[#9ca3af] mt-1">
            Connect with creators, collectors, and builders across specialized Solana spaces.
          </p>
        </div>

        <button
          onClick={() => {
            if (!user) setShowAuthModal(true);
            else {
              setCreateError(null);
              setShowCreateModal(true);
            }
          }}
          className="px-4 py-2 rounded-xl bg-[#ff5500] hover:bg-[#e64d00] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Plus size={15} />
          <span>New Community</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Community Directory Sidebar */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-mono-code text-[#6b7280] uppercase">
            Directory ({communities.length})
          </div>

          {communities.length === 0 && !loading ? (
            <div className="p-6 text-center border border-[#212634] rounded-xl bg-[#11141b] space-y-2">
              <Users size={24} className="mx-auto text-[#6b7280]" />
              <p className="text-xs font-bold text-white">No communities yet</p>
              <p className="text-[11px] text-[#8e97a8]">Be the first to launch a community.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {communities.map(com => {
                const isSelected = selectedCommunity?.id === com.id;
                return (
                  <button
                    key={com.id}
                    onClick={() => setSelectedCommunity(com)}
                    className={`w-full p-3 rounded-xl border text-left transition-colors flex items-center gap-3 ${
                      isSelected
                        ? 'bg-[#181d28] border-[#ff5500] text-white'
                        : 'bg-[#11141b] hover:bg-[#151922] border-[#212634] text-[#8e97a8]'
                    }`}
                  >
                    <img
                      src={com.avatar}
                      alt={com.name}
                      className="w-10 h-10 rounded-xl object-cover border border-[#262c3c] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-white truncate">{com.name}</span>
                        {com.isVerified && <VerifiedBadge size="sm" />}
                      </div>
                      <p className="text-[10px] text-[#6b7280] truncate mt-0.5">
                        {com.category} • {com.memberCount} {com.memberCount === 1 ? 'member' : 'members'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Selected Community View */}
        <div className="lg:col-span-8 space-y-4">
          {selectedCommunity ? (
            <div className="space-y-4">
              {/* Community Banner & Profile Card */}
              <div className="rounded-2xl bg-[#11141b] border border-[#212634] overflow-hidden">
                <div className="h-28 sm:h-36 w-full bg-[#0d1017] relative overflow-hidden">
                  {selectedCommunity.banner ? (
                    <img
                      src={selectedCommunity.banner}
                      alt={selectedCommunity.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-[#ff5500]/20 via-[#1a202c] to-[#0d1017]" />
                  )}
                </div>

                <div className="px-5 pb-5 -mt-10 sm:-mt-12 relative flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="flex items-end gap-3.5">
                    <img
                      src={selectedCommunity.avatar}
                      alt={selectedCommunity.name}
                      className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl object-cover border-4 border-[#11141b] shadow-2xl bg-black shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg sm:text-xl font-bold text-white truncate">
                          {selectedCommunity.name}
                        </h2>
                        {selectedCommunity.isVerified && <VerifiedBadge size="sm" />}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-mono-code text-[#8e97a8] mt-0.5">
                        <span className="text-[#ff5500]">{selectedCommunity.category}</span>
                        <span>•</span>
                        <span>{selectedCommunity.memberCount} {selectedCommunity.memberCount === 1 ? 'member' : 'members'}</span>
                        <span>•</span>
                        <span>{selectedCommunity.postCount || 0} posts</span>
                      </div>

                      <div className="text-[11px] font-mono-code text-[#6b7280] mt-0.5">
                        Created by{' '}
                        <button
                          onClick={() => onNavigate(`creator/${selectedCommunity.creatorUsername}`)}
                          className="text-[#ff8c4d] hover:underline"
                        >
                          @{selectedCommunity.creatorUsername}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
                    {/* Join / Leave button (disabled for owner) */}
                    {isOwner ? (
                      <span className="px-3 py-1.5 rounded-xl bg-[#181d28] border border-[#262c3c] text-xs font-mono-code text-[#ff8c4d]">
                        Owner
                      </span>
                    ) : (
                      <button
                        onClick={handleJoinLeave}
                        disabled={joining}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                          selectedCommunity.isJoined
                            ? 'bg-[#181d28] hover:bg-red-950/40 hover:text-red-300 border border-[#262c3c] text-[#8e97a8]'
                            : 'bg-[#ff5500] hover:bg-[#e64d00] text-white'
                        }`}
                      >
                        {joining ? 'Updating...' : (selectedCommunity.isJoined ? 'Joined' : 'Join')}
                      </button>
                    )}

                    {/* Community Settings */}
                    {canManage && (
                      <button
                        onClick={handleOpenSettings}
                        className="p-2 rounded-xl bg-[#181d28] hover:bg-[#202737] border border-[#262c3c] text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                        title="Community Settings"
                        aria-label="Community Settings"
                      >
                        <Settings size={14} />
                        <span className="hidden sm:inline">Settings</span>
                      </button>
                    )}

                    {/* Community Verification Request */}
                    {canManage && !selectedCommunity.isVerified && (
                      <button
                        onClick={() => {
                          setVerifyError(null);
                          setVerifySuccess(false);
                          setShowVerifyModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#181d28] hover:bg-[#202737] border border-[#262c3c] text-[#ff8c4d] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        title="Request Community Verification"
                      >
                        <ShieldCheck size={14} />
                        <span>Verify</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-Navigation Tabs */}
                <div className="flex items-center gap-2 px-5 border-t border-[#1e2330] bg-[#0c0f14]/50">
                  <button
                    onClick={() => setActiveTab('discussions')}
                    className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
                      activeTab === 'discussions'
                        ? 'border-[#ff5500] text-white'
                        : 'border-transparent text-[#8e97a8] hover:text-white'
                    }`}
                  >
                    Discussions
                  </button>
                  <button
                    onClick={() => setActiveTab('members')}
                    className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
                      activeTab === 'members'
                        ? 'border-[#ff5500] text-white'
                        : 'border-transparent text-[#8e97a8] hover:text-white'
                    }`}
                  >
                    Members ({selectedCommunity.memberCount})
                  </button>
                  <button
                    onClick={() => setActiveTab('about')}
                    className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
                      activeTab === 'about'
                        ? 'border-[#ff5500] text-white'
                        : 'border-transparent text-[#8e97a8] hover:text-white'
                    }`}
                  >
                    About
                  </button>
                </div>
              </div>

              {/* Tab 1: Discussions */}
              {activeTab === 'discussions' && (
                <div className="space-y-4">
                  {/* Post Composer */}
                  {user && (
                    <form onSubmit={handleCreatePost} className="bg-[#11141b] border border-[#212634] rounded-xl p-4 space-y-3">
                      <textarea
                        value={postContent}
                        onChange={e => setPostContent(e.target.value)}
                        placeholder={`Share an update in ${selectedCommunity.name}...`}
                        rows={2}
                        className="w-full bg-[#161a24] border border-[#232a3a] rounded-lg p-2.5 text-xs text-white placeholder-[#525a6c] focus:outline-none focus:border-[#ff5500] resize-none"
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={!postContent.trim() || submittingPost}
                          className="px-4 py-1.5 rounded-lg bg-[#ff5500] hover:bg-[#e64d00] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Send size={12} />
                          <span>{submittingPost ? 'Posting...' : 'Post'}</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Community Posts */}
                  {posts.length === 0 ? (
                    <div className="py-12 text-center border border-[#212634] rounded-xl bg-[#11141b] p-6 space-y-2">
                      <MessageSquare size={24} className="mx-auto text-[#6b7280]" />
                      <p className="text-xs font-bold text-white">No discussions yet</p>
                      <p className="text-[11px] text-[#8e97a8]">Start the first conversation in {selectedCommunity.name}.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {posts.map(post => {
                        const isLiked = post.likedByMe || likedIds.includes(post.id);
                        return (
                          <div key={post.id} className="bg-[#11141b] border border-[#212634] rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={post.authorAvatar}
                                alt={post.authorUsername}
                                className="w-8 h-8 rounded-full object-cover border border-[#232938]"
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => onNavigate(`creator/${post.authorUsername}`)}
                                    className="text-xs font-bold text-white hover:text-[#ff5500] transition-colors"
                                  >
                                    {post.authorDisplayName}
                                  </button>
                                  {post.authorVerified && <VerifiedBadge size="sm" />}
                                  <span className="text-[11px] font-mono-code text-[#6b7280]">@{post.authorUsername}</span>
                                </div>
                                <span className="text-[10px] font-mono-code text-[#525a6c]">
                                  {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>

                            <p className="text-xs sm:text-sm text-[#d1d5db] leading-relaxed whitespace-pre-line">
                              {post.content}
                            </p>

                            <div className="flex items-center gap-4 pt-2 border-t border-[#1b202c]">
                              <button
                                onClick={() => handleLike(post.id)}
                                className={`flex items-center gap-1.5 text-xs font-mono-code transition-colors ${
                                  isLiked ? 'text-red-500 font-bold' : 'text-[#8e97a8] hover:text-white'
                                }`}
                              >
                                <Heart size={14} className={isLiked ? 'fill-current text-red-500' : ''} />
                                <span>{post.likes || 0}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Members View */}
              {activeTab === 'members' && (
                <div className="bg-[#11141b] border border-[#212634] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Community Members</h3>
                      <p className="text-xs text-[#8e97a8] mt-0.5">
                        Active community participants and moderators.
                      </p>
                    </div>
                  </div>

                  {loadingMembers ? (
                    <div className="py-12 text-center text-xs font-mono-code text-[#8e97a8]">
                      Loading members...
                    </div>
                  ) : members.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#6b7280]">
                      No members found.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#1e2430]">
                      {members.map(member => {
                        const isMemberOwner = member.communityRole === 'owner' || member.userId === selectedCommunity.creatorId;
                        const isMemberMod = member.communityRole === 'moderator';

                        return (
                          <div key={member.id || member.userId} className="py-3 flex items-center justify-between gap-3">
                            {/* Member info - clicking takes to profile */}
                            <button
                              onClick={() => onNavigate(`creator/${member.user.username}`)}
                              className="flex items-center gap-3 text-left min-w-0 hover:opacity-80 transition-opacity"
                            >
                              <img
                                src={member.user.avatar}
                                alt={member.user.displayName}
                                className="w-10 h-10 rounded-xl object-cover border border-[#262c3c] shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-white truncate">
                                    {member.user.displayName}
                                  </span>
                                  {/* Checkmark ONLY on verified user accounts */}
                                  {member.user.isVerified && <VerifiedBadge size="sm" />}
                                </div>
                                <div className="text-[11px] font-mono-code text-[#8e97a8] truncate">
                                  @{member.user.username}
                                </div>
                              </div>
                            </button>

                            {/* Role and Management Controls */}
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Role Badge */}
                              <span className={`text-[10px] font-mono-code uppercase px-2 py-0.5 rounded border ${
                                isMemberOwner
                                  ? 'bg-amber-950/40 border-amber-800/50 text-amber-300'
                                  : isMemberMod
                                  ? 'bg-blue-950/40 border-blue-800/50 text-blue-300'
                                  : 'bg-[#181d28] border-[#262c3c] text-[#8e97a8]'
                              }`}>
                                {isMemberOwner ? 'Owner' : isMemberMod ? 'Moderator' : 'Member'}
                              </span>

                              {/* Owner/Admin actions on non-owner members */}
                              {canManage && !isMemberOwner && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleUpdateMemberRole(member.userId, member.communityRole)}
                                    className="p-1.5 rounded-lg bg-[#181d28] hover:bg-[#202737] border border-[#262c3c] text-[#8e97a8] hover:text-white text-xs transition-colors"
                                    title={isMemberMod ? 'Remove Moderator role' : 'Make Moderator'}
                                  >
                                    <Shield size={13} className={isMemberMod ? 'text-blue-400' : ''} />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveMember(member.userId)}
                                    className="p-1.5 rounded-lg bg-[#181d28] hover:bg-red-950/40 hover:text-red-400 border border-[#262c3c] text-[#8e97a8] text-xs transition-colors"
                                    title="Remove from community"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: About View */}
              {activeTab === 'about' && (
                <div className="bg-[#11141b] border border-[#212634] rounded-2xl p-5 space-y-6">
                  {/* Bio / Description */}
                  <div>
                    <h4 className="text-xs font-mono-code text-[#6b7280] uppercase mb-2">Description</h4>
                    <p className="text-xs text-[#d1d5db] leading-relaxed whitespace-pre-line">
                      {selectedCommunity.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Social Links */}
                  {selectedCommunity.socialLinks && Object.values(selectedCommunity.socialLinks).some(Boolean) && (
                    <div>
                      <h4 className="text-xs font-mono-code text-[#6b7280] uppercase mb-2">Community Links</h4>
                      <div className="flex flex-wrap gap-2.5">
                        {selectedCommunity.socialLinks.website && (
                          <a
                            href={selectedCommunity.socialLinks.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-[#181d28] border border-[#262c3c] text-xs text-white hover:text-[#ff5500] flex items-center gap-1.5 transition-colors"
                          >
                            <Globe size={13} />
                            <span>Website</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                        {selectedCommunity.socialLinks.twitter && (
                          <a
                            href={selectedCommunity.socialLinks.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-[#181d28] border border-[#262c3c] text-xs text-white hover:text-[#ff5500] flex items-center gap-1.5 transition-colors"
                          >
                            <Twitter size={13} />
                            <span>Twitter / X</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                        {selectedCommunity.socialLinks.discord && (
                          <a
                            href={selectedCommunity.socialLinks.discord}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-[#181d28] border border-[#262c3c] text-xs text-white hover:text-[#ff5500] flex items-center gap-1.5 transition-colors"
                          >
                            <MessageCircle size={13} />
                            <span>Discord</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                        {selectedCommunity.socialLinks.telegram && (
                          <a
                            href={selectedCommunity.socialLinks.telegram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-[#181d28] border border-[#262c3c] text-xs text-white hover:text-[#ff5500] flex items-center gap-1.5 transition-colors"
                          >
                            <SendHorizontal size={13} />
                            <span>Telegram</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Community Rules */}
                  {selectedCommunity.rules && selectedCommunity.rules.length > 0 && (
                    <div>
                      <h4 className="text-xs font-mono-code text-[#6b7280] uppercase mb-2">Community Rules</h4>
                      <ol className="space-y-2 list-decimal list-inside text-xs text-[#d1d5db]">
                        {selectedCommunity.rules.map((rule, idx) => (
                          <li key={idx} className="leading-relaxed pl-1">
                            {rule}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="py-20 text-center border border-[#212634] rounded-xl bg-[#11141b] space-y-2">
              <Users size={28} className="mx-auto text-[#6b7280]" />
              <p className="text-sm font-bold text-white">Select a Community</p>
              <p className="text-xs text-[#8e97a8]">Choose a community from the directory to view discussions.</p>
            </div>
          )}
        </div>
      </div>

      {/* 1. Community Settings Modal (Owner / Admin) */}
      {showSettingsModal && selectedCommunity && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-[#11141a] border border-[#232938] rounded-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#1f2430]">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-[#ff5500]" />
                <h3 className="text-base font-bold text-white">Community Settings</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg text-[#8e97a8] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {settingsError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{settingsError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono-code text-[#8e97a8] uppercase mb-1">
                    Community Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-[#161a24] border border-[#232a3a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono-code text-[#8e97a8] uppercase mb-1">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value)}
                    className="w-full bg-[#161a24] border border-[#232a3a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500]"
                  >
                    <option value="Art">Art & Collectibles</option>
                    <option value="Gaming">Gaming & Metaverse</option>
                    <option value="DAO">DAO & Governance</option>
                    <option value="Builders">Solana Builders</option>
                    <option value="General">General Discussion</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono-code text-[#8e97a8] uppercase mb-1">
                  Description / Bio
                </label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  className="w-full bg-[#161a24] border border-[#232a3a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500] resize-none"
                />
              </div>

              {/* Image Uploads */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <ImageUploader
                    id="com-avatar-upload"
                    label="Community Profile Image"
                    value={editAvatar}
                    onChange={url => setEditAvatar(url)}
                    aspectRatio="square"
                    maxSizeMB={5}
                  />
                </div>
                <div>
                  <ImageUploader
                    id="com-banner-upload"
                    label="Community Header Banner"
                    value={editBanner}
                    onChange={url => setEditBanner(url)}
                    aspectRatio="banner"
                    maxSizeMB={10}
                  />
                </div>
              </div>

              {/* Social Links */}
              <div className="space-y-2 pt-2 border-t border-[#1e2330]">
                <span className="block text-[11px] font-mono-code text-[#8e97a8] uppercase">
                  Social Links
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="url"
                    placeholder="Website URL"
                    value={editWebsite}
                    onChange={e => setEditWebsite(e.target.value)}
                    className="bg-[#161a24] border border-[#232a3a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500]"
                  />
                  <input
                    type="text"
                    placeholder="Twitter URL / Handle"
                    value={editTwitter}
                    onChange={e => setEditTwitter(e.target.value)}
                    className="bg-[#161a24] border border-[#232a3a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500]"
                  />
                  <input
                    type="url"
                    placeholder="Discord Invite"
                    value={editDiscord}
                    onChange={e => setEditDiscord(e.target.value)}
                    className="bg-[#161a24] border border-[#232a3a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500]"
                  />
                  <input
                    type="url"
                    placeholder="Telegram Group"
                    value={editTelegram}
                    onChange={e => setEditTelegram(e.target.value)}
                    className="bg-[#161a24] border border-[#232a3a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500]"
                  />
                </div>
              </div>

              {/* Community Rules */}
              <div className="space-y-2 pt-2 border-t border-[#1e2330]">
                <span className="block text-[11px] font-mono-code text-[#8e97a8] uppercase">
                  Community Rules
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a community guideline..."
                    value={newRuleInput}
                    onChange={e => setNewRuleInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddRule(); }}}
                    className="flex-1 bg-[#161a24] border border-[#232a3a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500]"
                  />
                  <button
                    type="button"
                    onClick={handleAddRule}
                    className="px-3 py-2 rounded-lg bg-[#181d28] hover:bg-[#202737] border border-[#262c3c] text-white text-xs font-semibold"
                  >
                    Add
                  </button>
                </div>
                {editRules.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {editRules.map((rule, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-[#141822] text-xs text-white">
                        <span>{idx + 1}. {rule}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRule(idx)}
                          className="text-[#8e97a8] hover:text-red-400 p-1"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#1e2330]">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#181d28] text-xs text-[#8e97a8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-5 py-2 rounded-xl bg-[#ff5500] hover:bg-[#e64d00] disabled:opacity-50 text-white font-bold text-xs"
                >
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Community Verification Request Modal */}
      {showVerifyModal && selectedCommunity && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#11141a] border border-[#232938] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1f2430]">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#ff5500]" />
                <h3 className="text-base font-bold text-white">Verify Community</h3>
              </div>
              <button
                onClick={() => setShowVerifyModal(false)}
                className="p-1 rounded-lg text-[#8e97a8] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {verifySuccess ? (
              <div className="py-6 text-center space-y-2">
                <Check size={32} className="mx-auto text-emerald-400" />
                <p className="text-sm font-bold text-white">Verification Request Submitted</p>
                <p className="text-xs text-[#8e97a8]">Our protocol operators will review your community.</p>
              </div>
            ) : (
              <form onSubmit={handleRequestVerification} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-[#141822] border border-[#242b3b] space-y-1.5 text-xs text-[#8e97a8]">
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <Info size={13} className="text-[#ff5500]" />
                    <span>Verification Requirements</span>
                  </p>
                  <p>1. Your creator account must already be verified.</p>
                  <p>2. Standard creators can have at most 1 verified community.</p>
                </div>

                {verifyError && (
                  <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle size={14} />
                    <span>{verifyError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-mono-code text-[#8e97a8] uppercase mb-1">
                    Justification / Background
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={verifyJustification}
                    onChange={e => setVerifyJustification(e.target.value)}
                    placeholder="Describe the community mission, roadmap, or official affiliation..."
                    className="w-full bg-[#161a24] border border-[#232a3a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500] resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowVerifyModal(false)}
                    className="px-4 py-2 rounded-xl bg-[#181d28] text-xs text-[#8e97a8] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!verifyJustification.trim() || submittingVerify}
                    className="px-5 py-2 rounded-xl bg-[#ff5500] hover:bg-[#e64d00] disabled:opacity-50 text-white font-bold text-xs"
                  >
                    {submittingVerify ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 3. Create Community Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#11141a] border border-[#232938] rounded-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#1f2430]">
              <h3 className="text-base font-bold text-white">Create New Community</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-[#8e97a8] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCommunity} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono-code text-[#8e97a8] uppercase mb-1">
                    Community Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newCommunityName}
                    onChange={e => setNewCommunityName(e.target.value)}
                    placeholder="e.g. Pixel Art Collective"
                    className="w-full bg-[#161a24] border border-[#232a3a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono-code text-[#8e97a8] uppercase mb-1">
                    Category
                  </label>
                  <select
                    value={newCommunityCategory}
                    onChange={e => setNewCommunityCategory(e.target.value)}
                    className="w-full bg-[#161a24] border border-[#232a3a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500]"
                  >
                    <option value="Art">Art & Collectibles</option>
                    <option value="Gaming">Gaming & Metaverse</option>
                    <option value="DAO">DAO & Governance</option>
                    <option value="Builders">Solana Builders</option>
                    <option value="General">General Discussion</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono-code text-[#8e97a8] uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newCommunityDesc}
                  onChange={e => setNewCommunityDesc(e.target.value)}
                  placeholder="What is this community about?"
                  className="w-full bg-[#161a24] border border-[#232a3a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500] resize-none"
                />
              </div>

              {/* Uploads */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <ImageUploader
                    id="new-com-avatar"
                    label="Profile Icon"
                    value={newCommunityAvatar}
                    onChange={url => setNewCommunityAvatar(url)}
                    aspectRatio="square"
                    maxSizeMB={5}
                  />
                </div>
                <div>
                  <ImageUploader
                    id="new-com-banner"
                    label="Header Banner"
                    value={newCommunityBanner}
                    onChange={url => setNewCommunityBanner(url)}
                    aspectRatio="banner"
                    maxSizeMB={10}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1e2330]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#181d28] text-xs text-[#8e97a8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newCommunityName.trim() || creatingCommunity}
                  className="px-5 py-2 rounded-xl bg-[#ff5500] hover:bg-[#e64d00] disabled:opacity-50 text-xs font-bold text-white"
                >
                  {creatingCommunity ? 'Creating...' : 'Create Community'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
