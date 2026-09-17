import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { Auction, AuctionBid, ActivityEvent, Notification } from '../../src/types';

export const auctionsRouter = Router();

// Get auctions
auctionsRouter.get('/', (req, res) => {
  const { status, creatorId, sort } = req.query;
  const database = db.get();
  let auctions = [...database.auctions];

  if (status && typeof status === 'string') {
    auctions = auctions.filter(a => a.status === status);
  }

  if (creatorId && typeof creatorId === 'string') {
    auctions = auctions.filter(a => a.creatorId === creatorId || a.creatorUsername.toLowerCase() === creatorId.toLowerCase());
  }

  if (sort === 'ending_soon') {
    auctions.sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime());
  } else if (sort === 'bids') {
    auctions.sort((a, b) => b.bidCount - a.bidCount);
  } else if (sort === 'price_high') {
    auctions.sort((a, b) => b.currentBid - a.currentBid);
  } else {
    // Newest
    auctions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }

  res.json({ auctions });
});

// Get single auction
auctionsRouter.get('/:id', (req, res) => {
  const database = db.get();
  const auction = database.auctions.find(a => a.id === req.params.id);
  if (!auction) {
    return res.status(404).json({ error: 'Auction not found' });
  }

  // Check if auction has expired in real time
  const now = Date.now();
  const endTime = new Date(auction.endTime).getTime();
  if (now > endTime && auction.status === 'active') {
    // Auto mark as expired/ready for settlement
    if (auction.bidCount > 0) {
      // Settleable
    } else {
      auction.status = 'expired';
      // Release NFT
      const nft = database.nfts.find(n => n.id === auction.nftId);
      if (nft) {
        nft.isInAuction = false;
        nft.auctionId = undefined;
      }
      db.save(database);
    }
  }

  res.json({ auction });
});

// Create Auction with custom title
auctionsRouter.post('/', requireAuth, (req: AuthenticatedRequest, res) => {
  const {
    customTitle,
    nftId,
    startingPrice,
    reservePrice,
    buyNowPrice,
    durationHours,
    minBidIncrement,
    description
  } = req.body;

  if (!customTitle || !nftId || startingPrice === undefined) {
    return res.status(400).json({ error: 'Custom title, NFT ID, and starting price are required' });
  }

  const database = db.get();
  const nft = database.nfts.find(n => n.id === nftId);
  if (!nft) {
    return res.status(404).json({ error: 'NFT not found' });
  }

  // Must own NFT
  if (nft.ownerId !== req.user!.id && nft.ownerAddress?.toLowerCase() !== req.user!.walletAddress?.toLowerCase()) {
    return res.status(403).json({ error: 'You can only create an auction for an NFT you currently own' });
  }

  if (nft.isListed || nft.isInAuction) {
    return res.status(400).json({ error: 'NFT is already listed or in an active auction' });
  }

  const hours = Number(durationHours) || 24;
  const startTime = new Date().toISOString();
  const endTime = new Date(Date.now() + hours * 3600 * 1000).toISOString();
  const auctionId = `auc_${crypto.randomBytes(8).toString('hex')}`;

  const newAuction: Auction = {
    id: auctionId,
    customTitle: customTitle.trim(),
    nftId: nft.id,
    nft: { ...nft, isInAuction: true, auctionId },
    creatorId: req.user!.id,
    creatorName: req.user!.displayName,
    creatorUsername: req.user!.username,
    creatorAvatar: req.user!.avatar,
    creatorVerified: req.user!.isVerified,
    startingPrice: Number(startingPrice),
    reservePrice: reservePrice ? Number(reservePrice) : undefined,
    buyNowPrice: buyNowPrice ? Number(buyNowPrice) : undefined,
    currency: 'SOL',
    startTime,
    endTime,
    minBidIncrement: minBidIncrement ? Number(minBidIncrement) : 0.05,
    currentBid: Number(startingPrice),
    bidCount: 0,
    status: 'active',
    bids: [],
    description: description?.trim()
  };

  nft.isInAuction = true;
  nft.auctionId = auctionId;
  nft.isListed = false;

  database.auctions.push(newAuction);

  // Activity
  const act: ActivityEvent = {
    id: `act_${Date.now()}`,
    type: 'auction_created',
    nftId: nft.id,
    nftName: newAuction.customTitle,
    nftImage: nft.image,
    collectionId: nft.collectionId,
    collectionName: nft.collectionName,
    fromAddress: req.user!.walletAddress || req.user!.username,
    fromUsername: req.user!.username,
    price: newAuction.startingPrice,
    timestamp: new Date().toISOString()
  };
  database.activity.unshift(act);

  db.save(database);
  res.status(201).json({ auction: newAuction });
});

