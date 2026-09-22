export interface OnChainWalletInfo {
  address: string;
  isValidPubkey: boolean;
  microAlgos: number;
  balance: number;
  recentSignatures: string[];
  accountOwner?: string;
  rpcNetwork: string;
  rpcUrl: string;
  confirmedAtRound?: number;
  error?: string;
}

export interface OnChainTxInfo {
  txId: string;
  isConfirmed: boolean;
  confirmationStatus: string;
  round?: number;
  err?: any;
  explorerUrl: string;
}

const ALGOD_SERVER = process.env.ALGORAND_ALGOD_SERVER || 'https://testnet-api.algonode.cloud';
const ALGOD_TOKEN = process.env.ALGORAND_ALGOD_TOKEN || '';

export class AlgorandOnChainData {
  /**
   * Validate Algorand 58-character public address format
   */
  public static isValidAlgorandAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false;
    const clean = address.trim().toUpperCase();
    return clean.length === 58 && /^[A-Z2-7]{58}$/.test(clean);
  }

  /**
   * Fetch live balance and recent activity directly from Algorand Algod/Indexer node
   */
  public static async getWalletInfo(address: string): Promise<OnChainWalletInfo> {
    const cleanAddr = address.trim().toUpperCase();
    const isValid = this.isValidAlgorandAddress(cleanAddr);

    if (!isValid) {
      return {
        address: cleanAddr,
        isValidPubkey: false,
        microAlgos: 0,
        balance: 0,
        recentSignatures: [],
        rpcNetwork: 'Algorand Testnet',
        rpcUrl: ALGOD_SERVER,
        error: 'Address is not a valid 58-character Algorand public key (Base32 format).'
      };
    }

    try {
      const resp = await fetch(`${ALGOD_SERVER}/v2/accounts/${cleanAddr}`, {
        headers: ALGOD_TOKEN ? { 'X-Algo-API-Token': ALGOD_TOKEN } : {}
      });

      if (resp.ok) {
        const account = await resp.json();
        const microAlgos = account.amount || 0;
        const balance = Math.round((microAlgos / 1000000) * 10000) / 10000;

        return {
          address: cleanAddr,
          isValidPubkey: true,
          microAlgos,
          balance,
          recentSignatures: [],
          rpcNetwork: 'Algorand Testnet',
          rpcUrl: ALGOD_SERVER,
          confirmedAtRound: account.round
        };
      } else if (resp.status === 404) {
        return {
          address: cleanAddr,
          isValidPubkey: true,
          microAlgos: 0,
          balance: 0,
          recentSignatures: [],
          rpcNetwork: 'Algorand Testnet',
          rpcUrl: ALGOD_SERVER,
          error: 'Account not yet funded or registered on Algorand ledger.'
        };
      } else {
        return {
          address: cleanAddr,
          isValidPubkey: true,
          microAlgos: 0,
          balance: 0,
          recentSignatures: [],
          rpcNetwork: 'Algorand Testnet',
          rpcUrl: ALGOD_SERVER,
          error: `Algod node returned status ${resp.status}`
        };
      }
    } catch (err: any) {
      return {
        address: cleanAddr,
        isValidPubkey: true,
        microAlgos: 0,
        balance: 0,
        recentSignatures: [],
        rpcNetwork: 'Algorand Testnet',
        rpcUrl: ALGOD_SERVER,
        error: `Algorand node connection: ${err.message}`
      };
    }
  }

  /**
   * Fetch transaction confirmation status directly from Algorand node
   */
  public static async verifyTransaction(txId: string): Promise<OnChainTxInfo> {
    const cleanTx = txId.trim();
    try {
      const resp = await fetch(`${ALGOD_SERVER}/v2/transactions/pending/${cleanTx}`, {
        headers: ALGOD_TOKEN ? { 'X-Algo-API-Token': ALGOD_TOKEN } : {}
      });

      if (resp.ok) {
        const pending = await resp.json();
        const isConfirmed = Boolean(pending['confirmed-round'] && pending['confirmed-round'] > 0);
        return {
          txId: cleanTx,
          isConfirmed,
          confirmationStatus: isConfirmed ? 'confirmed' : 'pending',
          round: pending['confirmed-round'],
          explorerUrl: `https://testnet.explorer.perawallet.app/tx/${cleanTx}`
        };
      }

      return {
        txId: cleanTx,
        isConfirmed: false,
        confirmationStatus: 'pending_or_archived',
        explorerUrl: `https://testnet.explorer.perawallet.app/tx/${cleanTx}`
      };
    } catch (err: any) {
      return {
        txId: cleanTx,
        isConfirmed: false,
        confirmationStatus: 'rpc_error',
        err: err.message,
        explorerUrl: `https://testnet.explorer.perawallet.app/tx/${cleanTx}`
      };
    }
  }

  /**
   * Get RPC node health
   */
  public static async checkRpcHealth(): Promise<{ status: 'online' | 'unreachable'; latencyMs?: number; round?: number }> {
    const start = Date.now();
    try {
      const resp = await fetch(`${ALGOD_SERVER}/v2/status`, {
        headers: ALGOD_TOKEN ? { 'X-Algo-API-Token': ALGOD_TOKEN } : {},
        signal: AbortSignal.timeout(3000)
      });
      const latencyMs = Date.now() - start;
      if (resp.ok) {
        const data = await resp.json();
        return { status: 'online', latencyMs, round: data['last-round'] };
      }
      return { status: 'unreachable', latencyMs };
    } catch {
      return { status: 'unreachable', latencyMs: Date.now() - start };
    }
  }
}
