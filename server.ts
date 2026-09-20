import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { authMiddleware } from './server/middleware/auth';
import { authRouter } from './server/routes/auth';
import { nftsRouter } from './server/routes/nfts';
import { auctionsRouter } from './server/routes/auctions';
import { bountiesRouter } from './server/routes/bounties';
import { usersRouter } from './server/routes/users';
import { solanaRouter } from './server/routes/solana';
import { adminRouter } from './server/routes/admin';
import { generalRouter } from './server/routes/general';
import { mintBotRouter } from './server/mintbot/router';
import { uploadRouter } from './server/routes/upload';
import { likesRouter } from './server/routes/likes';
import { postsRouter } from './server/routes/posts';
import { communitiesRouter } from './server/routes/communities';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser with ample limit for metadata/images
  app.use(express.json({ limit: '10mb' }));

  // Handle JSON parse errors gracefully
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ error: 'Invalid JSON request payload' });
    }
    next(err);
  });

  // Global authentication & session token extraction
  app.use(authMiddleware);

  // API routes mounted FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api', nftsRouter);
  app.use('/api/auctions', auctionsRouter);
  app.use('/api/bounties', bountiesRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/solana', solanaRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/mintbot', mintBotRouter);
  app.use('/api/likes', likesRouter);
  app.use('/api/communities', communitiesRouter);
  app.use('/api', postsRouter);
  app.use('/api', uploadRouter);
  app.use('/api', generalRouter);

  // Serve uploaded media files directly
  const uploadsPath = path.join(process.cwd(), 'data', 'uploads');
  app.use('/uploads', express.static(uploadsPath));

  // Vite middleware for development / static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MINT Solana NFT Protocol server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
