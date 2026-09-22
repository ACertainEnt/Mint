import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  User,
  NFTCollection,
  NFT,
  Auction,
  Bounty,
  ActivityEvent,
  Notification,
  PlatformConfig,
  SocialLike,
  SocialPost,
  SocialComment,
  SocialCommunity,
  SocialCommunityMember,
  SocialFollow,
  VerificationRequest
} from '../src/types';

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
  likes: SocialLike[];
  posts: SocialPost[];
  comments: SocialComment[];
  communities: SocialCommunity[];
  communityMembers: SocialCommunityMember[];
  follows: SocialFollow[];
  verificationRequests: VerificationRequest[];
  waitlist: any[];
  betaCodes: any[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getInitialDatabase(): DatabaseSchema {
  const initialPasswordHash = bcrypt.hashSync('EntAlgo2026!', 10);
  const now = new Date().toISOString();

  // Platform owner user requested by user: @L (pervercy23@gmail.com)
  const adminUser: User = {
    id: 'usr_ace_admin',
    email: 'pervercy23@gmail.com',
    username: 'L',
    displayName: 'A Certain Ent',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=240&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1200&auto=format&fit=crop&q=80',
    bio: 'Genesis creator & protocol architect. Curator of organic geometric artifacts on Algorand.',
    walletAddress: 'ACEALGORANDTESTNETVALIDATORCREATOR7XQP9KLM1VOS3W2YRT7UABCD',
    role: 'owner',
    privilegedType: 'platform_owner',
    isPrivileged: true,
    isVerified: true,
    isFoundingMember: true,
    foundingMemberGrantedAt: now,
    foundingMemberReason: 'Genesis protocol architect & platform owner',
    plan: 'unlimited',
    bot_unlimited: true,
    beta_access: true,
    usernameColor: '#ff5500',
    entitlement: {
      tier: 'unlimited',
      bot_unlimited: true
    },
    socialLinks: {
      website: 'https://mint.app',
      twitter: 'https://x.com/A_Certain_Ent',
      discord: 'https://discord.gg/algorand',
      telegram: 'https://t.me/mint_protocol'
    },
    createdAt: now,
    profileCompleted: true
  };

  // Second privileged MINT account: @mint (fahudmajed@gmail.com)
  const mintUser: User = {
    id: 'usr_mint_official',
    email: 'fahudmajed@gmail.com',
    username: 'mint',
    displayName: 'MINT',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=240&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1200&auto=format&fit=crop&q=80',
    bio: 'Official MINT Protocol account. Curating digital artifacts and ecosystem community on Algorand.',
    walletAddress: 'M1NTALGORANDTESTNETVALIDATORCREATOR7XQP9KLM1VOS3W2YRT7UABC',
    role: 'trusted_mint_account',
    privilegedType: 'trusted_mint_account',
    isPrivileged: true,
    isVerified: true,
    isFoundingMember: true,
    foundingMemberGrantedAt: now,
    foundingMemberReason: 'Official MINT protocol identity account',
    plan: 'unlimited',
    bot_unlimited: true,
    beta_access: true,
    usernameColor: '#ff5500',
    entitlement: {
      tier: 'unlimited',
      bot_unlimited: true
    },
    socialLinks: {
      website: 'https://mint.app',
      twitter: 'https://x.com/mint'
    },
    createdAt: now,
    profileCompleted: true
  };

  const creatorUser2: User = {
    id: 'usr_algo_artisan',
    email: 'artisan@kroma.art',
    username: 'Kroma',
    displayName: 'Kroma Studios',
    avatar: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=240&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1200&auto=format&fit=crop&q=80',
    bio: 'Pioneering generative voxel & 3D Algorand aesthetics.',
    walletAddress: 'KROMALGORANDTESTNETVALIDATORCREATOR7XQP9KLM1VOS3W2YRT7UABC',
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
      name: 'Ents of Algorand',
      symbol: 'ENTS',
      description: 'The ancient guardians of the high-throughput blockchain. 500 hand-rendered organic constructs forged in solar orange flame and obsidian stone.',
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80',
      banner: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1200&auto=format&fit=crop&q=80',
      totalSupply: 500,
      mintedSupply: 142,
      mintPrice: 45,
      royaltyFee: 5,
      contractAddress: 'ENT54XZQP9KLM1VOS3W2YRT7UABCDEFGHIKLMNOPQRSTUVWXYZ12345678',
      isVerified: true,
      socialLinks: {
        website: 'https://mint.app',
        twitter: 'https://x.com/A_Certain_Ent',
        discord: 'https://discord.gg/ents'
      },
      floorPrice: 75,
      totalVolume: 16250,
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
      description: 'Mathematical time shards captured at instant finality. Highly dense procedural artifacts for Algorand collectors.',
      image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=500&auto=format&fit=crop&q=80',
      banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
      totalSupply: 250,
      mintedSupply: 89,
      mintPrice: 60,
      royaltyFee: 4.5,
      contractAddress: 'GLYPH8UVWXYZ1ABCDEFGHIKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIK',
      isVerified: true,
      socialLinks: {
        twitter: 'https://x.com/kroma_studios'
      },
      floorPrice: 110,
      totalVolume: 21400,
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
      description: 'Isometric geometric signatures symbolizing the MINT protocol architecture. Monochromatic obsidian and solar orange facets.',
      image: 'https://images.unsplash.com/photo-1633167606207-d840b5070fc2?w=500&auto=format&fit=crop&q=80',
      banner: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1200&auto=format&fit=crop&q=80',
      totalSupply: 100,
      mintedSupply: 48,
      mintPrice: 25,
      royaltyFee: 3,
      contractAddress: 'CUBE77WXYZ1ABCDEFGHIKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIKLM',
      isVerified: true,
      floorPrice: 50,
      totalVolume: 6400,
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
      collectionName: 'Ents of Algorand',
      collectionSymbol: 'ENTS',
      name: 'Elder Ent #001 — Prime Sentinel',
      description: 'The first genesis Ent sculpted from ancient root memory and obsidian stone with an internal orange core reactor.',
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      tokenAddress: '71938201',
      creatorId: adminUser.id,
      creatorName: adminUser.displayName,
      creatorUsername: adminUser.username,
      creatorAvatar: adminUser.avatar,
      creatorVerified: true,
      ownerId: adminUser.id,
      ownerAddress: adminUser.walletAddress!,
      ownerUsername: adminUser.username,
      isListed: true,
      price: 135,
      isInAuction: false,
      traits: [
        { trait_type: 'Core', value: 'Solar Plasma', rarity: 3 },
        { trait_type: 'Material', value: 'Dark Basalt', rarity: 12 },
        { trait_type: 'Stature', value: 'Colossus', rarity: 5 },
        { trait_type: 'Era', value: 'Genesis Epoch', rarity: 1 }
      ],
      createdAt: now,
      lastSalePrice: 105,
      views: 842,
      likes: 124,
      blockchain: 'Algorand'
    },
    {
      id: 'nft_ent_042',
      collectionId: 'col_ents_genesis',
      collectionName: 'Ents of Algorand',
      collectionSymbol: 'ENTS',
      name: 'Grove Weaver #042',
      description: 'Interwoven root filaments generating kinetic energy through the Algorand consensus network.',
      image: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&auto=format&fit=crop&q=80',
      tokenAddress: '71938242',
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
      blockchain: 'Algorand'
    },
    {
      id: 'nft_glyph_108',
      collectionId: 'col_chrono_glyphs',
      collectionName: 'Chrono Glyphs',
      collectionSymbol: 'GLYPH',
      name: 'Chrono Glyph #108 — Apex Horizon',
      description: 'A harmonic temporal prism resonating at instant round finality.',
      image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=80',
      tokenAddress: '88492108',
      creatorId: creatorUser2.id,
      creatorName: creatorUser2.displayName,
      creatorUsername: creatorUser2.username,
      creatorAvatar: creatorUser2.avatar,
      creatorVerified: true,
      ownerId: creatorUser2.id,
      ownerAddress: creatorUser2.walletAddress!,
      ownerUsername: creatorUser2.username,
      isListed: true,
      price: 170,
      isInAuction: false,
      traits: [
        { trait_type: 'Frequency', value: 'Instant', rarity: 4 },
        { trait_type: 'Prism', value: 'Refractive Amber', rarity: 6 },
        { trait_type: 'Harmonic', value: 'Octave 8', rarity: 11 }
      ],
      createdAt: now,
      lastSalePrice: 140,
      views: 612,
      likes: 89,
      blockchain: 'Algorand'
    },
    {
      id: 'nft_cube_007',
      collectionId: 'col_hyper_cubes',
      collectionName: 'Hyper Cubes M',
      collectionSymbol: 'HCUBE',
      name: 'Isometric M #007',
      description: 'Official isometric brand emblem minted on Algorand. Pure geometric orange structure.',
      image: 'https://images.unsplash.com/photo-1633167606207-d840b5070fc2?w=800&auto=format&fit=crop&q=80',
      tokenAddress: '99201007',
      creatorId: adminUser.id,
      creatorName: adminUser.displayName,
      creatorUsername: adminUser.username,
      creatorAvatar: adminUser.avatar,
      creatorVerified: true,
      ownerId: adminUser.id,
      ownerAddress: adminUser.walletAddress!,
      ownerUsername: adminUser.username,
      isListed: true,
      price: 60,
      isInAuction: false,
      traits: [
        { trait_type: 'Shape', value: 'Isometric Hexagon M', rarity: 2 },
        { trait_type: 'Facet Color', value: 'Cadmium Orange', rarity: 8 },
        { trait_type: 'Shadow', value: 'Obsidian Matte', rarity: 15 }
      ],
      createdAt: now,
      views: 450,
      likes: 92,
      blockchain: 'Algorand'
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
      startingPrice: 75,
      reservePrice: 125,
      buyNowPrice: 250,
      currency: 'ALGO',
      startTime: now,
      endTime: new Date(Date.now() + 1000 * 60 * 60 * 46).toISOString(), // 46 hours left
      minBidIncrement: 5,
      currentBid: 140,
      currentBidderId: creatorUser2.id,
      currentBidderUsername: creatorUser2.username,
      currentBidderAddress: creatorUser2.walletAddress,
      bidCount: 6,
      status: 'active',
      description: 'Exclusive genesis single-edition grove weaver with kinetic solar core. Winner receives physical NFC-linked artifact and priority whitelist on future drops.',
      bids: [
        {
          id: 'bid_1',
          bidderId: 'usr_algo_artisan',
          bidderUsername: 'Kroma',
          bidderAddress: creatorUser2.walletAddress!,
          amount: 140,
          timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString()
        },
        {
          id: 'bid_2',
          bidderId: 'usr_collector_vault',
          bidderUsername: 'AlgoWhale',
          bidderAddress: 'WHAL38KP9VLM2Q4RST1UVXYZ8ABCDEFGHIKLMNOPQRSTUVWXYZ12345678',
          amount: 125,
          timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString()
        },
        {
          id: 'bid_3',
          bidderId: 'usr_algo_artisan',
          bidderUsername: 'Kroma',
          bidderAddress: creatorUser2.walletAddress!,
          amount: 105,
          timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString()
        }
      ]
    }
  ];

  // Bounties
  const bounties: Bounty[] = [
    {
      id: 'bounty_01_ent_lore',
      title: 'Ents of Algorand: Codex & Lore Design',
      description: 'We are seeking an experienced worldbuilder to construct the official 10-chapter mythology of the Ents of Algorand collection. Must define the origin of the obsidian core and consensus nodes.',
      creatorId: adminUser.id,
      creatorName: adminUser.displayName,
      creatorUsername: adminUser.username,
      creatorAvatar: adminUser.avatar,
      creatorVerified: true,
      reward: 175,
      currency: 'ALGO',
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      category: 'Collection Lore',
      requirements: [
        'Detailed worldbuilding document (Markdown or PDF)',
        'Character profiles for prime guardians',
        'Consensus technical alignment (Algorand Pure PoS metaphors)'
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
      reward: 250,
      currency: 'ALGO',
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
      collectionName: 'Ents of Algorand',
      fromAddress: creatorUser2.walletAddress,
      fromUsername: creatorUser2.username,
      price: 140,
      timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      txSignature: '4ZLP8VQXRT1MNOPQRSTUVWXY'
    },
    {
      id: 'act_2',
      type: 'listing',
      nftId: 'nft_ent_001',
      nftName: 'Elder Ent #001 — Prime Sentinel',
      nftImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
      collectionId: 'col_ents_genesis',
      collectionName: 'Ents of Algorand',
      fromAddress: adminUser.walletAddress,
      fromUsername: adminUser.username,
      price: 135,
      timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      txSignature: '5VRT1MNOPQRSTUVWXY1ABCDE'
    },
    {
      id: 'act_3',
      type: 'auction_created',
      nftId: 'nft_ent_042',
      nftName: 'The Great Ent Auction',
      nftImage: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=200&auto=format&fit=crop&q=80',
      collectionId: 'col_ents_genesis',
      collectionName: 'Ents of Algorand',
      fromAddress: adminUser.walletAddress,
      fromUsername: adminUser.username,
      price: 75,
      timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString()
    },
    {
      id: 'act_4',
      type: 'bounty_created',
      nftName: 'Ents of Algorand: Codex & Lore Design',
      fromAddress: adminUser.walletAddress,
      fromUsername: adminUser.username,
      price: 175,
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
    treasuryAddress: 'ACEALGORANDTESTNETVALIDATORCREATOR7XQP9KLM1VOS3W2YRT7UABCD',
    network: 'testnet',
    rpcEndpoint: 'https://testnet-api.algonode.cloud',
    mintBotConfig: {
      freeHourlyLimit: 20,
      proHourlyLimit: 200,
      enableExternalIndexer: false,
      indexerProviderName: 'Algorand Indexer V2',
      defaultNetwork: 'Algorand Testnet'
    },
    launchConfig: {
      collectionCreationFeeSol: 2.5,
      estimatedNetworkFeeSol: 0.001,
      minSupply: 1,
      maxSupply: 10000,
      minMintPriceSol: 0,
      maxMintPriceSol: 5000,
      maxRoyaltyPercent: 15,
      defaultWalletLimit: 5,
      maxWalletLimit: 50,
      allowedCurrencies: ['ALGO', 'USDC']
    },
    verificationConfig: {
      minAccountAgeDays: 0,
      minCreatedNfts: 1,
      minSolVolume: 10,
      maxVerifiedCommunitiesPerUser: 1,
      adminMultiCommunityAllowed: true,
      cooldownDays: 7
    },
    maxBioLength: 160,
    maxAccountsPerDevice: 3
  };

  const userPasswords: Record<string, string> = {
    [adminUser.id]: initialPasswordHash,
    [mintUser.id]: initialPasswordHash,
    [creatorUser2.id]: bcrypt.hashSync('CreatorPass2026!', 10)
  };

  return {
    users: [adminUser, mintUser, creatorUser2],
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
    verificationRequests: [],
    waitlist: [],
    betaCodes: []
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
        const creator2 = parsed.users?.find((u: User) => u.id === 'usr_algo_artisan' || u.id === 'usr_sol_artisan');
        if (creator2) {
          creator2.isVerified = false;
        }

        if (!Array.isArray(parsed.likes)) parsed.likes = [];
        if (!Array.isArray(parsed.posts)) parsed.posts = [];
        if (!Array.isArray(parsed.comments)) parsed.comments = [];
        if (!Array.isArray(parsed.communities)) parsed.communities = [];
        if (!Array.isArray(parsed.communityMembers)) parsed.communityMembers = [];
        if (!Array.isArray(parsed.follows)) parsed.follows = [];
        if (!Array.isArray(parsed.verificationRequests)) parsed.verificationRequests = [];
        if (!Array.isArray(parsed.waitlist)) parsed.waitlist = [];
        if (!Array.isArray(parsed.betaCodes)) parsed.betaCodes = [];

        if (!parsed.config) parsed.config = {} as any;
        if (!parsed.config.communityCreationCooldownHours) parsed.config.communityCreationCooldownHours = 10;
        if (!parsed.config.verificationConfig) {
          parsed.config.verificationConfig = {
            minAccountAgeDays: 0,
            minCreatedNfts: 1,
            minSolVolume: 10,
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

        // Ensure primary owner account @L (pervercy23@gmail.com) has verified, privileged, & founding status
        let ownerUser = (parsed.users || []).find(u => u.email?.toLowerCase() === 'pervercy23@gmail.com' || u.id === 'usr_ace_admin');
        if (ownerUser) {
          ownerUser.username = 'L';
          ownerUser.displayName = 'A Certain Ent';
          ownerUser.role = 'owner';
          ownerUser.privilegedType = 'platform_owner';
          ownerUser.isPrivileged = true;
          ownerUser.isVerified = true;
          ownerUser.isFoundingMember = true;
          ownerUser.plan = 'unlimited';
          ownerUser.bot_unlimited = true;
          ownerUser.beta_access = true;
          ownerUser.usernameColor = '#ff5500';
          if (!ownerUser.entitlement) {
            ownerUser.entitlement = { tier: 'unlimited', bot_unlimited: true };
          }
          if (!ownerUser.foundingMemberGrantedAt) {
            ownerUser.foundingMemberGrantedAt = ownerUser.createdAt;
            ownerUser.foundingMemberReason = 'Genesis protocol architect & platform owner';
          }
        }

        // Ensure second privileged account @mint (fahudmajed@gmail.com) has verified, privileged, & founding status
        let mintUserAcc = (parsed.users || []).find(u => u.email?.toLowerCase() === 'fahudmajed@gmail.com' || u.username.toLowerCase() === 'mint');
        if (!mintUserAcc) {
          const nowIso = new Date().toISOString();
          mintUserAcc = {
            id: 'usr_mint_official',
            email: 'fahudmajed@gmail.com',
            username: 'mint',
            displayName: 'MINT',
            avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=240&auto=format&fit=crop&q=80',
            banner: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1200&auto=format&fit=crop&q=80',
            bio: 'Official MINT Protocol account. Curating digital artifacts and ecosystem community on Algorand.',
            walletAddress: 'M1NTALGORANDTESTNETVALIDATORCREATOR7XQP9KLM1VOS3W2YRT7UABC',
            role: 'trusted_mint_account',
            privilegedType: 'trusted_mint_account',
            isPrivileged: true,
            isVerified: true,
            isFoundingMember: true,
            foundingMemberGrantedAt: nowIso,
            foundingMemberReason: 'Official MINT protocol identity account',
            plan: 'unlimited',
            bot_unlimited: true,
            entitlement: {
              tier: 'unlimited',
              bot_unlimited: true
            },
            socialLinks: {
              website: 'https://mint.app',
              twitter: 'https://x.com/mint'
            },
            createdAt: nowIso,
            profileCompleted: true
          };
          parsed.users.push(mintUserAcc);
        } else {
          mintUserAcc.username = 'mint';
          mintUserAcc.displayName = 'MINT';
          mintUserAcc.role = 'trusted_mint_account';
          mintUserAcc.privilegedType = 'trusted_mint_account';
          mintUserAcc.isPrivileged = true;
          mintUserAcc.isVerified = true;
          mintUserAcc.isFoundingMember = true;
          mintUserAcc.plan = 'unlimited';
          mintUserAcc.bot_unlimited = true;
          mintUserAcc.beta_access = true;
          mintUserAcc.usernameColor = '#ff5500';
          if (!mintUserAcc.entitlement) {
            mintUserAcc.entitlement = { tier: 'unlimited', bot_unlimited: true };
          }
        }

        // Ensure passwords for privileged accounts in database
        if (!parsed.userPasswords) parsed.userPasswords = {};
        const defaultHash = bcrypt.hashSync('EntAlgo2026!', 10);
        if (ownerUser && !parsed.userPasswords[ownerUser.id]) {
          parsed.userPasswords[ownerUser.id] = defaultHash;
        }
        if (mintUserAcc && !parsed.userPasswords[mintUserAcc.id]) {
          parsed.userPasswords[mintUserAcc.id] = defaultHash;
        }
        if (!parsed.config.maxBioLength) parsed.config.maxBioLength = 160;
        if (!parsed.config.maxAccountsPerDevice) parsed.config.maxAccountsPerDevice = 3;

        if (!parsed.config.launchConfig) {
          parsed.config.launchConfig = {
            collectionCreationFeeSol: 2.5,
            estimatedNetworkFeeSol: 0.001,
            minSupply: 1,
            maxSupply: 10000,
            minMintPriceSol: 0,
            maxMintPriceSol: 5000,
            maxRoyaltyPercent: 15,
            defaultWalletLimit: 5,
            maxWalletLimit: 50,
            allowedCurrencies: ['ALGO', 'USDC']
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
