import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { VerifiedBadge } from './VerifiedBadge';
import { FoundingBadge } from './FoundingBadge';
import { VerificationCategory } from '../types';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: { id: VerificationCategory; label: string }[] = [
  { id: 'Creator', label: 'Creator' },
  { id: 'Artist', label: 'Visual Artist' },
  { id: 'Collector', label: 'Curator & Collector' },
  { id: 'Community Leader', label: 'Community Leader' },
  { id: 'Builder', label: 'Protocol Builder' },
  { id: 'Founder', label: 'Founder' },
  { id: 'Public Figure', label: 'Public Figure' },
  { id: 'Other', label: 'Other Specialization' }
];

export const VerificationModal: React.FC<VerificationModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    isVerified: boolean;
    isFoundingMember?: boolean;
    role: string;
    status: string;
    activeRequest: any;
    lastRequest: any;
    cooldownUntil: string | null;
  } | null>(null);

  // Form states
  const [selectedCategory, setSelectedCategory] = useState<VerificationCategory>('Creator');
  const [justification, setJustification] = useState('');
  const [primaryLink, setPrimaryLink] = useState('');
  const [additionalLinks, setAdditionalLinks] = useState<string[]>([]);
  const [evidenceNotes, setEvidenceNotes] = useState('');

  // Info response state for 'needs_info'
  const [infoResponse, setInfoResponse] = useState('');
  const [infoLinks, setInfoLinks] = useState<string[]>(['']);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getVerificationStatus();
      setData(res);
      if (res.activeRequest?.category) {
        setSelectedCategory(res.activeRequest.category);
      }
      if (res.activeRequest?.justification) {
        setJustification(res.activeRequest.justification);
      }
      if (res.activeRequest?.portfolioUrl) {
        setPrimaryLink(res.activeRequest.portfolioUrl);
      }
      if (res.activeRequest?.evidence?.links?.length) {
        const [first, ...rest] = res.activeRequest.evidence.links;
        if (!primaryLink && first) setPrimaryLink(first);
        setAdditionalLinks(rest || []);
      }
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
      setSuccess(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddLink = () => {
    if (additionalLinks.length < 4) {
      setAdditionalLinks([...additionalLinks, '']);
    }
  };

  const handleLinkChange = (index: number, value: string) => {
    const updated = [...additionalLinks];
    updated[index] = value;
    setAdditionalLinks(updated);
  };

  const handleRemoveLink = (index: number) => {
    setAdditionalLinks(additionalLinks.filter((_, i) => i !== index));
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!justification.trim() || justification.trim().length < 15) {
      setError('Please provide at least 15 characters describing your background.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const allLinks = [primaryLink.trim(), ...additionalLinks.map(l => l.trim())].filter(Boolean);
      await api.requestUserVerification({
        category: selectedCategory,
        justification: justification.trim(),
        portfolioUrl: primaryLink.trim() || allLinks[0] || undefined,
        evidence: {
          links: allLinks,
          notes: evidenceNotes.trim() || undefined
        }
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

  const handleRespondInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!infoResponse.trim()) {
      setError('Please provide your response.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const validLinks = infoLinks.map(l => l.trim()).filter(Boolean);
      await api.respondVerificationInfo({
        responseText: infoResponse.trim(),
        additionalLinks: validLinks
      });
      setSuccess(true);
      setInfoResponse('');
      await loadStatus();
    } catch (err: any) {
      console.error('Respond to info request error:', err);
      setError(err.message || 'Failed to submit additional information.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in text-left">
      <div className="relative w-full max-w-xl bg-[#0f1218] border border-[#212634] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#1b202c] flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Verification</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[#8e97a8] hover:text-white px-2 py-1 rounded transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-left">
          {loading ? (
            <div className="py-12 text-center text-xs font-mono-code text-[#8e97a8]">
              Loading verification status...
            </div>
          ) : data ? (
            <div className="space-y-4">
              {/* Status Row */}
              <div className="p-3.5 rounded-xl bg-[#11141b] border border-[#212634] flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-mono-code text-[#6b7280] uppercase">Status</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {data.isVerified ? (
                      <span className="text-emerald-400">Verified</span>
                    ) : data.status === 'needs_info' ? (
                      <span className="text-amber-400">More Info Requested</span>
                    ) : data.status === 'under_review' || data.status === 'pending' ? (
                      <span className="text-amber-400">In Review</span>
                    ) : data.status === 'cooldown' ? (
                      <span className="text-red-400">Cooldown Active</span>
                    ) : (
                      <span className="text-[#8e97a8]">Not Verified</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {data.isVerified && <VerifiedBadge size="md" />}
                  {data.isFoundingMember && <FoundingBadge size="md" />}
                </div>
              </div>

              {/* Needs Information View */}
              {data.status === 'needs_info' && data.activeRequest && (
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs space-y-3">
                  <div className="font-bold text-amber-300">
                    Reviewer Note: {data.activeRequest.adminMessage || 'Please provide additional portfolio links.'}
                  </div>

                  <form onSubmit={handleRespondInfo} className="space-y-3 pt-1">
                    {error && (
                      <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
                        {error}
                      </div>
                    )}
                    {success && (
                      <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs">
                        Additional details submitted
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-mono-code text-[#8e97a8] uppercase mb-1">
                        Response
                      </label>
                      <textarea
                        value={infoResponse}
                        onChange={e => setInfoResponse(e.target.value)}
                        placeholder="Details requested..."
                        rows={3}
                        className="w-full bg-[#141822] border border-[#232a3a] rounded-xl p-3 text-xs text-white placeholder-[#525a6c] focus:outline-none focus:border-[#ff5500] resize-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono-code text-[#8e97a8] uppercase mb-1">
                        Link (Optional)
                      </label>
                      <input
                        type="url"
                        value={infoLinks[0] || ''}
                        onChange={e => setInfoLinks([e.target.value])}
                        placeholder="https://..."
                        className="w-full bg-[#141822] border border-[#232a3a] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#525a6c] focus:outline-none focus:border-[#ff5500]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 rounded-xl bg-[#ff5500] hover:bg-[#e64d00] disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      {submitting ? 'Submitting...' : 'Submit Response'}
                    </button>
                  </form>
                </div>
              )}

              {/* Verified Notice */}
              {data.isVerified ? (
                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 text-xs">
                  Your account is verified on MINT.
                </div>
              ) : data.status === 'under_review' || data.status === 'pending' ? (
                <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-300 text-xs space-y-1">
                  <div className="font-bold">Application In Review</div>
                  <div className="text-[11px] text-amber-200/80">Category: {data.activeRequest?.category || 'Creator'}</div>
                </div>
              ) : data.status === 'cooldown' ? (
                <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-800/40 text-red-300 text-xs space-y-1">
                  <div className="font-bold">Cooldown Active</div>
                  <div className="text-[11px] text-red-200/80">
                    Next submission available: {data.cooldownUntil ? new Date(data.cooldownUntil).toLocaleDateString() : '7 days'}
                  </div>
                </div>
              ) : data.status !== 'needs_info' && (
                <form onSubmit={handleSubmitRequest} className="space-y-3.5 pt-1">
                  {error && (
                    <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs">
                      Application submitted for review
                    </div>
                  )}

                  {/* Category Selection */}
                  <div>
                    <label className="block text-xs font-mono-code text-[#8e97a8] uppercase mb-1.5">
                      Category
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`p-2 rounded-xl text-center text-xs font-semibold border transition-all cursor-pointer ${
                            selectedCategory === cat.id
                              ? 'bg-[#ff5500]/20 border-[#ff5500] text-white'
                              : 'bg-[#141822] border-[#212634] text-[#8e97a8] hover:text-white'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Justification */}
                  <div>
                    <label className="block text-xs font-mono-code text-[#8e97a8] uppercase mb-1.5">
                      Background
                    </label>
                    <textarea
                      value={justification}
                      onChange={e => setJustification(e.target.value)}
                      placeholder="Describe your creative work or identity..."
                      rows={3}
                      className="w-full bg-[#141822] border border-[#232a3a] rounded-xl p-3 text-xs text-white placeholder-[#525a6c] focus:outline-none focus:border-[#ff5500] resize-none"
                      required
                    />
                  </div>

                  {/* Portfolio Link */}
                  <div>
                    <label className="block text-xs font-mono-code text-[#8e97a8] uppercase mb-1.5">
                      Portfolio or Social URL
                    </label>
                    <input
                      type="url"
                      value={primaryLink}
                      onChange={e => setPrimaryLink(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-[#141822] border border-[#232a3a] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#525a6c] focus:outline-none focus:border-[#ff5500]"
                    />
                  </div>

                  {/* Additional Links */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-mono-code text-[#8e97a8] uppercase">
                        Additional Links (Optional)
                      </label>
                      {additionalLinks.length < 4 && (
                        <button
                          type="button"
                          onClick={handleAddLink}
                          className="text-[11px] font-mono-code text-[#ff5500] hover:text-[#ff7733] cursor-pointer"
                        >
                          + Add Link
                        </button>
                      )}
                    </div>
                    {additionalLinks.map((link, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-2">
                        <input
                          type="url"
                          value={link}
                          onChange={e => handleLinkChange(idx, e.target.value)}
                          placeholder="https://..."
                          className="flex-1 bg-[#141822] border border-[#232a3a] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#525a6c] focus:outline-none focus:border-[#ff5500]"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveLink(idx)}
                          className="px-2 py-1 text-xs text-[#8e97a8] hover:text-red-400 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-mono-code text-[#8e97a8] uppercase mb-1.5">
                      Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={evidenceNotes}
                      onChange={e => setEvidenceNotes(e.target.value)}
                      placeholder="Additional details..."
                      className="w-full bg-[#141822] border border-[#232a3a] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#525a6c] focus:outline-none focus:border-[#ff5500]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 rounded-xl bg-[#ff5500] hover:bg-[#e64d00] disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    {submitting ? 'Submitting...' : 'Submit Verification Request'}
                  </button>
                </form>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
