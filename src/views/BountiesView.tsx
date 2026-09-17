import React, { useState, useEffect } from 'react';
import { Target, Plus, CheckCircle2, Clock, Sparkles, AlertCircle, ArrowUpRight, DollarSign, Upload, User } from 'lucide-react';
import { Bounty, BountySubmission } from '../types';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';

interface BountiesViewProps {
  onSelectBounty?: (bounty: Bounty) => void;
  onNavigate: (tab: string) => void;
}

export const BountiesView: React.FC<BountiesViewProps> = ({ onNavigate }) => {
  const { user, setShowAuthModal } = useAuth();
  const { connected, balance, sendSolTransaction } = useWallet();

  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Create Bounty Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('1.5');
  const [category, setCategory] = useState<'art_commission' | 'generative' | 'lore' | 'trait_design' | 'community'>('art_commission');
  const [requirementsText, setRequirementsText] = useState('High resolution SVG or PNG\nOriginal procedural design\nDeliverable within deadline');
  const [deadlineDays, setDeadlineDays] = useState('7');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Submit Work Modal
  const [submittingBounty, setSubmittingBounty] = useState<Bounty | null>(null);
  const [notes, setNotes] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [workSubmitting, setWorkSubmitting] = useState(false);
  const [workError, setWorkError] = useState<string | null>(null);

  const loadBounties = async () => {
    try {
      const res = await api.getBounties({
        category: categoryFilter !== 'all' ? categoryFilter : undefined
      });
      setBounties(res.bounties);
    } catch (err) {
      console.error('Failed to load bounties:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBounties();
  }, [categoryFilter]);

  const handleCreateBounty = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!title.trim() || !description.trim() || !reward) {
      setCreateError('Please complete all required fields.');
      return;
    }

    setCreateSubmitting(true);
    try {
      const reqs = requirementsText.split('\n').filter(r => r.trim().length > 0);
      await api.createBounty({
        title: title.trim(),
        description: description.trim(),
        reward: Number(reward),
        deadlineDays: Number(deadlineDays),
        category,
        requirements: reqs
      });

      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      loadBounties();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to post bounty');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingBounty) return;

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setWorkSubmitting(true);
    setWorkError(null);
    try {
      await api.submitBounty(submittingBounty.id, {
        notes: notes.trim(),
        previewUrl: previewUrl.trim()
      });

      setSubmittingBounty(null);
      setNotes('');
      setPreviewUrl('');
      loadBounties();
    } catch (err: any) {
      setWorkError(err.message || 'Failed to submit work');
    } finally {
      setWorkSubmitting(false);
    }
  };

  const handleAcceptSubmission = async (bounty: Bounty, submission: BountySubmission) => {
    if (!user || user.id !== bounty.creatorId) return;

    try {
      // Prompt wallet payment to winner
      const txRes = await sendSolTransaction(
        submission.submitterAddress,
        bounty.reward,
        `Bounty Payout: ${bounty.title}`
      );

      await api.completeBounty(bounty.id, submission.id, txRes.signature);
      loadBounties();
    } catch (err: any) {
      console.error('Payout failed:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f2430] pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white">
            Ecosystem Tasks & Commissions
          </h1>
          <p className="text-xs sm:text-sm text-[#9ca3af] mt-1">
            Commission artwork, generative trait design, and creative tasks with escrow-style SOL payouts.
          </p>
        </div>

        <button
          onClick={() => {
            if (!user) setShowAuthModal(true);
            else setShowCreateModal(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-[#ff5500] hover:bg-[#e64d00] text-white font-bold text-xs sm:text-sm transition-colors shadow-md shadow-[#ff5500]/25 flex items-center justify-center gap-2 shrink-0"
        >
          <Plus size={16} />
          <span>Create Bounty</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {[
          { id: 'all', label: 'All Bounties' },
          { id: 'art_commission', label: '🎨 Artwork Commission' },
          { id: 'generative', label: '⚡ Generative / Code' },
          { id: 'trait_design', label: '💎 Trait & Layer Design' },
          { id: 'lore', label: '📜 Lore & Story' },
          { id: 'community', label: '🌐 Community & Growth' }
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 ${
              categoryFilter === cat.id
                ? 'bg-[#ff5500] text-white'
                : 'bg-[#141822] text-[#8e97a8] hover:text-white border border-[#212634]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Bounties List */}
      {loading ? (
        <div className="py-20 text-center text-xs font-mono-code text-[#8e97a8]">
          Loading active bounties...
        </div>
      ) : bounties.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-[#11141b] border border-[#212634] p-8">
          <Target size={36} className="mx-auto mb-3 text-[#6b7280]" />
          <h3 className="text-base font-bold text-white">No active bounties in this category</h3>
          <p className="text-xs text-[#8e97a8] mt-1">Post a creative commission for the Solana community.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {bounties.map(bty => {
            const isCreator = user?.id === bty.creatorId;
            const daysRemaining = Math.max(0, Math.ceil((new Date(bty.deadline).getTime() - Date.now()) / (24 * 3600 * 1000)));

            return (
              <div
                key={bty.id}
                className="rounded-2xl bg-[#11141a] border border-[#202533] p-5 flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono-code uppercase px-2.5 py-0.5 rounded-full bg-[#1c2230] text-[#ff8c4d] border border-[#262e40] font-bold">
                      {bty.category.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono-code font-extrabold text-sm">
                      <DollarSign size={14} />
                      <span>{bty.reward} SOL</span>
                    </div>
                  </div>

                  <h3 className="text-base font-display font-bold text-white">
                    {bty.title}
                  </h3>
                  <p className="text-xs text-[#9ca3af] mt-1.5 leading-relaxed">
                    {bty.description}
                  </p>

                  {/* Requirements checklist */}
                  {bty.requirements.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <div className="text-[10px] font-mono-code text-[#6b7280] uppercase">Requirements:</div>
                      {bty.requirements.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-[#8e97a8]">
                          <CheckCircle2 size={12} className="text-[#ff5500] shrink-0" />
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Submissions Section for Creator */}
                  {isCreator && bty.submissions.length > 0 && (
                    <div className="mt-4 p-3 rounded-xl bg-[#0c0f15] border border-[#1e2330] space-y-2">
                      <div className="text-[11px] font-mono-code font-bold text-[#ff8c4d] flex items-center justify-between">
                        <span>SUBMITTED WORK ({bty.submissions.length}):</span>
                        <span className="text-[10px] text-[#8e97a8]">Review & Accept</span>
                      </div>
                      <div className="space-y-2">
                        {bty.submissions.map(sub => (
                          <div key={sub.id} className="p-2 rounded bg-[#161a22] flex items-center justify-between gap-2 text-xs">
                            <div className="min-w-0">
                              <span className="font-bold text-white">@{sub.submitterUsername}:</span>
                              <span className="text-[#8e97a8] ml-1">{sub.notes}</span>
                              {sub.previewUrl && (
                                <a href={sub.previewUrl} target="_blank" rel="noopener noreferrer" className="block text-[11px] text-[#ff5500] hover:underline">
                                  Preview File →
                                </a>
                              )}
                            </div>
                            {bty.status !== 'completed' ? (
                              <button
                                onClick={() => handleAcceptSubmission(bty, sub)}
                                className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] shrink-0"
                              >
                                Accept & Pay
                              </button>
                            ) : sub.status === 'accepted' ? (
                              <span className="text-[10px] font-mono-code text-emerald-400 font-bold">WINNER PAID</span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer status and submit button */}
                <div className="pt-3 border-t border-[#1b202c] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-[#6b7280]">
                    <Clock size={12} />
                    <span>{bty.status === 'completed' ? 'Completed' : `${daysRemaining} days left`}</span>
                  </div>

                  {bty.status !== 'completed' && !isCreator && (
                    <button
                      onClick={() => setSubmittingBounty(bty)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#ff5500] hover:bg-[#e64d00] text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <Upload size={12} />
                      <span>Submit Work</span>
                    </button>
                  )}

                  {bty.status === 'completed' && (
                    <span className="text-xs font-mono-code font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      ✓ Completed & Rewarded
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE BOUNTY MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#11141a] border border-[#212634] rounded-2xl p-6 shadow-2xl text-left max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-display font-bold text-white mb-1">
              Create Ecosystem Bounty
            </h2>
            <p className="text-xs text-[#9ca3af] mb-4">
              Reward contributors in SOL for artwork, code, or collection assets.
            </p>

            {createError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400 text-xs mb-4">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateBounty} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                  Bounty Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Design 5 Rare Helmet Traits in SVG"
                  className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                  Description & Task Scope *
                </label>
                <textarea
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Explain exactly what you need delivered..."
                  rows={3}
                  className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white resize-none focus:outline-none focus:border-[#ff5500]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                    Reward (SOL) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={reward}
                    onChange={e => setReward(e.target.value)}
                    className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white font-mono-code font-bold focus:outline-none focus:border-[#ff5500]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500]"
                  >
                    <option value="art_commission">Artwork Commission</option>
                    <option value="generative">Generative / Code</option>
                    <option value="trait_design">Trait Design</option>
                    <option value="lore">Lore & Story</option>
                    <option value="community">Community & Growth</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={deadlineDays}
                    onChange={e => setDeadlineDays(e.target.value)}
                    className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white font-mono-code focus:outline-none focus:border-[#ff5500]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                  Requirements (One per line)
                </label>
                <textarea
                  value={requirementsText}
                  onChange={e => setRequirementsText(e.target.value)}
                  rows={3}
                  className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white resize-none font-mono-code focus:outline-none focus:border-[#ff5500]"
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
                  {createSubmitting ? 'Posting Bounty...' : 'Publish Bounty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBMIT WORK MODAL */}
      {submittingBounty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-[#11141a] border border-[#212634] rounded-2xl p-6 shadow-2xl text-left">
            <h2 className="text-lg font-display font-bold text-white mb-1">
              Submit Work: "{submittingBounty.title}"
            </h2>
            <p className="text-xs text-[#9ca3af] mb-4">
              Attach a preview URL and delivery notes for the creator to review.
            </p>

            {workError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400 text-xs mb-4">
                {workError}
              </div>
            )}

            <form onSubmit={handleSubmitWork} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                  Preview Image / File URL
                </label>
                <input
                  type="url"
                  value={previewUrl}
                  onChange={e => setPreviewUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8e97a8] mb-1">
                  Submission Notes / Delivery Description *
                </label>
                <textarea
                  required
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Describe your design, layer composition, and delivery link..."
                  rows={3}
                  className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white resize-none focus:outline-none focus:border-[#ff5500]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSubmittingBounty(null)}
                  className="px-4 py-2 rounded-lg bg-[#181d28] text-xs font-semibold text-[#8e97a8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={workSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#ff5500] hover:bg-[#e64d00] text-white text-xs font-bold transition-colors"
                >
                  {workSubmitting ? 'Submitting...' : 'Submit to Creator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
