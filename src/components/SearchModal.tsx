import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Layers, Image as ImageIcon, User, Gavel, Target, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';
import { NFTCollection, NFT, User as UserType, Auction, Bounty } from '../types';
import { VerifiedBadge } from './VerifiedBadge';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    collections: NFTCollection[];
    nfts: NFT[];
    creators: UserType[];
    auctions: Auction[];
    bounties: Bounty[];
  }>({
    collections: [],
    nfts: [],
    creators: [],
    auctions: [],
    bounties: []
  });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ collections: [], nfts: [], creators: [], auctions: [], bounties: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ collections: [], nfts: [], creators: [], auctions: [], bounties: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.search(query.trim());
        setResults(res);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalResults = 
    results.collections.length + 
    results.nfts.length + 
    results.creators.length + 
    results.auctions.length + 
    results.bounties.length;

  const handleSelect = (path: string) => {
    onNavigate(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#11141a] border border-[#212634] rounded-2xl shadow-2xl overflow-hidden text-left flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#212634] gap-3">
          <Search size={18} className="text-[#ff5500] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search NFTs, collections, creators (@Ace), auctions, bounties..."
            className="flex-1 bg-transparent text-sm text-white placeholder-[#6b7280] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded text-[#6b7280] hover:text-white"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 text-[11px] font-mono-code text-[#6b7280] hover:text-white bg-[#191e2b] rounded border border-[#272e40]"
          >
            ESC
          </button>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-3 divide-y divide-[#1a202d]">
          {loading && (
            <div className="py-8 text-center text-xs text-[#8e97a8] font-mono-code">
              Searching protocol registry...
            </div>
          )}

          {!loading && query && totalResults === 0 && (
            <div className="py-10 text-center">
              <p className="text-sm font-semibold text-white">No results found for "{query}"</p>
              <p className="text-xs text-[#6b7280] mt-1">Try searching for "Ents", "Ace", or "Chrono"</p>
            </div>
          )}

          {!query && (
            <div className="p-4 text-xs text-[#6b7280]">
              <span className="font-semibold text-[#8e97a8]">Popular Quick Searches:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {['Ents of Solana', 'Chrono Glyphs', '@Ace', 'Hyper Cubes', 'Artwork Commissions'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag.replace('@', ''))}
                    className="px-2.5 py-1 rounded bg-[#161a23] hover:bg-[#202737] text-white border border-[#252c3c] text-xs transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Collections */}
          {results.collections.length > 0 && (
            <div className="py-2">
              <div className="px-2 py-1 text-[10px] font-mono-code uppercase text-[#8e97a8] font-bold flex items-center gap-1.5">
                <Layers size={12} className="text-[#ff5500]" /> Collections
              </div>
              <div className="mt-1 space-y-1">
                {results.collections.map(col => (
                  <button
                    key={col.id}
                    onClick={() => handleSelect(`/collection/${col.id}`)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#181d28] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <img src={col.image} alt={col.name} className="w-8 h-8 rounded-lg object-cover" />
                      <div className="text-left">
                        <div className="text-xs font-bold text-white group-hover:text-[#ff5500] flex items-center gap-1">
                          {col.name} {col.isVerified && <VerifiedBadge size="sm" />}
                        </div>
                        <div className="text-[11px] text-[#6b7280]">
                          Floor: <span className="text-[#ff5500] font-mono-code">{col.floorPrice || col.mintPrice} SOL</span> • Supply: {col.totalSupply}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono-code text-[#6b7280]">{col.symbol}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* NFTs */}
          {results.nfts.length > 0 && (
            <div className="py-2">
              <div className="px-2 py-1 text-[10px] font-mono-code uppercase text-[#8e97a8] font-bold flex items-center gap-1.5">
                <ImageIcon size={12} className="text-[#ff5500]" /> NFTs
              </div>
              <div className="mt-1 space-y-1">
                {results.nfts.map(nft => (
                  <button
                    key={nft.id}
                    onClick={() => handleSelect(`/nft/${nft.id}`)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#181d28] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <img src={nft.image} alt={nft.name} className="w-8 h-8 rounded-lg object-cover" />
                      <div className="text-left">
                        <div className="text-xs font-bold text-white group-hover:text-[#ff5500]">
                          {nft.name}
                        </div>
                        <div className="text-[11px] text-[#6b7280]">{nft.collectionName}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      {nft.price ? (
                        <span className="text-xs font-mono-code font-bold text-[#ff5500]">{nft.price} SOL</span>
                      ) : nft.isInAuction ? (
                        <span className="text-[10px] font-mono-code text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">AUCTION</span>
                      ) : (
                        <span className="text-[11px] text-[#525a6c]">Unlisted</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Creators */}
          {results.creators.length > 0 && (
            <div className="py-2">
              <div className="px-2 py-1 text-[10px] font-mono-code uppercase text-[#8e97a8] font-bold flex items-center gap-1.5">
                <User size={12} className="text-[#ff5500]" /> Creators & Collectors
              </div>
              <div className="mt-1 space-y-1">
                {results.creators.map(cr => (
                  <button
                    key={cr.id}
                    onClick={() => handleSelect(`/creator/@${cr.username}`)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#181d28] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <img src={cr.avatar} alt={cr.displayName} className="w-8 h-8 rounded-full object-cover" />
                      <div className="text-left">
                        <div className="text-xs font-bold text-white group-hover:text-[#ff5500]">
                          {cr.displayName}
                        </div>
                        <div className="text-[11px] text-[#6b7280] flex items-center gap-1">
                          <span>@{cr.username}</span>
                          {cr.isVerified && <VerifiedBadge size="sm" />}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-[#1c2230] text-[#8e97a8]">
                      {cr.role === 'admin' ? 'Protocol Admin' : 'Creator'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Auctions */}
          {results.auctions.length > 0 && (
            <div className="py-2">
              <div className="px-2 py-1 text-[10px] font-mono-code uppercase text-[#8e97a8] font-bold flex items-center gap-1.5">
                <Gavel size={12} className="text-[#ff5500]" /> Live Auctions
              </div>
              <div className="mt-1 space-y-1">
                {results.auctions.map(auc => (
                  <button
                    key={auc.id}
                    onClick={() => handleSelect(`/auctions/${auc.id}`)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#181d28] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <img src={auc.nft.image} alt={auc.customTitle} className="w-8 h-8 rounded-lg object-cover" />
                      <div className="text-left">
                        <div className="text-xs font-bold text-white group-hover:text-[#ff5500]">
                          {auc.customTitle}
                        </div>
                        <div className="text-[11px] text-[#6b7280]">By @{auc.creatorUsername}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono-code font-bold text-[#ff5500]">{auc.currentBid} SOL</div>
                      <div className="text-[10px] text-[#6b7280]">{auc.bidCount} bids</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bounties */}
          {results.bounties.length > 0 && (
            <div className="py-2">
              <div className="px-2 py-1 text-[10px] font-mono-code uppercase text-[#8e97a8] font-bold flex items-center gap-1.5">
                <Target size={12} className="text-[#ff5500]" /> Bounties & Tasks
              </div>
              <div className="mt-1 space-y-1">
                {results.bounties.map(b => (
                  <button
                    key={b.id}
                    onClick={() => handleSelect(`/bounties/${b.id}`)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#181d28] transition-colors group"
                  >
                    <div className="text-left">
                      <div className="text-xs font-bold text-white group-hover:text-[#ff5500]">
                        {b.title}
                      </div>
                      <div className="text-[11px] text-[#6b7280] capitalize">{b.category.replace('_', ' ')}</div>
                    </div>
                    <span className="text-xs font-mono-code font-bold text-emerald-400">
                      +{b.reward} SOL
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
