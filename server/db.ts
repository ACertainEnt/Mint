import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { User, NFTCollection, NFT, Auction, Bounty, ActivityEvent, Notification, PlatformConfig, LikeRecord, Community, CommunityMember, CommunityPost, PostComment, FollowRecord, VerificationRequest } from '../src/types';

export interface DatabaseSchema {
  users: User[];
  collections: NFTCollection[];
  nfts: NFT[];
  auctions: Auction[];
  bounties: Bounty[];
  activity: ActivityEvent[];
  notifications: Notification[];
  config: PlatformConfig;
  userPasswords: Record<string, string>; // userId -> bcrypt hash
  likes: LikeRecord[];
  posts: CommunityPost[];
  comments: PostComment[];
  communities: Community[];
  communityMembers: CommunityMember[];
  follows: FollowRecord[];
  verificationRequests: VerificationRequest[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getInitialDatabase(): DatabaseSchema {
  const initialPasswordHash = bcrypt.hashSync('EntSolana2026!', 10);
  const now = new Date().toISOString();

  // Platform owner user requested by user
  const adminUser: User = {
    id: 'usr_ace_admin',
    email: 'pervercy23@gmail.com',
    username: 'Ace',
    displayName: 'A Certain Ent',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=240&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1200&auto=format&fit=crop&q=80',
    bio: 'Genesis creator & protocol architect. Curator of organic geometric artifacts on Solana.',
    walletAddress: 'ACEp1aTfX7h8Kq3w9uV4y2z5L1m6NoP8qRsTuVwXyZ',
    role: 'owner',
    isVerified: true,
    plan: 'unlimited',
    bot_unlimited: true,
    entitlement: {
      tier: 'unlimited',
      bot_unlimited: true
    },
    socialLinks: {
      website: 'https://mint.solana.io',
      twitter: 'https://x.com/A_Certain_Ent',
      discord: 'https://discord.gg/solana',
      telegram: 'https://t.me/mint_solana'
    },
    createdAt: now,
    profileCompleted: true
  };

  const creatorUser2: User = {
    id: 'usr_sol_artisan',
    email: 'solartisan@solana.art',
    username: 'Kroma',
    displayName: 'Kroma Studios',
    avatar: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=240&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1200&auto=format&fit=crop&q=80',
    bio: 'Pioneering generative voxel & 3D Solana aesthetics.',
    walletAddress: 'Krom9x87Hq6tLm2P4vSw5rYz8bAcD1eFgHiJkLmNoP',
    role: 'creator',
    isVerified: false,
    socialLinks: {
      twitter: 'https://x.com/kroma_studios'
    },
    createdAt: now,
    profileCompleted: true
  };

  // Genesis Collections
  const collections: NFTCollection[] = [
    {
      id: 'col_ents_genesis',
      creatorId: adminUser.id,
      creatorAddress: adminUser.walletAddress!,
      creatorUsername: adminUser.username,
      name: 'Ents of Solana',
      symbol: 'ENTS',
      description: 'The ancient guardians of the high-throughput blockchain. 500 hand-rendered organic constructs forged in Solana orange flame and obsidian stone.',
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80',
      banner: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1200&auto=format&fit=crop&q=80',
      totalSupply: 500,
      mintedSupply: 142,
      mintPrice: 0.85,
      royaltyFee: 5,
      contractAddress: 'Ent54xZqP9kLm1VoS3w2yRt7uAbCdEfGhIjKlMnOpQr',
      isVerified: true,
      socialLinks: {
        website: 'https://mint.solana.io',
        twitter: 'https://x.com/A_Certain_Ent',
        discord: 'https://discord.gg/ents'
      },
      floorPrice: 1.45,
      totalVolume: 320.5,
      listedCount: 18,
      createdAt: now,
      isLive: true,
      walletMintLimit: 3
    },
    {
      id: 'col_chrono_glyphs',
      creatorId: creatorUser2.id,
      creatorAddress: creatorUser2.walletAddress!,
      creatorUsername: creatorUser2.username,
      name: 'Chrono Glyphs',
      symbol: 'GLYPH',
      description: 'Mathematical time shards captured at sub-second finality. Highly dense procedural artifacts for Solana collectors.',
      image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=500&auto=format&fit=crop&q=80',
      banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
      totalSupply: 250,
      mintedSupply: 89,
      mintPrice: 1.2,
      royaltyFee: 4.5,
      contractAddress: 'Glyph8uVwXyZ1aBcDeFgHiJkLmNoPqRsTuVwXyZ2',
      isVerified: true,
      socialLinks: {
        twitter: 'https://x.com/kroma_studios'
      },
      floorPrice: 2.1,
      totalVolume: 418.0,
      listedCount: 12,
      createdAt: now,
      isLive: true,
      walletMintLimit: 2
    },
    {
      id: 'col_hyper_cubes',
      creatorId: adminUser.id,
      creatorAddress: adminUser.walletAddress!,
      creatorUsername: adminUser.username,
      name: 'Hyper Cubes M',
      symbol: 'HCUBE',
      description: 'Isometric isometric geometric signatures symbolizing the MINT protocol architecture. Monochromatic obsidian and solar orange facets.',
      image: 'https://images.unsplash.com/photo-1633167606207-d840b5070fc2?w=500&auto=format&fit=crop&q=80',
      banner: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1200&auto=format&fit=crop&q=80',
      totalSupply: 100,
      mintedSupply: 48,
      mintPrice: 0.5,
      royaltyFee: 3,
      contractAddress: 'Cube77wXyZ1aBcDeFgHiJkLmNoPqRsTuVwXyZ89',
      isVerified: true,
      floorPrice: 0.95,
      totalVolume: 126.8,
      listedCount: 7,
      createdAt: now,
      isLive: true,
      walletMintLimit: 5
    }
  ];

  // Curated NFTs
  const nfts: NFT[] = [
    {
      id: 'nft_ent_001',
      collectionId: 'col_ents_genesis',
      collectionName: 'Ents of Solana',
      collectionSymbol: 'ENTS',
      name: 'Elder Ent #001 — Prime Sentinel',
      description: 'The first genesis Ent sculpted from ancient root memory and obsidian stone with an internal orange core reactor.',
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      tokenAddress: '7XqP9kLm1VoS3w2yRt7uAbCdEfGhIjKlMnOpQrStUv',
      creatorId: adminUser.id,
      creatorName: adminUser.displayName,
      creatorUsername: adminUser.username,
      creatorAvatar: adminUser.avatar,
      creatorVerified: true,
      ownerId: adminUser.id,
      ownerAddress: adminUser.walletAddress!,
      ownerUsername: adminUser.username,
      isListed: true,
      price: 2.75,
      isInAuction: false,
      traits: [
        { trait_type: 'Core', value: 'Solar Plasma', rarity: 3 },
        { trait_type: 'Material', value: 'Dark Basalt', rarity: 12 },
        { trait_type: 'Stature', value: 'Colossus', rarity: 5 },
        { trait_type: 'Era', value: 'Genesis Epoch', rarity: 1 }
      ],
      createdAt: now,
      lastSalePrice: 2.1,
      views: 842,
      likes: 124,
      blockchain: 'Solana'
    },
    {
      id: 'nft_ent_042',
      collectionId: 'col_ents_genesis',
      collectionName: 'Ents of Solana',
      collectionSymbol: 'ENTS',
      name: 'Grove Weaver #042',
      description: 'Interwoven root filaments generating kinetic energy through the Solana validator network.',
      image: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&auto=format&fit=crop&q=80',
      tokenAddress: '9Lm1VoS3w2yRt7uAbCdEfGhIjKlMnOpQrStUvWxYz',
      creatorId: adminUser.id,
      creatorName: adminUser.displayName,
      creatorUsername: adminUser.username,
      creatorAvatar: adminUser.avatar,
      creatorVerified: true,
      ownerId: adminUser.id,
      ownerAddress: adminUser.walletAddress!,
      ownerUsername: adminUser.username,
      isListed: false,
      price: undefined,
      isInAuction: true,
      auctionId: 'auc_the_great_ent',
      traits: [
        { trait_type: 'Core', value: 'Ember Weaver', rarity: 7 },
        { trait_type: 'Armor', value: 'Petrified Oak', rarity: 18 },
        { trait_type: 'Affinity', value: 'Kinetic', rarity: 9 }
      ],
      createdAt: now,
      views: 1290,
      likes: 218,
      blockchain: 'Solana'
    },
    {
      id: 'nft_glyph_108',
      collectionId: 'col_chrono_glyphs',
      collectionName: 'Chrono Glyphs',
      collectionSymbol: 'GLYPH',
      name: 'Chrono Glyph #108 — Apex Horizon',
      description: 'A harmonic temporal prism resonating at 400 millisecond slot intervals.',
      image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=80',
      tokenAddress: '4VoS3w2yRt7uAbCdEfGhIjKlMnOpQrStUvWxYz12',
      creatorId: creatorUser2.id,
      creatorName: creatorUser2.displayName,
      creatorUsername: creatorUser2.username,
      creatorAvatar: creatorUser2.avatar,
      creatorVerified: true,
      ownerId: creatorUser2.id,
      ownerAddress: creatorUser2.walletAddress!,
      ownerUsername: creatorUser2.username,
      isListed: true,
      price: 3.4,
      isInAuction: false,
      traits: [
        { trait_type: 'Frequency', value: '400ms', rarity: 4 },
        { trait_type: 'Prism', value: 'Refractive Amber', rarity: 6 },
        { trait_type: 'Harmonic', value: 'Octave 8', rarity: 11 }
      ],
      createdAt: now,
      lastSalePrice: 2.8,
      views: 612,
      likes: 89,
      blockchain: 'Solana'
    },
    {
      id: 'nft_cube_007',
      collectionId: 'col_hyper_cubes',
      collectionName: 'Hyper Cubes M',
      collectionSymbol: 'HCUBE',
      name: 'Isometric M #007',
      description: 'Official isometric brand emblem minted on Solana devnet. Pure geometric orange structure.',
      image: 'https://images.unsplash.com/photo-1633167606207-d840b5070fc2?w=800&auto=format&fit=crop&q=80',
      tokenAddress: '2w2yRt7uAbCdEfGhIjKlMnOpQrStUvWxYz123456',
      creatorId: adminUser.id,
      creatorName: adminUser.displayName,
      creatorUsername: adminUser.username,
      creatorAvatar: adminUser.avatar,
      creatorVerified: true,
      ownerId: adminUser.id,
      ownerAddress: adminUser.walletAddress!,
      ownerUsername: adminUser.username,
      isListed: true,
      price: 1.15,
      isInAuction: false,
      traits: [
        { trait_type: 'Shape', value: 'Isometric Hexagon M', rarity: 2 },
        { trait_type: 'Facet Color', value: 'Cadmium Orange', rarity: 8 },
        { trait_type: 'Shadow', value: 'Obsidian Matte', rarity: 15 }
      ],
      createdAt: now,
      views: 450,
      likes: 92,
      blockchain: 'Solana'
    }
  ];

  // Custom titled live auction as specifically requested in prompt:
  // "The Great Ent Auction"
  const auctions: Auction[] = [
    {
      id: 'auc_the_great_ent',
      customTitle: 'The Great Ent Auction',
      nftId: 'nft_ent_042',
      nft: nfts[1],
      creatorId: adminUser.id,
      creatorName: adminUser.displayName,
      creatorUsername: adminUser.username,
      creatorAvatar: adminUser.avatar,
      creatorVerified: true,
      startingPrice: 1.5,
      reservePrice: 2.5,
      buyNowPrice: 5.0,
      currency: 'SOL',
      startTime: now,
      endTime: new Date(Date.now() + 1000 * 60 * 60 * 46).toISOString(), // 46 hours left
      minBidIncrement: 0.1,
      currentBid: 2.8,
      currentBidderId: creatorUser2.id,
      currentBidderUsername: creatorUser2.username,
      currentBidderAddress: creatorUser2.walletAddress,
      bidCount: 6,
      status: 'active',
      description: 'Exclusive genesis single-edition grove weaver with kinetic solar core. Winner receives physical NFC-linked artifact and priority whitelist on future drops.',
      bids: [
        {
          id: 'bid_1',
          bidderId: 'usr_sol_artisan',
          bidderUsername: 'Kroma',
          bidderAddress: creatorUser2.walletAddress!,
          amount: 2.8,
          timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString()
        },
        {
          id: 'bid_2',
          bidderId: 'usr_collector_vault',
          bidderUsername: 'SolWhale',
          bidderAddress: 'Whal38kP9vLm2Q4rSt1uVxYz8aBcDeFgHiJkLmNoP',
          amount: 2.5,
          timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString()
        },
        {
          id: 'bid_3',
          bidderId: 'usr_sol_artisan',
          bidderUsername: 'Kroma',
          bidderAddress: creatorUser2.walletAddress!,
          amount: 2.1,
          timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString()
        }
      ]
    }
  ];

  // Bounties
  const bounties: Bounty[] = [
    {
      id: 'bounty_01_ent_lore',
      title: 'Ents of Solana: Codex & Lore Design',
      description: 'We are seeking an experienced worldbuilder to construct the official 10-chapter mythology of the Ents of Solana collection. Must define the origin of the obsidian core and solar flame validators.',
      creatorId: adminUser.id,
      creatorName: adminUser.displayName,
      creatorUsername: adminUser.username,
      creatorAvatar: adminUser.avatar,
      creatorVerified: true,
      reward: 3.5,
      currency: 'SOL',
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      category: 'Collection Lore',
      requirements: [
        'Detailed worldbuilding document (Markdown or PDF)',
        'Character profiles for prime guardians',
        'Validator technical alignment (Solana slot architecture metaphors)'
      ],
      status: 'open',
      submissions: [],
      createdAt: now
    },
    {
      id: 'bounty_02_3d_render',
      title: 'Isometric 3D Banner & Animated Assets',
      description: 'Create high-res 4K looping render assets showcasing the MINT isometric brand geometry in motion.',
      creatorId: adminUser.id,
      creatorName: adminUser.displayName,
      creatorUsername: adminUser.username,
      creatorAvatar: adminUser.avatar,
      creatorVerified: true,
      reward: 5.0,
      currency: 'SOL',
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4).toISOString(),
      category: '3D & Generative',
      requirements: [
        'Blender / Cinema4D project files',
        '3840x2160 60fps MP4 loop',
        'Transparent alpha channel WEBM'
      ],
      status: 'in_progress',
      submissions: [
        {
          id: 'sub_01',
          submitterId: creatorUser2.id,
          submitterUsername: creatorUser2.username,
          submitterAddress: creatorUser2.walletAddress!,
          submitterAvatar: creatorUser2.avatar,
          notes: 'Initial work in progress draft showcasing the ambient orange occlusion.',
          previewUrl: 'https://images.unsplash.com/photo-1633167606207-d840b5070fc2?w=800&auto=format&fit=crop&q=80',
          submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
          status: 'pending'
        }
      ],
      createdAt: now
    }
  ];

  const activity: ActivityEvent[] = [
    {
      id: 'act_1',
      type: 'bid',
      nftId: 'nft_ent_042',
      nftName: 'Grove Weaver #042',
      nftImage: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=200&auto=format&fit=crop&q=80',
      collectionId: 'col_ents_genesis',
      collectionName: 'Ents of Solana',
      fromAddress: creatorUser2.walletAddress,
      fromUsername: creatorUser2.username,
      price: 2.8,
      timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      txSignature: '4zLp8vQxRt1mNoPqRsTuVwXyZ1aBcDeFgHiJkLmNoPqR'
    },
    {
      id: 'act_2',
      type: 'listing',
      nftId: 'nft_ent_001',
      nftName: 'Elder Ent #001 — Prime Sentinel',
      nftImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
      collectionId: 'col_ents_genesis',
      collectionName: 'Ents of Solana',
      fromAddress: adminUser.walletAddress,
      fromUsername: adminUser.username,
      price: 2.75,
      timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      txSignature: '5vRt1mNoPqRsTuVwXyZ1aBcDeFgHiJkLmNoPqRsTuVw'
    },
    {
      id: 'act_3',
      type: 'auction_created',
      nftId: 'nft_ent_042',
      nftName: 'The Great Ent Auction',
      nftImage: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=200&auto=format&fit=crop&q=80',
      collectionId: 'col_ents_genesis',
      collectionName: 'Ents of Solana',
      fromAddress: adminUser.walletAddress,
      fromUsername: adminUser.username,
      price: 1.5,
      timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString()
    },
    {
      id: 'act_4',
      type: 'bounty_created',
      nftName: 'Ents of Solana: Codex & Lore Design',
      fromAddress: adminUser.walletAddress,
      fromUsername: adminUser.username,
      price: 3.5,
      timestamp: new Date(Date.now() - 1000 * 60 * 500).toISOString()
    }
  ];

  const notifications: Notification[] = [
    {
      id: 'notif_welcome',
      userId: adminUser.id,
      title: 'Welcome to MINT Protocol',
      message: 'Your genesis administrative account is verified and ready. Platform fees are routed to your treasury.',
      type: 'system',
      read: false,
      timestamp: now
    }
  ];

  const config: PlatformConfig = {
    marketplaceFeePercent: 1.5,
    auctionFeePercent: 2.0,
    mintFeePercent: 1.0,
    treasuryAddress: 'ACEp1aTfX7h8Kq3w9uV4y2z5L1m6NoP8qRsTuVwXyZ',
    network: 'devnet',
    rpcEndpoint: 'https://api.devnet.solana.com',
    mintBotConfig: {
      freeHourlyLimit: 20,
      proHourlyLimit: 200,
      enableExternalIndexer: false,
      indexerProviderName: 'Helius / Shyft (Boundary Ready)',
      defaultNetwork: 'Solana Devnet'
    },
    launchConfig: {
      collectionCreationFeeSol: 0.05,
      estimatedNetworkFeeSol: 0.012,
      minSupply: 1,
      maxSupply: 10000,
      minMintPriceSol: 0,
      maxMintPriceSol: 100,
      maxRoyaltyPercent: 15,
      defaultWalletLimit: 5,
      maxWalletLimit: 50,
      allowedCurrencies: ['SOL', 'USDC']
    },
    verificationConfig: {
      minAccountAgeDays: 0,
      minCreatedNfts: 1,
      minSolVolume: 0.1,
      maxVerifiedCommunitiesPerUser: 1,
      adminMultiCommunityAllowed: true,
      cooldownDays: 7
    },
    maxBioLength: 160,
    maxAccountsPerDevice: 3
  };

  const userPasswords: Record<string, string> = {
    [adminUser.id]: initialPasswordHash,
    [creatorUser2.id]: bcrypt.hashSync('CreatorPass2026!', 10)
  };

  return {
    users: [adminUser, creatorUser2],
    collections,
    nfts,
    auctions,
    bounties,
    activity,
    notifications,
    config,
    userPasswords,
    likes: [],
    posts: [],
    comments: [],
    communities: [],
    communityMembers: [],
    follows: [],
    verificationRequests: []
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure platform owner user exists and has verified + owner role
        const hasAdmin = parsed.users?.some((u: User) => u.email === 'pervercy23@gmail.com');
        if (!hasAdmin) {
          const init = getInitialDatabase();
          return this.save(init);
        }
        
        // Ensure pervercy23@gmail.com is verified and owner
        const admin = parsed.users?.find((u: User) => u.email === 'pervercy23@gmail.com');
        if (admin) {
          admin.isVerified = true;
          admin.role = 'owner';
          if (!admin.plan) admin.plan = 'unlimited';
          admin.bot_unlimited = true;
        }

        // Ensure creatorUser2 or other users are only verified if explicit
        const creator2 = parsed.users?.find((u: User) => u.id === 'usr_sol_artisan');
        if (creator2 && creator2.email === 'solartisan@solana.art') {
          creator2.isVerified = false;
        }

        if (!Array.isArray(parsed.likes)) parsed.likes = [];
        if (!Array.isArray(parsed.posts)) parsed.posts = [];
        if (!Array.isArray(parsed.comments)) parsed.comments = [];
        if (!Array.isArray(parsed.communities)) parsed.communities = [];
        if (!Array.isArray(parsed.communityMembers)) parsed.communityMembers = [];
        if (!Array.isArray(parsed.follows)) parsed.follows = [];
        if (!Array.isArray(parsed.verificationRequests)) parsed.verificationRequests = [];

        if (!parsed.config) parsed.config = {} as any;
        if (!parsed.config.communityCreationCooldownHours) parsed.config.communityCreationCooldownHours = 10;
        if (!parsed.config.verificationConfig) {
          parsed.config.verificationConfig = {
            minAccountAgeDays: 0,
            minCreatedNfts: 1,
            minSolVolume: 0.1,
            maxVerifiedCommunitiesPerUser: 1,
            adminMultiCommunityAllowed: true,
            cooldownDays: 7,
            allowedCategories: ['Creator', 'Artist', 'Collector', 'Community Leader', 'Builder', 'Public Figure', 'Founder', 'Other'],
            foundingConfig: {
              enabled: true,
              startDate: '2026-09-01T00:00:00.000Z',
              endDate: '2026-10-31T23:59:59.999Z',
              minPostsCount: 0,
              minActiveDays: 0,
              minInteractions: 0
            }
          };
        } else {
          if (!parsed.config.verificationConfig.allowedCategories) {
            parsed.config.verificationConfig.allowedCategories = ['Creator', 'Artist', 'Collector', 'Community Leader', 'Builder', 'Public Figure', 'Founder', 'Other'];
          }
          if (!parsed.config.verificationConfig.foundingConfig) {
            parsed.config.verificationConfig.foundingConfig = {
              enabled: true,
              startDate: '2026-09-01T00:00:00.000Z',
              endDate: '2026-10-31T23:59:59.999Z',
              minPostsCount: 0,
              minActiveDays: 0,
              minInteractions: 0
            };
          }
        }

        // Ensure owner account has verified & founding status
        const aceUser = (parsed.users || []).find(u => u.id === 'usr_ace_admin' || u.username.toLowerCase() === 'ace');
        if (aceUser) {
          aceUser.role = 'owner';
          aceUser.isVerified = true;
          aceUser.isFoundingMember = true;
          if (!aceUser.foundingMemberGrantedAt) {
            aceUser.foundingMemberGrantedAt = aceUser.createdAt;
            aceUser.foundingMemberReason = 'Genesis protocol architect & platform owner';
          }
        }
        if (!parsed.config.maxBioLength) parsed.config.maxBioLength = 160;
        if (!parsed.config.maxAccountsPerDevice) parsed.config.maxAccountsPerDevice = 3;

        if (!parsed.config.launchConfig) {
          parsed.config.launchConfig = {
            collectionCreationFeeSol: 0.05,
            estimatedNetworkFeeSol: 0.012,
            minSupply: 1,
            maxSupply: 10000,
            minMintPriceSol: 0,
            maxMintPriceSol: 100,
            maxRoyaltyPercent: 15,
            defaultWalletLimit: 5,
            maxWalletLimit: 50,
            allowedCurrencies: ['SOL', 'USDC']
          };
        }
        this.save(parsed);
        return parsed;
      }
    } catch (err) {
      console.error('Error loading DB file, reinitializing:', err);
    }
    const init = getInitialDatabase();
    return this.save(init);
  }

  public save(data?: DatabaseSchema): DatabaseSchema {
    if (data) {
      this.data = data;
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    return this.data;
  }

  public get(): DatabaseSchema {
    return this.data;
  }
}

export const db = new Database();
