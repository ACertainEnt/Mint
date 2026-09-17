import React, { useState, useEffect } from 'react';
import { Sparkles, Users, Gavel, Heart, MessageSquare, Send, Image as ImageIcon, ExternalLink, RefreshCw, PlusCircle, Tag, Clock, X, AlertCircle } from 'lucide-react';
import { NFT, Auction, ActivityEvent, CommunityPost } from '../types';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { ImageUploader } from '../components/ImageUploader';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';

interface HomeViewProps {
  onNavigate: (path: string) => void;
  onSelectNft: (nft: NFT) => void;
  onQuickBuy: (nft: NFT) => void;
  onQuickBid: (nft: NFT) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onSelectNft,
  onQuickBuy,
  onQuickBid
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

  const loadFeedData = async () => {
    try {
      const [postsRes, actRes, aucRes, myLikesRes] = await Promise.all([
        api.getFeedPosts({ tab: activeTab === 'following' ? 'following' : undefined }),
        api.getActivity(20),
        api.getAuctions({ status: 'active' }),
        api.getMyLikes().catch(() => ({ likedIds: [] }))
      ]);

      setPosts(postsRes.posts || []);
      setActivity(actRes.activity || []);
      setAuctions(aucRes.auctions || []);
      setLikedIds(myLikesRes.likedIds || []);
    } catch (err) {
      console.error('Failed to load feed data:', err);
    } finally {
      setLoading(false);
    }
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
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 text-left">
      {/* 1. Feed Navigation Tabs */}
      <div className="border-b border-[#212634] flex items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('foryou')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'foryou'
                ? 'bg-[#ff5500] text-white'
                : 'text-[#8e97a8] hover:text-white hover:bg-[#141822]'
            }`}
          >
            <Sparkles size={14} />
            <span>For You</span>
          </button>

          <button
            onClick={() => setActiveTab('following')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'following'
                ? 'bg-[#ff5500] text-white'
                : 'text-[#8e97a8] hover:text-white hover:bg-[#141822]'
            }`}
          >
            <Users size={14} />
            <span>Following</span>
          </button>

          <button
            onClick={() => setActiveTab('auctions')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'auctions'
                ? 'bg-[#ff5500] text-white'
                : 'text-[#8e97a8] hover:text-white hover:bg-[#141822]'
            }`}
          >
            <Gavel size={14} className={activeTab === 'auctions' ? 'text-white' : 'text-amber-400'} />
            <span>Live Auctions ({auctions.length})</span>
          </button>
        </div>

        <button
          onClick={loadFeedData}
          title="Refresh Feed"
          className="p-2 rounded-lg text-[#6b7280] hover:text-white hover:bg-[#141822] transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* 2. Feed Post Composer (When Authenticated) */}
      {user && activeTab !== 'auctions' && (
        <form onSubmit={handleCreatePost} className="bg-[#11141b] border border-[#212634] rounded-xl p-4 space-y-3">
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
              className="w-8 h-8 rounded-full object-cover border border-[#232938] shrink-0"
            />
            <div className="flex-1 min-w-0">
              <textarea
                value={postContent}
                onChange={e => setPostContent(e.target.value)}
                placeholder="Share a drop, trade alpha, or ask the community..."
                rows={2}
                className="w-full bg-[#161a24] border border-[#232a3a] rounded-lg p-2.5 text-xs text-white placeholder-[#525a6c] focus:outline-none focus:border-[#ff5500] resize-none"
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

          <div className="flex items-center justify-between pt-1 border-t border-[#1b202c]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMediaUploader(!showMediaUploader)}
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors ${
                  showMediaUploader || postMediaUrl ? 'bg-[#ff5500]/15 text-[#ff8c4d]' : 'text-[#8e97a8] hover:text-white hover:bg-[#181d28]'
                }`}
                title="Attach media from device"
              >
                <ImageIcon size={14} />
                <span className="text-[11px] font-medium">
                  {postMediaUrl ? 'Media Attached' : 'Add Media'}
                </span>
              </button>
            </div>

            <button
              type="submit"
              disabled={!postContent.trim() || submittingPost || isUploadingMedia}
              className="px-3.5 py-1.5 rounded-lg bg-[#ff5500] hover:bg-[#e64d00] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Send size={12} />
              <span>{submittingPost ? 'Posting...' : isUploadingMedia ? 'Uploading...' : 'Post'}</span>
            </button>
          </div>
        </form>
      )}

      {/* 3. Feed Tab Content */}
      {activeTab === 'foryou' && (
        <div className="space-y-4">
          {/* Posts Feed */}
          {posts.length > 0 && (
            <div className="space-y-3">
              {posts.map(post => {
                const isLiked = post.likedByMe || likedIds.includes(post.id);
                return (
                  <div key={post.id} className="bg-[#11141b] border border-[#212634] rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={post.authorAvatar}
                          alt={post.authorUsername}
                          className="w-8 h-8 rounded-full object-cover border border-[#232938]"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white">{post.authorDisplayName}</span>
                            {post.authorVerified && <VerifiedBadge size="sm" />}
                            <span className="text-[11px] font-mono-code text-[#6b7280]">@{post.authorUsername}</span>
                          </div>
                          <span className="text-[10px] font-mono-code text-[#525a6c]">
                            {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {post.communityName && (
                        <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-[#161a24] text-[#8e97a8] border border-[#232938]">
                          {post.communityName}
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-[#d1d5db] leading-relaxed whitespace-pre-line">
                      {post.content}
                    </p>

                    {post.mediaUrl && (
                      <div className="rounded-lg overflow-hidden border border-[#212634] bg-black max-h-96">
                        <img src={post.mediaUrl} alt="Post media" className="w-full h-full object-contain" loading="lazy" />
                      </div>
                    )}

                    {post.nft && (
                      <div
                        onClick={() => onSelectNft(post.nft!)}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-[#161a24] border border-[#232938] hover:border-[#ff5500]/40 transition-colors cursor-pointer"
                      >
                        <img src={post.nft.image} alt={post.nft.name} className="w-12 h-12 rounded object-cover" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{post.nft.name}</h4>
                          <p className="text-[11px] text-[#ff5500] font-mono-code font-bold">{post.nft.price ? `${post.nft.price} SOL` : 'Unlisted'}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4 pt-2 border-t border-[#1b202c]">
                      <button
                        onClick={() => handleLikePost(post.id)}
                        className={`flex items-center gap-1.5 text-xs font-mono-code transition-colors ${
                          isLiked ? 'text-red-500 font-bold' : 'text-[#8e97a8] hover:text-white'
                        }`}
                      >
                        <Heart size={14} className={isLiked ? 'fill-current text-red-500' : ''} />
                        <span>{post.likes || 0}</span>
                      </button>

                      <div className="flex items-center gap-1.5 text-xs font-mono-code text-[#6b7280]">
                        <MessageSquare size={14} />
                        <span>{post.commentCount || 0}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Real Marketplace & Blockchain Activity */}
          {activity.length > 0 && (
            <div className="bg-[#11141b] border border-[#212634] rounded-xl p-4 space-y-3">
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
            <div className="py-16 text-center border border-[#212634] rounded-xl bg-[#11141b] p-6 space-y-2">
              <p className="text-sm font-bold text-white">No activity yet</p>
              <p className="text-xs text-[#8e97a8]">Be the first to mint an artifact, place a bid, or start a community conversation.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'following' && (
        <div className="space-y-4">
          {!user ? (
            <div className="py-16 text-center border border-[#212634] rounded-xl bg-[#11141b] p-6 space-y-3">
              <Users size={28} className="mx-auto text-[#6b7280]" />
              <p className="text-sm font-bold text-white">Connect to view Following Feed</p>
              <p className="text-xs text-[#8e97a8]">Sign in or connect your wallet to follow creators and see their updates here.</p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 rounded-lg bg-[#ff5500] text-xs font-bold text-white"
              >
                Sign In
              </button>
            </div>
          ) : posts.length === 0 ? (
            <div className="py-16 text-center border border-[#212634] rounded-xl bg-[#11141b] p-6 space-y-2">
              <Users size={28} className="mx-auto text-[#6b7280]" />
              <p className="text-sm font-bold text-white">No activity yet</p>
              <p className="text-xs text-[#8e97a8]">You are not following any creators yet. Explore creators and collections to populate this feed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map(post => (
                <div key={post.id} className="bg-[#11141b] border border-[#212634] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <img src={post.authorAvatar} alt={post.authorUsername} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">{post.authorDisplayName}</span>
                        {post.authorVerified && <VerifiedBadge size="sm" />}
                        <span className="text-[11px] font-mono-code text-[#6b7280]">@{post.authorUsername}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-[#d1d5db]">{post.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'auctions' && (
        <div className="space-y-4">
          {auctions.length === 0 ? (
            <div className="py-16 text-center border border-[#212634] rounded-xl bg-[#11141b] p-6 space-y-2">
              <Gavel size={28} className="mx-auto text-[#6b7280]" />
              <p className="text-sm font-bold text-white">No live auctions right now</p>
              <p className="text-xs text-[#8e97a8]">Check back soon or put your owned artifacts on auction.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {auctions.map(auc => (
                <div
                  key={auc.id}
                  onClick={() => onNavigate(`auctions/${auc.id}`)}
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
                        onNavigate(`auctions/${auc.id}`);
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
