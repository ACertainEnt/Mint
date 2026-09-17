import { Connection, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';

const RPC_URL = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
const connection = new Connection(RPC_URL, 'confirmed');

export interface OnChainWalletInfo {
  address: string;
  isValidPubkey: boolean;
  lamports: number;
  solBalance: number;
  recentSignatures: string[];
  accountOwner?: string;
  isExecutable?: boolean;
  rpcNetwork: string;
  rpcUrl: string;
  confirmedAtSlot?: number;
  error?: string;
}

export interface OnChainTxInfo {
  signature: string;
  isConfirmed: boolean;
  confirmationStatus: string;
  slot?: number;
  err?: any;
  explorerUrl: string;
}

export class SolanaOnChainData {
  /**
   * Fetch live balance and recent activity directly from Solana RPC node
   */
  public static async getWalletInfo(address: string): Promise<OnChainWalletInfo> {
    const cleanAddr = address.trim();
    try {
      const pubkey = new PublicKey(cleanAddr);
      
      // Fetch balance and signatures concurrently
      const [lamports, signatures, accountInfo, slot] = await Promise.all([
        connection.getBalance(pubkey),
        connection.getSignaturesForAddress(pubkey, { limit: 5 }).catch(() => []),
        connection.getAccountInfo(pubkey).catch(() => null),
        connection.getSlot().catch(() => undefined)
      ]);

      const solBalance = lamports / LAMPORTS_PER_SOL;

      return {
        address: cleanAddr,
        isValidPubkey: true,
        lamports,
        solBalance: Math.round(solBalance * 10000) / 10000,
        recentSignatures: signatures.map(s => s.signature),
        accountOwner: accountInfo?.owner.toBase58(),
        isExecutable: accountInfo?.executable,
        rpcNetwork: 'Solana Devnet',
        rpcUrl: RPC_URL.replace(/(\?|&)api-key=[^&]+/, ''), // sanitize any embedded key if present
        confirmedAtSlot: slot
      };
    } catch (err: any) {
      return {
        address: cleanAddr,
        isValidPubkey: false,
        lamports: 0,
        solBalance: 0,
        recentSignatures: [],
        rpcNetwork: 'Solana Devnet',
        rpcUrl: RPC_URL.replace(/(\?|&)api-key=[^&]+/, ''),
        error: `Invalid Solana base58 public key or RPC network error: ${err.message}`
      };
    }
  }

  /**
   * Fetch transaction confirmation status directly from RPC
   */
  public static async verifyTransaction(signature: string): Promise<OnChainTxInfo> {
    const cleanSig = signature.trim();
    try {
      const status = await connection.getSignatureStatus(cleanSig, { searchTransactionHistory: true });
      const isConfirmed = !!(
        status.value && 
        (status.value.confirmationStatus === 'confirmed' || status.value.confirmationStatus === 'finalized')
      );

      return {
        signature: cleanSig,
        isConfirmed,
        confirmationStatus: status.value?.confirmationStatus || 'not_found',
        slot: status.value?.slot,
        err: status.value?.err || null,
        explorerUrl: `https://explorer.solana.com/tx/${cleanSig}?cluster=devnet`
      };
    } catch (err: any) {
      return {
        signature: cleanSig,
        isConfirmed: false,
        confirmationStatus: 'rpc_error',
        err: err.message,
        explorerUrl: `https://explorer.solana.com/tx/${cleanSig}?cluster=devnet`
      };
    }
  }

  /**
   * Get RPC node health
   */
  public static async checkRpcHealth(): Promise<{ status: 'online' | 'unreachable'; latencyMs?: number; slot?: number }> {
    const start = Date.now();
    try {
      const slot = await connection.getSlot('confirmed');
      return {
        status: 'online',
        latencyMs: Date.now() - start,
        slot
      };
    } catch {
      return {
        status: 'unreachable'
      };
    }
  }
}
