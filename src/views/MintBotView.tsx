import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Search, 
  Sparkles, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Wallet, 
  Gavel, 
  HelpCircle, 
  ArrowRight, 
  Clock, 
  Database, 
  Cpu, 
  RefreshCw,
  Copy,
  Check,
  Tag,
  ShieldCheck,
  Flame
} from 'lucide-react';
import { api } from '../lib/api';
import { 
  NFT, 
  NFTCollection, 
  Auction, 
  MintBotQueryResponse, 
  MintBotUsage, 
  MintBotSuggestionGroup 
} from '../types';

interface MintBotViewProps {
  onSelectNft: (nftId: string) => void;
  onSelectCollection: (colId: string) => void;
  onSelectAuction?: (auctionId: string) => void;
  onNavigate: (tab: string) => void;
  initialQuery?: string;
}

export const MintBotView: React.FC<MintBotViewProps> = ({
  onSelectNft,
  onSelectCollection,
  onSelectAuction,
  onNavigate,
  initialQuery
}) => {
  const [query, setQuery] = useState(initialQuery || '');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<MintBotQueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<MintBotUsage | null>(null);
  const [statusInfo, setStatusInfo] = useState<{
    database: { status: string; provider: string };
    solanaRpc: { status: string; network: string; endpoint: string; slot?: number };
    indexingProvider: { isConfigured: boolean; provider: string; message: string };
    aiEngine: { status: string; provider: string; note: string };
  } | null>(null);
  const [suggestions, setSuggestions] = useState<MintBotSuggestionGroup[]>([]);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

  // Load status, usage, suggestions on mount
  useEffect(() => {
    loadStatusAndUsage();
    loadSuggestions();
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, []);

  const loadStatusAndUsage = async () => {
    try {
      const [usageRes, statusRes] = await Promise.all([
        api.getMintBotUsage(),
        api.getMintBotStatus()
      ]);
      setUsage(usageRes.usage);
      setStatusInfo(statusRes);
    } catch (err) {
      console.error('Failed to load MintBot status:', err);
    }
  };

  const loadSuggestions = async () => {
    try {
      const res = await api.getMintBotSuggestions();
      setSuggestions(res.suggestions);
    } catch (err) {
      console.error('Failed to load suggestions:', err);
    }
  };

  const handleSearch = async (textToSearch?: string) => {
    const q = (textToSearch || query).trim();
    if (!q) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.queryMintBot(q);
      setCurrentResult(response);
      setUsage(response.usage);

      // Track recent queries
      setRecentQueries(prev => {
        const filtered = prev.filter(item => item.toLowerCase() !== q.toLowerCase());
        return [q, ...filtered].slice(0, 8);
      });
    } catch (err: any) {
      setError(err.message || 'Failed to execute query. Check connectivity or rate limits.');
      if (err.usage) {
        setUsage(err.usage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddr(text);
    setTimeout(() => setCopiedAddr(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 px-3 sm:px-0">
      {/* Top Header / Platform Research Deck */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#0e1117] border border-[#1c2230] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#ff5500]/15 border border-[#ff5500]/30 flex items-center justify-center text-[#ff5500]">
                <Bot size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-white tracking-tight">MintBot</h1>
                  <span className="px-2 py-0.5 rounded-md bg-[#ff5500]/10 border border-[#ff5500]/25 text-[#ff5500] text-[10px] font-mono-code font-bold uppercase">
                    Native Protocol Intelligence
                  </span>
                </div>
                <p className="text-xs text-[#8e97a8]">
                  Grounded NFT analytics, verified order books, and real-time Solana Devnet RPC state
                </p>
              </div>
            </div>
          </div>

          {/* Connected Data Sources & Usage Quota */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Solana Devnet RPC badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141822] border border-[#212634] text-[#8e97a8] font-mono-code text-[11px]">
              <span className={`w-2 h-2 rounded-full ${statusInfo?.solanaRpc.status === 'online' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              <span>Solana RPC: {statusInfo?.solanaRpc.network || 'Devnet'}</span>
            </div>

            {/* MINT Database badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141822] border border-[#212634] text-[#8e97a8] font-mono-code text-[11px]">
              <Database size={12} className="text-emerald-400" />
              <span>Mint State: Online</span>
            </div>

            {/* External Indexer Boundary badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141822] border border-[#212634] text-[#8e97a8] font-mono-code text-[11px]" title={statusInfo?.indexingProvider.message}>
              <Cpu size={12} className={statusInfo?.indexingProvider.isConfigured ? 'text-emerald-400' : 'text-[#6b7280]'} />
              <span>DAS Indexer: {statusInfo?.indexingProvider.isConfigured ? 'Active' : 'Unconfigured'}</span>
            </div>

            {/* Quota Pill */}
            {usage && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#ff5500]/10 border border-[#ff5500]/20 font-mono-code text-[11px] text-[#ff5500]">
                <span className="font-bold uppercase">{usage.tier} TIER:</span>
                <span>
                  {usage.isUnlimited || usage.tier === 'unlimited'
                    ? 'Unlimited Access'
                    : `${usage.remaining} / ${usage.limit} left`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="mt-5"
        >
          <div className="relative flex items-center">
            <div className="absolute left-4 text-[#8e97a8]">
              <Search size={18} />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about NFTs, collection floor prices, wallet balances, active auctions, or protocol fees..."
              className="w-full pl-11 pr-28 py-3 rounded-xl bg-[#080a0f] border border-[#212634] focus:border-[#ff5500] focus:ring-1 focus:ring-[#ff5500] text-sm text-white placeholder-[#525a6b] font-medium transition-all"
            />
            <div className="absolute right-2 flex items-center gap-2">
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="px-4 py-1.5 rounded-lg bg-[#ff5500] hover:bg-[#e04b00] disabled:opacity-50 text-white font-medium text-xs transition-colors flex items-center gap-1.5 shadow-sm shadow-[#ff5500]/20"
              >
                {loading ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Researching...</span>
                  </>
                ) : (
                  <>
                    <span>Query</span>
                    <ArrowRight size={13} />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Category Quick Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-3 text-xs">
          {[
            { id: 'all', label: 'All Research' },
            { id: 'collections', label: 'Collections & Floors' },
            { id: 'nfts', label: 'NFT Specs' },
            { id: 'wallets', label: 'Solana Wallets' },
            { id: 'auctions', label: 'Auctions' },
            { id: 'fees', label: 'Platform Fees' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                if (cat.id === 'collections') setQuery('Analyze Ents of Solana collection floor and stats');
                if (cat.id === 'nfts') setQuery('Look up Elder Ent #001 metadata and traits');
                if (cat.id === 'wallets') setQuery('Check balance for ACEp1aTfX7h8Kq3w9uV4y2z5L1m6NoP8qRsTuVwXyZ');
                if (cat.id === 'auctions') setQuery('Find active auctions on MINT');
                if (cat.id === 'fees') setQuery('What are the protocol fees and creator royalties?');
              }}
              className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap text-[11px] ${
                activeCategory === cat.id
                  ? 'bg-[#1b202d] text-white border border-[#2a3244]'
                  : 'bg-[#0f121a] text-[#8e97a8] hover:text-white border border-[#1b202c]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-red-400">Research Query Could Not Be Completed</h4>
            <p className="text-xs text-red-200/80">{error}</p>
          </div>
        </div>
      )}

      {/* Main Results Grid */}
      {currentResult && (
        <div className="space-y-6">
          {/* Factual Answer & Grounding Summary */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#0e1117] border border-[#1c2230] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1c2230] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-[#ff5500]" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Verified Analysis & State
                </span>
              </div>

              {/* Data Sources Badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                {currentResult.dataSources.map((ds, idx) => (
                  <span
                    key={idx}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono-code flex items-center gap-1 border ${
                      ds.status === 'verified' || ds.status === 'rpc_live'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-[#171a22] text-[#8e97a8] border-[#222734]'
                    }`}
                    title={ds.details}
                  >
                    {ds.status === 'verified' && <CheckCircle2 size={10} />}
                    {ds.status === 'rpc_live' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    {ds.status === 'unavailable' && <AlertCircle size={10} />}
                    <span>{ds.name}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Warning if data is unverified or missing */}
            {currentResult.unverifiedWarning && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-300">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{currentResult.unverifiedWarning}</span>
              </div>
            )}

            {/* Markdown Text Response */}
            <div className="text-sm text-[#c8d0de] leading-relaxed space-y-2 whitespace-pre-line font-sans">
              {currentResult.textAnswer}
            </div>
          </div>

          {/* Structured Result Renderers */}
          {/* 1. Collection Stats Card */}
          {currentResult.structuredData?.collectionStats && (
            <div className="p-5 rounded-2xl bg-[#0e1117] border border-[#1c2230] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={currentResult.structuredData.collectionStats.collection.image}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-xl object-cover border border-[#242b3b]"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      {currentResult.structuredData.collectionStats.collection.name}
                      {currentResult.structuredData.collectionStats.collection.isVerified && (
                        <ShieldCheck size={14} className="text-[#ff5500]" />
                      )}
                    </h3>
                    <span className="text-xs font-mono-code text-[#8e97a8]">
                      Symbol: {currentResult.structuredData.collectionStats.collection.symbol}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectCollection(currentResult.structuredData!.collectionStats!.collection.id)}
                  className="px-3 py-1.5 rounded-lg bg-[#191e2b] hover:bg-[#ff5500] hover:text-white border border-[#272f42] text-xs font-medium text-[#c8d0de] transition-colors flex items-center gap-1.5"
                >
                  <span>Explore Collection</span>
                  <ExternalLink size={12} />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#080a0f] border border-[#1a1f2c]">
                  <span className="text-[#8e97a8]">Floor Price</span>
                  <p className="text-base font-bold font-mono-code text-[#ff5500] mt-0.5">
                    {currentResult.structuredData.collectionStats.floorPrice} SOL
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#080a0f] border border-[#1a1f2c]">
                  <span className="text-[#8e97a8]">Total Volume</span>
                  <p className="text-base font-bold font-mono-code text-white mt-0.5">
                    {currentResult.structuredData.collectionStats.totalVolume} SOL
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#080a0f] border border-[#1a1f2c]">
                  <span className="text-[#8e97a8]">Supply Minted</span>
                  <p className="text-base font-bold font-mono-code text-white mt-0.5">
                    {currentResult.structuredData.collectionStats.collection.mintedSupply} / {currentResult.structuredData.collectionStats.collection.totalSupply}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#080a0f] border border-[#1a1f2c]">
                  <span className="text-[#8e97a8]">Listed On-Market</span>
                  <p className="text-base font-bold font-mono-code text-emerald-400 mt-0.5">
                    {currentResult.structuredData.collectionStats.listedCount} items
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. Wallet & RPC Details */}
          {currentResult.structuredData?.wallet && (
            <div className="p-5 rounded-2xl bg-[#0e1117] border border-[#1c2230] space-y-4">
              <div className="flex items-center justify-between border-b border-[#1c2230] pb-3">
                <div className="flex items-center gap-2">
                  <Wallet size={16} className="text-[#ff5500]" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Solana On-Chain Wallet Analysis
                  </span>
                </div>
                <span className="text-[11px] font-mono-code text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {currentResult.structuredData.wallet.rpcNetwork}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#080a0f] border border-[#1a1f2c] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8e97a8]">Public Key:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono-code text-white">
                        {currentResult.structuredData.wallet.address.slice(0, 8)}...{currentResult.structuredData.wallet.address.slice(-8)}
                      </span>
                      <button
                        onClick={() => handleCopy(currentResult.structuredData!.wallet!.address)}
                        className="text-[#8e97a8] hover:text-white"
                      >
                        {copiedAddr === currentResult.structuredData.wallet.address ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                      <a
                        href={`https://explorer.solana.com/address/${currentResult.structuredData.wallet.address}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#ff5500] hover:underline"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#8e97a8]">Solana Balance:</span>
                    <span className="font-mono-code font-bold text-base text-[#ff5500]">
                      {currentResult.structuredData.wallet.solBalance} SOL
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#8e97a8]">Mint User Handle:</span>
                    <span className="font-mono-code text-white">
                      {currentResult.structuredData.wallet.username ? `@${currentResult.structuredData.wallet.username}` : 'Unregistered keypair'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#8e97a8]">Protocol NFTs Owned:</span>
                    <span className="font-mono-code text-white">
                      {currentResult.structuredData.wallet.ownedNftsCount || 0}
                    </span>
                  </div>
                </div>

                {/* Recent Transaction Signatures directly from RPC */}
                <div className="p-4 rounded-xl bg-[#080a0f] border border-[#1a1f2c] space-y-2 text-xs">
                  <span className="text-[#8e97a8] font-medium block">
                    Recent Solana Devnet Transactions ({currentResult.structuredData.wallet.recentSignatures.length}):
                  </span>
                  {currentResult.structuredData.wallet.recentSignatures.length > 0 ? (
                    <div className="space-y-1.5">
                      {currentResult.structuredData.wallet.recentSignatures.map((sig, idx) => (
                        <div key={idx} className="flex items-center justify-between font-mono-code text-[11px] bg-[#10131c] p-1.5 rounded border border-[#1a202c]">
                          <span className="text-[#8e97a8]">{sig.slice(0, 10)}...{sig.slice(-10)}</span>
                          <a
                            href={`https://explorer.solana.com/tx/${sig}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#ff5500] hover:underline flex items-center gap-1"
                          >
                            <span>Explorer</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#6b7280] italic">No transaction signatures confirmed for this address on Devnet yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. NFT Spec Cards if returned */}
          {currentResult.structuredData?.nfts && currentResult.structuredData.nfts.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Tag size={14} className="text-[#ff5500]" />
                <span>Verified NFTs Matching Query ({currentResult.structuredData.nfts.length})</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {currentResult.structuredData.nfts.map((nft) => (
                  <div
                    key={nft.id}
                    onClick={() => onSelectNft(nft.id)}
                    className="p-3 rounded-xl bg-[#0e1117] hover:bg-[#121620] border border-[#1c2230] hover:border-[#ff5500]/50 cursor-pointer transition-all flex gap-3 items-center group"
                  >
                    <img
                      src={nft.image}
                      alt={nft.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-lg object-cover border border-[#212736] shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <span className="text-[10px] font-mono-code text-[#ff5500] block truncate">
                        {nft.collectionName}
                      </span>
                      <h5 className="text-xs font-bold text-white truncate group-hover:text-[#ff5500] transition-colors">
                        {nft.name}
                      </h5>
                      <div className="flex items-center justify-between text-xs font-mono-code">
                        <span className="text-[#8e97a8]">
                          {nft.isListed ? `${nft.price} SOL` : nft.isInAuction ? 'In Auction' : 'Vault'}
                        </span>
                        <span className="text-[10px] text-[#6b7280]">
                          #{nft.id.length > 4 ? nft.id.slice(-4) : nft.id}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Active Auctions Cards */}
          {currentResult.structuredData?.auctions && currentResult.structuredData.auctions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Gavel size={14} className="text-[#ff5500]" />
                <span>Active Auctions ({currentResult.structuredData.auctions.length})</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentResult.structuredData.auctions.map((auction) => (
                  <div
                    key={auction.id}
                    onClick={() => onSelectAuction ? onSelectAuction(auction.id) : onNavigate('auctions')}
                    className="p-4 rounded-xl bg-[#0e1117] hover:bg-[#121620] border border-[#1c2230] hover:border-[#ff5500]/40 cursor-pointer transition-all flex gap-3 items-center"
                  >
                    <img
                      src={auction.nft.image}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-lg object-cover border border-[#212736] shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <span className="text-[10px] font-mono-code text-[#ff5500] block truncate">
                        "{auction.customTitle}"
                      </span>
                      <h5 className="text-xs font-bold text-white truncate">
                        {auction.nft.name}
                      </h5>
                      <div className="flex items-center justify-between text-xs font-mono-code pt-1">
                        <span className="text-[#8e97a8]">High Bid: <b className="text-white">{auction.currentBid} SOL</b></span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          {auction.bidsCount} bids
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Protocol Rules & Guides */}
          {currentResult.structuredData?.platformHelp && (
            <div className="p-5 rounded-2xl bg-[#0e1117] border border-[#1c2230] space-y-3">
              <div className="flex items-center justify-between border-b border-[#1c2230] pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                  <HelpCircle size={15} className="text-[#ff5500]" />
                  <span>{currentResult.structuredData.platformHelp.topic}</span>
                </div>
                {currentResult.structuredData.platformHelp.actionLink && (
                  <button
                    onClick={() => onNavigate(currentResult.structuredData!.platformHelp!.actionLink!)}
                    className="text-xs font-mono-code text-[#ff5500] hover:underline flex items-center gap-1"
                  >
                    <span>Open in Mint</span>
                    <ArrowRight size={11} />
                  </button>
                )}
              </div>
              <p className="text-xs text-[#8e97a8]">
                {currentResult.structuredData.platformHelp.summary}
              </p>
              <ul className="space-y-1.5 text-xs text-[#c8d0de]">
                {currentResult.structuredData.platformHelp.rules.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff5500] shrink-0 mt-1.5" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Suggested Queries Deck (Shown when no result yet or for quick drill-down) */}
      <div className="space-y-4 pt-2">
        <h3 className="text-xs font-bold text-[#8e97a8] uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles size={13} className="text-[#ff5500]" />
          <span>Quick Research Prompts</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {suggestions.map((grp, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-[#0e1117] border border-[#1c2230] space-y-2">
              <span className="text-[11px] font-bold text-[#c8d0de] uppercase tracking-wider block">
                {grp.category}
              </span>
              <div className="space-y-1.5">
                {grp.queries.map((qText, qIdx) => (
                  <button
                    key={qIdx}
                    onClick={() => {
                      setQuery(qText);
                      handleSearch(qText);
                    }}
                    className="w-full text-left p-2 rounded-lg bg-[#080a0f] hover:bg-[#141824] border border-[#1a1f2c] hover:border-[#ff5500]/40 text-xs text-[#8e97a8] hover:text-white transition-all flex items-center justify-between group"
                  >
                    <span className="truncate pr-2">{qText}</span>
                    <ArrowRight size={12} className="shrink-0 text-[#6b7280] group-hover:text-[#ff5500] transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Queries History */}
      {recentQueries.length > 0 && (
        <div className="p-4 rounded-xl bg-[#0a0c10] border border-[#171c26] space-y-2 text-xs">
          <div className="flex items-center gap-2 text-[#8e97a8]">
            <Clock size={13} />
            <span className="font-semibold uppercase tracking-wider text-[10px]">Recent Session Queries</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentQueries.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(q);
                  handleSearch(q);
                }}
                className="px-2.5 py-1 rounded-md bg-[#11141c] hover:bg-[#191e2b] border border-[#202533] text-[#8e97a8] hover:text-white font-mono-code text-[11px] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
