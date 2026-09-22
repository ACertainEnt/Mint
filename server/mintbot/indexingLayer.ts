export interface IndexerStatus {
  isConfigured: boolean;
  provider: string;
  supportedMethods: string[];
  message: string;
}

export interface ExternalAssetResult {
  assetId: string;
  found: boolean;
  metadata?: any;
  source: 'algorand_indexer' | 'mint_internal' | 'unindexed';
  note: string;
}

export class AlgorandNftIndexingLayer {
  private static indexerServer = process.env.ALGORAND_INDEXER_SERVER || '';
  private static indexerToken = process.env.ALGORAND_INDEXER_TOKEN || '';

  /**
   * Get current indexing layer status
   */
  public static getStatus(): IndexerStatus {
    const isConfigured = Boolean(this.indexerServer);
    const provider = isConfigured
      ? 'Algorand Indexer V2'
      : 'MINT Internal Protocol Indexer';

    return {
      isConfigured,
      provider,
      supportedMethods: [
        'getAssetById',
        'getAssetsByAccount',
        'searchAssets'
      ],
      message: isConfigured
        ? `External Algorand indexer is active via ${provider}.`
        : `External Algorand Indexer is not configured in environment. MintBot is operating on verified MINT Protocol collections, genesis drops, and ledger state.`
    };
  }

  /**
   * Query an asset by asset ID / ASA ID.
   * If external indexer is configured, queries it; otherwise clearly returns unindexed status without inventing fake data.
   */
  public static async queryExternalAsset(assetId: string): Promise<ExternalAssetResult> {
    if (!this.indexerServer) {
      return {
        assetId,
        found: false,
        source: 'unindexed',
        note: 'External Algorand Indexer is not configured in environment. Arbitrary unlisted ASAs outside MINT Protocol cannot be indexed without ALGORAND_INDEXER_SERVER.'
      };
    }

    try {
      const response = await fetch(`${this.indexerServer}/v2/assets/${encodeURIComponent(assetId)}`, {
        headers: this.indexerToken ? { 'X-Indexer-API-Token': this.indexerToken } : {}
      });

      if (!response.ok) {
        return {
          assetId,
          found: false,
          source: 'unindexed',
          note: `Algorand Indexer returned status ${response.status}`
        };
      }

      const data = await response.json();
      return {
        assetId,
        found: true,
        metadata: data.asset,
        source: 'algorand_indexer',
        note: 'Asset verified via Algorand Indexer V2'
      };
    } catch (err: any) {
      return {
        assetId,
        found: false,
        source: 'unindexed',
        note: `Indexer lookup error: ${err.message}`
      };
    }
  }
}
