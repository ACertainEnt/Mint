export type UserRole = 'admin' | 'creator' | 'collector';

export interface UserEntitlement {
  tier: 'free' | 'pro' | 'unlimited';
  bot_unlimited: boolean;
  max_hourly_queries?: number;
}

export interface User {
  id: string;
  email?: string;
  username: string;
  displayName: string;
  avatar: string;
  banner?: string;
  bio?: string;
  walletAddress?: string;
  role: UserRole;
  isVerified: boolean;
  plan?: 'free' | 'pro' | 'unlimited' | 'enterprise';
  bot_unlimited?: boolean;
  bot_usage_limit?: number;
  entitlement?: UserEntitlement;
  socialLinks?: {
    website?: string;
    twitter?: string;
    discord?: string;
    telegram?: string;
  };
  createdAt: string;
  profileCompleted: boolean;
}

export interface NFTCollection {
  id: string;
  creatorId: string;
  creatorAddress: string;
  creatorUsername: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  banner: string;
  totalSupply: number;
  mintedSupply: number;
  mintPrice: number; // SOL
  royaltyFee: number; // percentage, e.g. 5
  contractAddress: string;
  isVerified: boolean;
  socialLinks?: {
    website?: string;
    twitter?: string;
    discord?: string;
    telegram?: string;
  };
  floorPrice: number;
  totalVolume: number;
  listedCount: number;
  createdAt: string;
  isLive: boolean;
  category?: string;
  currency?: string; // 'SOL' | 'USDC'
  mintStartTime?: string;
  mintEndTime?: string;
  walletMintLimit?: number;
  deployTxSignature?: string;
}

export interface NFTTrait {
  trait_type: string;
  value: string;
  rarity?: number;
}

export interface NFT {
  id: string;
  collectionId: string;
  collectionName: string;
  collectionSymbol: string;
  name: string;
  description: string;
  image: string;
  tokenAddress: string;
  contractAddress?: string;
  tokenId?: string;
  creatorId: string;
  creatorName: string;
  creatorUsername: string;
  creatorAvatar: string;
  creatorVerified: boolean;
  ownerId: string;
  ownerAddress: string;
  ownerUsername?: string;
  isListed: boolean;
  price?: number; // SOL
  isInAuction: boolean;
  auctionId?: string;
  traits: NFTTrait[];
  createdAt: string;
  lastSalePrice?: number;
  views: number;
  likes: number;
  blockchain: 'Solana';
}

export interface AuctionBid {
  id: string;
  bidderId: string;
  bidderUsername: string;
  bidderAddress: string;
  bidderAvatar?: string;
  amount: number;
  timestamp: string;
  txSignature?: string;
}

export interface Auction {
  id: string;
  customTitle: string; // The creator can set any original title, e.g. "The Great Ent Auction"
  nftId: string;
  nft: NFT;
  creatorId: string;
  creatorName: string;
  creatorUsername: string;
  creatorAvatar: string;
  creatorVerified: boolean;
  startingPrice: number; // SOL
  reservePrice?: number;
  buyNowPrice?: number;
  currency: 'SOL';
  startTime: string;
  endTime: string;
  minBidIncrement: number; // e.g. 0.05 SOL
  currentBid: number;
  currentBidderId?: string;
  currentBidderUsername?: string;
  currentBidderAddress?: string;
  bidCount: number;
  status: 'active' | 'settled' | 'cancelled' | 'expired';
  bids: AuctionBid[];
  winnerId?: string;
  winnerAddress?: string;
  description?: string;
  settledAt?: string;
  txSignature?: string;
}

export type BountyCategory = 
  | 'Art Commission'
  | '3D & Generative'
  | 'Collection Lore'
  | 'Trait Design'
  | 'UI / Creative'
  | 'Marketing';

export type BountyStatus = 
  | 'open'
  | 'in_progress'
  | 'submitted'
  | 'completed'
  | 'cancelled'
  | 'expired';

export interface BountySubmission {
  id: string;
  submitterId: string;
  submitterUsername: string;
  submitterAddress: string;
  submitterAvatar: string;
  notes: string;
  previewUrl: string;
  submittedAt: string;
  status: 'pending' | 'accepted' | 'rejected';
  payoutTxSignature?: string;
}

export interface Bounty {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName: string;
  creatorUsername: string;
  creatorAvatar: string;
  creatorVerified: boolean;
  reward: number; // SOL
  currency: 'SOL';
  deadline: string;
  category: BountyCategory;
  requirements: string[];
  status: BountyStatus;
  submissions: BountySubmission[];
  winnerId?: string;
  winnerAddress?: string;
  createdAt: string;
}

export type ActivityEventType =
  | 'mint'
  | 'sale'
  | 'listing'
  | 'delisting'
  | 'bid'
  | 'auction_created'
  | 'auction_settled'
  | 'collection_created'
  | 'bounty_created'
  | 'bounty_completed';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  nftId?: string;
  nftName?: string;
  nftImage?: string;
  collectionId?: string;
  collectionName?: string;
  fromAddress?: string;
  fromUsername?: string;
  toAddress?: string;
  toUsername?: string;
  price?: number;
  txSignature?: string;
  timestamp: string;
}

export interface LikeRecord {
  id: string;
  userId: string;
  targetType: 'nft' | 'collection' | 'auction' | 'post' | 'bounty';
  targetId: string;
  createdAt: string;
}

