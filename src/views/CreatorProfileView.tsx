import React, { useState, useEffect } from 'react';
import { ArrowLeft, Twitter, Globe, MessageSquare, ShieldCheck, Layers, Sparkles } from 'lucide-react';
import { User, NFT, NFTCollection } from '../types';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { NFTCard } from '../components/NFTCard';
import { CollectionCard } from '../components/CollectionCard';
import { api } from '../lib/api';

interface CreatorProfileViewProps {
  username: string;
  onBack: () => void;
  onSelectNft: (nft: NFT) => void;
  onSelectCollection: (col: NFTCollection) => void;
}

export const CreatorProfileView: React.FC<CreatorProfileViewProps> = ({
  username,
  onBack,
  onSelectNft,
  onSelectCollection
}) => {
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [collections, setCollections] = useState<NFTCollection[]>([]);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'collections' | 'items'>('collections');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getUserProfile(username);
        setProfileUser(res.user);
        const [colsRes, nftsRes] = await Promise.all([
          api.getCollections({ creatorId: res.user.id }),
          api.getNfts({ creatorId: res.user.id })
        ]);
        setCollections(colsRes.collections);
        setNfts(nftsRes.nfts);
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username]);

  if (loading) {
    return (
      <div className="py-24 text-center text-xs font-mono-code text-[#8e97a8]">
        Loading profile...
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="py-24 text-center space-y-3">
        <p className="text-white font-bold">User @{username} not found.</p>
        <button onClick={onBack} className="px-4 py-2 rounded-lg bg-[#181d28] text-xs text-white">
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-left">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-[#8e97a8] hover:text-white transition-colors"
      >
        <ArrowLeft size={14} />
        <span>Back</span>
      </button>

      {/* Profile Header */}
      <div className="rounded-2xl overflow-hidden bg-[#0c0f15] border border-[#212634]">
        <div className="h-40 sm:h-52 w-full bg-[#0a0c10] relative">
          {profileUser.banner ? (
            <img src={profileUser.banner} alt={profileUser.displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-[#ff5500]/20 to-[#1e2433]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0f15] via-transparent to-transparent" />
        </div>

        <div className="px-5 pb-5 -mt-16 sm:-mt-20 relative flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            <img
              src={profileUser.avatar}
              alt={profileUser.displayName}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-[#0c0f15] shadow-2xl bg-black"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-display font-extrabold text-white">
                  {profileUser.displayName}
                </h1>
                {profileUser.isVerified && <VerifiedBadge size="md" />}
              </div>
              <div className="flex items-center gap-2 text-xs font-mono-code text-[#8e97a8] mt-1">
                <span className="text-[#ff5500]">@{profileUser.username}</span>
                <span>•</span>
                <span>{profileUser.walletAddress ? (profileUser.walletAddress.length >= 12 ? `${profileUser.walletAddress.slice(0, 6)}...${profileUser.walletAddress.slice(-6)}` : profileUser.walletAddress) : 'Solana Devnet'}</span>
              </div>
            </div>
          </div>
        </div>

        {profileUser.bio && (
          <div className="px-5 pb-5 text-xs text-[#9ca3af] max-w-2xl leading-relaxed">
            {profileUser.bio}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1f2430] pb-2">
        <button
          onClick={() => setActiveTab('collections')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'collections' ? 'bg-[#ff5500] text-white' : 'text-[#8e97a8] hover:text-white'
          }`}
        >
          Collections ({collections.length})
        </button>
        <button
          onClick={() => setActiveTab('items')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'items' ? 'bg-[#ff5500] text-white' : 'text-[#8e97a8] hover:text-white'
          }`}
        >
          Created Artifacts ({nfts.length})
        </button>
      </div>

      {activeTab === 'collections' && (
        collections.length === 0 ? (
          <div className="py-12 text-center text-xs font-mono-code text-[#6b7280]">
            No collections published yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map(col => (
              <CollectionCard key={col.id} collection={col} onSelect={onSelectCollection} />
            ))}
          </div>
        )
      )}

      {activeTab === 'items' && (
        nfts.length === 0 ? (
          <div className="py-12 text-center text-xs font-mono-code text-[#6b7280]">
            No artifacts created yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {nfts.map(nft => (
              <NFTCard key={nft.id} nft={nft} onSelect={onSelectNft} />
            ))}
          </div>
        )
      )}
    </div>
  );
};
