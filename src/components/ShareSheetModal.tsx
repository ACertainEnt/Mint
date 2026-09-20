import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  MessageCircle,
  Send,
  Smartphone
} from 'lucide-react';

interface ShareSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  text?: string;
}

export const ShareSheetModal: React.FC<ShareSheetModalProps> = ({
  isOpen,
  onClose,
  url,
  title,
  text
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareText = text || title || 'Check this out on MINT';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url
        });
        onClose();
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Native share failed:', err);
        }
      }
    }
  };

  const handleWhatsApp = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${url}`)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleTelegram = () => {
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`;
    window.open(tgUrl, '_blank', 'noopener,noreferrer');
  };

  const handleMessages = () => {
    const smsUrl = `sms:?&body=${encodeURIComponent(`${shareText} ${url}`)}`;
    window.location.href = smsUrl;
  };

  const handleTwitter = () => {
    const twUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`;
    window.open(twUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[#12151c] border border-[#222838] rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl text-left space-y-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#212634] pb-3">
          <div className="flex items-center gap-2">
            <Share2 size={16} className="text-[#ff5500]" />
            <h3 className="text-sm font-bold text-white tracking-wide">Share</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8e97a8] hover:text-white hover:bg-[#1c2230] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* URL Preview */}
        <div className="p-2.5 rounded-lg bg-[#0d1017] border border-[#212634] flex items-center justify-between gap-2 text-xs">
          <span className="font-mono-code text-[#8e97a8] truncate select-all">{url}</span>
          <button
            onClick={handleCopyLink}
            className="px-2.5 py-1 rounded bg-[#ff5500]/15 hover:bg-[#ff5500]/25 text-[#ff8c4d] font-bold text-[11px] shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
          >
            {copied ? (
              <>
                <Check size={12} className="text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Share Destinations Grid */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {/* Copy Link Option */}
          <button
            onClick={handleCopyLink}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#171b24] hover:bg-[#1f2533] border border-[#232a3a] text-white transition-colors group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-[#ff5500]/10 border border-[#ff5500]/30 flex items-center justify-center text-[#ff5500] mb-1.5 group-hover:scale-105 transition-transform">
              {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
            </div>
            <span className="text-[11px] font-medium text-[#d1d5db] truncate">
              {copied ? 'Copied' : 'Copy link'}
            </span>
          </button>

          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#171b24] hover:bg-[#1f2533] border border-[#232a3a] text-white transition-colors group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-[#25D366]/10 border border-[#25D366]/30 flex items-center justify-center text-[#25D366] mb-1.5 group-hover:scale-105 transition-transform">
              <MessageCircle size={18} />
            </div>
            <span className="text-[11px] font-medium text-[#d1d5db] truncate">WhatsApp</span>
          </button>

          {/* Telegram */}
          <button
            onClick={handleTelegram}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#171b24] hover:bg-[#1f2533] border border-[#232a3a] text-white transition-colors group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-[#229ED9]/10 border border-[#229ED9]/30 flex items-center justify-center text-[#229ED9] mb-1.5 group-hover:scale-105 transition-transform">
              <Send size={18} />
            </div>
            <span className="text-[11px] font-medium text-[#d1d5db] truncate">Telegram</span>
          </button>

          {/* Messages / SMS */}
          <button
            onClick={handleMessages}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#171b24] hover:bg-[#1f2533] border border-[#232a3a] text-white transition-colors group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-[#38bdf8]/10 border border-[#38bdf8]/30 flex items-center justify-center text-[#38bdf8] mb-1.5 group-hover:scale-105 transition-transform">
              <Smartphone size={18} />
            </div>
            <span className="text-[11px] font-medium text-[#d1d5db] truncate">Messages</span>
          </button>
        </div>

        {/* Secondary Options */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleTwitter}
            className="flex-1 py-2 px-3 rounded-lg bg-[#161a23] hover:bg-[#1d222e] border border-[#232a3a] text-xs font-semibold text-[#8e97a8] hover:text-white transition-colors text-center cursor-pointer"
          >
            Share to X (Twitter)
          </button>

          {typeof navigator !== 'undefined' && !!navigator.share && (
            <button
              onClick={handleNativeShare}
              className="flex-1 py-2 px-3 rounded-lg bg-[#161a23] hover:bg-[#1d222e] border border-[#232a3a] text-xs font-semibold text-[#ff8c4d] hover:text-[#ff5500] transition-colors text-center cursor-pointer"
            >
              More Options...
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
