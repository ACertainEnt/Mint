import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  X, 
  Search, 
  Sparkles, 
  ArrowRight, 
  RefreshCw, 
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Database,
  Maximize2
} from 'lucide-react';
import { api } from '../lib/api';
import { MintBotQueryResponse, MintBotUsage } from '../types';

interface MintBotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullView: () => void;
  onSelectNft: (nftId: string) => void;
  onSelectCollection: (colId: string) => void;
  initialQuery?: string;
}

export const MintBotDrawer: React.FC<MintBotDrawerProps> = ({
  isOpen,
  onClose,
  onOpenFullView,
  onSelectNft,
  onSelectCollection,
  initialQuery
}) => {
  const [query, setQuery] = useState(initialQuery || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MintBotQueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<MintBotUsage | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getMintBotUsage().then(res => setUsage(res.usage)).catch(() => {});
      if (initialQuery) {
        setQuery(initialQuery);
        executeSearch(initialQuery);
      }
    }
  }, [isOpen, initialQuery]);

  if (!isOpen) return null;

  const executeSearch = async (queryText?: string) => {
    const q = (queryText || query).trim();
    if (!q) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.queryMintBot(q);
      setResult(res);
      setUsage(res.usage);
    } catch (err: any) {
      setError(err.message || 'Could not execute query.');
      if (err.usage) setUsage(err.usage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer panel */}
      <div className="relative w-full max-w-lg bg-[#0a0c10] border-l border-[#1d222e] h-full shadow-2xl flex flex-col z-10">
        {/* Header */}
        <div className="p-4 border-b border-[#1b202c] flex items-center justify-between bg-[#0e1117]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#ff5500]/15 border border-[#ff5500]/30 flex items-center justify-center text-[#ff5500]">
              <Bot size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">MintBot Quick Intel</h3>
                {usage && (
                  <span className="text-[10px] font-mono-code text-[#ff5500] bg-[#ff5500]/10 px-1.5 py-0.5 rounded border border-[#ff5500]/20">
                    {usage.isUnlimited || usage.tier === 'unlimited' ? '∞ Unlimited' : `${usage.remaining}/${usage.limit}`}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-[#8e97a8] block">Grounded Solana & MINT Research</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                onClose();
                onOpenFullView();
              }}
              className="p-1.5 rounded-lg text-[#8e97a8] hover:text-white hover:bg-[#181d28] transition-colors"
              title="Expand to Full View"
            >
              <Maximize2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8e97a8] hover:text-white hover:bg-[#181d28] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 border-b border-[#1b202c] bg-[#0c0e14]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeSearch();
            }}
            className="relative flex items-center"
          >
            <Search size={15} className="absolute left-3 text-[#8e97a8]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search NFT, collection floor, or Solana wallet..."
              className="w-full pl-9 pr-20 py-2 rounded-lg bg-[#080a0e] border border-[#212634] focus:border-[#ff5500] text-xs text-white placeholder-[#535c6e] focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-1 px-3 py-1 rounded-md bg-[#ff5500] hover:bg-[#e04b00] disabled:opacity-40 text-white text-xs font-semibold"
            >
              {loading ? <RefreshCw size={12} className="animate-spin" /> : 'Ask'}
            </button>
          </form>

          {/* Quick prompt pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 text-[10px]">
            {[
              { label: 'Ents Floor', q: 'Analyze Ents of Solana collection floor' },
              { label: 'Elder Ent #001', q: 'Look up Elder Ent #001 traits' },
              { label: 'Protocol Fees', q: 'What are the protocol fees on MINT?' },
              { label: 'Active Auctions', q: 'Find active auctions on MINT' }
            ].map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(p.q);
                  executeSearch(p.q);
                }}
                className="px-2 py-0.5 rounded bg-[#131720] hover:bg-[#1b212f] border border-[#1f2533] text-[#8e97a8] hover:text-white whitespace-nowrap transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-950/20 border border-red-500/30 flex items-start gap-2 text-xs text-red-300">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result ? (
            <div className="space-y-4">
              {/* Data Sources Badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                {result.dataSources.map((ds, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded text-[9px] font-mono-code bg-[#141822] border border-[#212634] text-[#8e97a8] flex items-center gap-1"
                  >
                    {ds.status === 'verified' && <CheckCircle2 size={10} className="text-emerald-400" />}
                    {ds.status === 'rpc_live' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    {ds.status === 'unavailable' && <AlertCircle size={10} className="text-amber-400" />}
                    <span>{ds.name}</span>
                  </span>
                ))}
              </div>

              {/* Verified Text Result */}
              <div className="p-4 rounded-xl bg-[#0e1117] border border-[#1c2230] text-xs text-[#c8d0de] leading-relaxed whitespace-pre-line">
                {result.textAnswer}
              </div>

              {/* Structured Previews */}
              {result.structuredData?.collectionStats && (
                <div className="p-3 rounded-xl bg-[#0e1117] border border-[#1c2230] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">
                      {result.structuredData.collectionStats.collection.name}
                    </span>
                    <button
                      onClick={() => {
                        onClose();
                        onSelectCollection(result.structuredData!.collectionStats!.collection.id);
                      }}
                      className="text-[11px] text-[#ff5500] hover:underline flex items-center gap-1"
                    >
                      <span>View</span>
                      <ExternalLink size={10} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] font-mono-code">
                    <div className="bg-[#080a0f] p-2 rounded border border-[#181d28]">
                      <span className="text-[#8e97a8] text-[9px] block">Floor</span>
                      <span className="font-bold text-[#ff5500]">
                        {result.structuredData.collectionStats.floorPrice} SOL
                      </span>
                    </div>
                    <div className="bg-[#080a0f] p-2 rounded border border-[#181d28]">
                      <span className="text-[#8e97a8] text-[9px] block">Supply</span>
                      <span className="text-white">
                        {result.structuredData.collectionStats.collection.mintedSupply}/{result.structuredData.collectionStats.collection.totalSupply}
                      </span>
                    </div>
                    <div className="bg-[#080a0f] p-2 rounded border border-[#181d28]">
                      <span className="text-[#8e97a8] text-[9px] block">Volume</span>
                      <span className="text-white">
                        {result.structuredData.collectionStats.totalVolume} SOL
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {result.structuredData?.nfts && result.structuredData.nfts.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-[#8e97a8] uppercase tracking-wider block">
                    Referenced Items
                  </span>
                  {result.structuredData.nfts.slice(0, 3).map(nft => (
                    <div
                      key={nft.id}
                      onClick={() => {
                        onClose();
                        onSelectNft(nft.id);
                      }}
                      className="p-2.5 rounded-lg bg-[#0e1117] hover:bg-[#131722] border border-[#1c2230] cursor-pointer flex items-center gap-3"
                    >
                      <img
                        src={nft.image}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-md object-cover border border-[#212634]"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-white block truncate">{nft.name}</span>
                        <span className="text-[10px] font-mono-code text-[#8e97a8]">
                          {nft.isListed ? `${nft.price} SOL` : nft.collectionName}
                        </span>
                      </div>
                      <ArrowRight size={13} className="text-[#6b7280]" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10 space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#11141c] border border-[#1c2230] mx-auto flex items-center justify-center text-[#ff5500]">
                <Bot size={22} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white">Ask MintBot Anything</h4>
                <p className="text-[11px] text-[#8e97a8] max-w-xs mx-auto">
                  Instant factual lookups grounded in MINT order books, launchpad collections, and live Solana Devnet RPC.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
