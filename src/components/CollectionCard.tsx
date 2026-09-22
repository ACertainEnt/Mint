import React from 'react';
import { Sparkles, ArrowUpRight } from 'lucide-react';
import { NFTCollection } from '../types';
import { VerifiedBadge } from './VerifiedBadge';

interface CollectionCardProps {
  collection: NFTCollection;
  onSelect: (collection: NFTCollection) => void;
  onQuickMint?: (collection: NFTCollection) => void;
}

export const CollectionCard: React.FC<CollectionCardProps> = ({ collection, onSelect, onQuickMint }) => {
  const percentMinted = Math.min(100, Math.round((collection.mintedSupply / collection.totalSupply) * 100));
  const isSoldOut = collection.mintedSupply >= collection.totalSupply;

  return (
    <div
      onClick={() => onSelect(collection)}
      className="group relative flex flex-col bg-[#11141a] hover:bg-[#151921] border border-[#1f2430] hover:border-[#ff5500]/50 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 shadow-sm"
    >
      {/* Banner */}
      <div className="relative h-24 w-full bg-[#0a0c10] overflow-hidden">
        {collection.banner ? (
          <img
            src={collection.banner}
            alt={collection.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-[#ff5500]/20 to-[#1e2433]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#11141a] via-transparent to-transparent" />

        {/* Live Badge */}
        {collection.isLive && !isSoldOut && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono-code font-bold backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>ACTIVE</span>
          </div>
        )}
      </div>

      {/* Avatar & Info */}
      <div className="px-3.5 pb-3.5 -mt-6 relative flex flex-col flex-1">
        <div className="flex items-end justify-between mb-2">
          <div className="relative">
            <img
              src={collection.image}
              alt={collection.name}
              className="w-12 h-12 rounded-xl object-cover border-2 border-[#11141a] shadow-md bg-black"
            />
          </div>
          <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-[#1c2230] text-[#8e97a8] border border-[#262e40]">
            {collection.symbol}
          </span>
        </div>

        <div>
          <div className="flex items-center gap-1">
            <h3 className="text-sm font-bold text-white group-hover:text-[#ff5500] transition-colors truncate">
              {collection.name}
            </h3>
          </div>
          <p className="text-[11px] text-[#8e97a8] line-clamp-1 mt-0.5">
            {collection.description}
          </p>
        </div>

        {/* Mint Progress */}
        <div className="mt-3">
          <div className="flex justify-between text-[10px] font-mono-code mb-1">
            <span className="text-[#6b7280]">
              BONDING: {collection.mintedSupply} / {collection.totalSupply}
            </span>
            <span className="text-[#ff5500] font-semibold">{percentMinted}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#1a202c] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#ff5500] to-[#ff8c4d] transition-all duration-500"
              style={{ width: `${percentMinted}%` }}
            />
          </div>
        </div>

        {/* Floor, Volume & Action */}
        <div className="mt-3 pt-2.5 border-t border-[#1b202b] flex items-center justify-between">
          <div className="flex gap-3 text-left">
            <div>
              <div className="text-[9px] font-mono-code text-[#6b7280]">PRICE</div>
              <div className="text-xs font-mono-code font-bold text-[#ff5500]">
                {collection.mintPrice} ALGO
              </div>
            </div>
            <div>
              <div className="text-[9px] font-mono-code text-[#6b7280]">VOLUME</div>
              <div className="text-xs font-mono-code font-bold text-white">
                {collection.totalVolume || 0} ALGO
              </div>
            </div>
          </div>

          {!isSoldOut && onQuickMint ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickMint(collection);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#ff5500] hover:bg-[#e64d00] text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm shadow-[#ff5500]/20"
            >
              <Sparkles size={11} />
              <span>Mint</span>
            </button>
          ) : (
            <div className="p-1 rounded text-[#6b7280] group-hover:text-white transition-colors">
              <ArrowUpRight size={16} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
