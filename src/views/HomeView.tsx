import React, { useState, useEffect } from 'react';
import { Sparkles, Users, Gavel, Heart, MessageSquare, Send, Image as ImageIcon, ExternalLink, RefreshCw, PlusCircle, Tag, Clock, X, AlertCircle } from 'lucide-react';
import { NFT, Auction, ActivityEvent, CommunityPost } from '../types';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { PostCard } from '../components/PostCard';
import { ImageUploader } from '../components/ImageUploader';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';

interface HomeViewProps {
  onNavigate: (path: string) => void;
  onSelectNft: (nft: NFT) => void;
  onSelectCollection?: (col: any) => void;
  onQuickBuy: (nft: NFT) => void;
  onQuickBid: (nft: NFT) => void;
  onOpenWaitlist?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onSelectNft,
  onSelectCollection,
  onQuickBuy,
  onQuickBid,
  onOpenWaitlist
}) => {
  const { user, setShowAuthModal } = useAuth();
  const { connected } = useWallet();

  const [activeTab, setActiveTab] = useState<'foryou' | 'following' | 'auctions'>('foryou');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);

  // Post composer
  const [postContent, setPostContent] = useState('');
  const [postMediaUrl, setPostMediaUrl] = useState<string | null>(null);
  const [showMediaUploader, setShowMediaUploader] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [submittingPost, setSubmittingPost] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);

  // Like tracking state
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  const loadFeedData = async () => {
    try {
      const [postsRes, actRes, aucRes, myLikesRes, myFollowingRes] = await Promise.all([
        api.getFeedPosts({ tab: activeTab === 'following' ? 'following' : undefined }).catch(() => ({ posts: [] })),
        api.getActivity(20).catch(() => ({ activity: [] })),
        api.getAuctions({ status: 'active' }).catch(() => ({ auctions: [] })),
        api.getMyLikes().catch(() => ({ likedIds: [] })),
        api.getMyFollowingIds().catch(() => ({ followingIds: [] }))
      ]);

      setPosts(postsRes.posts || []);
      setActivity(actRes.activity || []);
      setAuctions(aucRes.auctions || []);
      setLikedIds(myLikesRes.likedIds || []);
      setFollowingIds(myFollowingRes.followingIds || []);
    } catch (err) {
      console.warn('Notice: Feed data could not be refreshed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = (targetUserId: string, isFollowing: boolean) => {
    setFollowingIds(prev =>
      isFollowing ? [...prev, targetUserId] : prev.filter(id => id !== targetUserId)
    );
  };

  useEffect(() => {
    loadFeedData();
  }, [activeTab, user]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!postContent.trim() || submittingPost || isUploadingMedia) return;

    setSubmittingPost(true);
    setComposerError(null);
    try {
      const res = await api.createPost({
        content: postContent.trim(),
        mediaUrl: postMediaUrl || undefined
      });
      setPosts(prev => [res.post, ...prev]);
      setPostContent('');
      setPostMediaUrl(null);
      setShowMediaUploader(false);
    } catch (err: any) {
      console.error('Create post error:', err);
      setComposerError(err.message || 'Failed to publish post.');
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleLikePost = async (postId: string) => {
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
      console.error('Like post error:', err);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-left">
      {/* Early Access Waitlist Banner for Visitors */}
      {!user && onOpenWaitlist && (
        <div className="bg-gradient-to-r from-[#141822] via-[#1a1f2e] to-[#141822] border border-[#ff5500]/30 rounded-xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff5500]/20 border border-[#ff5500]/40 flex items-center justify-center text-[#ff5500] shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Join the MINT Early Access Waitlist</h3>
              <p className="text-xs text-[#8e97a8] mt-0.5">Secure your position for VIP NFT drops, launchpad allocations, and creator rewards.</p>
            </div>
          </div>
          <button
            onClick={onOpenWaitlist}
            className="px-4 py-2 rounded-lg bg-[#ff5500] hover:bg-[#e64d00] text-white text-xs font-bold transition-all shadow-md shadow-[#ff5500]/20 shrink-0 cursor-pointer"
          >
            Join Waitlist
          </button>
        </div>
      )}

      {/* 1. Feed Navigation Tabs - Clean, text-only top bar with underline accent */}
      <div className="border-b border-[#212634] flex items-center justify-between gap-2">
        <div className="flex items-center gap-4 sm:gap-8 -mb-px">
          <button
            id="tab-foryou"
            onClick={() => setActiveTab('foryou')}
            className={`py-3 px-1 text-xs sm:text-sm transition-colors cursor-pointer border-b-2 ${
              activeTab === 'foryou'
                ? 'border-[#ff5500] text-white font-bold'
                : 'border-transparent text-[#8e97a8] hover:text-white font-medium'
            }`}
          >
            For You
          </button>

          <button
            id="tab-following"
            onClick={() => setActiveTab('following')}
            className={`py-3 px-1 text-xs sm:text-sm transition-colors cursor-pointer border-b-2 ${
              activeTab === 'following'
                ? 'border-[#ff5500] text-white font-bold'
                : 'border-transparent text-[#8e97a8] hover:text-white font-medium'
            }`}
          >
            Following
          </button>

          <button
            id="tab-auctions"
            onClick={() => setActiveTab('auctions')}
            className={`py-3 px-1 text-xs sm:text-sm transition-colors cursor-pointer border-b-2 ${
              activeTab === 'auctions'
                ? 'border-[#ff5500] text-white font-bold'
                : 'border-transparent text-[#8e97a8] hover:text-white font-medium'
            }`}
          >
            Live Auctions ({auctions.length})
          </button>
        </div>

        <button
          onClick={loadFeedData}
          title="Refresh Feed"
          className="p-2 text-[#6b7280] hover:text-white transition-colors cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* 2. Feed Post Composer (When Authenticated) - No card wrapper, natural divider */}
      {user && activeTab !== 'auctions' && (
        <form onSubmit={handleCreatePost} className="pb-4 pt-1 border-b border-[#212634] space-y-3">
          {composerError && (
            <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{composerError}</span>
            </div>
          )}

          <div className="flex items-start gap-3">
            <img
              src={user.avatar}
              alt={user.displayName}
              className="w-9 h-9 rounded-full object-cover border border-[#232938] shrink-0 mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <textarea
                value={postContent}
                onChange={e => setPostContent(e.target.value)}
                placeholder="Share a drop, trade alpha, or ask the community..."
                rows={2}
                className="w-full bg-transparent border-0 focus:ring-0 text-sm text-white placeholder-[#525a6c] px-0 focus:outline-none resize-none"
              />

              {showMediaUploader && (
                <div className="mt-3 pt-3 border-t border-[#1e2430]">
                  <ImageUploader
                    id="post-media-uploader"
                    label="Attach Media from Device"
                    value={postMediaUrl}
                    onChange={(url) => setPostMediaUrl(url)}
                    onUploadingChange={setIsUploadingMedia}
                    maxSizeMB={5}
                    aspectRatio="square"
                    recommendation="PNG, JPG, or WebP up to 5 MB"
                    description="Select an image from your device storage"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#1b202c]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMediaUploader(!showMediaUploader)}
                className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                  showMediaUploader || postMediaUrl ? 'text-[#ff5500] font-semibold' : 'text-[#8e97a8] hover:text-white'
                }`}
                title="Attach media from device"
              >
                <ImageIcon size={15} />
                <span className="text-xs">
                  {postMediaUrl ? 'Media Attached' : 'Add Media'}
                </span>
              </button>
            </div>

            <button
              type="submit"
              disabled={!postContent.trim() || submittingPost || isUploadingMedia}
              className="px-4 py-1.5 rounded-lg bg-[#ff5500] hover:bg-[#e64d00] disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Send size={12} />
              <span>{submittingPost ? 'Posting...' : isUploadingMedia ? 'Uploading...' : 'Post'}</span>
            </button>
          </div>
        </form>
      )}

      {/* 3. Feed Tab Content */}
      {activeTab === 'foryou' && (
        <div className="space-y-6">
          {/* Posts Feed - Subtle horizontal divider between posts */}
          {posts.length > 0 && (
            <div className="divide-y divide-[#1f2533]">
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  onSelectNft={onSelectNft}
                  onNavigate={onNavigate}
                  followingIds={followingIds}
                  onFollowToggle={handleFollowToggle}
                  onUpdatePost={(updated) => setPosts(prev => prev.map(p => p.id === updated.id ? updated : p))}
                  onDeletePost={(deletedId) => setPosts(prev => prev.filter(p => p.id !== deletedId))}
                />
              ))}
            </div>
          )}

          {/* Real Marketplace & Blockchain Activity - No card framing */}
          {activity.length > 0 && (
            <div className="pt-6 border-t border-[#1f2533] space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono-code text-[#8e97a8]">
                Recent Marketplace Activity
              </h3>
              <div className="divide-y divide-[#1b202c]">
                {activity.slice(0, 10).map((act, i) => (
                  <div key={act.id || i} className="py-2.5 flex items-center justify-between text-xs gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono-code uppercase px-2 py-0.5 rounded bg-[#161a24] text-[#8e97a8] shrink-0">
                        {act.type}
                      </span>
                      <span
                        onClick={() => act.nftId && onNavigate(`nft/${act.nftId}`)}
                        className="font-bold text-white hover:text-[#ff5500] cursor-pointer truncate"
                      >
                        {act.nftName}
                      </span>
                      <span className="text-[#6b7280] truncate">by @{act.fromUsername}</span>
                    </div>

                    {act.price && (
                      <span className="font-mono-code font-bold text-[#ff5500] shrink-0">
                        {act.price} SOL
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state if neither posts nor activity exist */}
          {posts.length === 0 && activity.length === 0 && !loading && (
            <div className="py-16 text-center space-y-2">
              <p className="text-sm font-bold text-white">No activity yet</p>
              <p className="text-xs text-[#8e97a8]">Be the first to mint an artifact, place a bid, or start a community conversation.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'following' && (
        <div className="space-y-4">
          {!user ? (
            <div className="py-16 text-center space-y-3">
              <Users size={28} className="mx-auto text-[#6b7280]" />
              <p className="text-sm font-bold text-white">Connect to view Following Feed</p>
              <p className="text-xs text-[#8e97a8]">Sign in or connect your wallet to follow creators and see their updates here.</p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 rounded-lg bg-[#ff5500] text-xs font-bold text-white cursor-pointer"
              >
                Sign In
              </button>
            </div>
          ) : posts.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Users size={28} className="mx-auto text-[#6b7280]" />
              <p className="text-sm font-bold text-white">No activity yet</p>
              <p className="text-xs text-[#8e97a8]">You are not following any creators yet. Explore creators and collections to populate this feed.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1f2533]">
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  onSelectNft={onSelectNft}
                  onNavigate={onNavigate}
                  followingIds={followingIds}
                  onFollowToggle={handleFollowToggle}
                  onUpdatePost={(updated) => setPosts(prev => prev.map(p => p.id === updated.id ? updated : p))}
                  onDeletePost={(deletedId) => setPosts(prev => prev.filter(p => p.id !== deletedId))}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'auctions' && (
        <div className="space-y-4">
          {auctions.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Gavel size={28} className="mx-auto text-[#6b7280]" />
              <p className="text-sm font-bold text-white">No live auctions right now</p>
              <p className="text-xs text-[#8e97a8]">Check back soon or put your owned artifacts on auction.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {auctions.map(auc => (
                <div
                  key={auc.id}
                  onClick={() => onNavigate(`nft/${auc.nftId}`)}
                  className="p-4 rounded-xl bg-[#11141b] hover:bg-[#151922] border border-[#212634] hover:border-[#ff5500]/50 transition-colors cursor-pointer text-left space-y-3"
                >
                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-black relative">
                    <img src={auc.nft.image} alt={auc.customTitle} className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-sm text-[10px] font-mono-code text-white">
                      {auc.nft.collectionName}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white truncate">{auc.customTitle}</h4>
                    <p className="text-xs text-[#8e97a8] truncate mt-0.5">By @{auc.creatorUsername}</p>
                  </div>

                  <div className="pt-2 border-t border-[#1b202c] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] font-mono-code text-[#6b7280]">CURRENT BID</span>
                      <p className="font-mono-code font-bold text-amber-400">{auc.currentBid} SOL</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(`nft/${auc.nftId}`);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#ff5500] hover:bg-[#e64d00] text-white text-xs font-bold"
                    >
                      Bid Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
