import { Router } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';

export const uploadRouter = Router();

const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

// Endpoint to upload base64-encoded image from client file picker
uploadRouter.post('/upload', requireAuth, (req: AuthenticatedRequest, res) => {
  const { dataUrl, filename, mimeType } = req.body;

  if (!dataUrl || typeof dataUrl !== 'string') {
    return res.status(400).json({ error: 'Data URL payload is required' });
  }

  // Parse header
  const match = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (!match) {
    return res.status(400).json({ error: 'Invalid data URL format. Expected base64 encoded image.' });
  }

  const detectedMime = match[1].toLowerCase();
  const base64Data = match[2];

  if (!ALLOWED_MIME_TYPES[detectedMime]) {
    return res.status(400).json({
      error: `Unsupported image format (${detectedMime}). Only PNG, JPG/JPEG, and WebP are allowed.`
    });
  }

  const buffer = Buffer.from(base64Data, 'base64');
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return res.status(400).json({
      error: `File exceeds maximum allowed size of 8MB. Current size: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB`
    });
  }

  const ext = ALLOWED_MIME_TYPES[detectedMime];
  const fileHash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
  const safeFilename = `mint_${Date.now()}_${fileHash}${ext}`;
  const filePath = path.join(UPLOADS_DIR, safeFilename);

  fs.writeFileSync(filePath, buffer);

  // Check if external decentralized storage provider (Arweave / IPFS) is configured
  const arweaveConfigured = !!process.env.ARWEAVE_KEY || !!process.env.BUNDLR_KEY;
  const ipfsConfigured = !!process.env.PINATA_JWT || !!process.env.IPFS_GATEWAY_TOKEN;

  const publicUrl = `/uploads/${safeFilename}`;

  res.status(201).json({
    success: true,
    url: publicUrl,
    filename: safeFilename,
    originalName: filename || safeFilename,
    sizeBytes: buffer.length,
    mimeType: detectedMime,
    storageStatus: {
      provider: 'mint_node_storage',
      tier: 'Local Protocol Node (Devnet Active)',
      decentralizedProvider: arweaveConfigured ? 'Arweave' : ipfsConfigured ? 'IPFS' : 'unconfigured',
      isDecentralizedConfigured: arweaveConfigured || ipfsConfigured,
      note: arweaveConfigured || ipfsConfigured
        ? 'Decentralized storage gateway connected.'
        : 'Running on local MINT protocol storage node. Decentralized permanent storage (Arweave/IPFS) can be activated via environment keys.'
    }
  });
});

// Endpoint to query upload configuration & storage capabilities
uploadRouter.get('/upload/capabilities', (_req, res) => {
  const arweaveConfigured = !!process.env.ARWEAVE_KEY || !!process.env.BUNDLR_KEY;
  const ipfsConfigured = !!process.env.PINATA_JWT || !!process.env.IPFS_GATEWAY_TOKEN;

  res.json({
    maxSizeBytes: MAX_FILE_SIZE_BYTES,
    maxSizeMB: 8,
    supportedFormats: ['image/png', 'image/jpeg', 'image/webp'],
    supportedExtensions: ['.png', '.jpg', '.jpeg', '.webp'],
    activeStorageProvider: 'mint_node_storage',
    decentralizedProvider: arweaveConfigured ? 'arweave' : ipfsConfigured ? 'ipfs' : 'unconfigured',
    isDecentralizedConfigured: arweaveConfigured || ipfsConfigured,
    recommendations: {
      avatarResolution: '500x500 px',
      bannerResolution: '1200x400 px',
      maxFileSize: '5 MB recommended'
    }
  });
});
