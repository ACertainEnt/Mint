import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { NFT, NFTCollection, ActivityEvent, Notification } from '../../src/types';

export const nftsRouter = Router();

// Get collections
nftsRouter.get('/collections', (req, res) => {
  const { creatorId, search, sort } = req.query;
  const database = db.get();
  let collections = [...database.collections];

  if (creatorId && typeof creatorId === 'string') {
    collections = collections.filter(c => c.creatorId === creatorId || c.creatorUsername.toLowerCase() === creatorId.toLowerCase());
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    collections = collections.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.symbol.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
    );
  }

  if (sort === 'volume') {
    collections.sort((a, b) => b.totalVolume - a.totalVolume);
  } else if (sort === 'floor') {
    collections.sort((a, b) => b.floorPrice - a.floorPrice);
  } else {
    // Newest
    collections.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  res.json({ collections });
});

// Get single collection
nftsRouter.get('/collections/:id', (req, res) => {
  const database = db.get();
  const collection = database.collections.find(c => c.id === req.params.id);
  if (!collection) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  const nfts = database.nfts.filter(n => n.collectionId === collection.id);
  res.json({ collection, nfts });
});

// Create new collection (Launch)
nftsRouter.post('/collections', requireAuth, (req: AuthenticatedRequest, res) => {
  const {
    name,
    symbol,
    description,
    category,
    image,
    banner,
    totalSupply,
    mintPrice,
    currency,
    royaltyFee,
    socialLinks,
    walletMintLimit,
    mintStartTime,
    mintEndTime,
    deployTxSignature
  } = req.body;

  const database = db.get();
  const cfg = database.config.launchConfig || {
    collectionCreationFeeSol: 0.05,
    estimatedNetworkFeeSol: 0.012,
    minSupply: 1,
    maxSupply: 10000,
    minMintPriceSol: 0,
    maxMintPriceSol: 100,
    maxRoyaltyPercent: 15,
    defaultWalletLimit: 5,
    maxWalletLimit: 50,
    allowedCurrencies: ['SOL', 'USDC']
  };

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Collection name is required (up to 50 characters).' });
  }

  if (!symbol || typeof symbol !== 'string' || !symbol.trim()) {
    return res.status(400).json({ error: 'Collection symbol is required (2-10 alphanumeric characters).' });
  }

  const cleanSymbol = symbol.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (cleanSymbol.length < 2 || cleanSymbol.length > 10) {
    return res.status(400).json({ error: 'Collection symbol must be between 2 and 10 alphanumeric characters.' });
  }

  if (!image || typeof image !== 'string' || !image.trim()) {
    return res.status(400).json({ error: 'Collection artwork/logo is required. Please upload your artwork.' });
  }

  // Supply validation: whole number only, within allowed range
  const numSupply = Number(totalSupply);
  if (isNaN(numSupply) || !Number.isInteger(numSupply) || numSupply < cfg.minSupply || numSupply > cfg.maxSupply) {
    return res.status(400).json({
      error: `Total NFT supply must be an integer between ${cfg.minSupply.toLocaleString()} and ${cfg.maxSupply.toLocaleString()}.`
    });
  }

  // Mint price validation
  const numPrice = Number(mintPrice);
  if (isNaN(numPrice) || numPrice < cfg.minMintPriceSol || numPrice > cfg.maxMintPriceSol) {
    return res.status(400).json({
      error: `Mint price must be between ${cfg.minMintPriceSol} and ${cfg.maxMintPriceSol} SOL.`
    });
  }

  // Currency validation
  const validCurrency = currency && cfg.allowedCurrencies.includes(currency) ? currency : 'SOL';

  // Royalty fee validation
  const numRoyalty = royaltyFee !== undefined ? Number(royaltyFee) : 5;
  if (isNaN(numRoyalty) || numRoyalty < 0 || numRoyalty > cfg.maxRoyaltyPercent) {
    return res.status(400).json({
      error: `Royalty fee must be between 0% and ${cfg.maxRoyaltyPercent}%.`
    });
  }

  // Wallet mint limit
  const numWalletLimit = walletMintLimit !== undefined && walletMintLimit !== null
    ? Math.max(1, Math.min(cfg.maxWalletLimit, Number(walletMintLimit)))
    : cfg.defaultWalletLimit;

  const user = req.user!;

  // Generate Algorand asset contract address
  const randomAddress = `COL${crypto.randomBytes(16).toString('hex').slice(0, 32).toUpperCase()}`;
  const collectionId = `col_${cleanSymbol.toLowerCase()}_${crypto.randomBytes(4).toString('hex')}`;

  const newCollection: NFTCollection = {
    id: collectionId,
    creatorId: user.id,
    creatorAddress: user.walletAddress || 'Pending_Wallet_Binding',
    creatorUsername: user.username,
    name: name.trim().slice(0, 60),
    symbol: cleanSymbol,
    description: description?.trim() || '',
    category: category || 'art',
    currency: validCurrency,
    image: image.trim(),
    banner: banner?.trim() || image.trim(),
    totalSupply: numSupply,
    mintedSupply: 0,
    mintPrice: numPrice,
    royaltyFee: numRoyalty,
    contractAddress: randomAddress,
    isVerified: user.isVerified,
    socialLinks: socialLinks || {},
    floorPrice: numPrice,
    totalVolume: 0,
    listedCount: 0,
    createdAt: new Date().toISOString(),
    isLive: true,
    walletMintLimit: numWalletLimit,
    mintStartTime: mintStartTime || undefined,
    mintEndTime: mintEndTime || undefined,
    deployTxSignature: deployTxSignature || undefined
  };

  database.collections.push(newCollection);

  // Record activity
  const act: ActivityEvent = {
    id: `act_${Date.now()}`,
    type: 'collection_created',
    collectionId: newCollection.id,
    collectionName: newCollection.name,
    fromAddress: user.walletAddress || user.username,
    fromUsername: user.username,
    price: newCollection.mintPrice,
    timestamp: new Date().toISOString()
  };
  database.activity.unshift(act);

  db.save(database);
  res.status(201).json({ collection: newCollection });
});

