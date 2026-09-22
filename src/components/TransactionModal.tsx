import React from 'react';
import { Loader2, CheckCircle2, XCircle, ExternalLink, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { TxStatus } from '../types';

interface TransactionModalProps {
  status: TxStatus | null;
  onClose: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ status, onClose }) => {
  if (!status || status.step === 'idle') return null;

  const isPending = ['preparing', 'awaiting_wallet', 'submitting', 'confirming'].includes(status.step);
  const isConfirmed = status.step === 'confirmed';
  const isFailed = status.step === 'failed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#12151b] border border-[#232836] rounded-xl p-6 shadow-2xl text-left">
        {/* Step Indicator Progress */}
        <div className="flex items-center gap-1 mb-5">
          {(['preparing', 'awaiting_wallet', 'submitting', 'confirming'] as const).map((stepKey, idx) => {
            const steps = ['preparing', 'awaiting_wallet', 'submitting', 'confirming'];
            const currentIdx = steps.indexOf(status.step);
            const isDone = isConfirmed || currentIdx > idx;
            const isCurrent = status.step === stepKey;

            return (
              <div
                key={stepKey}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  isConfirmed || isDone
                    ? 'bg-[#ff5500]'
                    : isCurrent
                    ? 'bg-[#ff5500] animate-pulse'
                    : isFailed
                    ? 'bg-red-500/40'
                    : 'bg-[#1c212d]'
                }`}
              />
            );
          })}
        </div>

        <div className="flex items-start gap-4">
          <div className="shrink-0 mt-0.5">
            {isPending && (
              <div className="w-10 h-10 rounded-lg bg-[#ff5500]/15 flex items-center justify-center border border-[#ff5500]/30 text-[#ff5500]">
                <Loader2 size={22} className="animate-spin" />
              </div>
            )}
            {isConfirmed && (
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center border border-emerald-500/30 text-emerald-400">
                <CheckCircle2 size={24} />
              </div>
            )}
            {isFailed && (
              <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center border border-red-500/30 text-red-400">
                <XCircle size={24} />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider font-mono-code font-semibold px-2 py-0.5 rounded bg-[#1c212d] text-[#8e97a8]">
                {status.step.replace('_', ' ')}
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-1.5 leading-snug">
              {status.title}
            </h3>
            {status.message && (
              <p className="text-sm text-[#9ca3af] mt-1 leading-relaxed">
                {status.message}
              </p>
            )}
            {status.error && (
              <p className="text-sm text-red-400 mt-2 bg-red-950/40 p-2.5 rounded border border-red-800/40 font-mono-code text-xs">
                {status.error}
              </p>
            )}
          </div>
        </div>

        {/* Algorand On-chain Signature Link */}
        {status.txSignature && (
          <div className="mt-4 pt-3 border-t border-[#1c212d] flex items-center justify-between text-xs">
            <span className="text-[#6b7280] font-mono-code">
              Tx: {status.txSignature.length >= 16 ? `${status.txSignature.slice(0, 8)}...${status.txSignature.slice(-8)}` : status.txSignature}
            </span>
            <a
              href={`https://testnet.explorer.perawallet.app/tx/${status.txSignature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#ff5500] hover:underline font-mono-code font-medium"
            >
              Algorand Explorer <ExternalLink size={12} />
            </a>
          </div>
        )}

        {/* Footer actions */}
        <div className="mt-6 flex justify-end gap-3">
          {(isConfirmed || isFailed) && (
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#1c212d] hover:bg-[#252c3c] text-white font-semibold text-sm transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