// Place bid on auction
auctionsRouter.post('/:id/bid', requireAuth, (req: AuthenticatedRequest, res) => {
  const { amount, txSignature } = req.body;
  const numAmount = Number(amount);

  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'Valid bid amount in SOL is required' });
  }

  const database = db.get();
  const auction = database.auctions.find(a => a.id === req.params.id);
  if (!auction) {
    return res.status(404).json({ error: 'Auction not found' });
  }

  if (auction.status !== 'active') {
    return res.status(400).json({ error: 'This auction is no longer active' });
  }

  if (new Date(auction.endTime).getTime() <= Date.now()) {
    return res.status(400).json({ error: 'Auction has already ended' });
  }

  const bidder = req.user!;
  if (auction.creatorId === bidder.id) {
    return res.status(400).json({ error: 'Creators cannot bid on their own auctions' });
  }

  // Min bid check
  const minRequired = auction.bidCount === 0 
    ? auction.startingPrice 
    : auction.currentBid + auction.minBidIncrement;

  if (numAmount < minRequired) {
    return res.status(400).json({ 
      error: `Bid must be at least ${minRequired.toFixed(2)} SOL (current bid: ${auction.currentBid} + increment: ${auction.minBidIncrement})` 
    });
  }

  const prevHighestBidderId = auction.currentBidderId;
  const prevHighestBidderUsername = auction.currentBidderUsername;

  const newBid: AuctionBid = {
    id: `bid_${Date.now()}`,
    bidderId: bidder.id,
    bidderUsername: bidder.username,
    bidderAddress: bidder.walletAddress || 'Solana_Devnet_Bidder',
    bidderAvatar: bidder.avatar,
    amount: numAmount,
    timestamp: new Date().toISOString(),
    txSignature: txSignature || `tx_bid_${crypto.randomBytes(8).toString('hex')}`
  };

  auction.bids.unshift(newBid);
  auction.currentBid = numAmount;
  auction.currentBidderId = bidder.id;
  auction.currentBidderUsername = bidder.username;
  auction.currentBidderAddress = bidder.walletAddress;
  auction.bidCount += 1;

  // Check if buyNow triggered
  let immediateBuy = false;
  if (auction.buyNowPrice && numAmount >= auction.buyNowPrice) {
    immediateBuy = true;
    auction.status = 'settled';
    auction.winnerId = bidder.id;
    auction.winnerAddress = bidder.walletAddress;
    auction.settledAt = new Date().toISOString();

    // Transfer NFT
    const nft = database.nfts.find(n => n.id === auction.nftId);
    if (nft) {
      nft.ownerId = bidder.id;
      nft.ownerAddress = bidder.walletAddress || 'Solana_Devnet_Winner';
      nft.ownerUsername = bidder.username;
      nft.isInAuction = false;
      nft.auctionId = undefined;
      nft.lastSalePrice = numAmount;
    }
  }

  // Activity
  const act: ActivityEvent = {
    id: `act_${Date.now()}`,
    type: 'bid',
    nftId: auction.nftId,
    nftName: auction.customTitle,
    nftImage: auction.nft.image,
    collectionId: auction.nft.collectionId,
    collectionName: auction.nft.collectionName,
    fromAddress: bidder.walletAddress || bidder.username,
    fromUsername: bidder.username,
    price: numAmount,
    txSignature: newBid.txSignature,
    timestamp: new Date().toISOString()
  };
  database.activity.unshift(act);

  // Notify outbid user
  if (prevHighestBidderId && prevHighestBidderId !== bidder.id) {
    database.notifications.unshift({
      id: `notif_${Date.now()}_outbid`,
      userId: prevHighestBidderId,
      title: 'You Were Outbid!',
      message: `@${bidder.username} placed a higher bid of ${numAmount} SOL on "${auction.customTitle}".`,
      type: 'outbid',
      read: false,
      link: `/auctions/${auction.id}`,
      timestamp: new Date().toISOString()
    });
  }

  // Notify creator
  database.notifications.unshift({
    id: `notif_${Date.now()}_creator`,
    userId: auction.creatorId,
    title: immediateBuy ? 'Auction Buy-Now Triggered!' : 'New Bid on Auction',
    message: `@${bidder.username} ${immediateBuy ? 'instantly bought' : 'bid'} ${numAmount} SOL on your auction "${auction.customTitle}".`,
    type: 'bid',
    read: false,
    link: `/auctions/${auction.id}`,
    timestamp: new Date().toISOString()
  });

  db.save(database);
  res.json({ auction, newBid, immediateBuy });
});

