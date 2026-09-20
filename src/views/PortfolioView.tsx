import React, { useState, useEffect } from 'react';
import { Wallet, Coins, ExternalLink, Copy, Check, Layers, Tag, Gavel, Target, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import { NFT, NFTCollection, Auction, Bounty, ActivityEvent } from '../types';
import { NFTCard } from '../components/NFTCard';
import { CollectionCard } from '../components/CollectionCard';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { api } from '../lib/api';

interface PortfolioViewProps {
  onSelectNft: (nft: NFT) => void;
  onSelectCollection: (col: NFTCollection) => void;
  onNavigate: (tab: string) => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  onSelectNft,
  onSelectCollection,
  onNavigate
}) => {
  const { user, setShowAuthModal } = useAuth();
  const { connected, publicKey, balance, walletName, connect, requestAirdrop } = useWallet();

  const [activeTab, setActiveTab] = useState<'owned' | 'listed' | 'collections' | 'bids' | 'bounties' | 'history'>('owned');
  const [portfolioData, setPortfolioData] = useState<{
    ownedNfts: NFT[];
    listedNfts: NFT[];
    createdCollections: NFTCollection[];
    createdNfts: NFT[];
    activeBids: any[];
    wonAuctions: Auction[];
    createdBounties: Bounty[];
    submittedBounties: Bounty[];
    activity: ActivityEvent[];
  }>({
    ownedNfts: [],
    listedNfts: [],
    createdCollections: [],
    createdNfts: [],
    activeBids: [],
    wonAuctions: [],
    createdBounties: [],
    submittedBounties: [],
    activity: []
  });

  const [loading, setLoading] = useState(true);
  const [airdropping, setAirdropping] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadPortfolio = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const identifier = user.id || user.username || 'me';
      const res = await api.getUserPortfolio(identifier);
      if (res && res.portfolio) {
        setPortfolioData(res.portfolio);
      }
    } catch (err) {
      console.warn('Portfolio load notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, [user, publicKey]);

  const handleCopyAddress = () => {
    if (!publicKey) return;
    navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAirdrop = async () => {
    setAirdropping(true);
    try {
      await requestAirdrop();
      await loadPortfolio();
    } finally {
      setAirdropping(false);
    }
  };

  if (!user && !connected) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#ff5500]/15 text-[#ff5500] border border-[#ff5500]/30 flex items-center justify-center mx-auto">
          <Wallet size={30} />
        </div>
        <h2 className="text-xl font-display font-bold text-white">
          Connect to Access Portfolio
        </h2>
        <p className="text-xs text-[#9ca3af] leading-relaxed">
          Sign in or connect your Solana wallet to manage owned artifacts, active bids, collections, and on-chain balances.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={() => connect()}
            className="px-5 py-2.5 rounded-xl bg-[#ff5500] hover:bg-[#e64d00] text-white font-bold text-xs"
          >
            Connect Wallet
          </button>
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-5 py-2.5 rounded-xl bg-[#181d28] hover:bg-[#202737] text-white font-semibold text-xs border border-[#262c3c]"
          >
            Sign In / Register
          </button>
        </div>
      </div>
    );
  }

  // Real Floor Value Calculation
  const totalFloorValue = portfolioData.ownedNfts.reduce((acc, nft) => acc + (nft.price || 1.0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-left">
      {/* Wallet Card Header */}
      <div className="rounded-2xl bg-gradient-to-br from-[#12151d] to-[#0c0e14] border border-[#212634] p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#ff5500]/15 border border-[#ff5500]/30 flex items-center justify-center text-[#ff5500]">
              <Wallet size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-white">
                  {user ? user.displayName : 'Solana Portfolio'}
                </h1>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {user && (
                  <div className="flex items-center gap-1 text-xs font-mono-code text-[#6b7280]">
                    <span>@{user.username}</span>
                    {user.isVerified && <VerifiedBadge size="sm" />}
                    <span>•</span>
                  </div>
                )}
                {publicKey && (
                  <>
                    <span className="text-xs font-mono-code text-[#8e97a8]">
                      {publicKey.length >= 16 ? `${publicKey.slice(0, 8)}...${publicKey.slice(-8)}` : publicKey}
                    </span>
                    <button
                      onClick={handleCopyAddress}
                      className="p-1 rounded text-[#6b7280] hover:text-white"
                      title="Copy address"
                    >
                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                    <a
                      href={`https://explorer.solana.com/address/${publicKey}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono-code text-[#ff5500] hover:underline flex items-center gap-0.5"
                    >
                      <span>Explorer</span>
                      <ExternalLink size={10} />
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Devnet Balance & Faucet Button */}
          <div className="flex items-center gap-3 bg-[#0a0c10] p-3 rounded-xl border border-[#1d222e]">
            <div>
              <div className="text-[10px] font-mono-code text-[#6b7280]">DEVNET SOL BALANCE</div>
              <div className="text-lg sm:text-xl font-mono-code font-extrabold text-[#ff5500]">
                {balance.toFixed(4)} SOL
              </div>
            </div>
            <button
              onClick={handleAirdrop}
              disabled={airdropping}
              className="px-3 py-2 rounded-lg bg-[#ff5500]/20 hover:bg-[#ff5500]/30 border border-[#ff5500]/40 text-[#ff8c4d] text-xs font-mono-code font-bold flex items-center gap-1.5 transition-colors shrink-0"
            >
              <Coins size={13} />
              <span>{airdropping ? 'Requesting...' : '+1.0 Faucet SOL'}</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[#1e2330]">
          <div>
            <div className="text-[10px] font-mono-code text-[#6b7280]">OWNED NFTS</div>
            <div className="text-base sm:text-lg font-mono-code font-bold text-white">
              {portfolioData.ownedNfts.length} Items
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono-code text-[#6b7280]">ACTIVE LISTINGS</div>
            <div className="text-base sm:text-lg font-mono-code font-bold text-[#ff5500]">
              {portfolioData.listedNfts.length} Items
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono-code text-[#6b7280]">EST. FLOOR VALUE</div>
            <div className="text-base sm:text-lg font-mono-code font-bold text-white">
              ~{totalFloorValue.toFixed(2)} SOL
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono-code text-[#6b7280]">CREATED COLLECTIONS</div>
            <div className="text-base sm:text-lg font-mono-code font-bold text-white">
              {portfolioData.createdCollections.length}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[#1f2430] pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'owned', label: `Owned (${portfolioData.ownedNfts.length})` },
          { id: 'listed', label: `Active Listings (${portfolioData.listedNfts.length})` },
          { id: 'collections', label: `My Collections (${portfolioData.createdCollections.length})` },
          { id: 'bids', label: `Active Bids & Won (${portfolioData.activeBids.length + portfolioData.wonAuctions.length})` },
          { id: 'bounties', label: `Bounties (${portfolioData.createdBounties.length + portfolioData.submittedBounties.length})` },
          { id: 'history', label: 'Activity Feed' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              activeTab === tab.id ? 'bg-[#ff5500] text-white' : 'text-[#8e97a8] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'owned' && (
        portfolioData.ownedNfts.length === 0 ? (
          <div className="py-16 text-center rounded-2xl bg-[#11141b] border border-[#212634] p-6 space-y-3">
            <p className="text-white font-bold">No NFTs in this wallet yet.</p>
            <p className="text-xs text-[#8e97a8]">Mint from live collections or explore the marketplace.</p>
            <button onClick={() => onNavigate('explore')} className="px-4 py-2 rounded-lg bg-[#ff5500] text-white text-xs font-semibold">
              Explore NFTs
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {portfolioData.ownedNfts.map(nft => (
              <NFTCard key={nft.id} nft={nft} onSelect={onSelectNft} />
            ))}
          </div>
        )
      )}

      {activeTab === 'listed' && (
        portfolioData.listedNfts.length === 0 ? (
          <div className="py-16 text-center text-xs font-mono-code text-[#8e97a8]">
            No active marketplace listings. Click any owned NFT to list it for sale.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {portfolioData.listedNfts.map(nft => (
              <NFTCard key={nft.id} nft={nft} onSelect={onSelectNft} />
            ))}
          </div>
        )
      )}

      {activeTab === 'collections' && (
        portfolioData.createdCollections.length === 0 ? (
          <div className="py-16 text-center rounded-2xl bg-[#11141b] border border-[#212634] p-6 space-y-3">
            <p className="text-white font-bold">You haven't launched any collections yet.</p>
            <button onClick={() => onNavigate('launch')} className="px-4 py-2 rounded-lg bg-[#ff5500] text-white text-xs font-semibold">
              Launch Your First Collection
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {portfolioData.createdCollections.map(col => (
              <CollectionCard key={col.id} collection={col} onSelect={onSelectCollection} />
            ))}
          </div>
        )
      )}

      {activeTab === 'bids' && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-white uppercase font-mono-code">Active Auction Bids</h3>
          {portfolioData.activeBids.length === 0 ? (
            <div className="text-xs font-mono-code text-[#6b7280]">No active bids placed.</div>
          ) : (
            <div className="space-y-2">
              {portfolioData.activeBids.map((b, i) => (
                <div key={i} className="p-3 rounded-xl bg-[#11141a] border border-[#212634] flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">"{b.auction.customTitle}"</h4>
                    <div className="text-[11px] text-[#8e97a8]">Your Bid: <span className="text-amber-400 font-bold">{b.myBid.amount} SOL</span></div>
                  </div>
                  <span className={`text-[10px] font-mono-code px-2 py-0.5 rounded font-bold ${b.isLeading ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {b.isLeading ? 'HIGHEST BIDDER' : 'OUTBID'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {portfolioData.wonAuctions.length > 0 && (
            <>
              <h3 className="text-xs font-bold text-white uppercase font-mono-code pt-4">Won Auctions</h3>
              <div className="space-y-2">
                {portfolioData.wonAuctions.map(auc => (
                  <div key={auc.id} className="p-3 rounded-xl bg-[#11141a] border border-[#212634] flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">"{auc.customTitle}"</h4>
                      <div className="text-[11px] text-emerald-400 font-mono-code font-bold">Won for {auc.currentBid} SOL</div>
                    </div>
                    <button onClick={() => onSelectNft(auc.nft)} className="px-3 py-1 rounded bg-[#181d28] text-xs text-white">
                      View Item
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'bounties' && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-white uppercase font-mono-code">Your Bounties</h3>
          {portfolioData.createdBounties.length === 0 ? (
            <div className="text-xs font-mono-code text-[#6b7280]">No bounties created yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {portfolioData.createdBounties.map(bty => (
                <div key={bty.id} className="p-3.5 rounded-xl bg-[#11141a] border border-[#212634]">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-bold text-white">{bty.title}</span>
                    <span className="font-mono-code font-bold text-emerald-400">+{bty.reward} SOL</span>
                  </div>
                  <div className="text-[11px] text-[#8e97a8]">{bty.submissions.length} Submissions</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-2">
          {portfolioData.activity.length === 0 ? (
            <div className="text-xs font-mono-code text-[#6b7280]">No recent transactions.</div>
          ) : (
            portfolioData.activity.map(act => (
              <div key={act.id} className="p-3 rounded-xl bg-[#11141a] border border-[#212634] flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white capitalize">{act.type.replace('_', ' ')}:</span>
                  <span className="text-[#8e97a8] ml-1.5">{act.nftName}</span>
                </div>
                <div className="text-right">
                  {act.price && <span className="font-mono-code font-bold text-[#ff5500]">{act.price} SOL</span>}
                  <div className="text-[10px] font-mono-code text-[#6b7280]">
                    {new Date(act.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
