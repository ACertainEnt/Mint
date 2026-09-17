import { Router } from 'express';
import { MintBotOrchestrator } from './orchestrator';
import { MintBotEntitlements } from './entitlements';
import { SolanaOnChainData } from './onChainData';
import { SolanaNftIndexingLayer } from './indexingLayer';
import { AuthenticatedRequest } from '../middleware/auth';
import { MintBotSuggestionGroup } from '../../src/types';

export const mintBotRouter = Router();

// Query MintBot intelligent assistant
mintBotRouter.post('/query', async (req: AuthenticatedRequest, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'A query string is required' });
  }

  const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

  try {
    const result = await MintBotOrchestrator.executeQuery(query, req.user, clientIp);
    res.json(result);
  } catch (err: any) {
    if (err.status === 429) {
      return res.status(429).json({
        error: err.message,
        usage: err.usage
      });
    }
    console.error('MintBot Query Error:', err);
    res.status(500).json({
      error: 'An error occurred while researching your query',
      details: err.message
    });
  }
});

// Check current user's entitlement & usage quota
mintBotRouter.get('/usage', (req: AuthenticatedRequest, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const usage = MintBotEntitlements.getUsage(req.user, clientIp);
  res.json({ usage });
});

// Data providers and connection status
mintBotRouter.get('/status', async (req, res) => {
  const [rpcHealth, indexerStatus] = await Promise.all([
    SolanaOnChainData.checkRpcHealth(),
    SolanaNftIndexingLayer.getStatus()
  ]);

  const geminiAvailable = Boolean(process.env.GEMINI_API_KEY);

  res.json({
    database: {
      provider: 'MINT In-Memory / File Persistent DB',
      status: 'online',
      latency: '< 1ms'
    },
    solanaRpc: {
      endpoint: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      network: 'Solana Devnet',
      status: rpcHealth.status,
      latencyMs: rpcHealth.latencyMs,
      slot: rpcHealth.slot
    },
    indexingProvider: {
      ...indexerStatus
    },
    aiEngine: {
      provider: 'Google Gemini (gemini-3.8-flash)',
      status: geminiAvailable ? 'online' : 'fallback_deterministic',
      note: geminiAvailable ? 'Active with strict grounding' : 'GEMINI_API_KEY not configured; deterministic factual engine active'
    }
  });
});

// Curated research prompts
mintBotRouter.get('/suggestions', (req, res) => {
  const suggestions: MintBotSuggestionGroup[] = [
    {
      category: 'NFT & Metadata Research',
      queries: [
        'Look up Elder Ent #001 metadata and traits',
        'Who owns Elder Ent #001 and is it listed?',
        'Find Chrono Glyphs NFT details'
      ]
    },
    {
      category: 'Collection Analytics',
      queries: [
        'Analyze Ents of Solana floor price and volume',
        'Show Chrono Glyphs supply and mint progress',
        'Compare Hyper Cubes and Ents royalty fees'
      ]
    },
    {
      category: 'Solana Wallets & Holdings',
      queries: [
        'Check balance for ACEp1aTfX7h8Kq3w9uV4y2z5L1m6NoP8qRsTuVwXyZ',
        'Lookup Krom9x87Hq6tLm2P4vSw5rYz8bAcD1eFgHiJkLmNoP portfolio',
        'Analyze my current wallet balance on Solana Devnet'
      ]
    },
    {
      category: 'Marketplace & Listings',
      queries: [
        'Find cheapest NFTs listed under 2 SOL',
        'Search all active marketplace listings',
        'Show newly minted items available for purchase'
      ]
    },
    {
      category: 'Auctions & Bidding',
      queries: [
        'Find active auctions and current high bids',
        'Explain auction reserve price rules on MINT',
        'Show auctions ending soon'
      ]
    },
    {
      category: 'Platform Rules & Guides',
      queries: [
        'What are the protocol fees for marketplace sales and auctions?',
        'How does collection launchpad deployment work on MINT?',
        'How do creator bounties and escrows work?'
      ]
    }
  ];

  res.json({ suggestions });
});
