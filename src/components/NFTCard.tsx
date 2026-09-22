import React, { useState } from 'react';
import { Heart, Gavel, Tag, Zap } from 'lucide-react';
import { NFT } from '../types';
import { VerifiedBadge } from './VerifiedBadge';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface NFTCardProps {
  nft: NFT;
  onSelect: (nft: NFT) => void;
  onQuickBuy?: (nft: NFT) => void;
  onQuickBid?: (nft: NFT) => void;
  isLiked?: boolean;
}

export const NFTCard: React.FC<NFTCardProps> = ({ nft, onSelect, onQuickBuy, onQuickBid, isLiked = false }) => {
  const { user, setShowAuthModal } = useAuth();
  const [likes, setLikes] = useState(nft.likes || 0);
  const [liked, setLiked] = useState(isLiked);
  const [liking, setLiking] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (liking) return;
    setLiking(true);
    try {
      const res = await api.toggleLike('nft', nft.id);
      setLiked(res.liked);
      setLikes(res.likes);
    } catch (err) {
      console.error('Like toggle error:', err);
    } finally {
      setLiking(false);
    }
  };

  return (
    <div
      onClick={() => onSelect(nft)}
      className="group relative flex flex-col bg-[#11141a] hover:bg-[#151921] border border-[#1f2430] hover:border-[#ff5500]/50 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 shadow-sm hover:shadow-lg hover:shadow-black/50"
    >
      {/* Image & Badges */}
      <div className="relative aspect-square w-full bg-[#0a0c10] overflow-hidden">
        <img
          src={nft.image}
          alt={nft.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Top Floating Chips */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          {/* Status badge */}
          {nft.isInAuction ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-emerald-500/90 text-black shadow flex items-center gap-1 backdrop-blur-sm">
              <Zap size={10} /> GRADUATED
            </span>
          ) : nft.isListed ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-[#ff5500] text-white shadow flex items-center gap-1 backdrop-blur-sm">
              <Tag size={10} /> BONDING CURVE
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code font-medium bg-black/60 text-[#8e97a8] backdrop-blur-sm">
              NEW LAUNCH
            </span>
          )}

          {/* Like button */}
          <button
            onClick={handleLike}
            className={`pointer-events-auto p-1.5 rounded-full backdrop-blur-md transition-colors flex items-center gap-1 text-[11px] font-mono-code ${
              liked
                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                : 'bg-black/60 text-white/80 hover:text-white border border-white/10'
            }`}
          >
            <Heart size={12} className={liked ? 'fill-current text-red-500' : ''} />
            <span className="text-[10px]">{likes}</span>
          </button>
        </div>

        {/* Collection tag overlay */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          <div className="px-2 py-0.5 rounded bg-black/75 backdrop-blur-md text-[10px] font-mono-code text-white/90 truncate max-w-[80%] flex items-center gap-1 border border-white/10">
            <span className="truncate">{nft.collectionName}</span>
          </div>
        </div>
      </div>

      {/* Info Body */}
      <div className="p-3 flex flex-col justify-between flex-1">
        <div>
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[#ff5500] transition-colors">
              {nft.name}
            </h4>
            <span className="text-[10px] font-mono-code text-[#6b7280] shrink-0">
              #{nft.id ? (nft.id.length > 4 ? nft.id.slice(-4) : nft.id) : '0000'}
            </span>
          </div>
        </div>

        {/* Price & Action Row */}
        <div className="mt-2.5 pt-2 border-t border-[#1b202b] flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono-code text-[#6b7280]">
              {nft.isInAuction ? 'MARKET CAP' : nft.isListed ? 'PRICE' : 'INITIAL'}
            </div>
            <div className="text-xs sm:text-sm font-mono-code font-bold text-white flex items-baseline gap-1">
              {nft.isInAuction ? (
                <span className="text-emerald-400">{nft.price || 1.0} ALGO</span>
              ) : nft.isListed ? (
                <span className="text-[#ff5500]">{nft.price} ALGO</span>
              ) : nft.lastSalePrice ? (
                <span className="text-[#9ca3af]">{nft.lastSalePrice} ALGO</span>
              ) : (
                <span className="text-[#525a6c]">--</span>
              )}
            </div>
          </div>

          {/* Instant Quick Action Button */}
          {nft.isListed && onQuickBuy ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickBuy(nft);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-[#ff5500] hover:bg-[#e64d00] text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm shadow-[#ff5500]/20"
            >
              <Zap size={12} />
              <span>Buy</span>
            </button>
          ) : nft.isInAuction && onQuickBid ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickBid(nft);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Gavel size={12} />
              <span>Bid</span>
            </button>
          ) : (
            <span className="text-[11px] font-mono-code text-[#6b7280] group-hover:text-white transition-colors">
              Details →
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
