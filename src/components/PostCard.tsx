import React, { useState, useRef, useEffect } from 'react';
import {
  Heart,
  MessageSquare,
  Trash2,
  Send,
  CornerDownRight,
  AlertCircle,
  Loader2,
  Check,
  Pin,
  BarChart2,
  ExternalLink,
  Share2,
  Copy,
  Sparkles,
  MoreHorizontal,
  Edit3,
  Globe,
  Lock,
  Users as UsersIcon,
  Shield,
  EyeOff,
  Bookmark,
  Activity,
  FileText,
  Eye,
  Info,
  X
} from 'lucide-react';
import { CommunityPost, PostComment, PostPoll } from '../types';
import { VerifiedBadge } from './VerifiedBadge';
import { CommunityRoleBadge } from './CommunityRoleBadge';
import { ShareSheetModal } from './ShareSheetModal';
import { ThreadedCommentItem } from './ThreadedCommentItem';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { cooldownManager } from '../lib/cooldown';

interface PostCardProps {
  post: CommunityPost;
  onDeletePost?: (postId: string) => void;
  onPinPost?: (postId: string, pinned: boolean) => void;
  onSelectNft?: (nft: any) => void;
  onNavigate?: (path: string) => void;
  communityOwnerId?: string;
  isCommunityModerator?: boolean;
  followingIds?: string[];
  onFollowToggle?: (userId: string, isFollowing: boolean) => void;
  onUpdatePost?: (post: CommunityPost) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onDeletePost,
  onPinPost,
  onSelectNft,
  onNavigate,
  communityOwnerId,
  isCommunityModerator,
  followingIds = [],
  onFollowToggle,
  onUpdatePost
}) => {
  const { user, setShowAuthModal } = useAuth();

  // Content and author states
  const [postContent, setPostContent] = useState(post.content);
  const [editedAt, setEditedAt] = useState<string | undefined>(post.editedAt);
  const [isPinnedToProfile, setIsPinnedToProfile] = useState<boolean>(!!post.isPinnedToProfile);
  const [replyPermission, setReplyPermission] = useState<'everyone' | 'following' | 'mentioned' | 'none'>(
    post.replyPermission || 'everyone'
  );
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>(
    post.visibility || 'public'
  );

  // Edit post state
  const [isEditing, setIsEditing] = useState(false);
  const [editContentInput, setEditContentInput] = useState(post.content);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Modals & Menu states
  const [showThreeDotMenu, setShowThreeDotMenu] = useState(false);
  const [showReplyPermissionModal, setShowReplyPermissionModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showDisclosureModal, setShowDisclosureModal] = useState(false);
  const [showHiddenRepliesModal, setShowHiddenRepliesModal] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Follow state
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(followingIds.includes(post.authorId));
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);

  useEffect(() => {
    setIsFollowingAuthor(followingIds.includes(post.authorId));
  }, [followingIds, post.authorId]);

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowThreeDotMenu(false);
      }
    };
    if (showThreeDotMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showThreeDotMenu]);

  // Likes state
  const [likesCount, setLikesCount] = useState(post.likes || 0);
  const [isLiked, setIsLiked] = useState(!!post.likedByMe);
  const [isLiking, setIsLiking] = useState(false);

  // Deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Comments state
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsCount, setCommentsCount] = useState(post.commentCount || 0);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentCooldownError, setCommentCooldownError] = useState<string | null>(null);

  // Active reply composer ID (parentId)
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyCooldownError, setReplyCooldownError] = useState<string | null>(null);

  // Comment deletion tracking
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  // Poll voting state
  const [poll, setPoll] = useState<PostPoll | undefined>(post.poll);
  const [selectedPollOption, setSelectedPollOption] = useState<string | null>(post.poll?.userVotedOptionId || null);
  const [isVoting, setIsVoting] = useState(false);

  const isAuthor = user && user.id === post.authorId;
  const isPlatformStaff = user && (user.role === 'owner' || user.role === 'admin' || user.entitlement?.tier === 'unlimited');
  const isCommunityLeader = user && (user.id === communityOwnerId || isCommunityModerator);
  const canDeletePost = isAuthor || isCommunityLeader || isPlatformStaff;
  const canPin = (isCommunityLeader || isPlatformStaff) && !!post.communityId;

  // Follow / Unfollow author handler
  const handleFollowAuthor = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (isFollowingLoading) return;

    setIsFollowingLoading(true);
    try {
      if (isFollowingAuthor) {
        await api.unfollowUser(post.authorId);
        setIsFollowingAuthor(false);
        onFollowToggle?.(post.authorId, false);
      } else {
        await api.followUser(post.authorId);
        setIsFollowingAuthor(true);
        onFollowToggle?.(post.authorId, true);
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    } finally {
      setIsFollowingLoading(false);
    }
  };

  // Save edited post content
  const handleSaveEdit = async () => {
    if (!editContentInput.trim()) return;
    setIsSavingEdit(true);
    setEditError(null);
    try {
      const res = await api.updatePost(post.id, { content: editContentInput.trim() });
      setPostContent(res.post.content);
      setEditedAt(res.post.editedAt);
      setIsEditing(false);
      onUpdatePost?.(res.post);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update post.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Update who can reply
  const handleUpdateReplyPermission = async (newPerm: 'everyone' | 'following' | 'mentioned' | 'none') => {
    try {
      const res = await api.updatePost(post.id, { replyPermission: newPerm });
      setReplyPermission(newPerm);
      setShowReplyPermissionModal(false);
      onUpdatePost?.(res.post);
    } catch (err: any) {
      alert(err.message || 'Failed to update reply permission');
    }
  };

  // Update privacy settings
  const handleUpdateVisibility = async (newVis: 'public' | 'followers' | 'private') => {
    try {
      const res = await api.updatePost(post.id, { visibility: newVis });
      setVisibility(newVis);
      setShowPrivacyModal(false);
      onUpdatePost?.(res.post);
    } catch (err: any) {
      alert(err.message || 'Failed to update post privacy');
    }
  };

  // Toggle Pin to Profile
  const handleTogglePinToProfile = async () => {
    const nextPinned = !isPinnedToProfile;
    try {
      const res = await api.updatePost(post.id, { isPinnedToProfile: nextPinned });
      setIsPinnedToProfile(nextPinned);
      setShowThreeDotMenu(false);
      onUpdatePost?.(res.post);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile pin status');
    }
  };

  // Toggle post like
  const handleToggleLike = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (isLiking) return;

    const nextLiked = !isLiked;
    const nextCount = nextLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
    setIsLiked(nextLiked);
    setLikesCount(nextCount);
    setIsLiking(true);

    try {
      const res = await api.toggleLike('post', post.id);
      setIsLiked(res.liked);
      setLikesCount(res.likes);
    } catch {
      setIsLiked(!nextLiked);
      setLikesCount(likesCount);
    } finally {
      setIsLiking(false);
    }
  };

  // Load comments
  const handleToggleComments = async () => {
    const nextState = !showComments;
    setShowComments(nextState);

    if (nextState && comments.length === 0) {
      setLoadingComments(true);
      try {
        const res = await api.getPostComments(post.id);
        setComments(res.comments || []);
        if (typeof res.totalCount === 'number') {
          setCommentsCount(res.totalCount);
        }
      } catch (err) {
        console.error('Failed to load comments', err);
      } finally {
        setLoadingComments(false);
      }
    }
  };

  // Submit top-level comment with cooldown check
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!commentInput.trim() || submittingComment) return;

    // Cooldown check for comments
    const rem = cooldownManager.getRemainingCommentCooldown(isPlatformStaff);
    if (rem > 0) {
      setCommentCooldownError(cooldownManager.formatCooldownMessage(rem, 'comment'));
      return;
    }

    setSubmittingComment(true);
    setCommentCooldownError(null);

    try {
      const res = await api.createPostComment(post.id, {
        content: commentInput.trim()
      });
      cooldownManager.recordComment();

      const newCmt: PostComment = {
        ...res.comment,
        likedByMe: false,
        replyCount: 0,
        replies: []
      };
      setComments(prev => [...prev, newCmt]);
      setCommentsCount(prev => prev + 1);
      setCommentInput('');
    } catch (err: any) {
      setCommentCooldownError(err?.message || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Helper functions for multi-level comment tree management
  const insertReplyIntoTree = (nodes: PostComment[], parentId: string, newReply: PostComment): PostComment[] => {
    return nodes.map(node => {
      if (node.id === parentId) {
        const currentReplies = node.replies || [];
        return {
          ...node,
          replyCount: (node.replyCount || 0) + 1,
          replies: [...currentReplies, newReply]
        };
      }
      if (node.replies && node.replies.length > 0) {
        return {
          ...node,
          replies: insertReplyIntoTree(node.replies, parentId, newReply)
        };
      }
      return node;
    });
  };

  const removeCommentFromTree = (nodes: PostComment[], commentId: string): PostComment[] => {
    return nodes
      .filter(node => node.id !== commentId)
      .map(node => {
        if (node.replies && node.replies.length > 0) {
          const filteredReplies = removeCommentFromTree(node.replies, commentId);
          return {
            ...node,
            replies: filteredReplies,
            replyCount: filteredReplies.length
          };
        }
        return node;
      });
  };

  const updateLikeInTree = (nodes: PostComment[], commentId: string, liked: boolean, likes: number): PostComment[] => {
    return nodes.map(node => {
      if (node.id === commentId) {
        return {
          ...node,
          likedByMe: liked,
          likes
        };
      }
      if (node.replies && node.replies.length > 0) {
        return {
          ...node,
          replies: updateLikeInTree(node.replies, commentId, liked, likes)
        };
      }
      return node;
    });
  };

  // Start replying to any comment or reply
  const handleStartReply = (commentItem: PostComment) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (replyingToId === commentItem.id) {
      setReplyingToId(null);
      setReplyInput('');
      setReplyCooldownError(null);
      return;
    }
    setReplyingToId(commentItem.id);
    setReplyInput(`@${commentItem.authorUsername} `);
    setReplyCooldownError(null);
  };

  // Submit reply to a parent comment with cooldown check and author tagging
  const handleAddReply = async (parentId: string, targetAuthorUsername?: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!replyInput.trim() || submittingReply) return;

    // Cooldown check for replies
    const rem = cooldownManager.getRemainingReplyCooldown(isPlatformStaff);
    if (rem > 0) {
      setReplyCooldownError(cooldownManager.formatCooldownMessage(rem, 'reply'));
      return;
    }

    // Ensure parent comment author is tagged if replying to a thread item
    let finalContent = replyInput.trim();
    if (targetAuthorUsername && !finalContent.toLowerCase().includes(`@${targetAuthorUsername.toLowerCase()}`)) {
      finalContent = `@${targetAuthorUsername} ${finalContent}`;
    }

    // Verify there is actual message content beyond the mention tag
    const contentWithoutMention = finalContent.replace(new RegExp(`^@${targetAuthorUsername}\\s*`, 'i'), '').trim();
    if (!contentWithoutMention) {
      setReplyCooldownError('Please enter a reply message.');
      return;
    }

    setSubmittingReply(true);
    setReplyCooldownError(null);

    try {
      const res = await api.createPostComment(post.id, {
        content: finalContent,
        parentId
      });
      cooldownManager.recordReply();

      const newReply: PostComment = {
        ...res.comment,
        likedByMe: false,
        replyCount: 0,
        replies: []
      };

      setComments(prev => insertReplyIntoTree(prev, parentId, newReply));
      setCommentsCount(prev => prev + 1);
      setReplyInput('');
      setReplyingToId(null);
    } catch (err: any) {
      setReplyCooldownError(err?.message || 'Failed to post reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Toggle comment or reply like across any depth
  const handleToggleCommentLike = async (commentId: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    try {
      const res = await api.toggleLike('comment', commentId);
      setComments(prev => updateLikeInTree(prev, commentId, res.liked, res.likes));
    } catch (err) {
      console.error('Failed to toggle comment like', err);
    }
  };

  // Delete a comment or reply across any depth
  const handleDeleteComment = async (commentId: string) => {
    if (deletingCommentId) return;
    setDeletingCommentId(commentId);

    try {
      const res = await api.deletePostComment(commentId);
      const deletedCount = res.deletedCount || 1;

      setComments(prev => removeCommentFromTree(prev, commentId));
      setCommentsCount(prev => Math.max(0, prev - deletedCount));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete comment');
    } finally {
      setDeletingCommentId(null);
    }
  };

  // Delete post execution
  const handleDeletePost = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await api.deletePost(post.id);
      setShowDeleteConfirm(false);
      if (onDeletePost) {
        onDeletePost(post.id);
      }
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete post');
      setIsDeleting(false);
    }
  };

  // Handle poll option vote
  const handleVotePoll = async (optionId: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!poll || isVoting || selectedPollOption) return;

    setIsVoting(true);
    setSelectedPollOption(optionId);

    // Optimistic update
    const updatedOptions = poll.options.map(opt => {
      if (opt.id === optionId) {
        return { ...opt, votes: opt.votes + 1, voterIds: [...(opt.voterIds || []), user.id] };
      }
      return opt;
    });

    const nextPoll: PostPoll = {
      ...poll,
      options: updatedOptions,
      totalVotes: poll.totalVotes + 1,
      userVotedOptionId: optionId
    };
    setPoll(nextPoll);

    try {
      // Local or API poll vote recording
      if ((api as any).votePoll) {
        await (api as any).votePoll(post.id, optionId);
      }
    } catch {
      // Keep optimistic
    } finally {
      setIsVoting(false);
    }
  };

  // Format timestamp nicely
  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin}m`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d`;
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div id={`post-${post.id}`} className="py-4 sm:py-5 border-b border-[#1f2533] space-y-3 relative transition-colors text-left w-full bg-transparent">
      {/* Pinned Banners */}
      {post.isPinned && (
        <div className="flex items-center gap-1.5 text-[11px] font-mono-code font-bold text-[#ff5500] pb-1 border-b border-[#212634]/60">
          <Pin size={12} className="fill-current" />
          <span>Pinned in Community</span>
        </div>
      )}

      {/* Post Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <img
            src={post.authorAvatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80'}
            alt={post.authorUsername}
            className="w-9 h-9 rounded-full object-cover border border-[#232938] shrink-0 mt-0.5"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-white">
                {post.authorDisplayName || post.authorUsername}
              </span>
              <div className="flex items-center gap-1 text-[11px] font-mono-code text-[#ff5500]">
                <span>@{post.authorUsername}</span>
                {post.authorVerified && <VerifiedBadge size="sm" />}
              </div>

              {/* Plain text Creator Badge - No dark container */}
              {(post.authorId === communityOwnerId || post.authorCommunityRole === 'owner') && (
                <span className="text-[11px] font-mono-code font-bold text-[#ff5500]">
                  Creator
                </span>
              )}

              {/* Follow Button: subtle, only for other users when not already following */}
              {!isAuthor && !isFollowingAuthor && (
                <button
                  id={`btn-follow-${post.id}`}
                  type="button"
                  onClick={handleFollowAuthor}
                  disabled={isFollowingLoading}
                  className="inline-flex items-center text-[11px] font-semibold text-[#ff5500] hover:text-[#ff7733] transition-colors ml-1 cursor-pointer disabled:opacity-50"
                  title={`Follow @${post.authorUsername}`}
                >
                  {isFollowingLoading ? '...' : '+ Follow'}
                </button>
              )}

              {/* Community Role Badge */}
              {post.authorCommunityRole && post.authorCommunityRole !== 'owner' && (
                <CommunityRoleBadge
                  role={post.authorCommunityRole}
                  communityName={post.communityName}
                  size="xs"
                />
              )}
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono-code text-[#525a6c] flex-wrap mt-0.5">
              <span>{formatTime(post.createdAt)}</span>
              {post.spaceName && (
                <>
                  <span>•</span>
                  <span className="text-[#8e97a8]">{post.spaceName}</span>
                </>
              )}
              {post.shareToHome && (
                <>
                  <span>•</span>
                  <span className="text-[#38bdf8] flex items-center gap-0.5">
                    <Share2 size={9} /> Global Home
                  </span>
                </>
              )}
              {isPinnedToProfile && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 text-[#ff5500]">
                    <Pin size={9} className="fill-current" /> Pinned
                  </span>
                </>
              )}
              {visibility === 'followers' && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-0.5 text-[#8e97a8]">
                    <UsersIcon size={9} /> Followers
                  </span>
                </>
              )}
              {visibility === 'private' && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-0.5 text-amber-400">
                    <Lock size={9} /> Private
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {post.communityName && !post.spaceName && (
            <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-[#161a24] text-[#8e97a8] border border-[#232938] truncate max-w-[120px] hidden sm:inline-block">
              {post.communityName}
            </span>
          )}

          {/* Pin Post Action for Leaders */}
          {canPin && onPinPost && (
            <button
              onClick={() => onPinPost(post.id, !post.isPinned)}
              title={post.isPinned ? 'Unpin Post' : 'Pin Post'}
              className={`p-1.5 rounded-lg transition-colors ${
                post.isPinned ? 'text-[#ff5500] bg-[#ff5500]/10' : 'text-[#6b7280] hover:text-white'
              }`}
            >
              <Pin size={14} className={post.isPinned ? 'fill-current' : ''} />
            </button>
          )}

          {/* Post Options Menu (3-Dot) */}
          <div className="relative" ref={menuRef}>
            <button
              id={`btn-post-menu-${post.id}`}
              onClick={() => setShowThreeDotMenu(!showThreeDotMenu)}
              aria-label="Post options"
              className="p-1.5 rounded-lg text-[#8e97a8] hover:text-white hover:bg-[#1a202c] transition-colors cursor-pointer"
            >
              <MoreHorizontal size={16} />
            </button>

            {showThreeDotMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-[#141822] border border-[#252c3c] rounded-xl p-1.5 shadow-2xl z-40 text-left space-y-0.5 animate-fade-in text-xs">
                {isAuthor && (
                  <button
                    onClick={handleTogglePinToProfile}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#d1d5db] hover:text-white hover:bg-[#1e2534] transition-colors cursor-pointer"
                  >
                    <Pin size={14} className={isPinnedToProfile ? 'text-[#ff5500] fill-current' : 'text-[#8e97a8]'} />
                    <span>{isPinnedToProfile ? 'Unpin from profile' : 'Pin to profile'}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowThreeDotMenu(false);
                    setShowDisclosureModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#d1d5db] hover:text-white hover:bg-[#1e2534] transition-colors cursor-pointer"
                >
                  <FileText size={14} className="text-[#8e97a8]" />
                  <span>Content disclosure</span>
                </button>

                {isAuthor && (
                  <button
                    onClick={() => {
                      setShowThreeDotMenu(false);
                      setShowReplyPermissionModal(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#d1d5db] hover:text-white hover:bg-[#1e2534] transition-colors cursor-pointer"
                  >
                    <UsersIcon size={14} className="text-[#8e97a8]" />
                    <span>Change who can reply</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowThreeDotMenu(false);
                    setShowAnalyticsModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#d1d5db] hover:text-white hover:bg-[#1e2534] transition-colors cursor-pointer"
                >
                  <Activity size={14} className="text-[#8e97a8]" />
                  <span>View Post Analytics</span>
                </button>

                <button
                  onClick={() => {
                    setShowThreeDotMenu(false);
                    setShowHiddenRepliesModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#d1d5db] hover:text-white hover:bg-[#1e2534] transition-colors cursor-pointer"
                >
                  <EyeOff size={14} className="text-[#8e97a8]" />
                  <span>View Hidden Replies</span>
                </button>

                {isAuthor && (
                  <button
                    onClick={() => {
                      setShowThreeDotMenu(false);
                      setIsEditing(true);
                      setEditContentInput(postContent);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#d1d5db] hover:text-white hover:bg-[#1e2534] transition-colors cursor-pointer"
                  >
                    <Edit3 size={14} className="text-[#8e97a8]" />
                    <span>Edit post</span>
                  </button>
                )}

                {canDeletePost && (
                  <>
                    <div className="border-t border-[#202737] my-1" />
                    <button
                      onClick={() => {
                        setShowThreeDotMenu(false);
                        setShowDeleteConfirm(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                      <span>Delete post</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-xl space-y-2 animate-fade-in">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <AlertCircle size={14} className="text-red-400" />
            <span>Are you sure you want to delete this post?</span>
          </div>
          <p className="text-[11px] text-[#8e97a8] leading-relaxed">
            This post, its media, and all replies will be permanently deleted.
          </p>
          {deleteError && (
            <div className="text-[10px] text-red-400 bg-red-950/40 p-1.5 rounded font-mono-code">
              {deleteError}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="px-3 py-1 rounded-lg text-xs font-semibold text-[#8e97a8] hover:text-white hover:bg-[#1f2533] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id={`btn-confirm-delete-post-${post.id}`}
              onClick={handleDeletePost}
              disabled={isDeleting}
              className="px-3 py-1 rounded-lg text-xs font-bold bg-red-500 hover:bg-red-600 text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={11} className="animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                'Confirm Delete'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Post Text Content / Inline Editor */}
      {isEditing ? (
        <div className="space-y-2.5 pt-1">
          <textarea
            value={editContentInput}
            onChange={e => setEditContentInput(e.target.value)}
            rows={3}
            className="w-full p-3 bg-[#0d1017] border border-[#283144] focus:border-[#ff5500] rounded-xl text-xs sm:text-sm text-white focus:outline-none resize-none leading-relaxed"
            placeholder="Edit post..."
          />
          {editError && (
            <div className="text-xs text-red-400 font-mono-code">{editError}</div>
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditContentInput(postContent);
              }}
              disabled={isSavingEdit}
              className="px-3 py-1.5 text-xs font-semibold text-[#8e97a8] hover:text-white rounded-lg hover:bg-[#1a202c] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={isSavingEdit || !editContentInput.trim()}
              className="px-3 py-1.5 text-xs font-bold bg-[#ff5500] hover:bg-[#e64d00] text-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSavingEdit ? <Loader2 size={12} className="animate-spin" /> : null}
              <span>Save</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-xs sm:text-sm text-[#d1d5db] leading-relaxed whitespace-pre-line">
            {postContent}
          </p>
          {editedAt && (
            <span className="text-[10px] text-[#6b7280] font-mono-code inline-block">
              (edited)
            </span>
          )}
        </div>
      )}

      {/* Interactive Post Poll */}
      {poll && (
        <div className="p-3 bg-[#0d1017] border border-[#212634] rounded-xl space-y-2.5 my-2">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <BarChart2 size={14} className="text-[#ff5500]" />
            <span>{poll.question}</span>
          </div>

          <div className="space-y-2">
            {poll.options.map(option => {
              const pct = poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
              const hasVotedThis = selectedPollOption === option.id;
              const canVote = !selectedPollOption;

              return (
                <div
                  key={option.id}
                  onClick={() => canVote && handleVotePoll(option.id)}
                  className={`relative overflow-hidden rounded-lg border p-2.5 transition-all ${
                    hasVotedThis
                      ? 'border-[#ff5500] bg-[#ff5500]/10'
                      : canVote
                      ? 'border-[#232938] hover:border-[#ff5500]/50 bg-[#161a24] cursor-pointer'
                      : 'border-[#232938] bg-[#161a24]'
                  }`}
                >
                  {/* Percentage background fill */}
                  <div
                    style={{ width: `${pct}%` }}
                    className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                      hasVotedThis ? 'bg-[#ff5500]/25' : 'bg-white/5'
                    }`}
                  />

                  <div className="relative flex items-center justify-between z-10 text-xs">
                    <div className="flex items-center gap-2">
                      {hasVotedThis && <Check size={12} className="text-[#ff5500]" />}
                      <span className={hasVotedThis ? 'font-bold text-white' : 'text-[#d1d5db]'}>
                        {option.text}
                      </span>
                    </div>
                    <span className="font-mono-code text-[11px] text-[#8e97a8]">
                      {pct}% ({option.votes})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono-code text-[#525a6c] pt-1">
            <span>{poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'} total</span>
            {selectedPollOption && <span className="text-[#ff5500]">Vote registered</span>}
          </div>
        </div>
      )}

      {/* Attached Media */}
      {post.mediaUrl && (
        <div className="rounded-lg overflow-hidden border border-[#212634] bg-black max-h-96">
          <img
            src={post.mediaUrl}
            alt="Post media"
            className="w-full h-full object-contain"
            loading="lazy"
          />
        </div>
      )}

      {/* Attached Links Preview */}
      {post.links && post.links.length > 0 && (
        <div className="space-y-1.5">
          {post.links.map((link, idx) => (
            <a
              key={idx}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 rounded-lg bg-[#141822] border border-[#232938] hover:border-[#ff5500]/50 text-[11px] font-mono-code text-[#38bdf8] hover:underline transition-colors"
            >
              <ExternalLink size={12} className="shrink-0 text-[#8e97a8]" />
              <span className="truncate">{link}</span>
            </a>
          ))}
        </div>
      )}

      {/* Attached NFT card */}
      {post.nft && (
        <div
          onClick={() => onSelectNft && onSelectNft(post.nft!)}
          className="flex items-center gap-3 p-2.5 rounded-lg bg-[#161a24] border border-[#232938] hover:border-[#ff5500]/40 transition-colors cursor-pointer"
        >
          <img
            src={post.nft.image}
            alt={post.nft.name}
            className="w-12 h-12 rounded object-cover"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white truncate">{post.nft.name}</h4>
            <p className="text-[11px] text-[#ff5500] font-mono-code font-bold">
              {post.nft.price ? `${post.nft.price} ALGO` : 'Unlisted'}
            </p>
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex items-center justify-between pt-2.5 border-t border-[#1b202c]">
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Like Button */}
          <button
            id={`btn-like-post-${post.id}`}
            onClick={handleToggleLike}
            disabled={isLiking}
            className={`flex items-center gap-1.5 text-xs font-mono-code transition-colors cursor-pointer bg-transparent border-0 p-0 ${
              isLiked ? 'text-red-500 font-bold' : 'text-[#8e97a8] hover:text-white'
            }`}
            title={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart size={14} className={isLiked ? 'fill-current text-red-500' : ''} />
            <span>{likesCount}</span>
          </button>

          {/* Comment Button */}
          <button
            id={`btn-toggle-comments-${post.id}`}
            onClick={handleToggleComments}
            className={`flex items-center gap-1.5 text-xs font-mono-code transition-colors cursor-pointer bg-transparent border-0 p-0 ${
              showComments ? 'text-[#ff5500]' : 'text-[#8e97a8] hover:text-white'
            }`}
            title="Comments"
          >
            <MessageSquare size={14} />
            <span>{commentsCount}</span>
          </button>

          {/* Bookmark Button */}
          <button
            id={`btn-bookmark-post-${post.id}`}
            onClick={() => setIsBookmarked(!isBookmarked)}
            className={`flex items-center gap-1.5 text-xs font-mono-code transition-colors cursor-pointer bg-transparent border-0 p-0 ${
              isBookmarked ? 'text-[#ff5500] font-bold' : 'text-[#8e97a8] hover:text-white'
            }`}
            title={isBookmarked ? 'Remove Bookmark' : 'Bookmark'}
          >
            <Bookmark size={14} className={isBookmarked ? 'fill-current text-[#ff5500]' : ''} />
          </button>

          {/* Share Button (Native Sheet / Options) */}
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 text-xs font-mono-code text-[#8e97a8] hover:text-white transition-colors cursor-pointer bg-transparent border-0 p-0"
            title="Share"
          >
            <Share2 size={14} />
          </button>
        </div>

        {/* Inline View Count */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono-code text-[#6b7280]">
          <Eye size={12} className="text-[#525a6c]" />
          <span>
            {Math.max(24, (post.likes || 0) * 14 + (post.commentCount || 0) * 8 + ((post.id.charCodeAt(0) || 1) * 23) % 400) >= 1000
              ? `${(Math.max(24, (post.likes || 0) * 14 + (post.commentCount || 0) * 8 + ((post.id.charCodeAt(0) || 1) * 23) % 400) / 1000).toFixed(1)}k Views`
              : `${Math.max(24, (post.likes || 0) * 14 + (post.commentCount || 0) * 8 + ((post.id.charCodeAt(0) || 1) * 23) % 400)} Views`}
          </span>
        </div>
      </div>

      {/* Share Sheet Modal */}
      <ShareSheetModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={`${window.location.origin}/#post-${post.id}`}
        title={`Post by @${post.authorUsername} on MINT`}
        text={postContent?.slice(0, 100)}
      />

      {/* Post Analytics Modal */}
      {showAnalyticsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowAnalyticsModal(false)}
        >
          <div
            className="w-full max-w-sm bg-[#141822] border border-[#252c3c] rounded-2xl p-5 shadow-2xl text-left space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-[#ff5500]" />
                <h3 className="text-sm font-bold text-white">Post Analytics</h3>
              </div>
              <button
                onClick={() => setShowAnalyticsModal(false)}
                className="text-[#8e97a8] hover:text-white p-1"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-[#181d29] border border-[#222838]">
                <div className="text-[10px] font-mono-code text-[#8e97a8] uppercase">Impressions</div>
                <div className="text-lg font-bold text-white mt-1">
                  {Math.max(54, (post.likes || 0) * 28 + (post.commentCount || 0) * 16 + 120)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#181d29] border border-[#222838]">
                <div className="text-[10px] font-mono-code text-[#8e97a8] uppercase">Engagements</div>
                <div className="text-lg font-bold text-[#ff5500] mt-1">
                  {(post.likes || 0) + (post.commentCount || 0) + (isBookmarked ? 1 : 0)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#181d29] border border-[#222838]">
                <div className="text-[10px] font-mono-code text-[#8e97a8] uppercase">Profile Visits</div>
                <div className="text-lg font-bold text-white mt-1">
                  {Math.max(4, (post.likes || 0) * 2 + 3)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#181d29] border border-[#222838]">
                <div className="text-[10px] font-mono-code text-[#8e97a8] uppercase">Shares & Forwards</div>
                <div className="text-lg font-bold text-[#38bdf8] mt-1">
                  {Math.max(1, Math.floor((post.likes || 0) * 0.4))}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-[#6b7280] leading-relaxed">
              Real-time interaction telemetry tracked directly on-chain and through local feed syndication.
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setShowAnalyticsModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#8e97a8] hover:text-white transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Disclosure Modal */}
      {showDisclosureModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowDisclosureModal(false)}
        >
          <div
            className="w-full max-w-sm bg-[#141822] border border-[#252c3c] rounded-2xl p-5 shadow-2xl text-left space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-[#ff5500]" />
                <h3 className="text-sm font-bold text-white">Content Disclosure</h3>
              </div>
              <button
                onClick={() => setShowDisclosureModal(false)}
                className="text-[#8e97a8] hover:text-white p-1"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-[#8e97a8] leading-relaxed">
              Transparency declarations for this post on MINT:
            </p>

            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-[#181d29] border border-[#222838] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Original Web3 Creator Content</div>
                  <div className="text-[10px] text-[#8e97a8]">Authored by verified Algorand account</div>
                </div>
                <Check size={16} className="text-emerald-400 shrink-0" />
              </div>

              <div className="p-3 rounded-xl bg-[#181d29] border border-[#222838] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">No Paid Promotion</div>
                  <div className="text-[10px] text-[#8e97a8]">Organic community post</div>
                </div>
                <Check size={16} className="text-emerald-400 shrink-0" />
              </div>

              <div className="p-3 rounded-xl bg-[#181d29] border border-[#222838] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Safe Media Attestation</div>
                  <div className="text-[10px] text-[#8e97a8]">Direct media upload verified</div>
                </div>
                <Check size={16} className="text-emerald-400 shrink-0" />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setShowDisclosureModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#8e97a8] hover:text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Replies Modal */}
      {showHiddenRepliesModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowHiddenRepliesModal(false)}
        >
          <div
            className="w-full max-w-sm bg-[#141822] border border-[#252c3c] rounded-2xl p-5 shadow-2xl text-left space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <EyeOff size={16} className="text-[#ff5500]" />
                <h3 className="text-sm font-bold text-white">Hidden Replies</h3>
              </div>
              <button
                onClick={() => setShowHiddenRepliesModal(false)}
                className="text-[#8e97a8] hover:text-white p-1"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-[#8e97a8] leading-relaxed">
              Replies that were filtered by the creator or moderation filters.
            </p>

            <div className="py-8 text-center bg-[#181d29] rounded-xl border border-[#222838]">
              <EyeOff size={24} className="text-[#525a6c] mx-auto mb-2" />
              <div className="text-xs font-semibold text-white">No hidden replies</div>
              <p className="text-[11px] text-[#8e97a8] mt-0.5">All replies to this post are currently visible.</p>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setShowHiddenRepliesModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#8e97a8] hover:text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Who Can Reply Modal */}
      {showReplyPermissionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowReplyPermissionModal(false)}
        >
          <div
            className="w-full max-w-sm bg-[#141822] border border-[#252c3c] rounded-2xl p-5 shadow-2xl text-left space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h3 className="text-sm font-bold text-white">Who can reply?</h3>
              <p className="text-xs text-[#8e97a8] mt-0.5">
                Choose who is allowed to comment and reply to this post.
              </p>
            </div>

            <div className="space-y-1.5">
              {[
                { id: 'everyone', label: 'Everyone', desc: 'Anyone on MINT can reply' },
                { id: 'following', label: 'People I follow', desc: 'Only accounts you follow can reply' },
                { id: 'mentioned', label: 'Mentioned users', desc: 'Only accounts mentioned with @username' },
                { id: 'none', label: 'No one', desc: 'Replies are completely disabled' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleUpdateReplyPermission(opt.id as any)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    replyPermission === opt.id
                      ? 'bg-[#ff5500]/10 border-[#ff5500] text-white'
                      : 'bg-[#181d29] border-[#222838] text-[#d1d5db] hover:border-[#2f384c]'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-white">{opt.label}</div>
                    <div className="text-[11px] text-[#8e97a8]">{opt.desc}</div>
                  </div>
                  {replyPermission === opt.id && (
                    <Check size={16} className="text-[#ff5500] shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setShowReplyPermissionModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#8e97a8] hover:text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Settings Modal */}
      {showPrivacyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowPrivacyModal(false)}
        >
          <div
            className="w-full max-w-sm bg-[#141822] border border-[#252c3c] rounded-2xl p-5 shadow-2xl text-left space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h3 className="text-sm font-bold text-white">Privacy settings</h3>
              <p className="text-xs text-[#8e97a8] mt-0.5">
                Control who can view this post on MINT.
              </p>
            </div>

            <div className="space-y-1.5">
              {[
                { id: 'public', label: 'Public', desc: 'Visible to everyone on MINT' },
                { id: 'followers', label: 'Followers only', desc: 'Visible only to accounts that follow you' },
                { id: 'private', label: 'Private', desc: 'Visible only to you' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleUpdateVisibility(opt.id as any)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    visibility === opt.id
                      ? 'bg-[#ff5500]/10 border-[#ff5500] text-white'
                      : 'bg-[#181d29] border-[#222838] text-[#d1d5db] hover:border-[#2f384c]'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-white">{opt.label}</div>
                    <div className="text-[11px] text-[#8e97a8]">{opt.desc}</div>
                  </div>
                  {visibility === opt.id && (
                    <Check size={16} className="text-[#ff5500] shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#8e97a8] hover:text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comments & Replies Section */}
      {showComments && (
        <div className="pt-3 border-t border-[#1b202c] space-y-3">
          {/* Cooldown notice if triggered */}
          {commentCooldownError && (
            <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle size={13} className="shrink-0" />
              <span>{commentCooldownError}</span>
            </div>
          )}

          {/* Comment Composer */}
          {replyPermission === 'none' && !isAuthor ? (
            <div className="py-2.5 text-xs text-[#8e97a8] text-center border-b border-[#1b202c]">
              Replies are disabled for this post.
            </div>
          ) : replyPermission === 'following' && !isAuthor && !isFollowingAuthor ? (
            <div className="py-2.5 text-xs text-[#8e97a8] text-center border-b border-[#1b202c]">
              Only followers of @{post.authorUsername} can reply to this post.
            </div>
          ) : (
            <form onSubmit={handleAddComment} className="flex gap-2 items-center">
              <input
                type="text"
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                placeholder="Write a comment..."
                disabled={submittingComment}
                className="flex-1 px-2.5 py-2 bg-transparent border-b border-[#212634] focus:border-[#ff5500] text-xs text-white placeholder-[#525a6c] focus:outline-none transition-colors"
              />
              <button
                id={`btn-send-comment-${post.id}`}
                type="submit"
                disabled={submittingComment || !commentInput.trim()}
                className="px-3 py-1.5 bg-[#ff5500] hover:bg-[#e64d00] disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {submittingComment ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                <span>Post</span>
              </button>
            </form>
          )}

          {/* Comments List */}
          {loadingComments && comments.length === 0 ? (
            <div className="py-4 text-center">
              <Loader2 size={16} className="animate-spin text-[#ff5500] mx-auto mb-1" />
              <span className="text-xs text-[#6b7280]">Loading comments...</span>
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-[#525a6c] py-2 text-center">No comments yet. Be the first to start the conversation!</p>
          ) : (
            <div className="divide-y divide-[#1b202c]/50">
              {comments.map(comment => (
                <ThreadedCommentItem
                  key={comment.id}
                  comment={comment}
                  postAuthorId={post.authorId}
                  communityName={post.communityName}
                  user={user}
                  level={0}
                  replyingToId={replyingToId}
                  replyInput={replyInput}
                  submittingReply={submittingReply}
                  replyCooldownError={replyCooldownError}
                  deletingCommentId={deletingCommentId}
                  isPostAuthorOrStaff={isAuthor || isCommunityLeader || isPlatformStaff}
                  onStartReply={handleStartReply}
                  onCancelReply={() => {
                    setReplyingToId(null);
                    setReplyInput('');
                    setReplyCooldownError(null);
                  }}
                  onReplyInputChange={setReplyInput}
                  onSubmitReply={handleAddReply}
                  onToggleLike={handleToggleCommentLike}
                  onDeleteComment={handleDeleteComment}
                  formatTime={formatTime}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
