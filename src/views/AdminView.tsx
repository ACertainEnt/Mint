import React, { useState, useEffect } from 'react';
import { ShieldCheck, Settings, Users, AlertCircle, CheckCircle2, Lock, DollarSign, Bot, Cpu, Layers, Check, X, Clock, ExternalLink } from 'lucide-react';
import { PlatformSettings, User } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { VerifiedBadge } from '../components/VerifiedBadge';

export const AdminView: React.FC = () => {
  const { user } = useAuth();

  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Form states
  const [marketplaceFee, setMarketplaceFee] = useState(2.0);
  const [auctionFee, setAuctionFee] = useState(2.5);
  const [mintFee, setMintFee] = useState(1.0);
  const [treasuryAddress, setTreasuryAddress] = useState('');
  const [freeLimit, setFreeLimit] = useState<number>(20);
  const [proLimit, setProLimit] = useState<number>(200);

  // Verification Rules config
  const [minNftsCreated, setMinNftsCreated] = useState(1);
  const [minTotalSolVolume, setMinTotalSolVolume] = useState(0.5);
  const [minAccountAgeDays, setMinAccountAgeDays] = useState(1);
  const [maxBioLength, setMaxBioLength] = useState(160);
  const [maxAccountsPerDevice, setMaxAccountsPerDevice] = useState(3);

  const loadAdminData = async () => {
    try {
      const [configRes, usersRes, reqsRes] = await Promise.all([
        api.getConfig(),
        api.getAdminUsers(),
        api.getAdminVerificationRequests().catch(() => ({ requests: [] }))
      ]);
      setSettings(configRes.config);
      setMarketplaceFee(configRes.config.marketplaceFeePercent);
      setAuctionFee(configRes.config.auctionFeePercent);
      setMintFee(configRes.config.mintFeePercent);
      setTreasuryAddress(configRes.config.treasuryAddress);
      
      if (configRes.config.mintBotConfig) {
        setFreeLimit(configRes.config.mintBotConfig.freeHourlyLimit || 20);
        setProLimit(configRes.config.mintBotConfig.proHourlyLimit || 200);
      }

      if (configRes.config.verificationConfig) {
        setMinNftsCreated(configRes.config.verificationConfig.minCreatedNfts ?? 1);
        setMinTotalSolVolume(configRes.config.verificationConfig.minSolVolume ?? 0.5);
        setMinAccountAgeDays(configRes.config.verificationConfig.minAccountAgeDays ?? 1);
      }

      if (configRes.config.maxBioLength) {
        setMaxBioLength(configRes.config.maxBioLength);
      }
      if (configRes.config.maxAccountsPerDevice) {
        setMaxAccountsPerDevice(configRes.config.maxAccountsPerDevice);
      }

      setUsers(usersRes.users);
      setVerificationRequests(reqsRes.requests || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus(null);
    try {
      const res = await api.updateConfig({
        marketplaceFeePercent: Number(marketplaceFee),
        auctionFeePercent: Number(auctionFee),
        mintFeePercent: Number(mintFee),
        treasuryAddress: treasuryAddress.trim(),
        maxBioLength: Number(maxBioLength),
        maxAccountsPerDevice: Number(maxAccountsPerDevice),
        verificationConfig: {
          minCreatedNfts: Number(minNftsCreated),
          minSolVolume: Number(minTotalSolVolume),
          minAccountAgeDays: Number(minAccountAgeDays),
          maxVerifiedCommunitiesPerUser: 1,
          adminMultiCommunityAllowed: true,
          cooldownDays: 7
        },
        mintBotConfig: {
          freeHourlyLimit: Number(freeLimit),
          proHourlyLimit: Number(proLimit),
          enableExternalIndexer: false,
          indexerProviderName: 'Helius / Shyft (Boundary Ready)',
          defaultNetwork: 'Solana Devnet'
        }
      });
      setSettings(res.config);
      setSaveStatus('Platform configuration and verification rules saved.');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      setSaveStatus(`Failed to save: ${err.message}`);
    }
  };

  const handleToggleVerification = async (targetUser: User) => {
    try {
      const nextStatus = !targetUser.isVerified;
      const res = await api.toggleVerifyUser(targetUser.id, nextStatus);
      setUsers(prev => prev.map(u => u.id === targetUser.id ? res.user : u));
    } catch (err) {
      console.error('Verification toggle failed:', err);
    }
  };

  const handleReviewRequest = async (requestId: string, decision: 'approve' | 'reject') => {
    try {
      await api.reviewVerificationRequest(requestId, decision);
      setVerificationRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: decision === 'approve' ? 'approved' : 'rejected' } : r));
      loadAdminData();
    } catch (err: any) {
      console.error('Review error:', err);
      alert(err.message || 'Failed to process review.');
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto py-24 text-center space-y-3">
        <Lock size={32} className="mx-auto text-amber-400" />
        <h2 className="text-xl font-bold text-white">Admin Access Restricted</h2>
        <p className="text-xs text-[#8e97a8]">
          This control plane is restricted to protocol operators.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-left">
      <div className="flex items-center justify-between border-b border-[#1f2430] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono-code text-[#ff5500] font-bold mb-1">
            <ShieldCheck size={14} />
            <span>OPERATOR CONTROLS</span>
          </div>
          <h1 className="text-2xl font-display font-extrabold text-white">
            Platform Protocol Governance
          </h1>
          <p className="text-xs sm:text-sm text-[#9ca3af] mt-1">
            Configure protocol fee cuts, treasury routing, creator verification badges, and device limits.
          </p>
        </div>
      </div>

      {saveStatus && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Verification Request Review Queue */}
      {verificationRequests.filter(r => r.status === 'under_review' || r.status === 'pending').length > 0 && (
        <div className="bg-[#11141a] border border-amber-900/50 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono-code">
                Verification Queue ({verificationRequests.filter(r => r.status === 'under_review' || r.status === 'pending').length})
              </h3>
            </div>
          </div>
          <div className="space-y-2.5">
            {verificationRequests.filter(r => r.status === 'under_review' || r.status === 'pending').map(req => {
              const isCommunity = req.entityType === 'community' || req.type === 'community';
              return (
                <div key={req.id} className="p-3.5 rounded-xl bg-[#141822] border border-[#212634] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 font-bold text-white">
                      <span>{isCommunity ? (req.communityName || req.targetName || 'Community') : (req.userDisplayName || req.username || req.targetName)}</span>
                      <span className={`text-[10px] font-mono-code uppercase px-2 py-0.5 rounded ${
                        isCommunity ? 'bg-purple-950/60 text-purple-300 border border-purple-800/40' : 'bg-[#1c2230] text-[#ff8c4d]'
                      }`}>
                        {isCommunity ? 'Community Verification' : 'User Account'}
                      </span>
                      {req.username && (
                        <span className="text-[11px] font-mono-code text-[#8e97a8]">@{req.username}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#9ca3af] line-clamp-2">
                      "{req.justification}"
                    </p>
                    {req.portfolioUrl && (
                      <a
                        href={req.portfolioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-[#ff5500] hover:underline flex items-center gap-1"
                      >
                        <span>{req.portfolioUrl}</span>
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleReviewRequest(req.id, 'approve')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1"
                    >
                      <Check size={12} />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleReviewRequest(req.id, 'reject')}
                      className="px-3 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 font-bold text-xs flex items-center gap-1"
                    >
                      <X size={12} />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Settings Form */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSaveSettings} className="bg-[#11141a] border border-[#212634] p-5 rounded-2xl space-y-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono-code flex items-center gap-2">
              <DollarSign size={14} className="text-[#ff5500]" />
              Fee Rates & Treasury
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                  Marketplace Fee (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={marketplaceFee}
                  onChange={e => setMarketplaceFee(Number(e.target.value))}
                  className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white font-mono-code focus:outline-none focus:border-[#ff5500]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                  Auction Fee (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={auctionFee}
                  onChange={e => setAuctionFee(Number(e.target.value))}
                  className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white font-mono-code focus:outline-none focus:border-[#ff5500]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                  Mint Fee (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={mintFee}
                  onChange={e => setMintFee(Number(e.target.value))}
                  className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white font-mono-code focus:outline-none focus:border-[#ff5500]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                Protocol Treasury Solana Address
              </label>
              <input
                type="text"
                value={treasuryAddress}
                onChange={e => setTreasuryAddress(e.target.value)}
                className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white font-mono-code focus:outline-none focus:border-[#ff5500]"
              />
            </div>

            {/* Dynamic Verification Requirements */}
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono-code flex items-center gap-2 pt-3 border-t border-[#1e2330]">
              <ShieldCheck size={14} className="text-[#ff5500]" />
              Creator Verification Requirements
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                  Min NFTs Created
                </label>
                <input
                  type="number"
                  value={minNftsCreated}
                  onChange={e => setMinNftsCreated(Number(e.target.value))}
                  min={0}
                  className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white font-mono-code focus:outline-none focus:border-[#ff5500]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                  Min SOL Volume
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={minTotalSolVolume}
                  onChange={e => setMinTotalSolVolume(Number(e.target.value))}
                  min={0}
                  className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white font-mono-code focus:outline-none focus:border-[#ff5500]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                  Min Account Age (Days)
                </label>
                <input
                  type="number"
                  value={minAccountAgeDays}
                  onChange={e => setMinAccountAgeDays(Number(e.target.value))}
                  min={0}
                  className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white font-mono-code focus:outline-none focus:border-[#ff5500]"
                />
              </div>
            </div>

            {/* Profile & Multi-Account Constraints */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                  Max Bio Characters
                </label>
                <input
                  type="number"
                  value={maxBioLength}
                  onChange={e => setMaxBioLength(Number(e.target.value))}
                  min={50}
                  max={500}
                  className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white font-mono-code focus:outline-none focus:border-[#ff5500]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                  Max Accounts Per Device
                </label>
                <input
                  type="number"
                  value={maxAccountsPerDevice}
                  onChange={e => setMaxAccountsPerDevice(Number(e.target.value))}
                  min={1}
                  max={5}
                  className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white font-mono-code focus:outline-none focus:border-[#ff5500]"
                />
              </div>
            </div>

            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono-code flex items-center gap-2 pt-3 border-t border-[#1e2330]">
              <Bot size={14} className="text-[#ff5500]" />
              MintBot Intelligence & Quotas
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                  Free Tier Hourly Limit
                </label>
                <input
                  type="number"
                  value={freeLimit}
                  onChange={e => setFreeLimit(Number(e.target.value))}
                  min={1}
                  className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white font-mono-code focus:outline-none focus:border-[#ff5500]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                  Pro Tier Hourly Limit
                </label>
                <input
                  type="number"
                  value={proLimit}
                  onChange={e => setProLimit(Number(e.target.value))}
                  min={1}
                  className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white font-mono-code focus:outline-none focus:border-[#ff5500]"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#ff5500] hover:bg-[#e64d00] text-white font-bold text-xs transition-colors shadow-md shadow-[#ff5500]/25"
              >
                Save Protocol Settings
              </button>
            </div>
          </form>
        </div>

        {/* Creator Verification Badges Direct Toggle */}
        <div className="lg:col-span-5 bg-[#11141a] border border-[#212634] p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono-code flex items-center gap-2">
            <Users size={14} className="text-[#ff5500]" />
            User Account Verification
          </h3>
          <p className="text-xs text-[#8e97a8]">
            Grant or revoke official verified checkmarks for user accounts. Badges represent validated human creator identity.
          </p>

          <div className="divide-y divide-[#1b202c]">
            {users.map(u => (
              <div key={u.id} className="py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img src={u.avatar} alt={u.displayName} className="w-8 h-8 rounded-full object-cover shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                      <span>{u.displayName}</span>
                      {u.isVerified && <VerifiedBadge size="sm" />}
                    </div>
                    <div className="text-[10px] font-mono-code text-[#6b7280] truncate">
                      @{u.username} • {u.role}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleVerification(u)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                    u.isVerified
                      ? 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30'
                      : 'bg-[#ff5500]/15 hover:bg-[#ff5500]/25 text-[#ff8c4d] border border-[#ff5500]/30'
                  }`}
                >
                  {u.isVerified ? 'Revoke Badge' : 'Grant Verified'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

