import React, { useState, useEffect } from 'react';
import { Gavel, Clock, ArrowUpRight, Plus, Sparkles, AlertCircle, ShieldCheck, User } from 'lucide-react';
import { Auction, NFT } from '../types';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';

interface AuctionsViewProps {
  onSelectAuction: (auction: Auction) => void;
  onNavigate: (tab: string) => void;
}

export const AuctionsView: React.FC<AuctionsViewProps> = ({ onSelectAuction, onNavigate }) => {
  const { user, setShowAuthModal } = useAuth();
  const { connected, balance, connect, sendSolTransaction } = useWallet();

  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal for creating custom auction
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userNfts, setUserNfts] = useState<NFT[]>([]);
  const [selectedNftId, setSelectedNftId] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [startingPrice, setStartingPrice] = useState('1.0');
  const [reservePrice, setReservePrice] = useState('');
  const [buyNowPrice, setBuyNowPrice] = useState('3.0');
  const [durationHours, setDurationHours] = useState('24');
  const [description, setDescription] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Quick Bid modal
  const [biddingAuction, setBiddingAuction] = useState<Auction | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidLoading, setBidLoading] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);

  const loadAuctions = async () => {
    try {
      const res = await api.getAuctions({ status: 'active' });
      setAuctions(res.auctions);
    } catch (err) {
      console.error('Failed to load auctions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuctions();
    const interval = setInterval(loadAuctions, 10000);
    return () => clearInterval(interval);
  }, []);

  const openCreateModal = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setShowCreateModal(true);
    setCreateError(null);
    try {
      const res = await api.getNfts({ ownerId: user.id });
      // Only NFTs not listed and not in auction
      const available = res.nfts.filter(n => !n.isListed && !n.isInAuction);
      setUserNfts(available);
      if (available.length > 0) {
        setSelectedNftId(available[0].id);
        setCustomTitle(`Special Auction: ${available[0].name}`);
      }
    } catch (err) {
      console.error('Failed to load user NFTs:', err);
    }
  };

  const handleCreateAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!customTitle.trim() || !selectedNftId) {
      setCreateError('Please select an NFT and enter a custom auction title.');
      return;
    }

    setCreateSubmitting(true);
    try {
      await api.createAuction({
        customTitle: customTitle.trim(),
        nftId: selectedNftId,
        startingPrice: Number(startingPrice) || 0.5,
        reservePrice: reservePrice ? Number(reservePrice) : undefined,
        buyNowPrice: buyNowPrice ? Number(buyNowPrice) : undefined,
        durationHours: Number(durationHours) || 24,
        description: description.trim() || undefined
      });

      setShowCreateModal(false);
      loadAuctions();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create auction');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const openBidModal = (auc: Auction) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setBiddingAuction(auc);
    const minBid = auc.bidCount === 0 ? auc.startingPrice : auc.currentBid + auc.minBidIncrement;
    setBidAmount(minBid.toFixed(2));
    setBidError(null);
  };

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!biddingAuction) return;

    setBidLoading(true);
    setBidError(null);

    const amount = Number(bidAmount);
    try {
      // Prompt wallet transaction
      const txRes = await sendSolTransaction(
        biddingAuction.creatorUsername,
        amount,
        `Bid on ${biddingAuction.customTitle}`
      );

      await api.bidAuction(biddingAuction.id, amount, txRes.signature);

      setBiddingAuction(null);
      loadAuctions();
    } catch (err: any) {
      setBidError(err.message || 'Bid submission failed');
    } finally {
      setBidLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f2430] pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white">
            Custom-Titled NFT Auctions
          </h1>
          <p className="text-xs sm:text-sm text-[#9ca3af] mt-1">
            Original timed auctions with custom creator titles, automatic reserve settlement, and outbid tracking.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-[#ff5500] hover:bg-[#e64d00] text-white font-bold text-xs sm:text-sm transition-colors shadow-md shadow-[#ff5500]/25 flex items-center justify-center gap-2 shrink-0"
        >
          <Plus size={16} />
          <span>Start Custom Auction</span>
        </button>
      </div>

      {/* Grid of Auctions */}
      {loading ? (
        <div className="py-20 text-center text-xs font-mono-code text-[#8e97a8]">
          Loading active auctions...
        </div>
      ) : auctions.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-[#11141b] border border-[#212634] p-8">
          <Gavel size={36} className="mx-auto mb-3 text-[#6b7280]" />
          <h3 className="text-base font-bold text-white">No active auctions right now</h3>
          <p className="text-xs text-[#8e97a8] mt-1">Be the first to list an NFT with a custom auction title.</p>
          <button
            onClick={openCreateModal}
            className="mt-4 px-4 py-2 rounded-lg bg-[#ff5500] text-xs font-semibold text-white"
          >
            Create Auction
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {auctions.map(auc => {
            const timeLeft = Math.max(0, new Date(auc.endTime).getTime() - Date.now());
            const hoursLeft = Math.floor(timeLeft / (3600 * 1000));
            const minutesLeft = Math.floor((timeLeft % (3600 * 1000)) / (60 * 1000));

            return (
              <div
                key={auc.id}
                onClick={() => onSelectAuction(auc)}
                className="group rounded-2xl bg-[#11141a] hover:bg-[#151921] border border-[#202533] hover:border-[#ff5500]/50 p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-sm"
              >
                <div>
                  {/* NFT Image Preview */}
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black mb-3.5">
                    <img
                      src={auc.nft.image}
                      alt={auc.customTitle}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-[10px] font-mono-code text-white">
                      {auc.nft.collectionName}
                    </div>
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-amber-500/90 text-black font-mono-code text-[10px] font-bold flex items-center gap-1 shadow">
                      <Clock size={11} />
                      <span>{hoursLeft}h {minutesLeft}m left</span>
                    </div>
                  </div>

                  {/* Creator */}
                  <div className="flex items-center gap-1.5 text-xs text-[#8e97a8] mb-1">
                    <span>By</span>
                    <span className="font-semibold text-white flex items-center gap-1">
                      @{auc.creatorUsername}
                      {auc.creatorVerified && <VerifiedBadge size="sm" />}
                    </span>
                  </div>

                  {/* Custom Auction Title */}
                  <h3 className="text-base font-display font-bold text-white group-hover:text-[#ff5500] transition-colors truncate">
                    "{auc.customTitle}"
                  </h3>
                  <p className="text-xs text-[#9ca3af] line-clamp-2 mt-1">
                    {auc.description || auc.nft.description}
                  </p>
                </div>

                {/* Bid details and quick action */}
                <div className="mt-4 pt-3 border-t border-[#1b202c]">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-[10px] font-mono-code text-[#6b7280]">CURRENT BID</div>
                      <div className="text-base font-mono-code font-bold text-amber-400">
                        {auc.currentBid} SOL
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-mono-code text-[#6b7280]">BIDS</div>
                      <div className="text-xs font-mono-code font-semibold text-white">
                        {auc.bidCount} bids
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openBidModal(auc);
                      }}
                      className="flex-1 py-2 px-3 rounded-lg bg-[#ff5500] hover:bg-[#e64d00] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Gavel size={13} />
                      <span>Place Bid</span>
                    </button>
                    {auc.buyNowPrice && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setBiddingAuction(auc);
                          setBidAmount(auc.buyNowPrice!.toString());
                        }}
                        className="py-2 px-3 rounded-lg bg-[#181d28] hover:bg-[#202737] border border-[#262c3c] text-white text-xs font-semibold transition-colors"
                      >
                        Buy Now: {auc.buyNowPrice} SOL
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE AUCTION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#11141a] border border-[#212634] rounded-2xl p-6 shadow-2xl text-left max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-display font-bold text-white mb-1">
              Start Custom-Titled Auction
            </h2>
            <p className="text-xs text-[#9ca3af] mb-4">
              Set a creative custom auction title and choose starting parameters for your NFT.
            </p>

            {createError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400 text-xs mb-4">
                {createError}
              </div>
            )}

            {userNfts.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8e97a8]">
                <p>You do not currently own any unlisted NFTs eligible for auction.</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    onNavigate('explore');
                  }}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-[#ff5500] text-white font-semibold"
                >
                  Mint or Buy an NFT First
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateAuction} className="space-y-4">
                {/* Select NFT */}
                <div>
                  <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                    Select Your NFT *
                  </label>
                  <select
                    value={selectedNftId}
                    onChange={e => {
                      setSelectedNftId(e.target.value);
                      const chosen = userNfts.find(n => n.id === e.target.value);
                      if (chosen) setCustomTitle(`The Great ${chosen.name} Drop`);
                    }}
                    className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500]"
                  >
                    {userNfts.map(nft => (
                      <option key={nft.id} value={nft.id}>
                        {nft.name} ({nft.collectionName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Auction Title */}
                <div>
                  <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                    Custom Auction Title / Event Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customTitle}
                    onChange={e => setCustomTitle(e.target.value)}
                    placeholder="e.g. The Great Ent Auction, Friday Night Genesis"
                    maxLength={60}
                    className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500]"
                  />
                  <p className="text-[10px] text-[#6b7280] mt-1">
                    Give your auction any title you choose to capture collector interest.
                  </p>
                </div>

                {/* Pricing row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8e97a8] mb-1">
                      Starting Bid (SOL) *
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.01"
                      required
                      value={startingPrice}
                      onChange={e => setStartingPrice(e.target.value)}
                      className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white font-mono-code focus:outline-none focus:border-[#ff5500]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#8e97a8] mb-1">
                      Buy-Now Price (SOL)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.01"
                      value={buyNowPrice}
                      onChange={e => setBuyNowPrice(e.target.value)}
                      placeholder="Optional"
                      className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white font-mono-code focus:outline-none focus:border-[#ff5500]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#8e97a8] mb-1">
                      Duration (Hours)
                    </label>
                    <select
                      value={durationHours}
                      onChange={e => setDurationHours(e.target.value)}
                      className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500]"
                    >
                      <option value="6">6 Hours</option>
                      <option value="12">12 Hours</option>
                      <option value="24">24 Hours (1 Day)</option>
                      <option value="48">48 Hours (2 Days)</option>
                      <option value="72">72 Hours (3 Days)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                    Auction Lore / Notes
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Provide special details about this auction drop..."
                    rows={2}
                    className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white resize-none focus:outline-none focus:border-[#ff5500]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-lg bg-[#181d28] text-xs font-semibold text-[#8e97a8] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createSubmitting}
                    className="px-5 py-2 rounded-lg bg-[#ff5500] hover:bg-[#e64d00] text-white text-xs font-bold transition-colors"
                  >
                    {createSubmitting ? 'Initializing Auction...' : 'Launch Auction'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* QUICK BID MODAL */}
      {biddingAuction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-[#11141a] border border-[#212634] rounded-2xl p-6 shadow-2xl text-left">
            <h2 className="text-lg font-display font-bold text-white mb-1">
              Place Bid: "{biddingAuction.customTitle}"
            </h2>
            <p className="text-xs text-[#9ca3af] mb-4">
              Current highest bid is <span className="text-amber-400 font-bold font-mono-code">{biddingAuction.currentBid} SOL</span>.
            </p>

            {bidError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400 text-xs mb-4">
                {bidError}
              </div>
            )}

            <form onSubmit={handlePlaceBid} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                  Your Bid Amount (SOL) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={bidAmount}
                    onChange={e => setBidAmount(e.target.value)}
                    className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-sm text-white font-mono-code font-bold focus:outline-none focus:border-[#ff5500]"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-mono-code text-[#ff5500] font-bold">
                    SOL
                  </span>
                </div>
                <div className="flex justify-between text-[10px] font-mono-code text-[#6b7280] mt-1">
                  <span>Minimum required: {(biddingAuction.bidCount === 0 ? biddingAuction.startingPrice : biddingAuction.currentBid + biddingAuction.minBidIncrement).toFixed(2)} SOL</span>
                  <span>Wallet: {balance.toFixed(2)} SOL</span>
                </div>
              </div>

              {biddingAuction.buyNowPrice && (
                <div className="p-2.5 rounded-lg bg-[#161a22] border border-[#212634] text-xs text-[#8e97a8] flex items-center justify-between">
                  <span>Buy-Now Price:</span>
                  <span className="font-mono-code font-bold text-white">{biddingAuction.buyNowPrice} SOL</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBiddingAuction(null)}
                  className="px-4 py-2 rounded-lg bg-[#181d28] text-xs font-semibold text-[#8e97a8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bidLoading}
                  className="px-5 py-2 rounded-lg bg-[#ff5500] hover:bg-[#e64d00] text-white text-xs font-bold transition-colors shadow-md shadow-[#ff5500]/25"
                >
                  {bidLoading ? 'Broadcasting Bid...' : 'Confirm Bid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
