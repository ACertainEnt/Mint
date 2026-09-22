import React, { useState, useEffect } from 'react';
import { ArrowLeft, Share2, Check } from 'lucide-react';
import { User, NFT, NFTCollection } from '../types';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { NFTCard } from '../components/NFTCard';
import { CollectionCard } from '../components/CollectionCard';
import { EditProfileModal } from '../components/EditProfileModal';
import { useAuth } from '../context/AuthContext';
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
  const { user: authUser } = useAuth();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [collections, setCollections] = useState<NFTCollection[]>([]);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'collections' | 'items'>('collections');
  const [copiedShare, setCopiedShare] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

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

  useEffect(() => {
    load();
  }, [username]);

  const handleShareProfile = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const isOwnProfile =
    authUser &&
    profileUser &&
    (authUser.id === profileUser.id ||
      authUser.username?.toLowerCase() === profileUser.username?.toLowerCase());

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
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg border border-[#2d3748] bg-transparent text-xs text-white hover:bg-white/5 cursor-pointer"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="w-full text-left">
      {/* Top back navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-[#8e97a8] hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>
      </div>

      {/* 1. Full-width Edge-to-Edge Banner (Clickable to edit profile if own profile) */}
      <div
        onClick={() => {
          if (isOwnProfile) setShowEditProfileModal(true);
        }}
        className={`w-full h-44 sm:h-64 bg-[#0a0c10] relative overflow-hidden ${
          isOwnProfile ? 'cursor-pointer group' : ''
        }`}
        title={isOwnProfile ? 'Click banner to edit profile' : undefined}
      >
        {profileUser.banner ? (
          <img
            src={profileUser.banner}
            alt={profileUser.displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-[#ff5500]/25 via-[#1a1f2c] to-[#0c0e14]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-transparent to-transparent opacity-80" />
        {isOwnProfile && (
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20 text-white text-xs font-semibold">
            Edit Banner & Profile
          </div>
        )}
      </div>

      {/* 2. Profile Details Native Placement */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-6 space-y-4">
        <div className="relative -mt-14 sm:-mt-20 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
          {/* Avatar overlapping bottom-left directly on background */}
          <div className="flex items-end gap-4 flex-wrap sm:flex-nowrap min-w-0">
            <img
              src={profileUser.avatar}
              alt={profileUser.displayName}
              onClick={() => {
                if (isOwnProfile) setShowEditProfileModal(true);
              }}
              className={`w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover border-4 border-[#0d0d0d] shadow-2xl bg-black shrink-0 ${
                isOwnProfile ? 'cursor-pointer' : ''
              }`}
              title={isOwnProfile ? 'Click avatar to edit profile' : undefined}
            />
            <div className="mb-1 min-w-0 flex-1">
              <h1 className="text-xl sm:text-3xl font-display font-black text-white break-words">
                {profileUser.displayName}
              </h1>
              <div className="flex items-center gap-2 text-xs font-mono-code text-[#8e97a8] mt-1 flex-wrap">
                <span className="flex items-center gap-1 text-[#ff5500] font-bold">
                  @{profileUser.username}
                  {profileUser.isVerified && <VerifiedBadge size="sm" />}
                </span>
                <span>•</span>
                <span className="break-all text-[#8e97a8]">
                  {profileUser.walletAddress
                    ? profileUser.walletAddress.length >= 12
                      ? `${profileUser.walletAddress.slice(0, 6)}...${profileUser.walletAddress.slice(-6)}`
                      : profileUser.walletAddress
                    : 'Algorand Testnet'}
                </span>
              </div>
            </div>
          </div>

          {/* Flat Action Buttons */}
          <div className="flex items-center gap-2.5 self-start md:self-end shrink-0">
            {isOwnProfile && (
              <button
                onClick={() => setShowEditProfileModal(true)}
                className="px-3.5 py-1.5 rounded-lg border border-[#2d3748] hover:border-white/40 bg-transparent text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Edit Profile
              </button>
            )}
            <button
              onClick={handleShareProfile}
              className="px-3.5 py-1.5 rounded-lg border border-[#2d3748] hover:border-white/40 bg-transparent text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedShare ? <Check size={13} className="text-emerald-400" /> : <Share2 size={13} />}
              <span>{copiedShare ? 'Copied' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* Bio Text */}
        {profileUser.bio && (
          <p className="text-xs sm:text-sm text-[#9ca3af] leading-relaxed max-w-3xl break-words whitespace-normal pt-1">
            {profileUser.bio}
          </p>
        )}
      </div>

      {/* 3. Text-Only Tabs with Simple Underline Accent */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-6 border-b border-[#212634]">
          <button
            onClick={() => setActiveTab('collections')}
            className={`py-3 px-1 text-xs sm:text-sm transition-colors cursor-pointer border-b-2 ${
              activeTab === 'collections'
                ? 'border-[#ff5500] text-white font-bold'
                : 'border-transparent text-[#8e97a8] hover:text-white font-medium'
            }`}
          >
            Collections ({collections.length})
          </button>
          <button
            onClick={() => setActiveTab('items')}
            className={`py-3 px-1 text-xs sm:text-sm transition-colors cursor-pointer border-b-2 ${
              activeTab === 'items'
                ? 'border-[#ff5500] text-white font-bold'
                : 'border-transparent text-[#8e97a8] hover:text-white font-medium'
            }`}
          >
            Created Artifacts ({nfts.length})
          </button>
        </div>

        {/* Tab Panels */}
        <div className="py-6">
          {activeTab === 'collections' &&
            (collections.length === 0 ? (
              <div className="py-16 text-center text-xs font-mono-code text-[#6b7280]">
                No collections published yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {collections.map(col => (
                  <CollectionCard key={col.id} collection={col} onSelect={onSelectCollection} />
                ))}
              </div>
            ))}

          {activeTab === 'items' &&
            (nfts.length === 0 ? (
              <div className="py-16 text-center text-xs font-mono-code text-[#6b7280]">
                No artifacts created yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {nfts.map(nft => (
                  <NFTCard key={nft.id} nft={nft} onSelect={onSelectNft} />
                ))}
              </div>
            ))}
        </div>
      </div>

      {showEditProfileModal && (
        <EditProfileModal
          isOpen={showEditProfileModal}
          onClose={() => {
            setShowEditProfileModal(false);
            load();
          }}
        />
      )}
    </div>
  );
};