// Settle auction (by creator or winner after endTime)
auctionsRouter.post('/:id/settle', requireAuth, (req: AuthenticatedRequest, res) => {
  const database = db.get();
  const auction = database.auctions.find(a => a.id === req.params.id);
  if (!auction) {
    return res.status(404).json({ error: 'Auction not found' });
  }

  if (auction.status === 'settled') {
    return res.status(400).json({ error: 'Auction has already been settled' });
  }

  const isExpired = new Date(auction.endTime).getTime() <= Date.now();
  if (!isExpired) {
    return res.status(400).json({ error: 'Auction is still active; cannot settle before deadline' });
  }

  if (auction.bidCount === 0 || !auction.currentBidderId) {
    auction.status = 'expired';
    const nft = database.nfts.find(n => n.id === auction.nftId);
    if (nft) {
      nft.isInAuction = false;
      nft.auctionId = undefined;
    }
    db.save(database);
    return res.json({ auction, message: 'Auction ended with zero bids and has been released.' });
  }

  auction.status = 'settled';
  auction.winnerId = auction.currentBidderId;
  auction.winnerAddress = auction.currentBidderAddress;
  auction.settledAt = new Date().toISOString();

  // Transfer NFT
  const nft = database.nfts.find(n => n.id === auction.nftId);
  if (nft) {
    nft.ownerId = auction.currentBidderId;
    nft.ownerAddress = auction.currentBidderAddress || 'Solana_Devnet_Winner';
    nft.ownerUsername = auction.currentBidderUsername;
    nft.isInAuction = false;
    nft.auctionId = undefined;
    nft.lastSalePrice = auction.currentBid;
  }

  // Notifications
  database.notifications.unshift({
    id: `notif_${Date.now()}_won`,
    userId: auction.currentBidderId,
    title: 'Auction Won!',
    message: `Congratulations! You won "${auction.customTitle}" for ${auction.currentBid} SOL.`,
    type: 'auction_won',
    read: false,
    link: `/nft/${auction.nftId}`,
    timestamp: new Date().toISOString()
  });

  const act: ActivityEvent = {
    id: `act_${Date.now()}`,
    type: 'auction_settled',
    nftId: auction.nftId,
    nftName: auction.customTitle,
    nftImage: auction.nft.image,
    collectionId: auction.nft.collectionId,
    collectionName: auction.nft.collectionName,
    fromAddress: auction.creatorUsername,
    fromUsername: auction.creatorUsername,
    toAddress: auction.currentBidderAddress || auction.currentBidderUsername,
    toUsername: auction.currentBidderUsername,
    price: auction.currentBid,
    timestamp: new Date().toISOString()
  };
  database.activity.unshift(act);

  db.save(database);
  res.json({ auction, success: true });
});
