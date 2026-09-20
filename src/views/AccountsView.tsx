import React, { useState, useEffect } from 'react';
import { Wallet, Coins, ExternalLink, Copy, Check, Layers, Tag, Gavel, Target, Clock, ArrowRight, ShieldCheck, User, Edit3, Plus, LogOut, CheckCircle2, AlertCircle, RefreshCw, Smartphone } from 'lucide-react';
import { NFT, NFTCollection, Auction, Bounty, ActivityEvent } from '../types';
import { NFTCard } from '../components/NFTCard';
import { CollectionCard } from '../components/CollectionCard';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { ProviderBadge } from '../components/ProviderBadge';
import { EditProfileModal } from '../components/EditProfileModal';
import { VerificationModal } from '../components/VerificationModal';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { api } from '../lib/api';

interface AccountsViewProps {
  onSelectNft: (nft: NFT) => void;
  onSelectCollection: (col: NFTCollection) => void;
  onNavigate: (tab: string) => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  onSelectNft,
  onSelectCollection,
  onNavigate
}) => {
  const {
    user,
    accounts,
    switchAccount,
    addAccount,
    removeAccount,
    logoutCurrentAccount,
    setShowAuthModal,
    maxAccountsReached
  } = useAuth();
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

  // Modals
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [switchingUserId, setSwitchingUserId] = useState<string | null>(null);

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
  }, [user?.id, publicKey]);

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

  const handleSwitch = async (targetUserId: string) => {
    if (targetUserId === user?.id) return;
    setSwitchingUserId(targetUserId);
    try {
      await switchAccount(targetUserId);
    } finally {
      setSwitchingUserId(null);
    }
  };

  if (!user && !connected) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[#141822] text-[#ff5500] border border-[#212634] flex items-center justify-center mx-auto">
          <User size={26} />
        </div>
        <h2 className="text-xl font-display font-bold text-white">
          Connect to Access Accounts
        </h2>
        <p className="text-xs text-[#9ca3af] leading-relaxed">
          Sign in or connect your Solana wallet to view your profile, manage owned NFTs, active bids, collections, and on-chain balances.
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
    <div className="w-full text-left space-y-6">
      {/* 1. Account Profile Edge-to-Edge Banner */}
      <div
        onClick={() => {
          if (user) setShowEditProfileModal(true);
        }}
        className={`w-full h-40 sm:h-60 bg-[#0d1017] relative overflow-hidden ${
          user ? 'cursor-pointer group' : ''
        }`}
        title={user ? 'Click banner to edit profile' : undefined}
      >
        {user?.banner ? (
          <img
            src={user.banner}
            alt="Banner"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-[#ff5500]/25 via-[#161b26] to-[#0d1017]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-transparent to-transparent opacity-80" />
        {user && (
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20 text-white text-xs font-semibold">
            Edit Banner & Profile
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Profile Details Bar - Placed directly against main canvas background */}
        <div className="-mt-14 sm:-mt-20 relative flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-end gap-4 min-w-0">
            {user ? (
              <img
                src={user.avatar}
                alt={user.displayName}
                onClick={() => setShowEditProfileModal(true)}
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover border-4 border-[#0d0d0d] shadow-2xl bg-black shrink-0 cursor-pointer"
                title="Click avatar to edit profile"
              />
            ) : (
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-[#141822] border-4 border-[#0d0d0d] flex items-center justify-center text-[#ff5500] shrink-0">
                <Wallet size={32} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-white break-words">
                {user ? user.displayName : 'Solana Account'}
              </h1>
              {user?.username && (
                <div className="flex items-center gap-1.5 text-xs font-mono-code text-[#ff5500]">
                  <span>@{user.username}</span>
                  {user?.isVerified && <VerifiedBadge size="sm" />}
                </div>
              )}
              {publicKey && (
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="text-xs font-mono-code text-[#8e97a8] break-all">
                    {publicKey.length >= 16 ? `${publicKey.slice(0, 8)}...${publicKey.slice(-8)}` : publicKey}
                  </span>
                  <button
                    onClick={handleCopyAddress}
                    className="p-1 rounded text-[#6b7280] hover:text-white transition-colors cursor-pointer"
                    title="Copy address"
                    aria-label="Copy address"
                  >
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                  <a
                    href={`https://explorer.solana.com/address/${publicKey}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded text-[#8e97a8] hover:text-white transition-colors"
                    title="View in Solana Explorer"
                    aria-label="Solana Explorer"
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Flat Action Buttons & Devnet SOL */}
          <div className="flex flex-wrap items-center gap-3">
            {user && (
              <>
                <button
                  onClick={() => setShowEditProfileModal(true)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#2d3748] hover:border-white/40 bg-transparent text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Edit Profile
                </button>

                {!user.isVerified && (
                  <button
                    onClick={() => setShowVerificationModal(true)}
                    className="px-3.5 py-1.5 rounded-lg border border-[#ff8c4d]/50 hover:border-[#ff8c4d] bg-transparent text-[#ff8c4d] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Get Verified
                  </button>
                )}
              </>
            )}

            {/* Flat Balance & Faucet */}
            <div className="flex items-center gap-3 pl-2 border-l border-[#212634]">
              <div>
                <div className="text-[9px] font-mono-code text-[#6b7280]">DEVNET SOL</div>
                <div className="text-sm font-mono-code font-bold text-[#ff5500]">
                  {balance.toFixed(3)} SOL
                </div>
              </div>
              <button
                onClick={handleAirdrop}
                disabled={airdropping}
                className="px-2.5 py-1 rounded-lg border border-[#ff5500]/40 hover:bg-[#ff5500]/10 text-[#ff8c4d] text-[11px] font-mono-code font-bold transition-colors cursor-pointer"
              >
                {airdropping ? '...' : '+1.0 SOL'}
              </button>
            </div>
          </div>
        </div>

        {/* Bio Text - Un-truncated */}
        {user?.bio && (
          <p className="text-xs sm:text-sm text-[#9ca3af] leading-relaxed max-w-3xl break-words whitespace-normal">
            {user.bio}
          </p>
        )}

        {/* Flat Metrics Row (No card box) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-[#1f2533]">
          <div>
            <div className="text-[10px] font-mono-code text-[#6b7280] uppercase">Owned NFTs</div>
            <div className="text-base sm:text-lg font-mono-code font-bold text-white">
              {portfolioData.ownedNfts.length} Items
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono-code text-[#6b7280] uppercase">Active Listings</div>
            <div className="text-base sm:text-lg font-mono-code font-bold text-[#ff5500]">
              {portfolioData.listedNfts.length} Items
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono-code text-[#6b7280] uppercase">Est. Floor Value</div>
            <div className="text-base sm:text-lg font-mono-code font-bold text-white">
              ~{totalFloorValue.toFixed(2)} SOL
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono-code text-[#6b7280] uppercase">Created Collections</div>
            <div className="text-base sm:text-lg font-mono-code font-bold text-white">
              {portfolioData.createdCollections.length}
            </div>
          </div>
        </div>

        {/* 2. Device Accounts - Flat Section */}
        <div className="py-2 space-y-3 border-b border-[#1f2533] pb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono-code text-[#8e97a8]">
              Switch Accounts ({accounts.length})
            </h3>

            {!maxAccountsReached && (
              <button
                onClick={addAccount}
                className="px-3 py-1 rounded-lg border border-[#283042] hover:border-white/30 bg-transparent text-white text-xs font-medium transition-colors cursor-pointer"
              >
                + Add account
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {accounts.map(acc => {
              const isActive = acc.user.id === user?.id;

              return (
                <div
                  key={acc.user.id}
                  className={`p-3 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                    isActive
                      ? 'border-[#ff5500]/60 bg-[#141822]/40'
                      : 'border-[#232938] hover:border-[#384156] bg-transparent'
                  }`}
                >
                  <button
                    onClick={() => handleSwitch(acc.user.id)}
                    disabled={isActive || !!switchingUserId}
                    className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={acc.user.avatar}
                        alt={acc.user.displayName}
                        className="w-9 h-9 rounded-full object-cover border border-[#262c3c]"
                      />
                      <ProviderBadge
                        provider={acc.user.authProvider || (acc.user.email ? 'google' : 'wallet')}
                        size="xs"
                        className="absolute -bottom-0.5 -right-0.5"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">{acc.user.displayName}</div>
                      <div className="flex items-center gap-1 text-[11px] font-mono-code text-[#8e97a8] truncate">
                        <span>@{acc.user.username}</span>
                        {acc.user.isVerified && <VerifiedBadge size="sm" />}
                      </div>
                    </div>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-[#ff5500] shrink-0 mr-1" title="Active" />
                    )}
                  </button>

                  <button
                    onClick={() => removeAccount(acc.user.id)}
                    className="px-2 py-1 text-xs text-[#6b7280] hover:text-red-400 transition-colors cursor-pointer"
                    title="Remove account"
                    aria-label="Remove account"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Navigation Tabs - Text-Only with Simple Underline Accent */}
        <div className="flex items-center gap-6 border-b border-[#212634] overflow-x-auto no-scrollbar">
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
              className={`py-3 px-1 text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#ff5500] text-white font-bold'
                  : 'border-transparent text-[#8e97a8] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 4. Tab Panels with Clean Flat Content */}
        <div className="py-2">
          {activeTab === 'owned' && (
            <div>
              {portfolioData.ownedNfts.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <Layers size={28} className="mx-auto text-[#6b7280]" />
                  <p className="text-sm font-bold text-white">No NFTs owned yet</p>
                  <p className="text-xs text-[#8e97a8]">Mint, purchase on marketplace, or win auctions on Solana Devnet to build your vault.</p>
                  <button
                    onClick={() => onNavigate('explore')}
                    className="px-4 py-2 rounded-lg bg-[#ff5500] text-xs font-bold text-white cursor-pointer"
                  >
                    Explore Marketplace
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {portfolioData.ownedNfts.map(nft => (
                    <NFTCard key={nft.id} nft={nft} onSelect={onSelectNft} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'listed' && (
            <div>
              {portfolioData.listedNfts.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <Tag size={28} className="mx-auto text-[#6b7280]" />
                  <p className="text-sm font-bold text-white">No active listings</p>
                  <p className="text-xs text-[#8e97a8]">List any of your owned NFTs for instant fixed-price sale.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {portfolioData.listedNfts.map(nft => (
                    <NFTCard key={nft.id} nft={nft} onSelect={onSelectNft} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'collections' && (
            <div>
              {portfolioData.createdCollections.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <Layers size={28} className="mx-auto text-[#6b7280]" />
                  <p className="text-sm font-bold text-white">No collections created yet</p>
                  <p className="text-xs text-[#8e97a8]">Deploy an on-chain NFT collection with customized supply, mint fees, and royalties.</p>
                  <button
                    onClick={() => onNavigate('launch')}
                    className="px-4 py-2 rounded-lg bg-[#ff5500] text-xs font-bold text-white cursor-pointer"
                  >
                    Create Collection
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {portfolioData.createdCollections.map(col => (
                    <CollectionCard key={col.id} collection={col} onSelect={onSelectCollection} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'bids' && (
            <div className="space-y-4">
              {portfolioData.activeBids.length === 0 && portfolioData.wonAuctions.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <Gavel size={28} className="mx-auto text-[#6b7280]" />
                  <p className="text-sm font-bold text-white">No active auction bids</p>
                  <p className="text-xs text-[#8e97a8]">Participate in live NFT auctions to place on-chain bids.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#1f2533]">
                  {portfolioData.wonAuctions.map(auc => (
                    <div key={auc.id} className="py-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={auc.nftImage} alt={auc.nftName} className="w-12 h-12 rounded-lg object-cover" />
                        <div>
                          <h4 className="text-xs font-bold text-white">{auc.nftName}</h4>
                          <span className="text-[10px] font-mono-code text-emerald-400">AUCTION WON • {auc.currentBid} SOL</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'bounties' && (
            <div>
              {portfolioData.createdBounties.length === 0 && portfolioData.submittedBounties.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <Target size={28} className="mx-auto text-[#6b7280]" />
                  <p className="text-sm font-bold text-white">No active bounties</p>
                  <p className="text-xs text-[#8e97a8]">Create design or curation bounties or submit work for SOL rewards.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#1f2533]">
                  {portfolioData.createdBounties.map(bounty => (
                    <div key={bounty.id} className="py-3.5 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white">{bounty.title}</h4>
                        <span className="text-[10px] font-mono-code text-[#ff5500]">{bounty.rewardSol} SOL REWARD</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              {portfolioData.activity.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <Clock size={28} className="mx-auto text-[#6b7280]" />
                  <p className="text-sm font-bold text-white">No activity yet</p>
                  <p className="text-xs text-[#8e97a8]">Your on-chain transfers, bids, listings, and purchases will be indexed here.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#1f2533]">
                  {portfolioData.activity.map(act => (
                    <div key={act.id} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded bg-[#181d28] text-[#ff8c4d] border border-[#262c3c]">
                          {act.type}
                        </span>
                        <div>
                          <div className="font-bold text-white">
                            {act.nftName || act.collectionName || 'Solana Transaction'}
                          </div>
                          <div className="text-[10px] text-[#6b7280] font-mono-code">
                            {act.signature ? `${act.signature.slice(0, 10)}...` : 'Confirmed'}
                          </div>
                        </div>
                      </div>

                      {act.price && (
                        <div className="text-right">
                          <span className="font-mono-code font-bold text-[#ff5500]">
                            {act.price} SOL
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={showEditProfileModal}
        onClose={() => {
          setShowEditProfileModal(false);
          loadPortfolio();
        }}
      />

      {/* Verification Modal */}
      <VerificationModal
        isOpen={showVerificationModal}
        onClose={() => {
          setShowVerificationModal(false);
          loadPortfolio();
        }}
      />
    </div>
  );
};
