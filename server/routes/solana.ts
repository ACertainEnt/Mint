import { Router } from 'express';
import { Connection, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';

export const solanaRouter = Router();

const RPC_URL = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
const connection = new Connection(RPC_URL, 'confirmed');

// Get live Solana balance
solanaRouter.get('/balance/:address', async (req, res) => {
  const { address } = req.params;
  try {
    const pubkey = new PublicKey(address);
    const lamports = await connection.getBalance(pubkey);
    const sol = lamports / LAMPORTS_PER_SOL;
    res.json({
      address,
      lamports,
      sol,
      network: 'devnet',
      rpc: RPC_URL
    });
  } catch (err: any) {
    res.status(400).json({ error: 'Invalid Solana address or RPC unavailable', details: err.message });
  }
});

// Request devnet airdrop (1 SOL)
solanaRouter.post('/airdrop', async (req, res) => {
  const { address } = req.body;
  if (!address) {
    return res.status(400).json({ error: 'Solana wallet address is required' });
  }

  try {
    const pubkey = new PublicKey(address);
    const sig = await connection.requestAirdrop(pubkey, 1 * LAMPORTS_PER_SOL);
    
    // Wait for confirmation
    const latestBlockHash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: sig
    });

    const lamports = await connection.getBalance(pubkey);
    res.json({
      success: true,
      signature: sig,
      sol: lamports / LAMPORTS_PER_SOL,
      explorerUrl: `https://explorer.solana.com/tx/${sig}?cluster=devnet`
    });
  } catch (err: any) {
    console.error('Airdrop error:', err);
    res.status(429).json({ 
      error: 'Devnet faucet rate limit reached or RPC busy. Please wait a moment or request from faucet.solana.com', 
      details: err.message 
    });
  }
});

// Verify transaction on-chain
solanaRouter.post('/verify-tx', async (req, res) => {
  const { signature } = req.body;
  if (!signature) {
    return res.status(400).json({ error: 'Signature is required' });
  }

  try {
    const status = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });
    res.json({
      signature,
      confirmed: !!(status.value && (status.value.confirmationStatus === 'confirmed' || status.value.confirmationStatus === 'finalized')),
      confirmationStatus: status.value?.confirmationStatus || 'not_found',
      err: status.value?.err || null,
      slot: status.value?.slot
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to verify transaction on Solana RPC', details: err.message });
  }
});
