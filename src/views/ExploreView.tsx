import React, { useState, useEffect } from 'react';
import { Search, Filter, ArrowUpDown, Tag, Gavel, Sparkles, Layers } from 'lucide-react';
import { NFT, NFTCollection } from '../types';
import { NFTCard } from '../components/NFTCard';
import { api } from '../lib/api';

interface ExploreViewProps {
  onSelectNft: (nft: NFT) => void;
  onQuickBuy: (nft: NFT) => void;
  onQuickBid: (nft: NFT) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  onSelectNft,
  onQuickBuy,
  onQuickBid
}) => {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [collections, setCollections] = useState<NFTCollection[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'listed' | 'auction'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'likes'>('newest');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [nftsRes, colsRes] = await Promise.all([
          api.getNfts({
            collectionId: selectedCollection !== 'all' ? selectedCollection : undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            sort: sortBy === 'price_asc' ? 'price_low' : sortBy === 'price_desc' ? 'price_high' : sortBy === 'likes' ? 'likes' : 'newest',
            search: search.trim() || undefined
          }),
          api.getCollections()
        ]);
        setNfts(nftsRes.nfts);
        setCollections(colsRes.collections);
      } catch (err) {
        console.error('Explore load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedCollection, statusFilter, sortBy, search]);

  // Client-side min/max price filter
  const filteredNfts = nfts.filter(nft => {
    const price = nft.price || 0;
    if (minPrice && price < Number(minPrice)) return false;
    if (maxPrice && price > Number(maxPrice)) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white">
            Algorand Coins & Bonding Curves
          </h1>
          <p className="text-xs sm:text-sm text-[#9ca3af] mt-1">
            Discover trending memecoins, track bonding curve progress toward Tinyman DEX graduation, and trade with instant Algorand finality.
          </p>
        </div>
        <div className="text-xs font-mono-code text-[#6b7280]">
          Showing <span className="text-white font-bold">{filteredNfts.length}</span> coins
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#11141b] border border-[#212634] p-3.5 rounded-xl space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          {/* Search input */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-2.5 text-[#6b7280]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter coins by ticker, name, or creator..."
              className="w-full bg-[#161a22] border border-[#232938] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-[#525a6c] focus:outline-none focus:border-[#ff5500]"
            />
          </div>

          {/* Status Buttons */}
          <div className="flex items-center gap-1 bg-[#161a22] p-1 rounded-lg border border-[#232938]">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                statusFilter === 'all' ? 'bg-[#ff5500] text-white' : 'text-[#8e97a8] hover:text-white'
              }`}
            >
              All Coins
            </button>
            <button
              onClick={() => setStatusFilter('listed')}
              className={`px-3 py-1 text-xs font-semibold rounded transition-colors flex items-center gap-1 ${
                statusFilter === 'listed' ? 'bg-[#ff5500] text-white' : 'text-[#8e97a8] hover:text-white'
              }`}
            >
              <Tag size={12} />
              <span>Bonding Curve</span>
            </button>
            <button
              onClick={() => setStatusFilter('auction')}
              className={`px-3 py-1 text-xs font-semibold rounded transition-colors flex items-center gap-1 ${
                statusFilter === 'auction' ? 'bg-[#ff5500] text-white' : 'text-[#8e97a8] hover:text-white'
              }`}
            >
              <Sparkles size={12} />
              <span>DEX Graduated</span>
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <ArrowUpDown size={14} className="text-[#6b7280] hidden sm:inline" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-[#161a22] border border-[#232938] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500]"
            >
              <option value="newest">Newest Launches</option>
              <option value="price_asc">Market Cap: Low to High</option>
              <option value="price_desc">Market Cap: High to Low</option>
              <option value="likes">Highest Volume / Likes</option>
            </select>
          </div>
        </div>

        {/* Collection Pills and Price inputs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1b202c]">
          {/* Collection Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setSelectedCollection('all')}
              className={`px-2.5 py-1 rounded-full text-xs font-mono-code transition-colors shrink-0 ${
                selectedCollection === 'all'
                  ? 'bg-[#ff5500] text-white font-bold'
                  : 'bg-[#181d28] text-[#8e97a8] hover:text-white'
              }`}
            >
              All Categories
            </button>
            {collections.map(col => (
              <button
                key={col.id}
                onClick={() => setSelectedCollection(col.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-mono-code transition-colors shrink-0 flex items-center gap-1.5 ${
                  selectedCollection === col.id
                    ? 'bg-[#ff5500] text-white font-bold'
                    : 'bg-[#181d28] text-[#8e97a8] hover:text-white'
                }`}
              >
                <img src={col.image} alt={col.name} className="w-3.5 h-3.5 rounded-full object-cover" />
                <span>{col.name}</span>
              </button>
            ))}
          </div>

          {/* Min / Max ALGO range */}
          <div className="flex items-center gap-1.5 text-xs font-mono-code">
            <span className="text-[#6b7280]">ALGO Range:</span>
            <input
              type="number"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              placeholder="Min"
              className="w-16 bg-[#161a22] border border-[#232938] rounded px-2 py-1 text-xs text-white placeholder-[#525a6c] focus:outline-none"
            />
            <span className="text-[#6b7280]">-</span>
            <input
              type="number"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              placeholder="Max"
              className="w-16 bg-[#161a22] border border-[#232938] rounded px-2 py-1 text-xs text-white placeholder-[#525a6c] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs font-mono-code text-[#8e97a8]">
          Loading marketplace catalog...
        </div>
      ) : filteredNfts.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-[#11141b] border border-[#212634] p-8">
          <Layers size={32} className="mx-auto mb-3 text-[#6b7280]" />
          <h3 className="text-base font-bold text-white">No items found matching your filters</h3>
          <p className="text-xs text-[#8e97a8] mt-1">Try resetting the collection or price parameters.</p>
          <button
            onClick={() => {
              setSelectedCollection('all');
              setStatusFilter('all');
              setSearch('');
              setMinPrice('');
              setMaxPrice('');
            }}
            className="mt-4 px-4 py-2 rounded-lg bg-[#181d28] hover:bg-[#202737] text-xs font-semibold text-white transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {filteredNfts.map(nft => (
            <NFTCard
              key={nft.id}
              nft={nft}
              onSelect={onSelectNft}
              onQuickBuy={onQuickBuy}
              onQuickBid={onQuickBid}
            />
          ))}
        </div>
      )}
    </div>
  );
};
