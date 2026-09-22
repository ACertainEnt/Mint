import { GoogleGenAI } from '@google/genai';
import { MintDatabaseQueries } from './dbQueries';
import { AlgorandOnChainData, OnChainWalletInfo, OnChainTxInfo } from './onChainData';
import { AlgorandNftIndexingLayer } from './indexingLayer';
import { MintBotEntitlements } from './entitlements';
import { MintBotDataSource, MintBotQueryResponse, MintBotStructuredData, User } from '../../src/types';

export class MintBotOrchestrator {
  private static geminiClient: GoogleGenAI | null = null;

  private static getGeminiClient(): GoogleGenAI | null {
    if (!this.geminiClient && process.env.GEMINI_API_KEY) {
      try {
        this.geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      } catch (err) {
        console.warn('Could not initialize GoogleGenAI client:', err);
      }
    }
    return this.geminiClient;
  }

  /**
   * Process a natural language research or platform query
   */
  public static async executeQuery(
    rawQuery: string,
    user?: User,
    clientIp: string = 'unknown'
  ): Promise<MintBotQueryResponse> {
    const query = rawQuery.trim();
    if (!query) {
      throw new Error('Query string is required');
    }

    // 1. Enforce server-side usage entitlement
    const usageCheck = MintBotEntitlements.checkAndConsumeUsage(user, clientIp);
    if (!usageCheck.allowed) {
      const err: any = new Error(usageCheck.error || 'Usage limit exceeded');
      err.status = 429;
      err.usage = usageCheck.usage;
      throw err;
    }

    // 2. Classify intent and extract entities
    const lower = query.toLowerCase();
    let intent: 'nft_lookup' | 'collection_lookup' | 'wallet_lookup' | 'marketplace_search' | 'auction_search' | 'platform_help' | 'general' = 'general';

    // Algorand address format (58 base32 chars)
    const algoAddrMatch = query.match(/[A-Z2-7]{58}/i);
    const txIdMatch = query.match(/[A-Z0-9]{52}/i);

    const dataSources: MintBotDataSource[] = [];
    const structuredData: MintBotStructuredData = {};
    let unverifiedWarning: string | undefined;

    let retrievedContextText = '';

    // Route: Wallet or On-chain address lookup
    if (algoAddrMatch || (lower.includes('wallet') || lower.includes('balance') || lower.includes('address') || lower.includes('holdings') || lower.includes('algo'))) {
      const address = algoAddrMatch ? algoAddrMatch[0].toUpperCase() : '';
      if (address) {
        intent = 'wallet_lookup';
        const onChain = await AlgorandOnChainData.getWalletInfo(address);
        const dbUserLookup = MintDatabaseQueries.lookupUser(address);

        dataSources.push({
          name: 'Algorand Testnet Node',
          type: 'chain_rpc',
          status: onChain.isValidPubkey ? 'rpc_live' : 'unavailable',
          details: onChain.isValidPubkey ? `Round: ${onChain.confirmedAtRound || 'latest'}, Algod: verified` : onChain.error
        });

        dataSources.push({
          name: 'MINT Protocol Database',
          type: 'mint_db',
          status: 'verified',
          details: dbUserLookup.user ? `Registered user: @${dbUserLookup.user.username}` : 'No protocol account linked'
        });

        const indexerStatus = AlgorandNftIndexingLayer.getStatus();
        dataSources.push({
          name: indexerStatus.provider,
          type: 'indexing_provider',
          status: indexerStatus.isConfigured ? 'verified' : 'unavailable',
          details: indexerStatus.message
        });

        structuredData.wallet = {
          address,
          balance: onChain.balance,
          isRegisteredUser: Boolean(dbUserLookup.user),
          username: dbUserLookup.user?.username,
          rpcNetwork: onChain.rpcNetwork,
          recentSignatures: onChain.recentSignatures,
          ownedNftsCount: dbUserLookup.ownedNfts.length,
          createdNftsCount: dbUserLookup.createdNfts.length
        };

        if (dbUserLookup.ownedNfts.length > 0) {
          structuredData.nfts = dbUserLookup.ownedNfts;
        }

        retrievedContextText = `[WALLET REPORT] Address: ${address} | On-Chain Balance: ${onChain.balance} ALGO on Algorand | Valid Key: ${onChain.isValidPubkey} | Mint Registered User: ${dbUserLookup.user ? dbUserLookup.user.username : 'None'} | Mint Collections Owned: ${dbUserLookup.ownedNfts.length} | External Indexer: ${indexerStatus.isConfigured ? 'Active' : 'Unconfigured'}`;

        if (!onChain.isValidPubkey) {
          unverifiedWarning = 'The provided address is not a valid 58-character Algorand public key or could not be queried via Algod.';
        }
      }
    }
    // Route: Transaction ID lookup
    else if (txIdMatch || lower.includes('tx') || lower.includes('transaction')) {
      const txId = txIdMatch ? txIdMatch[0] : '';
      if (txId) {
        intent = 'wallet_lookup';
        const txInfo = await AlgorandOnChainData.verifyTransaction(txId);
        dataSources.push({
          name: 'Algorand Testnet Node',
          type: 'chain_rpc',
          status: txInfo.isConfirmed ? 'rpc_live' : 'unavailable',
          details: `Confirmation status: ${txInfo.confirmationStatus}`
        });

        retrievedContextText = `[TRANSACTION STATUS] TxID: ${txId} | Confirmed: ${txInfo.isConfirmed} | Status: ${txInfo.confirmationStatus} | Round: ${txInfo.round || 'N/A'} | Explorer: ${txInfo.explorerUrl}`;
      }
    }
    // Route: Auctions search
    else if (lower.includes('auction') || lower.includes('bid') || lower.includes('reserve')) {
      intent = 'auction_search';
      const auctions = MintDatabaseQueries.getActiveAuctions();
      structuredData.auctions = auctions;

      dataSources.push({
        name: 'MINT Auction Escrow Ledger',
        type: 'mint_db',
        status: 'verified',
        details: `${auctions.length} live auctions verified in protocol state`
      });

      retrievedContextText = `[ACTIVE AUCTIONS on MINT] Found ${auctions.length} verified live auctions:\n` +
        auctions.map(a => `- "${a.customTitle}" for NFT "${a.nft.name}" (${a.nft.collectionSymbol}): Current Bid ${a.currentBid} ALGO | Starting: ${a.startingPrice} ALGO | Reserve: ${a.reservePrice || a.startingPrice} ALGO | Ends: ${a.endTime} | Bids count: ${a.bidCount}`).join('\n');
    }
    // Route: Collection research or stats
    else if (lower.includes('collection') || lower.includes('floor') || lower.includes('ents') || lower.includes('chrono') || lower.includes('cube') || lower.includes('supply') || lower.includes('royalt')) {
      intent = 'collection_lookup';

      // Check for specific collection match
      const targetCol = lower.includes('ent') ? 'col_ents_genesis' : lower.includes('chrono') ? 'col_chrono_glyphs' : lower.includes('cube') ? 'col_hyper_cubes' : undefined;
      const stats = targetCol ? MintDatabaseQueries.getCollectionStats(targetCol) : null;
      const allCollections = MintDatabaseQueries.searchCollections(query);

      dataSources.push({
        name: 'MINT Protocol Database',
        type: 'mint_db',
        status: 'verified',
        details: 'Grounded in MINT registry'
      });

      if (stats) {
        structuredData.collectionStats = {
          collection: stats.collection,
          floorPrice: stats.floorPrice,
          listedCount: stats.listedCount,
          totalVolume: stats.totalVolume,
          mintProgressPercent: stats.mintProgressPercent,
          activeAuctionsCount: stats.activeAuctionsCount,
          highestSale: stats.highestListing
        };
        structuredData.collections = [stats.collection];

        retrievedContextText = `[COLLECTION ANALYTICS] Name: ${stats.collection.name} (${stats.collection.symbol}) | Total Supply: ${stats.totalSupply} | Minted: ${stats.mintedSupply} (${stats.mintProgressPercent}% minted) | Mint Price: ${stats.mintPrice} ALGO | Verified Floor Price: ${stats.floorPrice} ALGO | Total Volume: ${stats.totalVolume} ALGO | Listed Items: ${stats.listedCount} | Active Auctions: ${stats.activeAuctionsCount} | Royalty Fee: ${stats.royaltyFee}% | Verified Creator: ${stats.collection.creatorUsername}`;
      } else {
        structuredData.collections = allCollections;
        retrievedContextText = `[COLLECTIONS MATCHED] Found ${allCollections.length} collections:\n` +
          allCollections.map(c => `- ${c.name} (${c.symbol}): Floor ${c.floorPrice || 0} ALGO, Minted ${c.mintedSupply}/${c.totalSupply}, Volume ${c.totalVolume} ALGO`).join('\n');
      }
    }
    // Route: NFT lookup
    else if (lower.includes('nft') || lower.includes('elder') || lower.includes('glyph') || lower.includes('trait') || lower.includes('token') || lower.includes('sentinel')) {
      intent = 'nft_lookup';
      const nftResult = MintDatabaseQueries.lookupNft(query.replace(/nft|lookup|search|find/gi, '').trim() || 'Elder Ent #001');

      dataSources.push({
        name: 'MINT NFT Registry',
        type: 'mint_db',
        status: nftResult.nft ? 'verified' : 'unavailable',
        details: nftResult.nft ? `Verified NFT ID: ${nftResult.nft.id}` : 'No matching NFT in protocol'
      });

      if (nftResult.nft) {
        structuredData.nfts = [nftResult.nft];
        if (nftResult.collection) structuredData.collections = [nftResult.collection];
        if (nftResult.auction) structuredData.auctions = [nftResult.auction];

        retrievedContextText = `[NFT METADATA] Name: ${nftResult.nft.name} | Collection: ${nftResult.nft.collectionName} (${nftResult.nft.collectionSymbol}) | ASA ID / Token: ${nftResult.nft.tokenAddress || 'Unassigned'} | Owner: @${nftResult.nft.ownerUsername} (${nftResult.nft.ownerAddress}) | Listed for Sale: ${nftResult.nft.isListed ? `${nftResult.nft.price} ALGO` : 'No'} | In Auction: ${nftResult.nft.isInAuction ? 'Yes' : 'No'} | Traits: ${nftResult.nft.traits.map(t => `${t.trait_type}: ${t.value} (Rarity: ${t.rarity}%)`).join(', ')}`;
      } else {
        unverifiedWarning = `No NFT matching "${query}" was found in the MINT Protocol database.`;
        retrievedContextText = `No exact NFT match found. Similar tokens: ${nftResult.similarNfts.map(s => s.name).join(', ') || 'None'}`;
      }
    }
    // Route: Marketplace search
    else if (lower.includes('buy') || lower.includes('market') || lower.includes('list') || lower.includes('price') || lower.includes('cheap')) {
      intent = 'marketplace_search';
      const listings = MintDatabaseQueries.searchMarketplaceListings({
        maxPrice: lower.includes('under 50') ? 50 : lower.includes('under 20') ? 20 : undefined
      });
      structuredData.nfts = listings;

      dataSources.push({
        name: 'MINT Marketplace Order Book',
        type: 'mint_db',
        status: 'verified',
        details: `${listings.length} active listings indexed`
      });

      retrievedContextText = `[MARKETPLACE LISTINGS] Found ${listings.length} items listed for instant purchase:\n` +
        listings.slice(0, 8).map(n => `- ${n.name} (${n.collectionSymbol}): ${n.price} ALGO (Seller: @${n.ownerUsername})`).join('\n');
    }
    // Route: Protocol rules or platform help
    else if (lower.includes('fee') || lower.includes('launch') || lower.includes('how') || lower.includes('rule') || lower.includes('bount') || lower.includes('protocol')) {
      intent = 'platform_help';
      const topicKey = lower.includes('fee') ? 'fees' : lower.includes('launch') ? 'launchpad' : lower.includes('auction') ? 'auctions' : lower.includes('bount') ? 'bounties' : lower.includes('mint') ? 'minting' : 'overview';
      const help = MintDatabaseQueries.getPlatformHelp(topicKey);
      structuredData.platformHelp = help;

      dataSources.push({
        name: 'MINT Protocol Smart Governance Rules',
        type: 'grounded_rules',
        status: 'verified',
        details: `Topic: ${help.topic}`
      });

      retrievedContextText = `[PROTOCOL GUIDE: ${help.topic}]\nSummary: ${help.summary}\nRules & Mechanics:\n` + help.rules.map(r => `- ${r}`).join('\n');
    }
    // Fallback: General platform query
    else {
      intent = 'general';
      const collections = MintDatabaseQueries.searchCollections('');
      const auctions = MintDatabaseQueries.getActiveAuctions();

      dataSources.push({
        name: 'MINT Protocol State',
        type: 'mint_db',
        status: 'verified',
        details: 'Grounded in protocol registry'
      });

      retrievedContextText = `[MINT GENERAL STATE] Collections live: ${collections.length} | Active Auctions: ${auctions.length} | Network: Algorand Testnet`;
    }

    // 3. AI / Grounding Layer
    // Try Gemini API if available, strictly grounded. Otherwise fall back to deterministic response.
    let textAnswer = '';
    const gemini = this.getGeminiClient();

    if (gemini) {
      try {
        const prompt = `You are MintBot, the native, high-precision NFT research and protocol assistant for the MINT Algorand platform.

CRITICAL INSTRUCTIONS:
1. Ground your response 100% strictly in the VERIFIED DATA provided below.
2. NEVER invent, hallucinate, or extrapolate blockchain data, token addresses, transaction hashes, bids, floor prices, or wallet balances.
3. If specific information is missing or unindexed in the data payload, explicitly declare that it is currently unavailable or unverified.
4. Provide a crisp, structured, professional response matching MINT's design-forward, analytical tone.
5. Do not include markdown codeblocks or JSON. Output clean conversational markdown with bullet points where appropriate.

USER QUERY:
"${query}"

VERIFIED PROTOCOL DATA PAYLOAD:
${retrievedContextText}
${unverifiedWarning ? `NOTE: ${unverifiedWarning}` : ''}`;

        const response = await gemini.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt
        });

        if (response.text) {
          textAnswer = response.text.trim();
        }
      } catch (err: any) {
        console.warn('Gemini generation encountered an error, falling back to deterministic answer:', err.message);
      }
    }

    // 4. Deterministic fallback if Gemini is absent or errored
    if (!textAnswer) {
      textAnswer = this.formatDeterministicAnswer(intent, query, structuredData, retrievedContextText, unverifiedWarning);
    }

    return {
      query,
      intent,
      textAnswer,
      dataSources,
      structuredData,
      usage: usageCheck.usage,
      unverifiedWarning
    };
  }

  private static formatDeterministicAnswer(
    intent: string,
    query: string,
    structured: MintBotStructuredData,
    contextText: string,
    warning?: string
  ): string {
    if (warning) {
      return `${warning}\n\nMintBot operates exclusively on verified protocol and Algorand state. Please verify the identifier or check if the asset is listed under MINT collections.`;
    }

    if (intent === 'wallet_lookup' && structured.wallet) {
      const w = structured.wallet;
      return `### Algorand Wallet Research Report
* **Public Address:** \`${w.address}\`
* **On-Chain Balance:** **${w.balance} ALGO** (${w.rpcNetwork})
* **Protocol Identity:** ${w.isRegisteredUser ? `@${w.username}` : 'Unregistered / External keypair'}
* **Collections Owned on MINT:** ${w.ownedNftsCount || 0}

*Data verified against Algorand node ledger.*`;
    }

    if (intent === 'collection_lookup' && structured.collectionStats) {
      const s = structured.collectionStats;
      return `### ${s.collection.name} (${s.collection.symbol}) Analytics
* **Verified Floor Price:** **${s.floorPrice} ALGO**
* **Total Volume:** ${s.totalVolume} ALGO
* **Circulating / Total Supply:** ${s.collection.mintedSupply} / ${s.collection.totalSupply} (${s.mintProgressPercent}% minted)
* **Primary Mint Price:** ${s.collection.mintPrice} ALGO
* **Listed Marketplace Supply:** ${s.listedCount} items
* **Active Escrow Auctions:** ${s.activeAuctionsCount}
* **Creator Royalty:** ${s.collection.royaltyFee}%

*All metrics are verified from MINT protocol state and current order book.*`;
    }

    if (intent === 'nft_lookup' && structured.nfts && structured.nfts[0]) {
      const n = structured.nfts[0];
      return `### NFT Specification: ${n.name}
* **Collection:** ${n.collectionName} (\`${n.collectionSymbol}\`)
* **ASA / Token Address:** \`${n.tokenAddress || 'Pending Mint'}\`
* **Current Owner:** @${n.ownerUsername} (\`${n.ownerAddress}\`)
* **Market Status:** ${n.isListed ? `Listed for sale at **${n.price} ALGO**` : n.isInAuction ? 'Currently in live reserve auction' : 'Unlisted in collector vault'}
* **Rarity Traits:** ${n.traits.map(t => `${t.trait_type}: ${t.value} (${t.rarity}% rarity)`).join(' • ')}`;
    }

    if (intent === 'auction_search' && structured.auctions) {
      if (structured.auctions.length === 0) {
        return `There are currently no active auctions matching your search criteria. You can create a new custom-titled auction from any NFT in your portfolio.`;
      }
      return `### Active MINT Protocol Auctions (${structured.auctions.length} Live)
${structured.auctions.map(a => `* **"${a.customTitle}"** — ${a.nft.name}
  Current Bid: **${a.currentBid} ALGO** | Starting: ${a.startingPrice} ALGO | Reserve: ${a.reservePrice || a.startingPrice} ALGO | ${a.bidCount} bids recorded | Status: **Active**`).join('\n\n')}

*Bids are atomic and verified through Algorand escrow protocols.*`;
    }

    if (intent === 'platform_help' && structured.platformHelp) {
      const h = structured.platformHelp;
      return `### ${h.topic}
${h.summary}

${h.rules.map(r => `* ${r}`).join('\n')}`;
    }

    if (intent === 'marketplace_search' && structured.nfts) {
      if (structured.nfts.length === 0) {
        return `No marketplace listings currently match your query. Try broadening your price range or collection filter.`;
      }
      return `### Verified Marketplace Listings (${structured.nfts.length} Items Found)
${structured.nfts.slice(0, 5).map(n => `* **${n.name}** (${n.collectionSymbol}) — **${n.price} ALGO** (Seller: @${n.ownerUsername})`).join('\n')}

*Select any listing to preview metadata or initiate immediate settlement.*`;
    }

    return `### MINT Protocol Assistant
${contextText}

You can ask MintBot to look up specific NFTs, calculate collection analytics, verify Algorand wallet balances, find active auctions, or explain protocol fee mechanics.`;
  }
}
