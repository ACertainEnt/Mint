import React, { useState, useEffect } from 'react';
import { ShieldCheck, Settings, Users, AlertCircle, CheckCircle2, Lock, DollarSign, Bot, Cpu, Layers, Check, X, Clock, ExternalLink, HelpCircle, Award, Sparkles, RefreshCw, ChevronDown, ChevronUp, Ticket, Key, Copy, UserPlus, Mail } from 'lucide-react';
import { PlatformSettings, User, BetaCodeRecord, WaitlistEntry } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { FoundingBadge } from '../components/FoundingBadge';
import { UsernameDisplay } from '../components/UsernameDisplay';

export const AdminView: React.FC = () => {
  const { user } = useAuth();

  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Beta & Waitlist states
  const [betaCodes, setBetaCodes] = useState<BetaCodeRecord[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [generatingBeta, setGeneratingBeta] = useState(false);
  const [newCodeEmail, setNewCodeEmail] = useState('');
  const [newCodeNotes, setNewCodeNotes] = useState('');
  const [newCodeCount, setNewCodeCount] = useState(1);
  const [betaStatusMessage, setBetaStatusMessage] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [activeBetaTab, setActiveBetaTab] = useState<'codes' | 'waitlist'>('codes');

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

  // Founding Period config
  const [foundingEnabled, setFoundingEnabled] = useState(true);
  const [foundingStartDate, setFoundingStartDate] = useState('2026-09-01');
  const [foundingEndDate, setFoundingEndDate] = useState('2026-10-31');
  const [evaluatingFounding, setEvaluatingFounding] = useState(false);
  const [foundingEvalResult, setFoundingEvalResult] = useState<string | null>(null);

  // Verification Queue Filter & Modal Action
  const [reqFilter, setReqFilter] = useState<'pending' | 'needs_info' | 'approved' | 'rejected' | 'all'>('pending');
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    requestId: string;
    action: 'reject' | 'needs_info';
    promptText: string;
    inputValue: string;
  }>({
    isOpen: false,
    requestId: '',
    action: 'reject',
    promptText: '',
    inputValue: ''
  });

  const [expandedReqId, setExpandedReqId] = useState<string | null>(null);

  const loadAdminData = async () => {
    try {
      const [configRes, usersRes, reqsRes, betaRes, waitlistRes] = await Promise.all([
        api.getConfig(),
        api.getAdminUsers(),
        api.getAdminVerificationRequests().catch(() => ({ requests: [] })),
        api.getBetaCodes().catch(() => ({ codes: [] })),
        api.getWaitlist().catch(() => ({ waitlist: [] }))
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
        if (configRes.config.verificationConfig.foundingConfig) {
          setFoundingEnabled(!!configRes.config.verificationConfig.foundingConfig.enabled);
          if (configRes.config.verificationConfig.foundingConfig.startDate) {
            setFoundingStartDate(configRes.config.verificationConfig.foundingConfig.startDate.split('T')[0]);
          }
          if (configRes.config.verificationConfig.foundingConfig.endDate) {
            setFoundingEndDate(configRes.config.verificationConfig.foundingConfig.endDate.split('T')[0]);
          }
        }
      }

      if (configRes.config.maxBioLength) {
        setMaxBioLength(configRes.config.maxBioLength);
      }
      if (configRes.config.maxAccountsPerDevice) {
        setMaxAccountsPerDevice(configRes.config.maxAccountsPerDevice);
      }

      setUsers(usersRes.users);
      setVerificationRequests(reqsRes.requests || []);
      setBetaCodes(betaRes.codes || []);
      setWaitlist(waitlistRes.waitlist || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBetaCodes = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setGeneratingBeta(true);
    setBetaStatusMessage(null);
    try {
      const res = await api.generateBetaCodes({
        assignedEmail: newCodeEmail.trim() || undefined,
        notes: newCodeNotes.trim() || undefined,
        count: Number(newCodeCount) || 1
      });
      setBetaStatusMessage(res.message);
      setNewCodeEmail('');
      setNewCodeNotes('');
      setNewCodeCount(1);
      const [freshCodes, freshWaitlist] = await Promise.all([
        api.getBetaCodes().catch(() => ({ codes: [] })),
        api.getWaitlist().catch(() => ({ waitlist: [] }))
      ]);
      setBetaCodes(freshCodes.codes || []);
      setWaitlist(freshWaitlist.waitlist || []);
    } catch (err: any) {
      setBetaStatusMessage(err.message || 'Failed to generate beta codes');
    } finally {
      setGeneratingBeta(false);
    }
  };

  const handleRevokeBetaCode = async (codeId: string) => {
    try {
      await api.revokeBetaCode(codeId);
      setBetaCodes(prev => prev.map(c => c.id === codeId ? { ...c, status: 'revoked' } : c));
    } catch (err: any) {
      alert(err.message || 'Failed to revoke code');
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
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
          cooldownDays: 7,
          foundingConfig: {
            enabled: foundingEnabled,
            startDate: `${foundingStartDate}T00:00:00.000Z`,
            endDate: `${foundingEndDate}T23:59:59.999Z`,
            minPostsCount: 0,
            minActiveDays: 0,
            minInteractions: 0
          }
        },
        mintBotConfig: {
          freeHourlyLimit: Number(freeLimit),
          proHourlyLimit: Number(proLimit),
          enableExternalIndexer: false,
          indexerProviderName: 'Helius / Shyft (Boundary Ready)',
          defaultNetwork: 'Algorand Testnet'
        }
      });
      setSettings(res.config);
      setSaveStatus('Platform configuration saved successfully.');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      setSaveStatus(`Failed to save: ${err.message}`);
    }
  };

  const isPlatformOwner = user && (user.role === 'owner' || user.privilegedType === 'platform_owner' || user.email === 'pervercy23@gmail.com');

  const handleTogglePrivilege = async (targetUser: User) => {
    try {
      const isCurrentlyPrivileged = targetUser.isPrivileged || targetUser.privilegedType === 'trusted_mint_account';
      const nextPrivileged = !isCurrentlyPrivileged;
      const nextType = nextPrivileged ? 'trusted_mint_account' : null;
      const res = await api.updateUserPrivilege(targetUser.id, {
        isPrivileged: nextPrivileged,
        privilegedType: nextType,
        role: nextPrivileged ? 'trusted_mint_account' : 'user'
      });
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, ...res.user } : u));
    } catch (err) {
      console.error('Privilege toggle failed:', err);
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

  const handleToggleFounding = async (targetUser: User) => {
    try {
      const nextState = !targetUser.isFoundingMember;
      const res = await api.toggleFoundingMember(targetUser.id, nextState);
      setUsers(prev => prev.map(u => u.id === targetUser.id ? res.user : u));
    } catch (err) {
      console.error('Founding toggle failed:', err);
    }
  };

  const handleEvaluateFounding = async () => {
    setEvaluatingFounding(true);
    setFoundingEvalResult(null);
    try {
      const res = await api.evaluateFoundingMembers();
      setFoundingEvalResult(`Evaluated ${res.totalUsers} users: Awarded Founding Member status to ${res.grantedCount} early participants.`);
      loadAdminData();
    } catch (err: any) {
      setFoundingEvalResult(`Evaluation failed: ${err.message}`);
    } finally {
      setEvaluatingFounding(false);
    }
  };

  const handleReviewRequest = async (requestId: string, decision: 'approve' | 'reject' | 'needs_info', message?: string) => {
    try {
      await api.reviewVerificationRequest(requestId, decision, message);
      await loadAdminData();
      setActionModal(prev => ({ ...prev, isOpen: false }));
    } catch (err: any) {
      console.error('Review error:', err);
      alert(err.message || 'Failed to process review.');
    }
  };

  const openActionModal = (requestId: string, action: 'reject' | 'needs_info') => {
    setActionModal({
      isOpen: true,
      requestId,
      action,
      promptText: action === 'reject' ? 'Reason for Rejection (sent to applicant):' : 'Information Requested from Applicant:',
      inputValue: action === 'reject' ? 'Requirements not fully met at this time.' : 'Please provide additional portfolio links or proof of creator authorship.'
    });
  };

  const isOperator = user?.role === 'admin' || user?.role === 'owner' || user?.id === 'usr_ace_admin';

  if (!user || !isOperator) {
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

  const filteredRequests = verificationRequests.filter(r => {
    if (reqFilter === 'pending') return r.status === 'pending' || r.status === 'under_review';
    if (reqFilter === 'needs_info') return r.status === 'needs_info';
    if (reqFilter === 'approved') return r.status === 'approved';
    if (reqFilter === 'rejected') return r.status === 'rejected';
    return true;
  });

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
            Protocol fees, verification applications, advisory AI assessments, Founding Member cohorts, and rate limits.
          </p>
        </div>
      </div>

      {saveStatus && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Verification Review Queue Section */}
      <div className="bg-[#11141a] border border-[#212634] p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1c212d] pb-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[#ff5500]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono-code">
              Verification Applications ({filteredRequests.length})
            </h3>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {(['pending', 'needs_info', 'approved', 'rejected', 'all'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setReqFilter(tab)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono-code uppercase transition-colors ${
                  reqFilter === tab
                    ? 'bg-[#ff5500] text-white font-bold'
                    : 'bg-[#181d28] text-[#8e97a8] hover:text-white'
                }`}
              >
                {tab.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#6b7280]">
            No verification requests matching "{reqFilter}" filter.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map(req => {
              const isCommunity = req.entityType === 'community' || req.type === 'community';
              const isExpanded = expandedReqId === req.id;
              const ai = req.aiAssessment;

              return (
                <div key={req.id} className="p-4 rounded-xl bg-[#141822] border border-[#212634] space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 font-bold text-white flex-wrap">
                        <span>{isCommunity ? (req.communityName || req.targetName || 'Community') : (req.userDisplayName || req.username || req.targetName)}</span>
                        {req.username && (
                          <span className="text-[11px] font-mono-code text-[#ff5500]">@{req.username}</span>
                        )}
                        {req.category && (
                          <span className="text-[10px] font-mono-code uppercase px-2 py-0.5 rounded bg-[#1c2230] text-[#ff8c4d] border border-[#ff5500]/20">
                            {req.category}
                          </span>
                        )}
                        <span className={`text-[10px] font-mono-code uppercase px-2 py-0.5 rounded ${
                          req.status === 'approved' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40' :
                          req.status === 'rejected' ? 'bg-red-950/60 text-red-300 border border-red-800/40' :
                          req.status === 'needs_info' ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40' :
                          'bg-blue-950/60 text-blue-300 border border-blue-800/40'
                        }`}>
                          {req.status}
                        </span>
                      </div>

                      {/* Signals summary */}
                      {req.userSignals && (
                        <div className="flex items-center gap-3 text-[11px] font-mono-code text-[#8e97a8] pt-0.5">
                          <span>Age: <strong className="text-white">{req.userSignals.accountAgeDays}d</strong></span>
                          <span>•</span>
                          <span>NFTs: <strong className="text-white">{req.userSignals.createdNftsCount}</strong></span>
                          <span>•</span>
                          <span>Posts: <strong className="text-white">{req.userSignals.postsCount}</strong></span>
                        </div>
                      )}

                      <p className="text-[11px] text-[#9ca3af] leading-relaxed pt-1">
                        "{req.justification}"
                      </p>

                      {/* Evidence Links */}
                      {(req.evidence?.links?.length > 0 || req.portfolioUrl) && (
                        <div className="flex items-center gap-2 flex-wrap pt-1">
                          {(req.evidence?.links || [req.portfolioUrl]).map((link: string, lIdx: number) => (
                            <a
                              key={lIdx}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-mono-code text-[#ff5500] hover:underline flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded border border-white/5"
                            >
                              <span className="truncate max-w-[200px]">{link}</span>
                              <ExternalLink size={10} />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Review Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setExpandedReqId(isExpanded ? null : req.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#181d28] hover:bg-[#202736] text-[#8e97a8] text-xs font-mono-code flex items-center gap-1"
                      >
                        <span>Details</span>
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>

                      {(req.status === 'pending' || req.status === 'under_review' || req.status === 'needs_info') && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleReviewRequest(req.id, 'approve')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1"
                          >
                            <Check size={12} />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openActionModal(req.id, 'needs_info')}
                            className="px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/40 font-bold text-xs flex items-center gap-1"
                          >
                            <HelpCircle size={12} />
                            <span>Ask Info</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openActionModal(req.id, 'reject')}
                            className="px-3 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 font-bold text-xs flex items-center gap-1"
                          >
                            <X size={12} />
                            <span>Reject</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded Detail Panel: AI Assessment & History */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-[#1f2430] space-y-3">
                      {/* AI Content Assessment: STRICTLY ADVISORY */}
                      {ai && (
                        <div className="p-3 rounded-xl bg-[#0d0f14] border border-[#232a3a] space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <Bot size={13} className="text-[#ff5500]" />
                              <span>AI Content Assessment (Advisory Signal)</span>
                            </div>
                            <span className={`font-mono-code text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                              ai.level === 'high' ? 'bg-red-950/60 text-red-300 border border-red-800/40' :
                              ai.level === 'moderate' ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40' :
                              'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                            }`}>
                              {ai.level} Likelihood ({Math.round((ai.score || 0) * 100)}%)
                            </span>
                          </div>
                          <p className="text-[11px] text-[#8e97a8] leading-relaxed">
                            {ai.advisoryNote || 'Heuristic indicator for human reviewer context only. Never used to automatically approve or reject applications.'}
                          </p>
                          {ai.signals && ai.signals.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-1">
                              {ai.signals.map((sig: string, sIdx: number) => (
                                <span key={sIdx} className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-[#181e2b] text-[#9ca3af]">
                                  {sig}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Additional Evidence Submitted */}
                      {req.additionalEvidence && req.additionalEvidence.length > 0 && (
                        <div className="p-3 rounded-xl bg-[#0c0e14] border border-[#212634] space-y-2">
                          <span className="font-mono-code text-[10px] text-[#ff8c4d] font-bold uppercase block">
                            Applicant Additional Information:
                          </span>
                          {req.additionalEvidence.map((ae: any, aeIdx: number) => (
                            <div key={aeIdx} className="space-y-1 text-[11px] text-[#9ca3af]">
                              <p>"{ae.text}"</p>
                              {ae.links && ae.links.length > 0 && (
                                <div className="flex gap-2">
                                  {ae.links.map((l: string, i: number) => (
                                    <a key={i} href={l} target="_blank" rel="noopener noreferrer" className="text-[#ff5500] hover:underline">
                                      {l}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Audit History */}
                      {req.history && req.history.length > 0 && (
                        <div className="space-y-1 text-[11px]">
                          <span className="font-mono-code text-[10px] text-[#6b7280] font-bold uppercase block">
                            Audit Trail
                          </span>
                          <div className="space-y-1 font-mono-code text-[10px] text-[#8e97a8]">
                            {req.history.map((h: any, hIdx: number) => (
                              <div key={hIdx} className="flex items-center gap-2">
                                <span className="text-[#6b7280]">{new Date(h.timestamp).toLocaleString()}</span>
                                <span>•</span>
                                <span className="text-white font-bold">{h.action}</span>
                                {h.note && <span>- "{h.note}"</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Settings Form */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSaveSettings} className="bg-[#11141a] border border-[#212634] p-5 rounded-2xl space-y-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono-code flex items-center gap-2">
              <DollarSign size={14} className="text-[#ff5500]" />
              Fee Cuts & Protocol Routing
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                  Market Fee (%)
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
                Protocol Treasury Algorand Address
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

            {/* Founding Period Parameters */}
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono-code flex items-center gap-2 pt-3 border-t border-[#1e2330]">
              <Award size={14} className="text-amber-400" />
              Founding Member Period Parameters
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                  Founding Window Start
                </label>
                <input
                  type="date"
                  value={foundingStartDate}
                  onChange={e => setFoundingStartDate(e.target.value)}
                  className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white font-mono-code focus:outline-none focus:border-[#ff5500]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                  Founding Window End
                </label>
                <input
                  type="date"
                  value={foundingEndDate}
                  onChange={e => setFoundingEndDate(e.target.value)}
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

        {/* User Account Verification & Founding Management */}
        <div className="lg:col-span-5 space-y-5">
          {/* Founding Member Cohort Evaluation Card */}
          <div className="bg-[#11141a] border border-[#212634] p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono-code flex items-center gap-2">
                <Award size={14} className="text-amber-400" />
                Founding Member Cohort
              </h3>
            </div>
            <p className="text-xs text-[#8e97a8]">
              Automate or audit founding member designations for accounts created during the genesis window.
            </p>
            {foundingEvalResult && (
              <div className="p-2.5 rounded-lg bg-[#141822] border border-amber-500/20 text-amber-300 text-xs">
                {foundingEvalResult}
              </div>
            )}
            <button
              type="button"
              onClick={handleEvaluateFounding}
              disabled={evaluatingFounding}
              className="w-full py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 text-xs font-bold font-mono-code flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {evaluatingFounding ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Evaluating Cohort...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>Evaluate & Grant Founding Members</span>
                </>
              )}
            </button>
          </div>

          {/* Beta Access & Waitlist Management */}
          <div className="bg-[#11141a] border border-[#212634] p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono-code flex items-center gap-2">
                <Ticket size={16} className="text-[#ff5500]" />
                Beta Access & Waitlist
              </h3>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-[#1b202c] border border-[#262c3d] text-[10px] font-mono-code text-[#9aa4b6]">
                  {betaCodes.length} Codes • {waitlist.length} on Waitlist
                </span>
                <div className="flex bg-[#161a23] rounded-lg p-0.5 border border-[#212634]">
                  <button
                    type="button"
                    onClick={() => setActiveBetaTab('codes')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                      activeBetaTab === 'codes' ? 'bg-[#ff5500] text-white shadow-sm' : 'text-[#8e97a8] hover:text-white'
                    }`}
                  >
                    Beta Codes
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveBetaTab('waitlist')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                      activeBetaTab === 'waitlist' ? 'bg-[#ff5500] text-white shadow-sm' : 'text-[#8e97a8] hover:text-white'
                    }`}
                  >
                    Waitlist ({waitlist.length})
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Generator Bar */}
            <form onSubmit={handleGenerateBetaCodes} className="p-3.5 rounded-xl bg-[#141822] border border-[#1e2330] space-y-3">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Key size={13} className="text-[#ff5500]" />
                <span>Issue New Beta Invitation Code</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-5">
                  <input
                    type="email"
                    placeholder="Assign to Email (optional)"
                    value={newCodeEmail}
                    onChange={e => setNewCodeEmail(e.target.value)}
                    className="w-full bg-[#10131a] border border-[#232938] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#5d677a] focus:outline-none focus:border-[#ff5500]"
                  />
                </div>
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    placeholder="Notes (e.g. Creator VIP)"
                    value={newCodeNotes}
                    onChange={e => setNewCodeNotes(e.target.value)}
                    className="w-full bg-[#10131a] border border-[#232938] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#5d677a] focus:outline-none focus:border-[#ff5500]"
                  />
                </div>
                <div className="sm:col-span-3 flex gap-2">
                  <select
                    value={newCodeCount}
                    onChange={e => setNewCodeCount(Number(e.target.value))}
                    className="bg-[#10131a] border border-[#232938] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff5500]"
                  >
                    <option value={1}>1 Code</option>
                    <option value={3}>3 Codes</option>
                    <option value={5}>5 Codes</option>
                    <option value={10}>10 Codes</option>
                  </select>
                  <button
                    type="submit"
                    disabled={generatingBeta}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-[#ff5500] hover:bg-[#e04a00] text-white text-xs font-bold font-mono-code flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                  >
                    {generatingBeta ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <>
                        <Key size={12} />
                        <span>Generate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              {betaStatusMessage && (
                <p className="text-[11px] text-[#ff7733] font-mono-code">{betaStatusMessage}</p>
              )}
            </form>

            {/* Tab: Beta Codes List */}
            {activeBetaTab === 'codes' && (
              <div className="space-y-2">
                {betaCodes.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#626d80] font-mono-code">
                    No beta codes generated yet. Generate your first one above.
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto divide-y divide-[#1b202c] pr-1">
                    {betaCodes.map(bc => (
                      <div key={bc.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono-code font-bold text-xs text-white tracking-wider">
                              {bc.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyCode(bc.code, bc.id)}
                              className="text-[#8e97a8] hover:text-[#ff5500] transition-colors p-1"
                              title="Copy Code"
                            >
                              {copiedCodeId === bc.id ? (
                                <Check size={12} className="text-emerald-400" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                            {bc.status === 'unused' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono-code bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Unused
                              </span>
                            )}
                            {bc.status === 'redeemed' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono-code bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                Redeemed
                              </span>
                            )}
                            {bc.status === 'revoked' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono-code bg-red-500/10 text-red-400 border border-red-500/20">
                                Revoked
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#717b8f] font-mono-code truncate mt-0.5">
                            {bc.assignedEmail && <span>For: {bc.assignedEmail} • </span>}
                            {bc.notes && <span>{bc.notes} • </span>}
                            <span>Created {new Date(bc.createdAt).toLocaleDateString()}</span>
                            {bc.redeemedAt && <span> • Redeemed {new Date(bc.redeemedAt).toLocaleDateString()}</span>}
                          </div>
                        </div>

                        {bc.status === 'unused' && (
                          <button
                            type="button"
                            onClick={() => handleRevokeBetaCode(bc.id)}
                            className="px-2 py-1 rounded text-[10px] font-bold font-mono-code text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors shrink-0"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Waitlist List */}
            {activeBetaTab === 'waitlist' && (
              <div className="space-y-2">
                {waitlist.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#626d80] font-mono-code">
                    No users on the waitlist yet.
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto divide-y divide-[#1b202c] pr-1">
                    {waitlist.map(w => (
                      <div key={w.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white truncate">
                              {w.email}
                            </span>
                            {w.roleInterest && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold font-mono-code bg-[#1f2533] text-[#939db0] border border-[#2b3345]">
                                {w.roleInterest}
                              </span>
                            )}
                            {w.hasRedeemedBeta && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold font-mono-code bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Beta Active
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#717b8f] font-mono-code truncate mt-0.5">
                            <span>Joined {new Date(w.createdAt).toLocaleDateString()}</span>
                            {w.notes && <span> • "{w.notes}"</span>}
                          </div>
                        </div>

                        {!w.hasRedeemedBeta && (
                          <button
                            type="button"
                            onClick={() => {
                              setNewCodeEmail(w.email);
                              setNewCodeNotes(`Waitlist: ${w.roleInterest || 'user'}`);
                              setActiveBetaTab('codes');
                            }}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono-code bg-[#ff5500]/15 hover:bg-[#ff5500]/25 text-[#ff5500] border border-[#ff5500]/30 transition-colors shrink-0 flex items-center gap-1"
                          >
                            <Key size={10} />
                            <span>Issue Code</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Account Verification & Founding Badges Direct Toggle */}
          <div className="bg-[#11141a] border border-[#212634] p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono-code flex items-center gap-2">
              <Users size={14} className="text-[#ff5500]" />
              User Badges & Privileges
            </h3>
            <p className="text-xs text-[#8e97a8]">
              Manage Verified checkmark status and Founding Member badges individually.
            </p>

            <div className="divide-y divide-[#1b202c]">
              {users.map(u => (
                <div key={u.id} className="py-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src={u.avatar} alt={u.displayName} className="w-8 h-8 rounded-full object-cover shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                        <span>{u.displayName}</span>
                        {u.isFoundingMember && <FoundingBadge size="sm" />}
                      </div>
                      <div className="text-[10px] font-mono-code text-[#6b7280] truncate flex items-center gap-1.5">
                        <UsernameDisplay user={u} className="text-[10px]" />
                        {u.isVerified && <VerifiedBadge size="sm" />}
                        {u.privilegedType === 'platform_owner' && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold text-[9px] uppercase font-mono-code">
                            Owner
                          </span>
                        )}
                        {u.privilegedType === 'trusted_mint_account' && (
                          <span className="px-1.5 py-0.5 rounded bg-[#ff5500]/20 text-[#ff5500] font-bold text-[9px] uppercase font-mono-code">
                            Trusted MINT
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Privileged Account Toggle (Owner Only) */}
                    {isPlatformOwner && u.privilegedType !== 'platform_owner' && (
                      <button
                        onClick={() => handleTogglePrivilege(u)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                          u.isPrivileged || u.privilegedType === 'trusted_mint_account'
                            ? 'bg-[#ff5500]/20 text-[#ff5500] border border-[#ff5500]/40 hover:bg-[#ff5500]/30'
                            : 'bg-[#181d28] text-[#8e97a8] hover:text-white border border-transparent'
                        }`}
                        title={u.isPrivileged ? 'Revoke Privileged Status' : 'Grant Privileged Status'}
                      >
                        {u.isPrivileged || u.privilegedType === 'trusted_mint_account' ? 'Privileged' : 'Make Privileged'}
                      </button>
                    )}

                    {/* Founding Toggle */}
                    <button
                      onClick={() => handleToggleFounding(u)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        u.isFoundingMember
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                          : 'bg-[#181d28] text-[#8e97a8] hover:text-white'
                      }`}
                      title={u.isFoundingMember ? 'Revoke Founding Member' : 'Award Founding Member'}
                    >
                      <Award size={12} className={u.isFoundingMember ? 'text-amber-400' : 'text-[#6b7280]'} />
                    </button>

                    {/* Verification Toggle */}
                    <button
                      onClick={() => handleToggleVerification(u)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        u.isVerified
                          ? 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30'
                          : 'bg-[#ff5500]/15 hover:bg-[#ff5500]/25 text-[#ff8c4d] border border-[#ff5500]/30'
                      }`}
                    >
                      {u.isVerified ? 'Revoke' : 'Verify'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Prompt Modal for Reject / Request Info */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-[#11141a] border border-[#212634] rounded-2xl p-5 shadow-2xl space-y-4 text-left">
            <h4 className="text-sm font-bold text-white font-mono-code uppercase">
              {actionModal.action === 'reject' ? 'Reject Verification Request' : 'Request Additional Information'}
            </h4>
            <div>
              <label className="block text-xs font-mono-code text-[#8e97a8] uppercase mb-1.5">
                {actionModal.promptText}
              </label>
              <textarea
                value={actionModal.inputValue}
                onChange={e => setActionModal(prev => ({ ...prev, inputValue: e.target.value }))}
                rows={3}
                className="w-full bg-[#161a22] border border-[#232938] rounded-xl p-3 text-xs text-white placeholder-[#525a6c] focus:outline-none focus:border-[#ff5500] resize-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionModal(prev => ({ ...prev, isOpen: false }))}
                className="px-3 py-1.5 rounded-lg bg-[#181d28] hover:bg-[#202736] text-[#8e97a8] text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReviewRequest(actionModal.requestId, actionModal.action, actionModal.inputValue)}
                className={`px-3 py-1.5 rounded-lg text-white font-bold text-xs ${
                  actionModal.action === 'reject' ? 'bg-red-600 hover:bg-red-500' : 'bg-amber-600 hover:bg-amber-500'
                }`}
              >
                Confirm {actionModal.action === 'reject' ? 'Rejection' : 'Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
