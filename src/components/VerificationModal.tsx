import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, CheckCircle2, AlertCircle, Clock, ExternalLink, RefreshCw, Send, Users, Sparkles, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { VerifiedBadge } from './VerifiedBadge';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    isVerified: boolean;
    role: string;
    status: string;
    isEligible: boolean;
    requirements: { id: string; label: string; required: number; current: number; met: boolean; unit?: string }[];
    activeRequest: any;
    lastRequest: any;
    cooldownUntil: string | null;
    communityLimits: {
      max: number;
      currentVerifiedCount: number;
      isAdmin: boolean;
      canVerifyAnotherCommunity: boolean;
      verifiedCommunities: { id: string; name: string; slug: string }[];
    };
  } | null>(null);

  const [justification, setJustification] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getVerificationStatus();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load verification status:', err);
      setError(err.message || 'Failed to fetch verification status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await api.requestUserVerification({
        justification: justification.trim(),
        portfolioUrl: portfolioUrl.trim() || undefined
      });
      setSuccess(true);
      await loadStatus();
    } catch (err: any) {
      console.error('Submit verification request error:', err);
      setError(err.message || 'Failed to submit verification request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in text-left">
      <div className="relative w-full max-w-lg bg-[#0f1218] border border-[#212634] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#1b202c] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#ff5500]" />
            <h3 className="text-base font-bold text-white">Creator Verification</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#6b7280] hover:text-white hover:bg-[#181d28] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 text-center text-xs font-mono-code text-[#8e97a8] space-y-2">
              <RefreshCw size={20} className="mx-auto animate-spin text-[#ff5500]" />
              <p>Evaluating account metrics and protocol eligibility...</p>
            </div>
          ) : data ? (
            <div className="space-y-5">
              {/* Philosophy Notice */}
              <div className="p-3.5 rounded-xl bg-[#141822] border border-[#232a3a] space-y-1.5 text-xs text-[#9ca3af]">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#ff5500]" />
                  <span>Protocol Identity Model</span>
                </div>
                <p className="leading-relaxed">
                  Verification on Mint validates <strong>creator identity and authenticity</strong> for user accounts. It is not an endorsement of individual artworks or speculative value.
                </p>
              </div>

              {/* Status Header */}
              <div className="p-4 rounded-xl bg-[#11141b] border border-[#212634] flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-mono-code text-[#6b7280] uppercase">CURRENT STATUS</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {data.isVerified ? (
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm">
                        <VerifiedBadge size="md" />
                        <span>Verified Creator Account</span>
                      </div>
                    ) : data.status === 'under_review' ? (
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm">
                        <Clock size={16} className="animate-pulse" />
                        <span>Request Under Review</span>
                      </div>
                    ) : data.status === 'cooldown' ? (
                      <div className="flex items-center gap-1.5 text-red-400 font-bold text-sm">
                        <Clock size={16} />
                        <span>Cooldown Active</span>
                      </div>
                    ) : data.isEligible ? (
                      <div className="flex items-center gap-1.5 text-[#ff8c4d] font-bold text-sm">
                        <CheckCircle2 size={16} />
                        <span>Eligible for Verification</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[#8e97a8] font-bold text-sm">
                        <AlertCircle size={16} />
                        <span>Requirements Pending</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right font-mono-code text-xs">
                  <span className="text-[#6b7280]">Role:</span> <span className="text-white font-bold uppercase">{data.role}</span>
                </div>
              </div>

              {/* Requirements Checklist */}
              <div>
                <h4 className="text-xs font-mono-code text-[#8e97a8] uppercase mb-2.5">
                  Verification Criteria
                </h4>
                <div className="space-y-2">
                  {data.requirements.map(req => (
                    <div
                      key={req.id}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                        req.met
                          ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                          : 'bg-[#141822] border-[#212634] text-[#8e97a8]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {req.met ? (
                          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-[#3b4356] shrink-0" />
                        )}
                        <span>{req.label}</span>
                      </div>
                      <div className="font-mono-code text-[11px] font-bold">
                        {req.current} / {req.required} {req.unit || ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* One Verified Community Limit Section */}
              <div className="p-3.5 rounded-xl bg-[#11141b] border border-[#212634] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Users size={14} className="text-[#ff5500]" />
                    <span>Community Verification Quota</span>
                  </div>
                  <span className="font-mono-code text-[11px] text-[#ff8c4d]">
                    {data.communityLimits.currentVerifiedCount} / {data.communityLimits.isAdmin ? 'Unlimited (Admin)' : data.communityLimits.max}
                  </span>
                </div>
                <p className="text-[11px] text-[#8e97a8] leading-relaxed">
                  To maintain signal quality, standard verified creators can hold at most <strong>1 verified community</strong>. All additional communities created remain active in the directory without the badge.
                </p>
                {data.communityLimits.verifiedCommunities.length > 0 && (
                  <div className="pt-1 text-[11px] text-[#9ca3af]">
                    Active verified space: <span className="text-white font-bold">{data.communityLimits.verifiedCommunities[0].name}</span>
                  </div>
                )}
              </div>

              {/* Request Form or Under Review Notice */}
              {data.isVerified ? (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 text-xs space-y-1">
                  <p className="font-bold">Your account is fully verified.</p>
                  <p className="text-[11px] text-emerald-400/80">
                    Your badge is attached to your user profile and displays across comments, drops, and community authorship.
                  </p>
                </div>
              ) : data.status === 'under_review' ? (
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <Clock size={16} className="text-amber-400" />
                    <span>Your application is currently being reviewed</span>
                  </div>
                  <p className="text-[11px] text-amber-200/80">
                    Protocol moderators are evaluating your on-chain activity and identity proof. You will receive an on-chain inbox notification once processed.
                  </p>
                  {data.activeRequest?.justification && (
                    <div className="text-[11px] font-mono-code text-amber-100/70 p-2 rounded bg-black/40 border border-white/5">
                      "{data.activeRequest.justification}"
                    </div>
                  )}
                </div>
              ) : data.status === 'cooldown' ? (
                <div className="p-4 rounded-xl bg-red-950/20 border border-red-800/40 text-red-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle size={16} className="text-red-400" />
                    <span>Application Cooldown</span>
                  </div>
                  <p className="text-[11px] text-red-200/80">
                    A previous request was not approved. You may resubmit after the cooldown expires on:
                  </p>
                  <p className="font-mono-code font-bold text-white">
                    {data.cooldownUntil ? new Date(data.cooldownUntil).toLocaleDateString() : '7 days'}
                  </p>
                  {data.lastRequest?.rejectionReason && (
                    <div className="text-[11px] text-red-200/70 italic">
                      Note: {data.lastRequest.rejectionReason}
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmitRequest} className="space-y-3 pt-2">
                  {error && (
                    <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                      <AlertCircle size={15} className="shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {success && (
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 size={15} className="shrink-0" />
                      <span>Request submitted successfully!</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-mono-code text-[#8e97a8] uppercase mb-1.5">
                      Identity & Art Justification
                    </label>
                    <textarea
                      value={justification}
                      onChange={e => setJustification(e.target.value)}
                      placeholder="Briefly describe your creative work, primary art style, or creator background..."
                      rows={3}
                      className="w-full bg-[#141822] border border-[#232a3a] rounded-xl p-3 text-xs text-white placeholder-[#525a6c] focus:outline-none focus:border-[#ff5500] resize-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono-code text-[#8e97a8] uppercase mb-1.5">
                      Portfolio / Social Proof URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={portfolioUrl}
                      onChange={e => setPortfolioUrl(e.target.value)}
                      placeholder="https://twitter.com/yourhandle or https://portfolio.art"
                      className="w-full bg-[#141822] border border-[#232a3a] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#525a6c] focus:outline-none focus:border-[#ff5500]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !data.isEligible}
                    className="w-full py-2.5 rounded-xl bg-[#ff5500] hover:bg-[#e64d00] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Submitting Request...</span>
                      </>
                    ) : (
                      <>
                        <Send size={13} />
                        <span>Submit Verification Request</span>
                      </>
                    )}
                  </button>
                  {!data.isEligible && (
                    <p className="text-[11px] text-center text-[#6b7280]">
                      Complete all criteria above to unlock request submission.
                    </p>
                  )}
                </form>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
