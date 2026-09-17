import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, ExternalLink, Globe, Twitter, MessageSquare, Layers, ShieldCheck, Tag, Gavel, Bot } from 'lucide-react';
import { NFTCollection, NFT } from '../types';
import { NFTCard } from '../components/NFTCard';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { api } from '../lib/api';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';

interface CollectionDetailViewProps {
  collectionId: string;
  onBack: () => void;
  onSelectNft: (nft: NFT) => void;
  onQuickBuy: (nft: NFT) => void;
  onQuickBid: (nft: NFT) => void;
  onNavigate?: (path: string) => void;
}

export const CollectionDetailView: React.FC<CollectionDetailViewProps> = ({
  collectionId,
  onBack,
  onSelectNft,
  onQuickBuy,
  onQuickBid,
  onNavigate
}) => {
  const { user, setShowAuthModal } = useAuth();
  const { connected, balance, sendSolTransaction, connect } = useWallet();

  const [collection, setCollection] = useState<NFTCollection | null>(null);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);

  // Minting
  const [mintQuantity, setMintQuantity] = useState(1);
  const [minting, setMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState<NFT | null>(null);

  const loadData = async () => {
    try {
      const res = await api.getCollection(collectionId);
      setCollection(res.collection);
      setNfts(res.nfts);
    } catch (err) {
      console.error('Failed to load collection:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [collectionId]);

  if (loading) {
    return (
      <div className="py-24 text-center text-xs font-mono-code text-[#8e97a8]">
        Loading collection details & Solana token metadata...
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="py-24 text-center space-y-3">
        <p className="text-white font-bold">Collection not found.</p>
        <button onClick={onBack} className="px-4 py-2 rounded-lg bg-[#181d28] text-xs text-white">
          Back
        </button>
      </div>
    );
  }

  const isSoldOut = collection.mintedSupply >= collection.totalSupply;
  const percentMinted = Math.min(100, Math.round((collection.mintedSupply / collection.totalSupply) * 100));

  const handleMint = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setMinting(true);
    try {
      if (!connected) {
        await connect();
      }

      const totalCost = Number((collection.mintPrice * mintQuantity).toFixed(3));
      // Real Solana transaction transfer to creator address or treasury
      const txRes = await sendSolTransaction(
        collection.creatorAddress || 'ACEp1aTfX7h8Kq3w9uV4y2z5L1m6NoP8qRsTuVwXyZ',
        totalCost,
        `Mint ${mintQuantity}x ${collection.name}`
      );

      // Perform on-chain contract mint call on protocol backend
      const res = await api.mintNft({
        collectionId: collection.id,
        txSignature: txRes.signature
      });

      setMintSuccess(res.nft);
      loadData();
    } catch (err) {
      console.error('Mint failed:', err);
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-left">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-[#8e97a8] hover:text-white transition-colors"
      >
        <ArrowLeft size={14} />
        <span>Back to Collections</span>
      </button>

      {/* Banner & Header */}
      <div className="relative rounded-2xl overflow-hidden bg-[#0c0f15] border border-[#212634]">
        {/* Banner */}
        <div className="h-44 sm:h-64 w-full bg-[#0a0c10] relative">
          {collection.banner ? (
            <img src={collection.banner} alt={collection.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-[#ff5500]/20 to-[#1e2433]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0f15] via-transparent to-transparent" />
        </div>

        {/* Content Bar */}
        <div className="px-5 pb-5 -mt-16 sm:-mt-20 relative flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            <img
              src={collection.image}
              alt={collection.name}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-[#0c0f15] shadow-2xl bg-black"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-display font-extrabold text-white">
                  {collection.name}
                </h1>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono-code text-[#8e97a8] mt-1">
                <span>By @{collection.creatorUsername}</span>
                <span>•</span>
                <span className="text-[#ff5500]">{collection.symbol}</span>
                <span>•</span>
                <span>{collection.totalSupply} Items</span>
              </div>
            </div>
          </div>

          {/* Socials & Contract */}
          <div className="flex items-center gap-2">
            {collection.socialLinks?.twitter && (
              <a
                href={collection.socialLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-[#141822] hover:bg-[#1b212e] border border-[#212634] text-white transition-colors"
                title="Twitter / X"
              >
                <Twitter size={15} />
              </a>
            )}
            {collection.socialLinks?.discord && (
              <a
                href={collection.socialLinks.discord}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-[#141822] hover:bg-[#1b212e] border border-[#212634] text-white transition-colors"
                title="Discord"
              >
                <MessageSquare size={15} />
              </a>
            )}
            {collection.socialLinks?.website && (
              <a
                href={collection.socialLinks.website}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-[#141822] hover:bg-[#1b212e] border border-[#212634] text-white transition-colors"
                title="Website"
              >
                <Globe size={15} />
              </a>
            )}
            {onNavigate && (
              <button
                onClick={() => onNavigate(`mintbot:Analyze ${collection.name} collection floor and stats`)}
                className="px-3 py-2 rounded-lg bg-[#141822] hover:bg-[#1b212e] border border-[#212634] text-xs font-mono-code text-[#ff5500] hover:text-white transition-colors flex items-center gap-1.5"
                title="Research Collection on MintBot"
              >
                <Bot size={13} />
                <span>MintBot Intel</span>
              </button>
            )}
            <a
              href={`https://explorer.solana.com/address/${collection.contractAddress}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-lg bg-[#141822] hover:bg-[#1b212e] border border-[#212634] text-xs font-mono-code text-[#ff8c4d] transition-colors flex items-center gap-1.5"
            >
              <span>Solana Contract</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      {/* Stats Bar & Mint Box Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Stats & Description */}
        <div className="lg:col-span-8 space-y-4">
          <p className="text-xs sm:text-sm text-[#9ca3af] leading-relaxed">
            {collection.description}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-[#11141a] border border-[#212634]">
            <div>
              <div className="text-[10px] font-mono-code text-[#6b7280]">FLOOR PRICE</div>
              <div className="text-sm sm:text-base font-mono-code font-bold text-[#ff5500]">
                {collection.floorPrice || collection.mintPrice} SOL
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono-code text-[#6b7280]">TOTAL VOLUME</div>
              <div className="text-sm sm:text-base font-mono-code font-bold text-white">
                {collection.totalVolume || 0} SOL
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono-code text-[#6b7280]">MINTED / TOTAL</div>
              <div className="text-sm sm:text-base font-mono-code font-bold text-white">
                {collection.mintedSupply} / {collection.totalSupply}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono-code text-[#6b7280]">ROYALTY</div>
              <div className="text-sm sm:text-base font-mono-code font-bold text-emerald-400">
                {collection.royaltyFee}%
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Minting Box */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-[#11141b] border border-[#232837] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono-code font-bold uppercase text-white flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#ff5500]" />
              {isSoldOut ? 'Mint Concluded' : 'Live Primary Mint'}
            </span>
            <span className="text-xs font-mono-code text-[#ff5500] font-bold">{percentMinted}%</span>
          </div>

          <div className="w-full h-2 bg-[#1a202c] rounded-full overflow-hidden">
            <div className="h-full bg-[#ff5500]" style={{ width: `${percentMinted}%` }} />
          </div>

          {!isSoldOut && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8e97a8]">Price per item:</span>
                <span className="font-mono-code font-bold text-white">{collection.mintPrice} SOL</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8e97a8]">Wallet limit:</span>
                <span className="font-mono-code text-white">{collection.walletMintLimit || 3} items</span>
              </div>

              <button
                onClick={handleMint}
                disabled={minting}
                className="w-full py-3 rounded-xl bg-[#ff5500] hover:bg-[#e64d00] disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-[#ff5500]/25 flex items-center justify-center gap-2"
              >
                <Sparkles size={15} />
                <span>{minting ? 'Minting On Solana...' : `Mint 1 NFT for ${collection.mintPrice} SOL`}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mint Success Banner */}
      {mintSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={mintSuccess.image} alt={mintSuccess.name} className="w-12 h-12 rounded-lg object-cover" />
            <div>
              <div className="text-xs font-bold text-emerald-400">Successfully Minted!</div>
              <div className="text-sm font-bold text-white">{mintSuccess.name}</div>
            </div>
          </div>
          <button
            onClick={() => onSelectNft(mintSuccess)}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold"
          >
            View NFT
          </button>
        </div>
      )}

      {/* NFTs in this collection */}
      <div className="space-y-4 pt-4 border-t border-[#1b202c]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-white">
            Collection Artifacts ({nfts.length})
          </h2>
        </div>

        {nfts.length === 0 ? (
          <div className="py-12 text-center text-xs font-mono-code text-[#6b7280]">
            No tokens minted in this collection yet. Be the genesis minter above!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {nfts.map(nft => (
              <NFTCard
                key={nft.id}
                nft={nft}
                onSelect={onSelectNft}
                onQuickBuy={onQuickBuy}
                onQuickBid={onQuickBid}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
