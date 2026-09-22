import React, { useState } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, Loader2, X, Shield, ArrowRight, Wallet, UserCheck } from 'lucide-react';
import { api } from '../lib/api';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBetaRedeem?: () => void;
}

export const WaitlistModal: React.FC<WaitlistModalProps> = ({
  isOpen,
  onClose,
  onOpenBetaRedeem
}) => {
  const [email, setEmail] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [roleInterest, setRoleInterest] = useState<'creator' | 'collector' | 'developer' | 'community'>('collector');
  const [notes, setNotes] = useState('');

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'duplicate' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [registeredPosition, setRegisteredPosition] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('submitting');
    setMessage('');

    try {
      const res = await api.joinWaitlist({
        email: email.trim(),
        walletAddress: walletAddress.trim() || undefined,
        roleInterest,
        notes: notes.trim() || undefined
      });

      if (res.success) {
        setStatus('success');
        setMessage(res.message || "You're officially on the MINT early access waitlist!");
        if (res.position) {
          setRegisteredPosition(res.position);
        }
      } else {
        setStatus('error');
        setMessage('Unable to join waitlist at this time. Please try again.');
      }
    } catch (err: any) {
      if (err?.alreadyRegistered || err?.message?.toLowerCase().includes('already registered')) {
        setStatus('duplicate');
        setMessage('This email is already registered on the MINT waitlist. We have your spot saved!');
      } else {
        setStatus('error');
        setMessage(err?.message || 'Failed to submit waitlist registration. Please try again.');
      }
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setMessage('');
  };

  return (
    <div
      id="waitlist-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="waitlist-modal-container"
        className="relative w-full max-w-lg bg-[#0e1117] border border-[#212634] rounded-2xl p-6 sm:p-7 shadow-2xl text-left overflow-hidden"
      >
        {/* Close Button */}
        <button
          id="waitlist-modal-close-btn"
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-lg bg-[#161a24] hover:bg-[#202634] text-[#8e97a8] hover:text-white flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Top Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold font-mono-code bg-[#ff5500]/15 text-[#ff5500] border border-[#ff5500]/30 flex items-center gap-1">
            <Sparkles size={11} />
            <span>Algorand Genesis Protocol</span>
          </span>
          <span className="text-[10px] font-mono-code text-[#737e92]">v0.9 Beta</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          Join the MINT Early Access Waitlist
        </h2>
        <p className="text-xs sm:text-sm text-[#8e97a8] mt-1.5 leading-relaxed">
          MINT is launching high-throughput digital artifacts and verified creator drops on Algorand. Reserve your cohort spot for priority access.
        </p>

        {/* Status: SUCCESS */}
        {status === 'success' && (
          <div className="mt-6 p-5 rounded-xl bg-[#141a24] border border-emerald-500/30 text-center space-y-3 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Spot Reserved!</h3>
              <p className="text-xs text-[#9aa4b6] mt-1">
                {message}
              </p>
              {registeredPosition && (
                <div className="mt-3 inline-block px-3 py-1 rounded-lg bg-[#1b2230] border border-[#2a3447] text-xs font-mono-code text-[#ff7733]">
                  Waitlist Position: #{registeredPosition}
                </div>
              )}
            </div>
            <p className="text-[11px] text-[#717b8f]">
              We will send an invitation code to <span className="text-white font-mono-code">{email}</span> as soon as your cohort opens.
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-[#ff5500] hover:bg-[#e04a00] text-white text-xs font-bold font-mono-code transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Status: DUPLICATE */}
        {status === 'duplicate' && (
          <div className="mt-6 p-5 rounded-xl bg-[#181a24] border border-amber-500/30 text-center space-y-3 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <UserCheck size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Already On the List</h3>
              <p className="text-xs text-[#9aa4b6] mt-1">
                {message}
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
              {onOpenBetaRedeem && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenBetaRedeem();
                  }}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#ff5500] hover:bg-[#e04a00] text-white text-xs font-bold font-mono-code transition-colors"
                >
                  Have a Beta Code? Redeem
                </button>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#1a202c] hover:bg-[#232b3c] text-[#a0aec0] text-xs font-bold font-mono-code transition-colors"
              >
                Register Another Email
              </button>
            </div>
          </div>
        )}

        {/* Status: FORM (idle, submitting, error) */}
        {(status === 'idle' || status === 'submitting' || status === 'error') && (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {status === 'error' && message && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/40 text-xs text-red-300 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{message}</span>
              </div>
            )}

            {/* Email Address (Required) */}
            <div>
              <label className="block text-xs font-bold text-[#c2cbd9] mb-1.5 font-mono-code">
                EMAIL ADDRESS <span className="text-[#ff5500]">*</span>
              </label>
              <input
                id="waitlist-email-input"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-[#121620] border border-[#262e3f] focus:border-[#ff5500] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-[#58647a] focus:outline-none transition-colors"
              />
            </div>

            {/* Role / Primary Interest */}
            <div>
              <label className="block text-xs font-bold text-[#c2cbd9] mb-1.5 font-mono-code">
                PRIMARY INTEREST
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'collector', label: 'Collector / Trader', desc: 'Discover & collect genesis NFTs' },
                  { id: 'creator', label: 'Artist / Creator', desc: 'Launch collections & curate drops' },
                  { id: 'developer', label: 'Developer / Protocol', desc: 'Build on Algorand NFT APIs' },
                  { id: 'community', label: 'Community & DAO', desc: 'Join governance & bounties' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRoleInterest(opt.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      roleInterest === opt.id
                        ? 'bg-[#ff5500]/10 border-[#ff5500] text-white'
                        : 'bg-[#121620] border-[#222837] text-[#8e97a8] hover:border-[#323b4e]'
                    }`}
                  >
                    <div className="text-xs font-bold leading-none">{opt.label}</div>
                    <div className="text-[10px] text-[#6b778c] mt-1 leading-tight">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Algorand Wallet (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#c2cbd9] font-mono-code flex items-center gap-1.5">
                  <Wallet size={12} className="text-[#8e97a8]" />
                  <span>ALGORAND WALLET ADDRESS</span>
                </label>
                <span className="text-[10px] text-[#6b778c] font-mono-code">Optional</span>
              </div>
              <input
                id="waitlist-wallet-input"
                type="text"
                value={walletAddress}
                onChange={e => setWalletAddress(e.target.value)}
                placeholder="58-character Algorand address (Pera / Defly)"
                className="w-full bg-[#121620] border border-[#262e3f] focus:border-[#ff5500] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#58647a] focus:outline-none font-mono-code transition-colors"
              />
              <p className="text-[10px] text-[#636f83] mt-1">
                Provide your Algorand address if you wish to receive testnet allocations and early ASA drops.
              </p>
            </div>

            {/* Notes / Portfolio */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#c2cbd9] font-mono-code">
                  NOTES / PORTFOLIO LINK
                </label>
                <span className="text-[10px] text-[#6b778c] font-mono-code">Optional</span>
              </div>
              <input
                id="waitlist-notes-input"
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Links to previous artworks, Twitter/X handle, or projects"
                className="w-full bg-[#121620] border border-[#262e3f] focus:border-[#ff5500] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#58647a] focus:outline-none transition-colors"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                id="waitlist-submit-btn"
                type="submit"
                disabled={status === 'submitting' || !email.trim()}
                className="w-full py-3 rounded-xl bg-[#ff5500] hover:bg-[#e04a00] text-white text-xs sm:text-sm font-bold font-mono-code flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#ff5500]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'submitting' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Reserving Your Spot...</span>
                  </>
                ) : (
                  <>
                    <span>Join Early Access Waitlist</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-center gap-1 text-[11px] text-[#677387] pt-1">
              <Shield size={11} className="text-[#8e97a8]" />
              <span>Real Firestore-backed persistence • No spam</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
