import { db } from '../db';
import { NFT, NFTCollection, Auction, Bounty, User } from '../../src/types';

export class MintDatabaseQueries {
  /**
   * Search or lookup an NFT by name, ID, or token/mint address
   */
  public static lookupNft(query: string): {
    nft: NFT | null;
    collection: NFTCollection | null;
    auction: Auction | null;
    ownerUser: User | null;
    similarNfts: NFT[];
  } {
    const database = db.get();
    const cleanQuery = query.trim().toLowerCase();

    // 1. Exact match on id or tokenAddress
    let match = database.nfts.find(n => 
      n.id.toLowerCase() === cleanQuery || 
      n.tokenAddress?.toLowerCase() === cleanQuery ||
      n.contractAddress?.toLowerCase() === cleanQuery
    );

    // 2. Exact match on name
    if (!match) {
      match = database.nfts.find(n => n.name.toLowerCase() === cleanQuery);
    }

    // 3. Substring match
    if (!match) {
      match = database.nfts.find(n => n.name.toLowerCase().includes(cleanQuery));
    }

    if (!match) {
      // Find similar candidates if any
      const similar = database.nfts.filter(n => 
        n.name.toLowerCase().includes(cleanQuery) ||
        n.collectionName.toLowerCase().includes(cleanQuery) ||
        n.collectionSymbol.toLowerCase().includes(cleanQuery)
      ).slice(0, 4);

      return {
        nft: null,
        collection: null,
        auction: null,
        ownerUser: null,
        similarNfts: similar
      };
    }

    const collection = database.collections.find(c => c.id === match!.collectionId) || null;
    const auction = match.isInAuction ? database.auctions.find(a => a.nftId === match!.id && a.status === 'active') || null : null;
    const ownerUser = database.users.find(u => u.walletAddress === match!.ownerAddress || u.id === match!.ownerId) || null;

    return {
      nft: match,
      collection,
      auction,
      ownerUser,
      similarNfts: []
    };
  }

  /**
   * Search collections or retrieve a collection by ID, symbol, or name
   */
  public static searchCollections(query?: string, filters?: { minFloor?: number; maxFloor?: number; verifiedOnly?: boolean }): NFTCollection[] {
    const database = db.get();
    let results = [...database.collections];

    if (query && query.trim().length > 0) {
      const q = query.trim().toLowerCase();
      results = results.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.id.toLowerCase() === q
      );
    }

    if (filters?.verifiedOnly) {
      results = results.filter(c => c.isVerified);
    }

    if (filters?.minFloor !== undefined) {
      results = results.filter(c => (c.floorPrice || 0) >= filters.minFloor!);
    }

    if (filters?.maxFloor !== undefined) {
      results = results.filter(c => (c.floorPrice || 0) <= filters.maxFloor!);
    }

