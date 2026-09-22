import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Shield,
  Eye,
  ArrowRight,
  ArrowLeft,
  Layers,
  Coins,
  Settings,
  Calendar,
  Wallet,
  Clock,
  HardDrive,
  RefreshCw,
  ExternalLink,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { api } from '../lib/api';
import { NFTCollection, PlatformConfig } from '../types';
import { CollectionCard } from '../components/CollectionCard';
import { ImageUploader, UploadedFileMeta } from '../components/ImageUploader';
import { LaunchCostSummary } from '../components/LaunchCostSummary';
import { LaunchSecurityNotice } from '../components/LaunchSecurityNotice';

interface LaunchViewProps {
  onCollectionCreated: (col: NFTCollection) => void;
  onNavigate: (tab: string) => void;
}

type LaunchStep = 1 | 2 | 3 | 4;

type LaunchButtonState =
  | 'disabled'
  | 'ready'
  | 'preparing'
  | 'awaiting_wallet'
  | 'processing'
  | 'confirmed'
  | 'failed';

export const LaunchView: React.FC<LaunchViewProps> = ({ onCollectionCreated, onNavigate }) => {
  const { user, setShowAuthModal } = useAuth();
  const { connected, publicKey, balance, connect, sendTransaction, requestAirdrop, refreshBalance } = useWallet();

  // Step Management (1: Details, 2: Config, 3: Fees, 4: Review)
  const [currentStep, setCurrentStep] = useState<LaunchStep>(1);

  // Platform Config (retrieved from server)
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // STEP 1 — Collection Details State
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'art' | 'generative' | 'photography' | 'utility' | 'pfp'>('art');
  const [image, setImage] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<UploadedFileMeta | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [bannerMeta, setBannerMeta] = useState<UploadedFileMeta | null>(null);
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [discord, setDiscord] = useState('');
  const [telegram, setTelegram] = useState('');

  // Upload progress tracking
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  // STEP 2 — Collection Configuration State
  const [totalSupply, setTotalSupply] = useState<string>('250');
  const [mintPrice, setMintPrice] = useState<string>('0.25');
  const [currency, setCurrency] = useState<'ALGO' | 'USDC'>('ALGO');
  const [royaltyFee, setRoyaltyFee] = useState<string>('5.0');
  const [hasWalletLimit, setHasWalletLimit] = useState(true);
  const [walletMintLimit, setWalletMintLimit] = useState<string>('5');
  const [isScheduled, setIsScheduled] = useState(false);
  const [mintStartTime, setMintStartTime] = useState<string>('');
  const [mintEndTime, setMintEndTime] = useState<string>('');

  // STEP 3 & 4 — Launch Execution State
  const [launchButtonState, setLaunchButtonState] = useState<LaunchButtonState>('ready');
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [confirmedCollection, setConfirmedCollection] = useState<NFTCollection | null>(null);
  const [confirmedTxSignature, setConfirmedTxSignature] = useState<string | null>(null);
  const [isAirdropping, setIsAirdropping] = useState(false);

  // Fetch server-side platform configuration
  useEffect(() => {
    let isMounted = true;
    async function loadConfig() {
      try {
        const res = await api.getConfig();
        if (isMounted) {
          setPlatformConfig(res.config);
          if (res.config?.launchConfig) {
            setWalletMintLimit(String(res.config.launchConfig.defaultWalletLimit || 5));
          }
        }
      } catch (err) {
        console.warn('Failed to load server platform config, using protocol fallbacks:', err);
      } finally {
        if (isMounted) setLoadingConfig(false);
      }
    }
    loadConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  // Update wallet balance when entering fee step
  useEffect(() => {
    if (connected && publicKey) {
      refreshBalance().catch(() => {});
    }
  }, [connected, publicKey, currentStep, refreshBalance]);

  // Dynamic limits from server configuration
  const launchCfg = platformConfig?.launchConfig || {
    collectionCreationFeeSol: 0.05,
    estimatedNetworkFeeSol: 0.012,
    minSupply: 1,
    maxSupply: 10000,
    minMintPriceSol: 0,
    maxMintPriceSol: 100,
    maxRoyaltyPercent: 15,
    defaultWalletLimit: 5,
    maxWalletLimit: 50,
    allowedCurrencies: ['ALGO', 'USDC']
  };

  // Upfront fee calculations
  const creationFee = launchCfg.collectionCreationFeeSol;
  const platformFeePct = platformConfig?.mintFeePercent ?? 1.0;
  const estimatedNetworkFee = launchCfg.estimatedNetworkFeeSol;
  const estimatedTotalCost = Number((creationFee + estimatedNetworkFee).toFixed(4));

  // --- Step 1 Validation ---
  const isNameValid = name.trim().length >= 2 && name.trim().length <= 50;
  const isSymbolValid = /^[a-zA-Z0-9]{2,10}$/.test(symbol.trim());
  const isDescriptionValid = description.trim().length >= 10 && description.trim().length <= 400;
  const isImageValid = !!image && !isUploadingImage;
  const isStep1Valid = isNameValid && isSymbolValid && isDescriptionValid && isImageValid && !isUploadingBanner;

  // --- Step 2 Validation ---
  const numSupply = Number(totalSupply);
  const isSupplyValid =
    totalSupply !== '' &&
    Number.isInteger(numSupply) &&
    numSupply >= launchCfg.minSupply &&
    numSupply <= launchCfg.maxSupply;

  const numPrice = Number(mintPrice);
  const isPriceValid =
    mintPrice !== '' &&
    !isNaN(numPrice) &&
    numPrice >= launchCfg.minMintPriceSol &&
    numPrice <= launchCfg.maxMintPriceSol;

  const numRoyalty = Number(royaltyFee);
  const isRoyaltyValid =
    royaltyFee !== '' &&
    !isNaN(numRoyalty) &&
    numRoyalty >= 0 &&
    numRoyalty <= launchCfg.maxRoyaltyPercent;

  const numWalletLimit = Number(walletMintLimit);
  const isWalletLimitValid = !hasWalletLimit || (Number.isInteger(numWalletLimit) && numWalletLimit >= 1 && numWalletLimit <= launchCfg.maxWalletLimit);

  const isScheduleValid = !isScheduled || (
    mintStartTime !== '' &&
    (!mintEndTime || new Date(mintEndTime).getTime() > new Date(mintStartTime).getTime())
  );

  const isStep2Valid = isSupplyValid && isPriceValid && isRoyaltyValid && isWalletLimitValid && isScheduleValid;

  // Live Card Preview
  const previewCollection: NFTCollection = {
    id: 'col_preview',
    creatorId: user?.id || 'usr_preview',
    creatorAddress: publicKey || 'Algorand_Testnet_Creator',
    creatorUsername: user?.username || 'creator',
    name: name.trim() || 'Untitled Collection',
    symbol: (symbol.trim() || 'MINT').toUpperCase(),
    description: description.trim() || 'Your custom procedural collection on the Algorand blockchain.',
    image: image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80',
    banner: banner || image || 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1200&auto=format&fit=crop&q=80',
    totalSupply: isSupplyValid ? numSupply : 100,
    mintedSupply: 0,
    mintPrice: isPriceValid ? numPrice : 0.1,
    royaltyFee: isRoyaltyValid ? numRoyalty : 5,
    contractAddress: 'ALGO_Testnet_DeployPending...',
    isVerified: !!user?.isVerified,
    floorPrice: isPriceValid ? numPrice : 0.1,
    totalVolume: 0,
    listedCount: 0,
    createdAt: new Date().toISOString(),
    isLive: true,
    category,
    currency,
    walletMintLimit: hasWalletLimit ? numWalletLimit : undefined,
    mintStartTime: isScheduled && mintStartTime ? mintStartTime : undefined,
    mintEndTime: isScheduled && mintEndTime ? mintEndTime : undefined
  };

  // Request devnet airdrop from step 3
  const handleAirdrop = async () => {
    setIsAirdropping(true);
    setLaunchError(null);
    try {
      await requestAirdrop();
      await refreshBalance();
    } catch (err: any) {
      setLaunchError(err.message || 'Failed to request Testnet airdrop. Please retry in a moment.');
    } finally {
      setIsAirdropping(false);
    }
  };

  // --- Step 4 Launch Execution ---
  const handleLaunchCollection = async () => {
    setLaunchError(null);

    // 1. Auth check
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    // 2. Validate all inputs
    if (!isStep1Valid || !isStep2Valid) {
      setLaunchButtonState('disabled');
      setLaunchError('Please verify all required fields and parameters before launching.');
      return;
    }

    try {
      // Button State: PREPARING
      setLaunchButtonState('preparing');

      // Ensure wallet connection
      let activeWalletKey = publicKey;
      if (!activeWalletKey) {
        setLaunchButtonState('awaiting_wallet');
        activeWalletKey = await connect();
        if (!activeWalletKey) {
          throw new Error('Wallet connection is required to sign the on-chain deployment.');
        }
      }

      // Check wallet balance
      if (balance < creationFee) {
        setLaunchButtonState('failed');
        setLaunchError(`Insufficient Testnet ALGO balance (${balance.toFixed(4)} ALGO). Minimum required: ${creationFee} ALGO.`);
        return;
      }

      // Button State: AWAITING WALLET CONFIRMATION
      setLaunchButtonState('awaiting_wallet');

      const treasury = platformConfig?.treasuryAddress || 'ACEp1aTfX7h8Kq3w9uV4y2z5L1m6NoP8qRsTuVwXyZ';

      // Button State: PROCESSING
      setLaunchButtonState('processing');

      // Execute on-chain deployment fee transfer on Algorand Testnet
      const txResult = await sendTransaction(
        treasury,
        creationFee,
        `Deploy Collection: ${name.trim()} (${symbol.trim().toUpperCase()})`
      );

      if (!txResult.success) {
        throw new Error(txResult.error || 'Algorand transaction rejected or failed to confirm on Testnet.');
      }

      // Create collection on backend with verified signature
      const res = await api.createCollection({
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        description: description.trim(),
        category,
        image: image!,
        banner: banner || image!,
        totalSupply: numSupply,
        mintPrice: numPrice,
        currency,
        royaltyFee: numRoyalty,
        walletMintLimit: hasWalletLimit ? numWalletLimit : undefined,
        mintStartTime: isScheduled && mintStartTime ? mintStartTime : undefined,
        mintEndTime: isScheduled && mintEndTime ? mintEndTime : undefined,
        deployTxSignature: txResult.signature,
        socialLinks: {
          website: website.trim() || undefined,
          twitter: twitter.trim() || undefined,
          discord: discord.trim() || undefined,
          telegram: telegram.trim() || undefined
        }
      });

      // Button State: CONFIRMED
      setLaunchButtonState('confirmed');
      setConfirmedCollection(res.collection);
      setConfirmedTxSignature(txResult.signature || null);
      onCollectionCreated(res.collection);
    } catch (err: any) {
      console.error('Launch failed:', err);
      setLaunchButtonState('failed');
      setLaunchError(err.message || 'Collection deployment failed. Please check wallet connection and retry.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-left">
      {/* Header & Devnet Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1f2430] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-display font-extrabold text-white">
              Launch Algorand Memecoin
            </h1>
            <span className="px-2 py-0.5 rounded bg-[#ff5500]/15 border border-[#ff5500]/30 text-[#ff8c4d] text-[10px] font-mono-code font-bold uppercase">
              Algorand Testnet
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#8e97a8] mt-1">
            Create your token ticker, bonding curve parameters, initial liquidity pool, and social channels on Algorand.
          </p>
        </div>

        {/* Protocol Fee Tag */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141822] border border-[#212634] text-xs font-mono-code text-[#ff8c4d] self-start sm:self-auto">
          <Coins size={14} />
          <span>Deploy: {creationFee} ALGO</span>
        </div>
      </div>

      {/* Mobile-First Step Navigation Bar */}
      <div className="bg-[#11141a] border border-[#1f2430] rounded-xl p-2">
        <div className="grid grid-cols-4 gap-1 sm:gap-2">
          {[
            { step: 1 as LaunchStep, title: 'Details', icon: Layers, valid: isStep1Valid },
            { step: 2 as LaunchStep, title: 'Config', icon: Settings, valid: isStep2Valid },
            { step: 3 as LaunchStep, title: 'Fees', icon: Coins, valid: true },
            { step: 4 as LaunchStep, title: 'Review', icon: CheckCircle2, valid: isStep1Valid && isStep2Valid }
          ].map(({ step, title, icon: Icon, valid }) => {
            const isActive = currentStep === step;
            const isPassed = currentStep > step;

            return (
              <button
                key={step}
                type="button"
                onClick={() => {
                  // Allow going back to any step, or moving forward if current step is valid
                  if (step < currentStep || (step === 2 && isStep1Valid) || (step === 3 && isStep1Valid && isStep2Valid) || (step === 4 && isStep1Valid && isStep2Valid)) {
                    setCurrentStep(step);
                  }
                }}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 rounded-lg text-xs font-bold transition-all min-h-[44px] ${
                  isActive
                    ? 'bg-[#ff5500] text-white shadow-sm'
                    : isPassed
                    ? 'bg-[#181d27] text-emerald-400 hover:bg-[#1f2634]'
                    : 'text-[#6b7280] hover:text-[#9ca3af]'
                }`}
              >
                <div className="flex items-center gap-1">
                  {isPassed ? (
                    <CheckCircle2 size={13} className="text-emerald-400" />
                  ) : (
                    <span className="font-mono-code text-[11px] opacity-80">{step}.</span>
                  )}
                  <span className="hidden sm:inline">{title}</span>
                </div>
                <span className="sm:hidden text-[10px] truncate">{title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Global Error Notice */}
      {launchError && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
            <span className="leading-relaxed">{launchError}</span>
          </div>
          <button
            type="button"
            onClick={() => setLaunchError(null)}
            className="text-red-400 hover:text-white font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Active Step Content */}
        <div className="lg:col-span-7 space-y-6">
          {/* ========================================================================= */}
          {/* STEP 1: COLLECTION DETAILS */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-5">
              {/* Card 1: Identity & Metadata */}
              <div className="bg-[#11141b] border border-[#212634] p-4 sm:p-5 rounded-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#1b202c]">
                  <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono-code flex items-center gap-2">
                    <Layers size={14} className="text-[#ff5500]" />
                    Collection Details
                  </h3>
                  <span className="text-[11px] text-[#8e97a8] font-mono-code">Step 1 of 4</span>
                </div>

                {/* Name & Symbol */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <div className="flex justify-between items-center mb-1">
                      <label htmlFor="col-name" className="text-xs font-semibold text-[#8e97a8]">
                        Collection Name <span className="text-[#ff5500]">*</span>
                      </label>
                      <span className="text-[10px] text-[#6b7280] font-mono-code">{name.length}/50</span>
                    </div>
                    <input
                      id="col-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value.slice(0, 50))}
                      placeholder="e.g. Solar Prisms"
                      maxLength={50}
                      className="w-full bg-[#161a22] border border-[#232938] focus:border-[#ff5500] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none min-h-[44px]"
                    />
                    {name.trim().length > 0 && name.trim().length < 2 && (
                      <p className="text-[10px] text-red-400 mt-1">Name must be at least 2 characters.</p>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label htmlFor="col-symbol" className="text-xs font-semibold text-[#8e97a8]">
                        Symbol <span className="text-[#ff5500]">*</span>
                      </label>
                      <span className="text-[10px] text-[#6b7280] font-mono-code">{symbol.length}/10</span>
                    </div>
                    <input
                      id="col-symbol"
                      type="text"
                      required
                      value={symbol}
                      onChange={(e) =>
                        setSymbol(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase())
                      }
                      placeholder="PRISM"
                      maxLength={10}
                      className="w-full bg-[#161a22] border border-[#232938] focus:border-[#ff5500] rounded-lg px-3 py-2.5 text-xs text-white uppercase font-mono-code focus:outline-none min-h-[44px]"
                    />
                    {symbol.length > 0 && !isSymbolValid && (
                      <p className="text-[10px] text-red-400 mt-1">2-10 alphanumeric characters.</p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="col-desc" className="text-xs font-semibold text-[#8e97a8]">
                      Description <span className="text-[#ff5500]">*</span>
                    </label>
                    <span className="text-[10px] text-[#6b7280] font-mono-code">{description.length}/400</span>
                  </div>
                  <textarea
                    id="col-desc"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 400))}
                    placeholder="Describe your artwork lore, generation algorithm, utility, and creative inspiration..."
                    rows={3}
                    maxLength={400}
                    className="w-full bg-[#161a22] border border-[#232938] focus:border-[#ff5500] rounded-lg px-3 py-2.5 text-xs text-white resize-none focus:outline-none leading-relaxed"
                  />
                  {description.trim().length > 0 && description.trim().length < 10 && (
                    <p className="text-[10px] text-red-400 mt-1">Description must be at least 10 characters.</p>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="col-category" className="block text-xs font-semibold text-[#8e97a8] mb-1">
                    Category <span className="text-[#ff5500]">*</span>
                  </label>
                  <select
                    id="col-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-[#161a22] border border-[#232938] focus:border-[#ff5500] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none min-h-[44px]"
                  >
                    <option value="art">Fine Digital Art</option>
                    <option value="generative">Generative & Algorithmic</option>
                    <option value="pfp">Avatar / PFP</option>
                    <option value="photography">Photography & Realism</option>
                    <option value="utility">Gaming, Access & Utility</option>
                  </select>
                </div>
              </div>

              {/* Card 2: Device File Uploads */}
              <div className="bg-[#11141b] border border-[#212634] p-4 sm:p-5 rounded-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#1b202c]">
                  <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono-code flex items-center gap-2">
                    <HardDrive size={14} className="text-[#ff5500]" />
                    Collection Media & Storage
                  </h3>
                  <span className="text-[10px] text-emerald-400 font-mono-code flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Device Picker Ready
                  </span>
                </div>

                {/* Collection Artwork / Logo (Required) */}
                <ImageUploader
                  id="collection-logo-uploader"
                  label="Collection Artwork / Logo"
                  required
                  value={image}
                  onChange={(url, meta) => {
                    setImage(url);
                    setImageMeta(meta || null);
                  }}
                  aspectRatio="square"
                  maxSizeMB={5}
                  recommendation="500x500 px • Max 5MB"
                  description="Primary artwork representing your collection across marketplaces, exploration grids, and wallets."
                  onUploadingChange={setIsUploadingImage}
                />

                {/* Header Banner (Optional) */}
                <ImageUploader
                  id="collection-banner-uploader"
                  label="Header Banner (Optional)"
                  value={banner}
                  onChange={(url, meta) => {
                    setBanner(url);
                    setBannerMeta(meta || null);
                  }}
                  aspectRatio="banner"
                  maxSizeMB={8}
                  recommendation="1200x400 px • Max 8MB"
                  description="Wide header displayed on your dedicated collection launch page. If omitted, your artwork will be adapted."
                  onUploadingChange={setIsUploadingBanner}
                />

                {/* Storage Integration Transparency Notice */}
                <div className="p-3 rounded-lg bg-[#0d1016] border border-[#1d222e] text-[11px] text-[#8e97a8] space-y-1">
                  <div className="flex items-center justify-between font-semibold text-white">
                    <span className="flex items-center gap-1.5">
                      <HardDrive size={12} className="text-[#ff5500]" />
                      Active Protocol Storage Tier:
                    </span>
                    <span className="font-mono-code text-[#ff8c4d]">MINT Local Node (Testnet)</span>
                  </div>
                  <p className="leading-relaxed">
                    Uploaded media files are verified and served directly through the local protocol node storage cluster. Decentralized permanent storage (Arweave / IPFS gateway) can be activated through environment provider keys.
                  </p>
                </div>
              </div>

              {/* Card 3: Social Links (Optional) */}
              <div className="bg-[#11141b] border border-[#212634] p-4 sm:p-5 rounded-xl space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono-code">
                  Social & Community Links (Optional)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="social-web" className="block text-[11px] font-semibold text-[#8e97a8] mb-1">
                      Website URL
                    </label>
                    <input
                      id="social-web"
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500]"
                    />
                  </div>
                  <div>
                    <label htmlFor="social-x" className="block text-[11px] font-semibold text-[#8e97a8] mb-1">
                      X / Twitter
                    </label>
                    <input
                      id="social-x"
                      type="text"
                      value={twitter}
                      onChange={(e) => setTwitter(e.target.value)}
                      placeholder="@username or https://x.com/..."
                      className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500]"
                    />
                  </div>
                  <div>
                    <label htmlFor="social-discord" className="block text-[11px] font-semibold text-[#8e97a8] mb-1">
                      Discord
                    </label>
                    <input
                      id="social-discord"
                      type="url"
                      value={discord}
                      onChange={(e) => setDiscord(e.target.value)}
                      placeholder="https://discord.gg/..."
                      className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500]"
                    />
                  </div>
                  <div>
                    <label htmlFor="social-tg" className="block text-[11px] font-semibold text-[#8e97a8] mb-1">
                      Telegram
                    </label>
                    <input
                      id="social-tg"
                      type="text"
                      value={telegram}
                      onChange={(e) => setTelegram(e.target.value)}
                      placeholder="https://t.me/..."
                      className="w-full bg-[#161a22] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500]"
                    />
                  </div>
                </div>
              </div>

              {/* Step 1 Actions */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={!isStep1Valid}
                  onClick={() => setCurrentStep(2)}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#ff5500] hover:bg-[#e64d00] disabled:opacity-40 disabled:hover:bg-[#ff5500] text-white font-bold text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-2 min-h-[48px]"
                >
                  <span>Continue to Configuration</span>
                  <ArrowRight size={15} />
                </button>
                {!isStep1Valid && (
                  <p className="text-[11px] text-[#8e97a8] text-center mt-2">
                    Please provide Collection Name, Symbol, Description, and upload artwork to continue.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: COLLECTION CONFIGURATION */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="bg-[#11141b] border border-[#212634] p-4 sm:p-5 rounded-xl space-y-5">
                <div className="flex items-center justify-between pb-2 border-b border-[#1b202c]">
                  <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono-code flex items-center gap-2">
                    <Settings size={14} className="text-[#ff5500]" />
                    Collection Configuration
                  </h3>
                  <span className="text-[11px] text-[#8e97a8] font-mono-code">Step 2 of 4</span>
                </div>

                {/* Total Supply Configuration */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="col-supply" className="text-xs font-semibold text-[#8e97a8]">
                      Total NFT Supply <span className="text-[#ff5500]">*</span>
                    </label>
                    <span className="text-[11px] text-[#ff8c4d] font-mono-code">
                      Allowed: {launchCfg.minSupply} to {launchCfg.maxSupply.toLocaleString()}
                    </span>
                  </div>
                  <input
                    id="col-supply"
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min={launchCfg.minSupply}
                    max={launchCfg.maxSupply}
                    required
                    value={totalSupply}
                    onChange={(e) => setTotalSupply(e.target.value)}
                    className="w-full bg-[#161a22] border border-[#232938] focus:border-[#ff5500] rounded-lg px-3 py-2.5 text-xs text-white font-mono-code focus:outline-none min-h-[44px]"
                  />
                  <div className="flex items-center justify-between text-[11px] text-[#6b7280] mt-1">
                    <span>Fixed token edition count enforced on Algorand ASA.</span>
                    {!isSupplyValid && totalSupply !== '' && (
                      <span className="text-red-400 font-semibold">
                        Must be a whole number between {launchCfg.minSupply} and {launchCfg.maxSupply.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Mint Price & Currency */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="col-price" className="text-xs font-semibold text-[#8e97a8]">
                        Mint Price <span className="text-[#ff5500]">*</span>
                      </label>
                      <span className="text-[11px] text-[#ff8c4d] font-mono-code">
                        Min: {launchCfg.minMintPriceSol} {currency} • Max: {launchCfg.maxMintPriceSol} {currency}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        id="col-price"
                        type="number"
                        inputMode="decimal"
                        step="0.001"
                        min={launchCfg.minMintPriceSol}
                        max={launchCfg.maxMintPriceSol}
                        required
                        value={mintPrice}
                        onChange={(e) => setMintPrice(e.target.value)}
                        className="w-full bg-[#161a22] border border-[#232938] focus:border-[#ff5500] rounded-lg pl-3 pr-16 py-2.5 text-xs text-white font-mono-code focus:outline-none min-h-[44px]"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono-code font-bold text-[#8e97a8]">
                        {currency}
                      </div>
                    </div>
                    {!isPriceValid && mintPrice !== '' && (
                      <p className="text-[10px] text-red-400 mt-1">
                        Price must be a valid number between {launchCfg.minMintPriceSol} and {launchCfg.maxMintPriceSol} {currency}.
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="col-curr" className="block text-xs font-semibold text-[#8e97a8] mb-1">
                      Currency
                    </label>
                    <select
                      id="col-curr"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as any)}
                      className="w-full bg-[#161a22] border border-[#232938] focus:border-[#ff5500] rounded-lg px-3 py-2.5 text-xs text-white font-mono-code focus:outline-none min-h-[44px]"
                    >
                      <option value="ALGO">ALGO (Native)</option>
                      <option value="USDC">USDC (Testnet)</option>
                    </select>
                  </div>
                </div>

                {/* Per-Wallet Mint Limit */}
                <div className="p-3.5 rounded-lg bg-[#0d1016] border border-[#1d222e] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">Per-Wallet Mint Limit</h4>
                      <p className="text-[11px] text-[#8e97a8]">
                        Prevents automated bots from monopolizing your drop.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasWalletLimit}
                        onChange={(e) => setHasWalletLimit(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-[#212634] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#ff5500]"></div>
                    </label>
                  </div>

                  {hasWalletLimit && (
                    <div className="pt-2 border-t border-[#1b202c]">
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="col-wallet-limit" className="text-[11px] font-semibold text-[#8e97a8]">
                          Max tokens per wallet
                        </label>
                        <span className="text-[10px] text-[#6b7280] font-mono-code">
                          1 to {launchCfg.maxWalletLimit} tokens
                        </span>
                      </div>
                      <input
                        id="col-wallet-limit"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={launchCfg.maxWalletLimit}
                        value={walletMintLimit}
                        onChange={(e) => setWalletMintLimit(e.target.value)}
                        className="w-full bg-[#161a22] border border-[#232938] focus:border-[#ff5500] rounded-lg px-3 py-2 text-xs text-white font-mono-code focus:outline-none min-h-[40px]"
                      />
                    </div>
                  )}
                </div>

                {/* Mint Schedule (Optional Start & End Time) */}
                <div className="p-3.5 rounded-lg bg-[#0d1016] border border-[#1d222e] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Calendar size={13} className="text-[#ff5500]" />
                        Drop Schedule
                      </h4>
                      <p className="text-[11px] text-[#8e97a8]">
                        Choose immediate launch or configure a future mint window.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isScheduled}
                        onChange={(e) => setIsScheduled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-[#212634] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#ff5500]"></div>
                    </label>
                  </div>

                  {isScheduled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#1b202c]">
                      <div>
                        <label htmlFor="col-start-time" className="block text-[11px] font-semibold text-[#8e97a8] mb-1">
                          Mint Opens (Start Time) <span className="text-[#ff5500]">*</span>
                        </label>
                        <input
                          id="col-start-time"
                          type="datetime-local"
                          value={mintStartTime}
                          onChange={(e) => setMintStartTime(e.target.value)}
                          className="w-full bg-[#161a22] border border-[#232938] focus:border-[#ff5500] rounded-lg px-3 py-2 text-xs text-white font-mono-code focus:outline-none min-h-[40px]"
                        />
                      </div>
                      <div>
                        <label htmlFor="col-end-time" className="block text-[11px] font-semibold text-[#8e97a8] mb-1">
                          Mint Closes (Optional)
                        </label>
                        <input
                          id="col-end-time"
                          type="datetime-local"
                          value={mintEndTime}
                          onChange={(e) => setMintEndTime(e.target.value)}
                          className="w-full bg-[#161a22] border border-[#232938] focus:border-[#ff5500] rounded-lg px-3 py-2 text-xs text-white font-mono-code focus:outline-none min-h-[40px]"
                        />
                      </div>
                      {!isScheduleValid && (
                        <div className="sm:col-span-2 text-[10px] text-red-400">
                          Please specify a start time. End time must be after start time.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Royalties & Creator Share */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="col-royalty" className="text-xs font-semibold text-[#8e97a8]">
                      Creator Secondary Royalty (%)
                    </label>
                    <span className="text-[11px] text-white font-mono-code font-bold">
                      {royaltyFee}% (Max {launchCfg.maxRoyaltyPercent}%)
                    </span>
                  </div>
                  <input
                    id="col-royalty"
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min={0}
                    max={launchCfg.maxRoyaltyPercent}
                    value={royaltyFee}
                    onChange={(e) => setRoyaltyFee(e.target.value)}
                    className="w-full bg-[#161a22] border border-[#232938] focus:border-[#ff5500] rounded-lg px-3 py-2 text-xs text-white font-mono-code focus:outline-none min-h-[44px]"
                  />
                  <p className="text-[11px] text-[#6b7280] mt-1">
                    Enforced on secondary marketplace sales and automatically routed to your connected creator address.
                  </p>
                </div>
              </div>

              {/* Step 2 Actions */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="py-3 px-5 rounded-xl bg-[#141822] hover:bg-[#1a202c] border border-[#212634] text-white font-semibold text-xs transition-colors flex items-center gap-1.5 min-h-[48px]"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  disabled={!isStep2Valid}
                  onClick={() => setCurrentStep(3)}
                  className="flex-1 py-3.5 px-6 rounded-xl bg-[#ff5500] hover:bg-[#e64d00] disabled:opacity-40 disabled:hover:bg-[#ff5500] text-white font-bold text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-2 min-h-[48px]"
                >
                  <span>Continue to Fee Summary</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: FEES */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-5">
              {/* Dedicated Launch Cost / Fee Summary */}
              <LaunchCostSummary
                creationFeeSol={creationFee}
                platformFeePercent={platformFeePct}
                estimatedNetworkFeeSol={estimatedNetworkFee}
                walletBalanceSol={connected ? balance : null}
                currency="ALGO"
                connectedWalletAddress={publicKey}
                onRequestAirdrop={handleAirdrop}
                isAirdropping={isAirdropping}
              />

              {/* Step 3 Actions */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="py-3 px-5 rounded-xl bg-[#141822] hover:bg-[#1a202c] border border-[#212634] text-white font-semibold text-xs transition-colors flex items-center gap-1.5 min-h-[48px]"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="flex-1 py-3.5 px-6 rounded-xl bg-[#ff5500] hover:bg-[#e64d00] text-white font-bold text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-2 min-h-[48px]"
                >
                  <span>Proceed to Final Review</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: REVIEW & CONFIRM LAUNCH */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <div className="space-y-5">
              {/* Confirmation Success State */}
              {launchButtonState === 'confirmed' && confirmedCollection && (
                <div className="p-5 rounded-xl bg-[#0e1612] border border-emerald-500/50 space-y-4">
                  <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
                    <CheckCircle2 size={18} />
                    <span>Collection Successfully Deployed on Algorand Testnet!</span>
                  </div>

                  <p className="text-xs text-[#a7f3d0] leading-relaxed">
                    Your collection <strong>{confirmedCollection.name}</strong> ({confirmedCollection.symbol}) is live on-chain. Algorand ASA parameters are initialized and ready for minting.
                  </p>

                  <div className="p-3 rounded-lg bg-[#070b09] border border-emerald-950 text-xs font-mono-code space-y-1.5 text-[#8e97a8]">
                    <div className="flex justify-between">
                      <span>Contract Address:</span>
                      <span className="text-white truncate max-w-[200px]">
                        {confirmedCollection.contractAddress}
                      </span>
                    </div>
                    {confirmedTxSignature && (
                      <div className="flex justify-between items-center">
                        <span>Algorand Tx ID:</span>
                        <a
                          href={`https://testnet.explorer.perawallet.app/tx/${confirmedTxSignature}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#ff8c4d] hover:underline flex items-center gap-1"
                        >
                          <span className="truncate max-w-[150px]">{confirmedTxSignature.slice(0, 16)}...</span>
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => onNavigate(`collection/${confirmedCollection.id}`)}
                      className="flex-1 py-3 px-5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                    >
                      <Eye size={14} />
                      <span>View Collection Page</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigate('explore')}
                      className="py-3 px-5 rounded-lg bg-[#141822] hover:bg-[#1a202c] border border-[#212634] text-white font-semibold text-xs transition-colors flex items-center justify-center min-h-[44px]"
                    >
                      Explore Marketplace
                    </button>
                  </div>
                </div>
              )}

              {/* Review Manifest Sheet */}
              {launchButtonState !== 'confirmed' && (
                <div className="bg-[#11141b] border border-[#212634] p-4 sm:p-5 rounded-xl space-y-5">
                  <div className="flex items-center justify-between pb-2 border-b border-[#1b202c]">
                    <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono-code flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-[#ff5500]" />
                      Final Review Before Launch
                    </h3>
                    <span className="text-[11px] text-[#8e97a8] font-mono-code">Step 4 of 4</span>
                  </div>

                  {/* Section A: Identity Summary */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">1. Identity & Media</span>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="text-[11px] font-bold text-[#ff8c4d] hover:underline"
                      >
                        Edit Details
                      </button>
                    </div>

                    <div className="p-3 rounded-lg bg-[#0d1016] border border-[#1b212d] flex items-center gap-3">
                      {image ? (
                        <img
                          src={image}
                          alt={name}
                          className="w-14 h-14 rounded-lg object-cover border border-[#2b3345] shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-[#181d28] flex items-center justify-center text-xs text-[#8e97a8]">
                          No Media
                        </div>
                      )}
                      <div className="min-w-0 flex-1 space-y-0.5 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-white truncate">
                          <span className="truncate">{name || 'Untitled'}</span>
                          <span className="text-[10px] font-mono-code text-[#ff8c4d] px-1.5 py-0.2 rounded bg-[#1c2230]">
                            {symbol || 'MINT'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8e97a8] line-clamp-2">
                          {description || 'No description provided.'}
                        </p>
                        <div className="text-[10px] text-[#6b7280] font-mono-code capitalize">
                          Category: {category}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section B: Economics Summary */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">2. Economics & Schedule</span>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="text-[11px] font-bold text-[#ff8c4d] hover:underline"
                      >
                        Edit Config
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono-code">
                      <div className="p-2.5 rounded-lg bg-[#0d1016] border border-[#1b212d]">
                        <span className="text-[10px] text-[#8e97a8] block">TOTAL SUPPLY</span>
                        <span className="text-white font-bold text-sm">{totalSupply}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#0d1016] border border-[#1b212d]">
                        <span className="text-[10px] text-[#8e97a8] block">MINT PRICE</span>
                        <span className="text-white font-bold text-sm">{mintPrice} {currency}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#0d1016] border border-[#1b212d]">
                        <span className="text-[10px] text-[#8e97a8] block">ROYALTY FEE</span>
                        <span className="text-white font-bold text-sm">{royaltyFee}%</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#0d1016] border border-[#1b212d]">
                        <span className="text-[10px] text-[#8e97a8] block">WALLET LIMIT</span>
                        <span className="text-white font-bold text-sm">
                          {hasWalletLimit ? `${walletMintLimit} max` : 'Unlimited'}
                        </span>
                      </div>
                    </div>

                    {isScheduled && (
                      <div className="p-2.5 rounded-lg bg-[#0d1016] border border-[#1b212d] text-[11px] font-mono-code text-[#8e97a8] flex items-center gap-2">
                        <Clock size={12} className="text-[#ff5500]" />
                        <span>Scheduled: {new Date(mintStartTime).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Section C: Fee Breakdown Summary */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">3. Cost Schedule</span>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="text-[11px] font-bold text-[#ff8c4d] hover:underline"
                      >
                        Inspect Fees
                      </button>
                    </div>

                    <div className="p-3 rounded-lg bg-[#0d1016] border border-[#1b212d] space-y-1.5 text-xs font-mono-code">
                      <div className="flex justify-between text-[#8e97a8]">
                        <span>Collection creation:</span>
                        <span className="text-white">{creationFee.toFixed(2)} ALGO</span>
                      </div>
                      <div className="flex justify-between text-[#8e97a8]">
                        <span>Platform fee:</span>
                        <span className="text-white">0.00 ALGO ({platformFeePct}% at mint)</span>
                      </div>
                      <div className="flex justify-between text-[#8e97a8]">
                        <span>Estimated network fee:</span>
                        <span className="text-white">~{estimatedNetworkFee.toFixed(3)} ALGO</span>
                      </div>
                      <div className="border-t border-dashed border-[#232938] pt-1.5 flex justify-between text-sm font-bold">
                        <span className="text-white">Estimated total:</span>
                        <span className="text-[#ff5500]">~{estimatedTotalCost.toFixed(3)} ALGO</span>
                      </div>
                    </div>
                  </div>

                  {/* Security Architecture Component (Future scam guardrails boundary) */}
                  <LaunchSecurityNotice
                    user={user}
                    creatorAddress={publicKey}
                    royaltyFee={numRoyalty}
                    walletMintLimit={hasWalletLimit ? numWalletLimit : undefined}
                    step="review"
                  />

                  {/* Wallet Connection Status */}
                  <div className="p-3 rounded-lg bg-[#0d1016] border border-[#1b212d] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Wallet size={14} className="text-[#ff5500]" />
                      <span className="text-[#8e97a8]">Signing Wallet:</span>
                      <span className="font-mono-code text-white">
                        {publicKey ? `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}` : 'Not Connected'}
                      </span>
                    </div>
                    {connected && (
                      <span className="font-mono-code text-emerald-400 font-semibold">
                        Balance: {balance.toFixed(4)} ALGO
                      </span>
                    )}
                  </div>

                  {/* Step 4 Actions & Launch Button with 7 Explicit States */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        disabled={launchButtonState === 'preparing' || launchButtonState === 'awaiting_wallet' || launchButtonState === 'processing'}
                        onClick={() => setCurrentStep(3)}
                        className="py-3.5 px-5 rounded-xl bg-[#141822] hover:bg-[#1a202c] border border-[#212634] text-white font-semibold text-xs transition-colors flex items-center gap-1.5 min-h-[50px]"
                      >
                        <ArrowLeft size={14} />
                        <span>Back</span>
                      </button>

                      {/* Explicit Launch Button State Render */}
                      <button
                        type="button"
                        onClick={handleLaunchCollection}
                        disabled={
                          !isStep1Valid ||
                          !isStep2Valid ||
                          launchButtonState === 'preparing' ||
                          launchButtonState === 'awaiting_wallet' ||
                          launchButtonState === 'processing'
                        }
                        className={`flex-1 py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 min-h-[50px] ${
                          launchButtonState === 'preparing' || launchButtonState === 'awaiting_wallet' || launchButtonState === 'processing'
                            ? 'bg-[#e64d00] text-white cursor-wait'
                            : launchButtonState === 'failed'
                            ? 'bg-red-700 hover:bg-red-600 text-white'
                            : !isStep1Valid || !isStep2Valid
                            ? 'bg-[#232a3b] text-[#6b7280] cursor-not-allowed'
                            : 'bg-[#ff5500] hover:bg-[#e64d00] text-white active:scale-98'
                        }`}
                      >
                        {/* 1. Disabled */}
                        {(!isStep1Valid || !isStep2Valid) && (
                          <>
                            <AlertCircle size={15} />
                            <span>Disabled — Incomplete Required Fields</span>
                          </>
                        )}

                        {/* 2. Ready */}
                        {isStep1Valid && isStep2Valid && launchButtonState === 'ready' && (
                          <>
                            <Sparkles size={16} />
                            <span>Launch Collection ({creationFee} ALGO)</span>
                          </>
                        )}

                        {/* 3. Preparing */}
                        {launchButtonState === 'preparing' && (
                          <>
                            <RefreshCw size={15} className="animate-spin" />
                            <span>Preparing Transaction & Metadata...</span>
                          </>
                        )}

                        {/* 4. Awaiting Wallet Confirmation */}
                        {launchButtonState === 'awaiting_wallet' && (
                          <>
                            <Wallet size={15} className="animate-pulse" />
                            <span>Awaiting Wallet Approval in Pera/Defly...</span>
                          </>
                        )}

                        {/* 5. Processing */}
                        {launchButtonState === 'processing' && (
                          <>
                            <RefreshCw size={15} className="animate-spin" />
                            <span>Processing Algorand Testnet Confirmation...</span>
                          </>
                        )}

                        {/* 6. Failed */}
                        {launchButtonState === 'failed' && (
                          <>
                            <RefreshCw size={15} />
                            <span>Retry Collection Launch</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Explanatory note under button */}
                    <p className="text-[11px] text-[#6b7280] text-center">
                      Deployment triggers an on-chain transaction to register ASA smart contract parameters on Algorand Testnet.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Live Discovery Preview & Protocol Guarantees */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
          <div className="flex items-center justify-between text-xs font-mono-code text-[#8e97a8]">
            <span className="flex items-center gap-1.5">
              <Eye size={13} className="text-[#ff5500]" />
              LIVE DISCOVERY CARD PREVIEW
            </span>
            <span className="text-[10px] text-[#6b7280]">Marketplace Simulation</span>
          </div>

          {/* Render real CollectionCard using current live state */}
          <CollectionCard
            collection={previewCollection}
            onSelect={() => {}}
          />

          {/* Quick Context Card */}
          <div className="p-4 rounded-xl bg-[#11141b] border border-[#212634] space-y-2.5 text-xs text-[#8e97a8]">
            <div className="flex items-center gap-2 text-white font-bold">
              <Shield size={14} className="text-[#ff5500]" />
              <span>Testnet Protocol Guarantees</span>
            </div>
            <ul className="space-y-1.5 text-[11px] leading-relaxed">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>Zero upfront platform charge — only 0.05 ALGO deploy and ~0.012 ALGO network fees.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>Primary minting opens immediately upon transaction confirmation.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>Creator royalties ({royaltyFee}%) hard-coded into secondary trading escrow.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
