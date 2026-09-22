import React, { useState, useEffect } from 'react';
import { ExternalLink, Tag, Gavel, Heart, Share2, Shield, ArrowLeft, Check, Sparkles, AlertCircle, Bot } from 'lucide-react';
import { NFT, Auction, NFTCollection } from '../types';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';

interface NFTDetailViewProps {
  nftId: string;
  onBack: () => void;
  onNavigate: (path: string) => void;
  onBuy: (nft: NFT) => void;
  onBid: (nft: NFT) => void;
}

export const NFTDetailView: React.FC<NFTDetailViewProps> = ({
  nftId,
  onBack,
  onNavigate,
  onBuy,
  onBid
}) => {
  const { user, setShowAuthModal } = useAuth();
  const { publicKey } = useWallet();

  const [nft, setNft] = useState<NFT | null>(null);
  const [collection, setCollection] = useState<NFTCollection | null>(null);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);

  // Listing modal
  const [showListModal, setShowListModal] = useState(false);
  const [listPrice, setListPrice] = useState('1.5');
  const [listLoading, setListLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [liking, setLiking] = useState(false);

  const loadNft = async () => {
    try {
      const [res, myLikesRes] = await Promise.all([
        api.getNft(nftId),
        api.getMyLikes().catch(() => ({ likedIds: [] }))
      ]);
      setNft(res.nft);
      setCollection(res.collection);
      setAuction(res.auction);
      setLikesCount(res.nft.likes || 0);
      setLiked(myLikesRes.likedIds.includes(res.nft.id));
    } catch (err) {
      console.error('Failed to load NFT:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLike = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (liking || !nft) return;
    setLiking(true);
    try {
      const res = await api.toggleLike('nft', nft.id);
      setLiked(res.liked);
      setLikesCount(res.likes);
    } catch (err) {
      console.error('Like toggle error:', err);
    } finally {
      setLiking(false);
    }
  };

  useEffect(() => {
    loadNft();
  }, [nftId]);

  if (loading) {
    return (
      <div className="py-24 text-center text-xs font-mono-code text-[#8e97a8]">
        Fetching on-chain artifact data from Algorand...
      </div>
    );
  }

  if (!nft) {
    return (
      <div className="py-24 text-center space-y-3">
        <p className="text-white font-bold">NFT not found or token has been burned.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg bg-[#181d28] text-xs text-white"
        >
          Return to Explore
        </button>
      </div>
    );
  }

  const isOwner = user?.id === nft.ownerId || (publicKey && nft.ownerAddress.toLowerCase() === publicKey.toLowerCase());

  const handleListForSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setListLoading(true);
    try {
      const res = await api.listNft(nft.id, Number(listPrice));
      setNft(res.nft);
      setShowListModal(false);
    } catch (err) {
      console.error('List error:', err);
    } finally {
      setListLoading(false);
    }
  };

  const handleDelist = async () => {
    try {
      const res = await api.delistNft(nft.id);
      setNft(res.nft);
    } catch (err) {
      console.error('Delist error:', err);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-left">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-[#8e97a8] hover:text-white transition-colors"
      >
        <ArrowLeft size={14} />
        <span>Back</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: NFT High-Res Visual */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black border border-[#212634] shadow-xl group">
            <img
              src={nft.image}
              alt={nft.name}
              className="w-full h-full object-cover"
            />

            {/* Rarity Rank Floating Chip */}
            {nft.rarityScore && (
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-xs font-mono-code font-bold text-amber-400">
                ⭐ Rarity: {nft.rarityScore.toFixed(1)} / 100
              </div>
            )}
          </div>
        </div>

        {/* Right: Metadata & Actions */}
        <div className="lg:col-span-6 space-y-5">
          <div>
            {/* Collection tag */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <button
                onClick={() => onNavigate(`collection/${nft.collectionId}`)}
                className="text-xs font-mono-code text-[#ff5500] hover:underline flex items-center gap-1.5"
              >
                <span>{nft.collectionName}</span>
                {nft.creatorVerified && <VerifiedBadge size="sm" />}
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleToggleLike}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono-code transition-colors flex items-center gap-1.5 ${
                    liked
                      ? 'bg-red-500/15 text-red-400 border-red-500/30'
                      : 'bg-[#141822] hover:bg-[#1b212f] border-[#212634] text-[#8e97a8] hover:text-white'
                  }`}
                  title={liked ? 'Unlike' : 'Like'}
                >
                  <Heart size={13} className={liked ? 'fill-current text-red-500' : ''} />
                  <span>{likesCount}</span>
                </button>

                <button
                  onClick={() => onNavigate(`mintbot:Look up ${nft.name} metadata and traits`)}
                  className="px-2 py-1.5 rounded-lg bg-[#141822] hover:bg-[#1b212f] border border-[#212634] text-xs text-[#ff5500] hover:text-white transition-colors flex items-center gap-1"
                  title="Research NFT on MintBot"
                >
                  <Bot size={13} />
                  <span className="hidden sm:inline">Intel</span>
                </button>

                <button
                  onClick={handleShare}
                  className="p-1.5 rounded-lg bg-[#141822] hover:bg-[#1b212f] border border-[#212634] text-xs text-[#8e97a8] hover:text-white transition-colors flex items-center gap-1"
                  title="Share NFT link"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Share2 size={13} />}
                  <span>{copied ? 'Copied' : 'Share'}</span>
                </button>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white">
              {nft.name}
            </h1>
            <p className="text-xs text-[#9ca3af] mt-2 leading-relaxed">
              {nft.description}
            </p>
          </div>

          {/* Provenance & Ownership */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#11141a] border border-[#212634] text-xs">
            <div>
              <div className="text-[10px] font-mono-code text-[#6b7280]">ORIGINAL CREATOR</div>
              <div className="font-bold text-white flex items-center gap-1 mt-0.5">
                <span>@{nft.creatorUsername}</span>
                {nft.creatorVerified && <VerifiedBadge size="sm" />}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono-code text-[#6b7280]">CURRENT OWNER</div>
              <div className="font-bold text-white mt-0.5 truncate">
                {isOwner ? (
                  <span className="text-emerald-400 font-mono-code font-bold">You (Connected)</span>
                ) : (
                  <span>@{nft.ownerUsername || (nft.ownerAddress ? (nft.ownerAddress.length >= 8 ? `${nft.ownerAddress.slice(0, 8)}...` : nft.ownerAddress) : 'Collector')}</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Box: Buy / Bid / Manage */}
          <div className="p-5 rounded-2xl bg-[#11141b] border border-[#232837] space-y-4">
            {nft.isInAuction && auction ? (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono-code text-[#8e97a8]">ACTIVE AUCTION</span>
                  <span className="text-xs font-mono-code text-amber-400 font-bold">{auction.bidCount} Bids</span>
                </div>
                <div className="text-2xl font-mono-code font-extrabold text-amber-400 mb-4">
                  {auction.currentBid} ALGO
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onBid(nft)}
                    className="flex-1 py-3 rounded-xl bg-[#ff5500] hover:bg-[#e64d00] text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Gavel size={16} />
                    <span>Place Bid</span>
                  </button>
                  <button
                    onClick={() => onNavigate(`auctions/${auction.id}`)}
                    className="py-3 px-4 rounded-xl bg-[#181d28] hover:bg-[#202737] text-white font-semibold text-xs transition-colors"
                  >
                    Auction Room →
                  </button>
                </div>
              </div>
            ) : nft.isListed ? (
              <div>
                <div className="text-xs font-mono-code text-[#8e97a8] mb-1">BUY NOW PRICE</div>
                <div className="text-2xl font-mono-code font-extrabold text-[#ff5500] mb-4">
                  {nft.price} ALGO
                </div>

                {isOwner ? (
                  <button
                    onClick={handleDelist}
                    className="w-full py-2.5 rounded-xl bg-[#1e2330] hover:bg-red-950/40 text-[#8e97a8] hover:text-red-400 font-semibold text-xs transition-colors"
                  >
                    Cancel Listing
                  </button>
                ) : (
                  <button
                    onClick={() => onBuy(nft)}
                    className="w-full py-3 rounded-xl bg-[#ff5500] hover:bg-[#e64d00] text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#ff5500]/25"
                  >
                    <Tag size={16} />
                    <span>Instant Buy for {nft.price} ALGO</span>
                  </button>
                )}
              </div>
            ) : isOwner ? (
              <div className="space-y-2">
                <div className="text-xs font-mono-code text-[#8e97a8]">OWNERSHIP ACTIONS</div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowListModal(true)}
                    className="flex-1 py-2.5 rounded-xl bg-[#ff5500] hover:bg-[#e64d00] text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Tag size={14} />
                    <span>List for Sale</span>
                  </button>
                  <button
                    onClick={() => onNavigate('auctions')}
                    className="flex-1 py-2.5 rounded-xl bg-[#181d28] hover:bg-[#222838] border border-[#252c3c] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Gavel size={14} className="text-amber-400" />
                    <span>Put on Auction</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-2 text-xs font-mono-code text-[#6b7280]">
                This artifact is currently unlisted by its owner.
              </div>
            )}
          </div>

          {/* Traits & Attributes */}
          {nft.traits && nft.traits.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono-code text-white">
                Attributes & Traits ({nft.traits.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {nft.traits.map((trait, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-[#11141a] border border-[#1f2430] text-left"
                  >
                    <div className="text-[10px] font-mono-code uppercase text-[#ff5500]">
                      {trait.trait_type}
                    </div>
                    <div className="text-xs font-bold text-white mt-0.5 truncate">
                      {trait.value}
                    </div>
                    {trait.rarity && (
                      <div className="text-[9px] font-mono-code text-[#6b7280] mt-0.5">
                        {trait.rarity}% have this trait
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* On-Chain Token Details */}
          <div className="p-4 rounded-xl bg-[#11141a] border border-[#212634] space-y-2 text-xs font-mono-code">
            <div className="flex items-center justify-between text-[#8e97a8]">
              <span>Asset ID / Mint:</span>
              {nft.tokenAddress ? (
                <a
                  href={`https://testnet.explorer.perawallet.app/asset/${nft.tokenAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-[#ff5500] hover:underline flex items-center gap-1"
                >
                  <span>{nft.tokenAddress.length >= 12 ? `${nft.tokenAddress.slice(0, 6)}...${nft.tokenAddress.slice(-6)}` : nft.tokenAddress}</span>
                  <ExternalLink size={10} />
                </a>
              ) : (
                <span className="text-white">#{nft.id}</span>
              )}
            </div>
            <div className="flex items-center justify-between text-[#8e97a8]">
              <span>Contract / Application:</span>
              {(() => {
                const targetAddr = nft.contractAddress || collection?.contractAddress || nft.tokenAddress;
                if (!targetAddr) {
                  return <span className="text-[#8e97a8]">Algorand ARC-0003 Standard</span>;
                }
                const displayAddr = targetAddr.length >= 12 ? `${targetAddr.slice(0, 6)}...${targetAddr.slice(-6)}` : targetAddr;
                return (
                  <a
                    href={`https://testnet.explorer.perawallet.app/address/${targetAddr}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#ff5500] hover:underline flex items-center gap-1"
                  >
                    <span>{displayAddr}</span>
                    <ExternalLink size={11} />
                  </a>
                );
              })()}
            </div>
            <div className="flex items-center justify-between text-[#8e97a8]">
              <span>Network:</span>
              <span className="text-emerald-400">Algorand Testnet</span>
            </div>
          </div>
        </div>
      </div>

      {/* LIST FOR SALE MODAL */}
      {showListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm bg-[#11141a] border border-[#212634] rounded-2xl p-6 shadow-2xl text-left">
            <h2 className="text-lg font-display font-bold text-white mb-1">
              List Item for Sale
            </h2>
            <p className="text-xs text-[#9ca3af] mb-4">
              Set your fixed listing price in ALGO. Buyers can instantly purchase your NFT.
            </p>

            <form onSubmit={handleListForSale} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                  Listing Price (ALGO) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="0.01"
                    required
                    value={listPrice}
                    onChange={e => setListPrice(e.target.value)}
                    className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-sm text-white font-mono-code font-bold focus:outline-none focus:border-[#ff5500]"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-mono-code text-[#ff5500] font-bold">
                    ALGO
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowListModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#181d28] text-xs font-semibold text-[#8e97a8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={listLoading}
                  className="px-5 py-2 rounded-lg bg-[#ff5500] hover:bg-[#e64d00] text-white text-xs font-bold transition-colors shadow-md shadow-[#ff5500]/25"
                >
                  {listLoading ? 'Listing...' : 'Confirm Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
