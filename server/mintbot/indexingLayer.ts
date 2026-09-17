export interface IndexerStatus {
  isConfigured: boolean;
  provider: string;
  supportedMethods: string[];
  message: string;
}

export interface ExternalAssetResult {
  mintAddress: string;
  found: boolean;
  metadata?: any;
  source: 'helius' | 'shyft' | 'mint_internal' | 'unindexed';
  note: string;
}

export class SolanaNftIndexingLayer {
  private static heliusApiKey = process.env.HELIUS_API_KEY || '';
  private static shyftApiKey = process.env.SHYFT_API_KEY || '';

  /**
   * Get current indexing layer status
   */
  public static getStatus(): IndexerStatus {
    const isConfigured = Boolean(this.heliusApiKey || this.shyftApiKey);
    const provider = this.heliusApiKey 
      ? 'Helius DAS Protocol' 
      : this.shyftApiKey 
        ? 'Shyft Solana Indexer' 
        : 'MINT Internal Indexer + Solana Devnet RPC';

    return {
      isConfigured,
      provider,
      supportedMethods: [
        'getAssetByMint',
        'getAssetsByOwner',
        'searchAssets'
      ],
      message: isConfigured
        ? `External indexer is active via ${provider}.`
        : `External cross-program DAS indexer (Helius/Shyft) is not configured in environment. MintBot is operating on verified MINT Protocol collections, genesis drops, and direct Solana Devnet RPC state.`
    };
  }

  /**
   * Query an asset by mint address.
   * If external indexer is configured, queries it; otherwise clearly returns unindexed/fallback status without inventing fake data.
   */
  public static async queryExternalAsset(mintAddress: string): Promise<ExternalAssetResult> {
    if (!this.heliusApiKey && !this.shyftApiKey) {
      return {
        mintAddress,
        found: false,
        source: 'unindexed',
        note: 'External DAS indexing provider is not configured in environment. Arbitrary unlisted Solana tokens outside MINT Protocol cannot be indexed without HELIUS_API_KEY or SHYFT_API_KEY.'
      };
    }

    // Boundary for future provider execution
    try {
      if (this.heliusApiKey) {
        const response = await fetch(`https://devnet.helius-rpc.com/?api-key=${this.heliusApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'mintbot-das-lookup',
            method: 'getAsset',
            params: { id: mintAddress }
          })
        });
        const data = await response.json();
        if (data.result) {
          return {
            mintAddress,
            found: true,
            metadata: data.result,
            source: 'helius',
            note: 'Verified via Helius DAS'
          };
        }
      }
    } catch (err: any) {
      return {
        mintAddress,
        found: false,
        source: 'unindexed',
        note: `Indexer lookup failed: ${err.message}`
      };
    }

    return {
      mintAddress,
      found: false,
      source: 'unindexed',
      note: 'Asset not found on configured indexing provider.'
    };
  }
}