// Get NFTs
nftsRouter.get('/nfts', (req, res) => {
  const { collectionId, creatorId, ownerId, status, sort, search } = req.query;
  const database = db.get();
  let nfts = [...database.nfts];

  if (collectionId && typeof collectionId === 'string') {
    nfts = nfts.filter(n => n.collectionId === collectionId);
  }

  if (creatorId && typeof creatorId === 'string') {
    nfts = nfts.filter(n => n.creatorId === creatorId || n.creatorUsername.toLowerCase() === creatorId.toLowerCase());
  }

  if (ownerId && typeof ownerId === 'string') {
    nfts = nfts.filter(n => n.ownerId === ownerId || n.ownerAddress?.toLowerCase() === ownerId.toLowerCase());
  }

  if (status === 'listed') {
    nfts = nfts.filter(n => n.isListed);
  } else if (status === 'auction') {
    nfts = nfts.filter(n => n.isInAuction);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    nfts = nfts.filter(n => 
      n.name.toLowerCase().includes(q) || 
      n.collectionName.toLowerCase().includes(q) ||
      n.description.toLowerCase().includes(q)
    );
  }

  if (sort === 'price_asc') {
    nfts.sort((a, b) => (a.price || 999999) - (b.price || 999999));
  } else if (sort === 'price_desc') {
    nfts.sort((a, b) => (b.price || 0) - (a.price || 0));
  } else if (sort === 'likes') {
    nfts.sort((a, b) => b.likes - a.likes);
  } else {
    nfts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  res.json({ nfts });
});

// Get single NFT
nftsRouter.get('/nfts/:id', (req, res) => {
  const database = db.get();
  const nft = database.nfts.find(n => n.id === req.params.id);
  if (!nft) {
    return res.status(404).json({ error: 'NFT not found' });
  }

  // Find active auction if any
  const auction = nft.isInAuction ? database.auctions.find(a => a.nftId === nft.id && a.status === 'active') : null;
  const collection = database.collections.find(c => c.id === nft.collectionId);
  const populatedNft: NFT = {
    ...nft,
    contractAddress: nft.contractAddress || collection?.contractAddress || nft.tokenAddress,
    tokenId: nft.tokenId || nft.id
  };

  res.json({ nft: populatedNft, auction, collection });
});

// Mint NFT into collection
nftsRouter.post('/nfts/mint', requireAuth, (req: AuthenticatedRequest, res) => {
  const { collectionId, txSignature, traits } = req.body;

  if (!collectionId) {
    return res.status(400).json({ error: 'Collection ID is required' });
  }

  const database = db.get();
  const collection = database.collections.find(c => c.id === collectionId);
  if (!collection) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  if (collection.mintedSupply >= collection.totalSupply) {
    return res.status(400).json({ error: 'Collection is completely minted out' });
  }

  const user = req.user!;
  const mintIndex = collection.mintedSupply + 1;
  const tokenAddress = `NFT${crypto.randomBytes(16).toString('hex').slice(0, 32)}`;
  const nftId = `nft_${collection.symbol.toLowerCase()}_${mintIndex}`;

  const newNft: NFT = {
    id: nftId,
    collectionId: collection.id,
    collectionName: collection.name,
    collectionSymbol: collection.symbol,
    name: `${collection.name} #${mintIndex.toString().padStart(3, '0')}`,
    description: `Original edition #${mintIndex} minted from the verified ${collection.name} collection on Algorand.`,
    image: collection.image,
    tokenAddress,
    creatorId: collection.creatorId,
    creatorName: collection.name,
    creatorUsername: collection.creatorUsername,
    creatorAvatar: collection.image,
    creatorVerified: collection.isVerified,
    ownerId: user.id,
    ownerAddress: user.walletAddress || 'Algorand_Testnet_Holder',
    ownerUsername: user.username,
    isListed: false,
    isInAuction: false,
    traits: traits || [
      { trait_type: 'Generation', value: 'Genesis' },
      { trait_type: 'Edition', value: `#${mintIndex}` },
      { trait_type: 'Mint Stage', value: 'Public Wave' }
    ],
    createdAt: new Date().toISOString(),
    views: 1,
    likes: 0,
    blockchain: 'Algorand'
  };

  collection.mintedSupply += 1;
  database.nfts.push(newNft);

  // Record mint event
  const act: ActivityEvent = {
    id: `act_${Date.now()}`,
    type: 'mint',
    nftId: newNft.id,
    nftName: newNft.name,
    nftImage: newNft.image,
    collectionId: collection.id,
    collectionName: collection.name,
    toAddress: user.walletAddress || user.username,
    toUsername: user.username,
    price: collection.mintPrice,
    txSignature: txSignature || `tx_${crypto.randomBytes(16).toString('hex')}`,
    timestamp: new Date().toISOString()
  };
  database.activity.unshift(act);

  // Notification
  const notif: Notification = {
    id: `notif_${Date.now()}`,
    userId: user.id,
    title: 'NFT Mint Confirmed',
    message: `You successfully minted ${newNft.name}! Check your portfolio.`,
    type: 'system',
    read: false,
    link: `/nft/${newNft.id}`,
    timestamp: new Date().toISOString()
  };
  database.notifications.unshift(notif);

  db.save(database);
  res.status(201).json({ nft: newNft, collection });
});

// List NFT for sale
nftsRouter.post('/nfts/:id/list', requireAuth, (req: AuthenticatedRequest, res) => {
  const { price } = req.body;
  const numPrice = Number(price);

  if (!numPrice || numPrice <= 0) {
    return res.status(400).json({ error: 'Valid sale price in SOL is required' });
  }

  const database = db.get();
  const nft = database.nfts.find(n => n.id === req.params.id);
  if (!nft) {
    return res.status(404).json({ error: 'NFT not found' });
  }

  // Authorization check
  if (nft.ownerId !== req.user!.id && nft.ownerAddress?.toLowerCase() !== req.user!.walletAddress?.toLowerCase()) {
    return res.status(403).json({ error: 'Only the current owner can list this NFT' });
  }

  if (nft.isInAuction) {
    return res.status(400).json({ error: 'Cannot list an NFT currently in an active auction' });
  }

  nft.isListed = true;
  nft.price = numPrice;

  // Update collection listedCount & floorPrice if applicable
  const col = database.collections.find(c => c.id === nft.collectionId);
  if (col) {
    const listedInCol = database.nfts.filter(n => n.collectionId === col.id && n.isListed && n.price);
    col.listedCount = listedInCol.length;
    if (col.floorPrice === 0 || numPrice < col.floorPrice) {
      col.floorPrice = numPrice;
    }
  }

  // Activity
  const act: ActivityEvent = {
    id: `act_${Date.now()}`,
    type: 'listing',
    nftId: nft.id,
    nftName: nft.name,
    nftImage: nft.image,
    collectionId: nft.collectionId,
    collectionName: nft.collectionName,
    fromAddress: req.user!.walletAddress || req.user!.username,
    fromUsername: req.user!.username,
    price: numPrice,
    timestamp: new Date().toISOString()
  };
  database.activity.unshift(act);

  db.save(database);
  res.json({ nft });
});

// Delist NFT
nftsRouter.post('/nfts/:id/delist', requireAuth, (req: AuthenticatedRequest, res) => {
  const database = db.get();
  const nft = database.nfts.find(n => n.id === req.params.id);
  if (!nft) {
    return res.status(404).json({ error: 'NFT not found' });
  }

  // Authorization check
  if (nft.ownerId !== req.user!.id && nft.ownerAddress?.toLowerCase() !== req.user!.walletAddress?.toLowerCase()) {
    return res.status(403).json({ error: 'Only the current owner can delist this NFT' });
  }

  nft.isListed = false;
  nft.price = undefined;

  // Activity
  const act: ActivityEvent = {
    id: `act_${Date.now()}`,
    type: 'delisting',
    nftId: nft.id,
    nftName: nft.name,
    nftImage: nft.image,
    collectionId: nft.collectionId,
    collectionName: nft.collectionName,
    fromAddress: req.user!.walletAddress || req.user!.username,
    fromUsername: req.user!.username,
    timestamp: new Date().toISOString()
  };
  database.activity.unshift(act);

  db.save(database);
  res.json({ nft });
});

// Buy NFT
nftsRouter.post('/nfts/:id/buy', requireAuth, (req: AuthenticatedRequest, res) => {
  const { txSignature } = req.body;
  const database = db.get();
  const nft = database.nfts.find(n => n.id === req.params.id);
  if (!nft) {
    return res.status(404).json({ error: 'NFT not found' });
  }

  if (!nft.isListed || !nft.price) {
    return res.status(400).json({ error: 'This NFT is not currently listed for sale' });
  }

  const buyer = req.user!;
  if (nft.ownerId === buyer.id) {
    return res.status(400).json({ error: 'You already own this NFT' });
  }

  const prevOwnerId = nft.ownerId;
  const prevOwnerUsername = nft.ownerUsername;
  const salePrice = nft.price;

  // Transfer ownership
  nft.ownerId = buyer.id;
  nft.ownerAddress = buyer.walletAddress || 'Algorand_Testnet_Holder';
  nft.ownerUsername = buyer.username;
  nft.isListed = false;
  nft.price = undefined;
  nft.lastSalePrice = salePrice;

  // Update collection volume
  const col = database.collections.find(c => c.id === nft.collectionId);
  if (col) {
    col.totalVolume = Number((col.totalVolume + salePrice).toFixed(3));
    const listedInCol = database.nfts.filter(n => n.collectionId === col.id && n.isListed);
    col.listedCount = listedInCol.length;
  }

  // Activity event
  const act: ActivityEvent = {
    id: `act_${Date.now()}`,
    type: 'sale',
    nftId: nft.id,
    nftName: nft.name,
    nftImage: nft.image,
    collectionId: nft.collectionId,
    collectionName: nft.collectionName,
    fromAddress: prevOwnerUsername,
    fromUsername: prevOwnerUsername,
    toAddress: buyer.walletAddress || buyer.username,
    toUsername: buyer.username,
    price: salePrice,
    txSignature: txSignature || `tx_${crypto.randomBytes(16).toString('hex')}`,
    timestamp: new Date().toISOString()
  };
  database.activity.unshift(act);

  // Notify seller
  if (prevOwnerId) {
    database.notifications.unshift({
      id: `notif_${Date.now()}_seller`,
      userId: prevOwnerId,
      title: 'NFT Sold!',
      message: `Your item "${nft.name}" was purchased by @${buyer.username} for ${salePrice} SOL.`,
      type: 'sale',
      read: false,
      link: `/nft/${nft.id}`,
      timestamp: new Date().toISOString()
    });
  }

  // Notify buyer
  database.notifications.unshift({
    id: `notif_${Date.now()}_buyer`,
    userId: buyer.id,
    title: 'NFT Purchased!',
    message: `Congratulations! You are now the verified owner of "${nft.name}".`,
    type: 'sale',
    read: false,
    link: `/nft/${nft.id}`,
    timestamp: new Date().toISOString()
  });

  db.save(database);
  res.json({ nft, success: true });
});

// Like / View NFT
nftsRouter.post('/nfts/:id/like', (req, res) => {
  const database = db.get();
  const nft = database.nfts.find(n => n.id === req.params.id);
  if (!nft) {
    return res.status(404).json({ error: 'NFT not found' });
  }

  nft.likes += 1;
  db.save(database);
  res.json({ likes: nft.likes });
});
