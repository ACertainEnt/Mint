import React from 'react';
import { Coins, AlertCircle, CheckCircle2, RefreshCw, Wallet, Info } from 'lucide-react';

interface LaunchCostSummaryProps {
  creationFeeSol: number;
  platformFeePercent: number;
  estimatedNetworkFeeSol: number;
  walletBalanceSol: number | null;
  currency?: string;
  connectedWalletAddress: string | null;
  onRequestAirdrop?: () => Promise<void>;
  isAirdropping?: boolean;
  className?: string;
}

export const LaunchCostSummary: React.FC<LaunchCostSummaryProps> = ({
  creationFeeSol,
  platformFeePercent,
  estimatedNetworkFeeSol,
  walletBalanceSol,
  currency = 'SOL',
  connectedWalletAddress,
  onRequestAirdrop,
  isAirdropping = false,
  className = ''
}) => {
  // Estimated total upfront deployment cost
  const estimatedTotalSol = Number((creationFeeSol + estimatedNetworkFeeSol).toFixed(4));
  const hasBalance = walletBalanceSol !== null;
  const isInsufficient = hasBalance && walletBalanceSol < estimatedTotalSol;

  return (
    <div className={`p-4 sm:p-5 rounded-xl bg-[#11141b] border border-[#212634] space-y-4 text-left ${className}`}>
      {/* Section Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1b202c]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#ff5500]/10 border border-[#ff5500]/20 flex items-center justify-center text-[#ff5500]">
            <Coins size={15} />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase font-mono-code">
              Launch Cost / Fee Summary
            </h3>
            <p className="text-[11px] text-[#8e97a8]">
              Transparent protocol fee schedule prior to contract deployment.
            </p>
          </div>
        </div>

        <span className="text-[10px] text-[#8e97a8] font-mono-code px-2 py-0.5 rounded bg-[#161a24] border border-[#262c3d]">
          Devnet Fixed
        </span>
      </div>

      {/* Fee Table / Line Items */}
      <div className="space-y-2.5 font-mono-code text-xs">
        {/* Line 1: Collection Creation Fee */}
        <div className="flex items-center justify-between text-[#8e97a8]">
          <div className="flex items-center gap-1.5">
            <span className="text-white">Collection creation</span>
            <span className="text-[10px] text-[#6b7280] hidden sm:inline">(Candy machine setup)</span>
          </div>
          <span className="text-white font-semibold">
            {creationFeeSol.toFixed(2)} {currency}
          </span>
        </div>

        {/* Line 2: Platform Fee */}
        <div className="flex items-center justify-between text-[#8e97a8]">
          <div className="flex items-center gap-1.5">
            <span className="text-white">Platform fee</span>
            <span className="text-[10px] text-[#6b7280] hidden sm:inline">(On primary mints)</span>
          </div>
          <div className="text-right">
            <span className="text-white font-semibold">0.00 {currency}</span>
            <span className="text-[10px] text-[#8e97a8] ml-1">({platformFeePercent}% at mint)</span>
          </div>
        </div>

        {/* Line 3: Estimated Network Fee */}
        <div className="flex items-center justify-between text-[#8e97a8]">
          <div className="flex items-center gap-1.5">
            <span className="text-white">Estimated network fee</span>
            <span className="text-[10px] text-[#6b7280] hidden sm:inline">(Solana rent & gas)</span>
          </div>
          <span className="text-white font-semibold">
            ~{estimatedNetworkFeeSol.toFixed(3)} {currency}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-[#232938] pt-2.5" />

        {/* Line 4: Estimated Total */}
        <div className="flex items-center justify-between text-sm pt-0.5">
          <span className="font-bold text-white tracking-wide uppercase">
            Estimated total
          </span>
          <span className="text-base font-extrabold text-[#ff5500]">
            ~{estimatedTotalSol.toFixed(3)} {currency}
          </span>
        </div>
      </div>

      {/* Network fee variance explanation */}
      <div className="p-2.5 rounded-lg bg-[#0d1016] border border-[#1b212d] flex items-start gap-2 text-[11px] text-[#8e97a8]">
        <Info size={13} className="shrink-0 mt-0.5 text-[#ff8c4d]" />
        <span className="leading-normal">
          <strong className="text-white">Estimated network fee:</strong> Final network fee may vary slightly based on Solana validator slot congestion and rent-exempt lamport balances at execution.
        </span>
      </div>

      {/* Wallet Balance Verification */}
      <div className="pt-2 border-t border-[#1b202c]">
        {connectedWalletAddress ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs">
              <Wallet size={14} className="text-[#8e97a8]" />
              <span className="text-[#8e97a8]">Connected Balance:</span>
              <span className={`font-mono-code font-bold ${isInsufficient ? 'text-red-400' : 'text-emerald-400'}`}>
                {hasBalance ? `${walletBalanceSol.toFixed(4)} ${currency}` : 'Checking balance...'}
              </span>
            </div>

            {/* Airdrop helper on devnet if insufficient */}
            {isInsufficient && onRequestAirdrop && (
              <button
                type="button"
                onClick={onRequestAirdrop}
                disabled={isAirdropping}
                className="px-3 py-1.5 rounded-lg bg-[#ff5500]/15 hover:bg-[#ff5500]/25 border border-[#ff5500]/40 text-xs font-bold text-[#ff8c4d] flex items-center justify-center gap-1.5 min-h-[36px] transition-colors"
              >
                {isAirdropping ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Funding...</span>
                  </>
                ) : (
                  <>
                    <Coins size={12} />
                    <span>Request +1 Devnet SOL</span>
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-amber-400/90 flex items-center gap-1.5 font-mono-code">
            <AlertCircle size={13} />
            <span>Connect your Solana Devnet wallet to verify funds before launch.</span>
          </div>
        )}

        {isInsufficient && (
          <div className="mt-2.5 p-2 rounded-lg bg-red-950/40 border border-red-800/40 text-red-300 text-[11px] flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0 text-red-400" />
            <span>
              Your wallet balance ({walletBalanceSol?.toFixed(4)} {currency}) is lower than the estimated total (~{estimatedTotalSol} {currency}). Please request devnet SOL or switch wallets.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