export interface FollowRecord {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface CommunityMember {
  id: string;
  communityId: string;
  userId: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
    role: UserRole;
  };
  communityRole: 'owner' | 'moderator' | 'member';
  joinedAt: string;
}

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatar: string;
  banner?: string;
  creatorId: string;
  creatorUsername: string;
  memberCount: number;
  postCount: number;
  isVerified?: boolean;
  category: string;
  collectionId?: string;
  createdAt: string;
  rules?: string[];
  isJoined?: boolean;
  userRoleInCommunity?: 'owner' | 'moderator' | 'member' | null;
  socialLinks?: {
    website?: string;
    twitter?: string;
    discord?: string;
    telegram?: string;
  };
}

export interface CommunityPost {
  id: string;
  communityId?: string;
  communityName?: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar: string;
  authorVerified?: boolean;
  content: string;
  mediaUrl?: string;
  nftId?: string;
  nft?: NFT;
  likes: number;
  commentCount: number;
  createdAt: string;
  likedByMe?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'like' | 'follow' | 'sale' | 'bid' | 'outbid' | 'auction_won' | 'bounty_submission' | 'bounty_completed' | 'system';
  read: boolean;
  link?: string;
  timestamp: string;
  actorId?: string;
  actorUsername?: string;
  actorAvatar?: string;
  targetType?: 'nft' | 'collection' | 'auction' | 'post' | 'bounty';
  targetId?: string;
}

export interface MintBotConfig {
  freeHourlyLimit: number;
  proHourlyLimit: number;
  enableExternalIndexer: boolean;
  indexerProviderName?: string;
  defaultNetwork: string;
}

export interface VerificationRuleConfig {
  minAccountAgeDays: number;
  minCreatedNfts: number;
  minSolVolume: number;
  maxVerifiedCommunitiesPerUser: number;
  adminMultiCommunityAllowed: boolean;
  cooldownDays: number;
}

export type VerificationStatus =
  | 'not_eligible'
  | 'eligible'
  | 'request_available'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'cooldown';

export interface VerificationRequest {
  id: string;
  userId: string;
  username: string;
  userDisplayName: string;
  userAvatar: string;
  entityType: 'user' | 'community';
  communityId?: string;
  communityName?: string;
  status: 'under_review' | 'approved' | 'rejected';
  justification?: string;
  portfolioUrl?: string;
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface StoredAccount {
  token: string;
  user: User;
  lastActive: string;
}

export interface LaunchPlatformConfig {
  collectionCreationFeeSol: number;
  estimatedNetworkFeeSol: number;
  minSupply: number;
  maxSupply: number;
  minMintPriceSol: number;
  maxMintPriceSol: number;
  maxRoyaltyPercent: number;
  defaultWalletLimit: number;
  maxWalletLimit: number;
  allowedCurrencies: string[];
}

export interface PlatformConfig {
  marketplaceFeePercent: number; // 1.5%
  auctionFeePercent: number;     // 2.0%
  mintFeePercent: number;        // 1.0%
  treasuryAddress: string;
  network: 'devnet' | 'mainnet-beta';
  rpcEndpoint: string;
  mintBotConfig?: MintBotConfig;
  launchConfig?: LaunchPlatformConfig;
  verificationConfig?: VerificationRuleConfig;
  maxBioLength?: number;
  maxAccountsPerDevice?: number;
}

export type PlatformSettings = PlatformConfig;

export interface MintBotDataSource {
  name: string;
  type: 'mint_db' | 'solana_rpc' | 'indexing_provider' | 'grounded_rules';
  status: 'verified' | 'unavailable' | 'rpc_live';
  details?: string;
}

export interface MintBotWalletData {
  address: string;
  solBalance: number;
  isRegisteredUser: boolean;
  username?: string;
  rpcNetwork: string;
  recentSignatures: string[];
  ownedNftsCount?: number;
  createdNftsCount?: number;
}

export interface MintBotCollectionStats {
  collection: NFTCollection;
  floorPrice: number;
  listedCount: number;
  totalVolume: number;
  mintProgressPercent: number;
  activeAuctionsCount: number;
  highestSale?: number;
}

export interface MintBotStructuredData {
  nfts?: NFT[];
  collections?: NFTCollection[];
  auctions?: Auction[];
  bounties?: Bounty[];
  wallet?: MintBotWalletData;
  collectionStats?: MintBotCollectionStats;
  platformHelp?: {
    topic: string;
    summary: string;
    rules: string[];
    actionLink?: string;
  };
}

export interface MintBotUsage {
  tier: 'free' | 'pro' | 'unlimited';
  usedThisHour: number;
  limit: number | string;
  remaining: number | string;
  resetInMinutes: number;
  isUnlimited?: boolean;
}

export interface MintBotQueryResponse {
  query: string;
  intent: 'nft_lookup' | 'collection_lookup' | 'wallet_lookup' | 'marketplace_search' | 'auction_search' | 'platform_help' | 'general';
  textAnswer: string;
  dataSources: MintBotDataSource[];
  structuredData?: MintBotStructuredData;
  usage: MintBotUsage;
  unverifiedWarning?: string;
}

export interface MintBotSuggestionGroup {
  category: string;
  queries: string[];
}

export type TxStep = 
  | 'idle'
  | 'preparing'
  | 'awaiting_wallet'
  | 'submitting'
  | 'confirming'
  | 'confirmed'
  | 'failed';

export interface TxStatus {
  step: TxStep;
  title: string;
  message?: string;
  txSignature?: string;
  error?: string;
}
