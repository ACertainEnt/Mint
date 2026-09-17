import React, { useState } from 'react';
import { Search, Bell, Wallet, User as UserIcon, LogOut, Shield, ChevronDown, Check, Coins, ExternalLink, Bot } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { VerifiedBadge } from './VerifiedBadge';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';

interface HeaderProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  unreadNotifications: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate,
  onOpenSearch,
  onOpenNotifications,
  unreadNotifications
}) => {
  const { user, isAdmin, isVerified, setShowAuthModal, logout } = useAuth();
  const { connected, publicKey, balance, walletName, connect, disconnect, requestAirdrop } = useWallet();

  const [walletDropdown, setWalletDropdown] = useState(false);
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [airdropping, setAirdropping] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'explore', label: 'Explore' },
    { id: 'launch', label: 'Launch' },
    { id: 'communities', label: 'Communities' },
    { id: 'accounts', label: 'Accounts' },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin' }] : [])
  ];

  const handleAirdrop = async () => {
    setAirdropping(true);
    try {
      await requestAirdrop();
    } finally {
      setAirdropping(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0a0c10]/90 backdrop-blur-md border-b border-[#1b202c]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand Logo & Solana Devnet Indicator */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center focus:outline-none"
          >
            <BrandLogo size={28} />
          </button>

          {/* Network indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono-code font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>SOLANA DEVNET</span>
          </div>
        </div>

        {/* Center: Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-[#11141b]/80 p-1 rounded-xl border border-[#1d222f]">
          {navItems.map(item => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#ff5500] text-white shadow-sm shadow-[#ff5500]/25'
                    : 'text-[#8e97a8] hover:text-white hover:bg-[#181d28]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Search, Notifications, Wallet, Profile */}
        <div className="flex items-center gap-2">
          {/* MintBot quick trigger */}
          <button
            onClick={() => onNavigate('mintbot')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              currentTab === 'mintbot'
                ? 'bg-[#ff5500] text-white border-[#ff5500] shadow-sm shadow-[#ff5500]/25'
                : 'bg-[#141822] hover:bg-[#1b202d] border-[#212634] text-[#ff5500] hover:text-white'
            }`}
            title="MintBot NFT Intelligence"
          >
            <Bot size={15} className={currentTab === 'mintbot' ? 'text-white' : 'text-[#ff5500]'} />
            <span className="hidden sm:inline text-[11px]">MintBot</span>
          </button>

          {/* Global Search trigger */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#141822] hover:bg-[#1b202d] border border-[#212634] text-xs text-[#8e97a8] hover:text-white transition-colors"
          >
            <Search size={14} className="text-[#ff5500]" />
            <span className="hidden lg:inline text-[11px]">Search...</span>
            <kbd className="hidden lg:inline px-1.5 py-0.5 rounded bg-[#1e2330] text-[9px] font-mono-code text-[#6b7280]">
              /
            </kbd>
          </button>

          {/* Notifications */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-lg bg-[#141822] hover:bg-[#1b202d] border border-[#212634] text-[#8e97a8] hover:text-white transition-colors"
            title="Notifications"
          >
            <Bell size={15} />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#ff5500] text-white font-mono-code text-[9px] font-bold flex items-center justify-center animate-pulse">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>

          {/* Wallet Button */}
          <div className="relative">
            {connected && publicKey ? (
              <button
                onClick={() => setWalletDropdown(!walletDropdown)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#141822] hover:bg-[#1b202d] border border-[#262c3c] text-xs transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-mono-code font-bold text-[#ff5500]">
                  {balance.toFixed(2)} SOL
                </span>
                {publicKey && publicKey.length >= 8 && (
                  <span className="hidden sm:inline font-mono-code text-[11px] text-[#8e97a8]">
                    {publicKey.slice(0, 4)}..{publicKey.slice(-4)}
                  </span>
                )}
                <ChevronDown size={12} className="text-[#6b7280]" />
              </button>
            ) : (
              <button
                onClick={() => connect()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff5500] hover:bg-[#e64d00] text-white text-xs font-semibold shadow-sm shadow-[#ff5500]/25 transition-colors"
              >
                <Wallet size={14} />
                <span>Connect</span>
              </button>
            )}

            {/* Wallet Dropdown */}
            {walletDropdown && connected && publicKey && (
              <div className="absolute right-0 mt-2 w-64 bg-[#11141a] border border-[#232938] rounded-xl p-3 shadow-2xl z-50 text-left animate-fade-in">
                <div className="text-[10px] font-mono-code text-[#6b7280] uppercase">
                  Connected via {walletName || 'Solana'}
                </div>
                <div className="font-mono-code text-xs text-white break-all bg-[#0a0c10] p-2 rounded border border-[#1b202c] my-1.5 flex items-center justify-between">
                  <span>{publicKey.length >= 16 ? `${publicKey.slice(0, 10)}...${publicKey.slice(-6)}` : publicKey}</span>
                  <a
                    href={`https://explorer.solana.com/address/${publicKey}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#ff5500] hover:underline"
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>

                <div className="p-2 rounded bg-[#161a22] border border-[#212634] my-2">
                  <div className="text-[10px] font-mono-code text-[#8e97a8]">DEVNET BALANCE</div>
                  <div className="text-base font-mono-code font-extrabold text-[#ff5500]">
                    {balance.toFixed(4)} SOL
                  </div>
                </div>

                {/* Devnet Faucet Airdrop Button */}
                <button
                  onClick={handleAirdrop}
                  disabled={airdropping}
                  className="w-full mb-2 py-1.5 px-2 rounded-lg bg-[#ff5500]/15 hover:bg-[#ff5500]/25 border border-[#ff5500]/30 text-[#ff8c4d] text-xs font-mono-code font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Coins size={13} />
                  <span>{airdropping ? 'Requesting...' : '+1.0 Free Devnet SOL'}</span>
                </button>

                <button
                  onClick={() => {
                    disconnect();
                    setWalletDropdown(false);
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-[#181d28] hover:bg-red-950/40 text-[#8e97a8] hover:text-red-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <LogOut size={13} />
                  <span>Disconnect</span>
                </button>
              </div>
            )}
          </div>

          {/* Profile / Account Dropdown */}
          <div className="relative">
            {user ? (
              <button
                onClick={() => setProfileDropdown(!profileDropdown)}
                className="flex items-center gap-1 p-1 rounded-full hover:ring-2 hover:ring-[#ff5500]/50 transition-all"
              >
                <img
                  src={user.avatar}
                  alt={user.displayName}
                  className="w-8 h-8 rounded-full object-cover border border-[#262c3c]"
                />
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-3 py-1.5 rounded-lg bg-[#181d28] hover:bg-[#202737] border border-[#262c3c] text-white text-xs font-semibold transition-colors"
              >
                Sign In
              </button>
            )}

            {/* Profile Menu */}
            {profileDropdown && user && (
              <div className="absolute right-0 mt-2 w-56 bg-[#11141a] border border-[#232938] rounded-xl p-2 shadow-2xl z-50 text-left animate-fade-in">
                <div className="p-2 border-b border-[#1c212d]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate">
                      {user.displayName}
                    </span>
                    {user.isVerified && <VerifiedBadge size="sm" />}
                  </div>
                  <div className="text-[11px] font-mono-code text-[#ff5500]">
                    @{user.username}
                  </div>
                </div>

                <div className="py-1 space-y-0.5 text-xs">
                  <button
                    onClick={() => {
                      onNavigate('portfolio');
                      setProfileDropdown(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#181d28] text-[#8e97a8] hover:text-white transition-colors"
                  >
                    My Portfolio & NFTs
                  </button>
                  <button
                    onClick={() => {
                      onNavigate(`creator/@${user.username}`);
                      setProfileDropdown(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#181d28] text-[#8e97a8] hover:text-white transition-colors"
                  >
                    Public Creator Profile
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        onNavigate('admin');
                        setProfileDropdown(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg bg-[#ff5500]/10 hover:bg-[#ff5500]/20 text-[#ff8c4d] font-bold transition-colors flex items-center justify-between"
                    >
                      <span>Admin Protocol Hub</span>
                      <Shield size={12} />
                    </button>
                  )}
                </div>

                <div className="pt-1 border-t border-[#1c212d]">
                  <button
                    onClick={() => {
                      logout();
                      setProfileDropdown(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-red-950/40 text-[#8e97a8] hover:text-red-400 text-xs transition-colors flex items-center gap-1.5"
                  >
                    <LogOut size={13} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