    return results;
  }

  /**
   * Get detailed analytics for a collection
   */
  public static getCollectionStats(collectionIdOrSymbol: string) {
    const database = db.get();
    const q = collectionIdOrSymbol.trim().toLowerCase();
    const collection = database.collections.find(c => 
      c.id.toLowerCase() === q || 
      c.symbol.toLowerCase() === q || 
      c.name.toLowerCase() === q
    );

    if (!collection) {
      return null;
    }

    const colNfts = database.nfts.filter(n => n.collectionId === collection.id);
    const listedNfts = colNfts.filter(n => n.isListed && n.price);
    const activeAuctions = database.auctions.filter(a => a.nft.collectionId === collection.id && a.status === 'active');
    
    const floorPrice = listedNfts.length > 0 
      ? Math.min(...listedNfts.map(n => n.price!)) 
      : collection.floorPrice || 0;

    const highestListing = listedNfts.length > 0
      ? Math.max(...listedNfts.map(n => n.price!))
      : 0;

    const mintProgressPercent = collection.totalSupply > 0 
      ? Math.min(100, (collection.mintedSupply / collection.totalSupply) * 100)
      : 0;

    return {
      collection,
      floorPrice,
      highestListing,
      listedCount: listedNfts.length,
      activeAuctionsCount: activeAuctions.length,
      totalVolume: collection.totalVolume,
      mintProgressPercent: Math.round(mintProgressPercent * 10) / 10,
      totalItemsIndexedOnMint: colNfts.length,
      totalSupply: collection.totalSupply,
      mintedSupply: collection.mintedSupply,
      mintPrice: collection.mintPrice,
      royaltyFee: collection.royaltyFee,
      isLive: collection.isLive
    };
  }

  /**
   * Search active listings on Mint Marketplace
   */
  public static searchMarketplaceListings(filters: {
    collectionId?: string;
    collectionSymbol?: string;
    minPrice?: number;
    maxPrice?: number;
    searchQuery?: string;
    limit?: number;
  }): NFT[] {
    const database = db.get();
    let listings = database.nfts.filter(n => n.isListed && n.price !== undefined);

    if (filters.collectionId) {
      listings = listings.filter(n => n.collectionId === filters.collectionId);
    } else if (filters.collectionSymbol) {
      listings = listings.filter(n => n.collectionSymbol.toLowerCase() === filters.collectionSymbol!.toLowerCase());
    }

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      listings = listings.filter(n => 
        n.name.toLowerCase().includes(q) ||
        n.collectionName.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q)
      );
    }

    if (filters.minPrice !== undefined) {
      listings = listings.filter(n => n.price! >= filters.minPrice!);
    }

    if (filters.maxPrice !== undefined) {
      listings = listings.filter(n => n.price! <= filters.maxPrice!);
    }

    // Sort by price ascending by default for buyers
    listings.sort((a, b) => (a.price || 0) - (b.price || 0));

    return listings.slice(0, filters.limit || 12);
  }

  /**
   * Search and retrieve active auctions
   */
  public static getActiveAuctions(filters?: { query?: string; maxBid?: number }): Auction[] {
    const database = db.get();
    let auctions = database.auctions.filter(a => a.status === 'active');

    if (filters?.query) {
      const q = filters.query.toLowerCase();
      auctions = auctions.filter(a => 
        a.customTitle.toLowerCase().includes(q) ||
        a.nft.name.toLowerCase().includes(q) ||
        a.nft.collectionName.toLowerCase().includes(q) ||
        a.nft.collectionSymbol.toLowerCase().includes(q)
      );
    }

    if (filters?.maxBid !== undefined) {
      auctions = auctions.filter(a => a.currentBid <= filters.maxBid!);
    }

    return auctions;
  }

  /**
   * Search active bounties
   */
  public static getBounties(filters?: { category?: string; query?: string }): Bounty[] {
    const database = db.get();
    let bounties = database.bounties.filter(b => b.status === 'open');

    if (filters?.category) {
      bounties = bounties.filter(b => b.category.toLowerCase() === filters.category!.toLowerCase());
    }

    if (filters?.query) {
      const q = filters.query.toLowerCase();
      bounties = bounties.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
      );
    }

    return bounties;
  }

  /**
   * Lookup creator or collector in Mint database
   */
  public static lookupUser(usernameOrWallet: string): {
    user: User | null;
    collections: NFTCollection[];
    createdNfts: NFT[];
    ownedNfts: NFT[];
  } {
    const database = db.get();
    const q = usernameOrWallet.trim().toLowerCase();

    const user = database.users.find(u => 
      u.username.toLowerCase() === q ||
      u.id.toLowerCase() === q ||
      u.walletAddress?.toLowerCase() === q
    ) || null;

    if (!user) {
      return { user: null, collections: [], createdNfts: [], ownedNfts: [] };
    }

    const collections = database.collections.filter(c => c.creatorId === user.id);
    const createdNfts = database.nfts.filter(n => n.creatorId === user.id);
    const ownedNfts = database.nfts.filter(n => n.ownerId === user.id || (user.walletAddress && n.ownerAddress === user.walletAddress));

    return { user, collections, createdNfts, ownedNfts };
  }

  /**
   * Retrieve official Mint Protocol rules, fee structure, and help topics
   */
  public static getPlatformHelp(topic?: string) {
    const database = db.get();
    const config = database.config;

    const topics: Record<string, { topic: string; summary: string; rules: string[]; actionLink?: string }> = {
      fees: {
        topic: 'Protocol Fee Structure',
        summary: `MINT charges transparent protocol fees routed directly to the verified protocol treasury on Algorand:`,
        rules: [
          `Marketplace Secondary Sale Fee: ${config.marketplaceFeePercent}% (deducted from seller payout upon completed sale)`,
          `Auction Settlement Fee: ${config.auctionFeePercent}% (deducted from final winning bid)`,
          `Primary Launchpad Mint Fee: ${config.mintFeePercent}% (deducted from collection mint revenue)`,
          `Creator Royalties: Configured per collection by the creator (typically 3% - 7%) and strictly enforced on Mint`,
          `Algorand Network Gas: Sub-penny network transaction fees paid in ALGO (0.001 ALGO standard min fee)`
        ],
        actionLink: 'explore'
      },
      launchpad: {
        topic: 'Collection Launchpad & Creator Economics',
        summary: 'MINT provides an end-to-end launchpad for Algorand artists, game studios, and generative creators.',
        rules: [
          'Total Supply: Define total supply (e.g. 100 to 10,000 artifacts) with immutable symbols',
          'Mint Price: Set primary mint cost denominated in ALGO',
          'Wallet Mint Limits: Guardrails to prevent bot drain (e.g. max 3 per wallet)',
          'Creator Royalties: Set royalty percentage (0% to 15%) for perpetual secondary earnings',
          'Live Preview: Test and review collection card displays and trait metadata prior to on-chain deployment',
          'Instant Listing: Newly minted items can be listed on the secondary market immediately'
        ],
        actionLink: 'launch'
      },
      auctions: {
        topic: 'Custom-Titled Auctions & Bidding',
        summary: 'Creators and collectors can run timed, reserve-backed auctions with custom creative titles.',
        rules: [
          'Custom Titles: Auctions can have thematic titles (e.g. "The Great Ent Auction")',
          'Starting & Reserve Bids: Bidding begins at the starting bid; reserve price must be reached for settlement',
          'Buy-Now Option: Instant settlement available if buyer meets the instant purchase price',
          'Minimum Increments: Bids must exceed current highest bid by at least 1 ALGO or 5%',
          'Atomic Escrow: Funds are held safely; outbid collectors receive immediate notification and balance release',
          'Settlement Finality: Auction won events trigger automated NFT transfer and treasury fee deduction'
        ],
        actionLink: 'auctions'
      },
      bounties: {
        topic: 'Creator Bounties & Community Commissions',
        summary: 'Sponsor or complete creative and technical tasks funded by ALGO bounties.',
        rules: [
          'Categories: Artwork design, 3D voxel modeling, lore codex, smart contract scripts, UI themes',
          'Escrow Payout: Bounties hold rewards in ALGO escrow until creator accepts a completed submission',
          'Submissions: Contributors attach their portfolio, repository, or artwork files',
          'Approval Workflow: Bounty sponsors review and approve work with on-chain payout release'
        ],
        actionLink: 'bounties'
      },
      minting: {
        topic: 'Primary Minting Pipeline',
        summary: 'How to mint NFTs directly from active launchpad drops on Algorand.',
        rules: [
          'Connect Algorand wallet (Pera, Defly, or standard Algorand keypair)',
          'Ensure sufficient ALGO balance for mint price and minimum balance requirement',
          'Click "Mint" on any active collection; the protocol verifies wallet limit and supply',
          'Transaction progresses through clear stages with on-chain confirmation'
        ],
        actionLink: 'explore'
      }
    };

    if (topic && topics[topic.toLowerCase()]) {
      return topics[topic.toLowerCase()];
    }

    return {
      topic: 'MINT Protocol Overview',
      summary: 'MINT is a mobile-first, high-throughput NFT platform and launchpad native to Algorand.',
      rules: [
        'Explore Genesis Collections: Discover curated collections like Ents of Algorand, Chrono Glyphs, and Hyper Cubes',
        'Algorand Native Integration: Pure Proof-of-Stake finality and instant settlement with 0 carbon footprint',
        'Verified Checkmark Program: Top creators and authentic collections receive verified shields',
        'MintBot Assistant: Deep real-time NFT analytics and grounded research powered by verified data sources'
      ],
      actionLink: 'explore'
    };
  }
}
