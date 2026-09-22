import React from 'react';
import { Shield, AlertTriangle, CheckCircle2, Lock, Eye, FileText, Info } from 'lucide-react';
import { User } from '../types';

interface LaunchSecurityNoticeProps {
  user: User | null;
  creatorAddress: string | null;
  royaltyFee: number;
  walletMintLimit?: number;
  className?: string;
  step?: 'details' | 'config' | 'fees' | 'review';
}

/**
 * Clean architectural component reserving space for future rug-pull / scam detection,
 * contract auditing, and creator reputation verification without displaying fake scores.
 */
export const LaunchSecurityNotice: React.FC<LaunchSecurityNoticeProps> = ({
  user,
  creatorAddress,
  royaltyFee,
  walletMintLimit,
  className = '',
  step = 'review'
}) => {
  return (
    <div className={`p-4 rounded-xl bg-[#10131a] border border-[#212634] space-y-3.5 text-left ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1b202c]">
        <div className="flex items-center gap-2">
          <Shield size={15} className="text-[#ff5500]" />
          <span className="text-xs font-bold text-white tracking-wide uppercase font-mono-code">
            Protocol Security & Transparency
          </span>
        </div>
        <span className="text-[10px] text-[#8e97a8] font-mono-code px-2 py-0.5 rounded bg-[#161a24] border border-[#262c3d]">
          Testnet Guards Active
        </span>
      </div>

      {/* Security Architecture Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Item 1: Creator Verification & Identity */}
        <div className="p-3 rounded-lg bg-[#0d1016] border border-[#1b212d] space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-white">
            <span className="flex items-center gap-1.5">
              <Eye size={12} className="text-[#8e97a8]" />
              Creator Identity
            </span>
            {user?.isVerified ? (
              <span className="text-[10px] text-emerald-400 font-mono-code flex items-center gap-1">
                <CheckCircle2 size={11} />
                Verified Creator
              </span>
            ) : (
              <span className="text-[10px] text-[#8e97a8] font-mono-code">
                Standard Account
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#8e97a8] leading-relaxed">
            {user?.isVerified
              ? 'Collection will receive the verified creator checkmark upon on-chain deployment.'
              : 'Unverified creator launches remain in the Community directory until reviewed by protocol administration.'}
          </p>
        </div>

        {/* Item 2: Mint Authority & Escrow */}
        <div className="p-3 rounded-lg bg-[#0d1016] border border-[#1b212d] space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-white">
            <span className="flex items-center gap-1.5">
              <Lock size={12} className="text-[#ff5500]" />
              Mint Authority
            </span>
            <span className="text-[10px] text-[#ff8c4d] font-mono-code">
              Escrow Bound
            </span>
          </div>
          <p className="text-[11px] text-[#8e97a8] leading-relaxed">
            Candy Machine accounts restrict unauthorized token issuance beyond declared supply.
          </p>
        </div>

        {/* Item 3: Secondary Royalties & Enforcement */}
        <div className="p-3 rounded-lg bg-[#0d1016] border border-[#1b212d] space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-white">
            <span className="flex items-center gap-1.5">
              <FileText size={12} className="text-[#8e97a8]" />
              Royalty Enforcement
            </span>
            <span className="text-[10px] text-white font-mono-code">
              {royaltyFee}% On-Chain
            </span>
          </div>
          <p className="text-[11px] text-[#8e97a8] leading-relaxed">
            Creator share is automatically routed to your connected payout address on marketplace sales.
          </p>
        </div>

        {/* Item 4: Per-Wallet Anti-Bot Caps */}
        <div className="p-3 rounded-lg bg-[#0d1016] border border-[#1b212d] space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-white">
            <span className="flex items-center gap-1.5">
              <AlertTriangle size={12} className="text-[#8e97a8]" />
              Anti-Bot Fair Launch
            </span>
            <span className="text-[10px] text-white font-mono-code">
              {walletMintLimit ? `${walletMintLimit} per wallet` : 'Unlimited'}
            </span>
          </div>
          <p className="text-[11px] text-[#8e97a8] leading-relaxed">
            Wallet mint limits mitigate automated bot sniping during the primary mint window.
          </p>
        </div>
      </div>

      {/* Reserved Future Moderation / Scam Detection Notice */}
      <div className="p-2.5 rounded-lg bg-[#0d1016] border border-[#1f2533] flex items-start gap-2 text-[11px] text-[#8e97a8]">
        <Info size={13} className="shrink-0 mt-0.5 text-[#ff5500]" />
        <span className="leading-normal">
          All launches are subject to protocol moderation. Malicious metadata, duplicated trademark assets, or fraudulent withdrawal parameters are delisted upon administrative inspection.
        </span>
      </div>
    </div>
  );
};
