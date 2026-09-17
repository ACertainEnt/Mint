import { User, NFTCollection, NFT, Auction, Bounty, ActivityEvent, Notification, PlatformConfig, MintBotQueryResponse, MintBotUsage, MintBotSuggestionGroup, Community, CommunityMember, CommunityPost } from '../types';

const TOKEN_KEY = 'mint_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMsg = `HTTP error ${response.status}`;
    try {
      const data = await response.json();
      if (data.error) errorMsg = data.error;
    } catch {}
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Auth
  async getWalletNonce(walletAddress: string) {
    return request<{ nonce: string; message: string }>('/api/auth/wallet-nonce', {
      method: 'POST',
      body: JSON.stringify({ walletAddress })
    });
  },

  async walletLogin(walletAddress: string, signature?: string, message?: string) {
    const res = await request<{ token: string; user: User; isNewUser: boolean }>('/api/auth/wallet-login', {
      method: 'POST',
      body: JSON.stringify({ walletAddress, signature, message })
    });
    setStoredToken(res.token);
    return res;
  },

  async providerLogin(data: { provider: string; email?: string; providerId?: string; displayName?: string; avatar?: string }) {
    const res = await request<{ token: string; user: User; isNewUser: boolean }>('/api/auth/provider-login', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    setStoredToken(res.token);
    return res;
  },

  async register(data: { email: string; password: string; username?: string; displayName?: string }) {
    const res = await request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    setStoredToken(res.token);
    return res;
  },

  async login(data: { email: string; password: string }) {
    const res = await request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    setStoredToken(res.token);
    return res;
  },

  async getCurrentUser() {
    return request<{ user: User }>('/api/auth/me');
  },

  async checkUsername(username: string) {
    return request<{ available: boolean; error?: string; username: string }>(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
  },

  async completeProfile(data: { username: string; displayName?: string; avatar?: string; bio?: string }) {
    return request<{ user: User }>('/api/auth/complete-profile', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateProfile(data: Partial<User>) {
    return request<{ user: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Collections & NFTs
  async getCollections(params: { creatorId?: string; search?: string; sort?: string } = {}) {
    const q = new URLSearchParams();
    if (params.creatorId) q.set('creatorId', params.creatorId);
    if (params.search) q.set('search', params.search);
    if (params.sort) q.set('sort', params.sort);
    return request<{ collections: NFTCollection[] }>(`/api/collections?${q.toString()}`);
  },

  async getCollection(id: string) {
    return request<{ collection: NFTCollection; nfts: NFT[] }>(`/api/collections/${id}`);
  },

  async createCollection(data: Partial<NFTCollection>) {
    return request<{ collection: NFTCollection }>('/api/collections', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async uploadImage(data: { dataUrl: string; filename: string; mimeType: string }) {
    return request<{
      success: boolean;
      url: string;
      filename: string;
      originalName: string;
      sizeBytes: number;
      mimeType: string;
      storageStatus: {
        provider: string;
        tier: string;
        decentralizedProvider: string;
        isDecentralizedConfigured: boolean;
        note: string;
      };
    }>('/api/upload', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getUploadCapabilities() {
    return request<{
      maxSizeBytes: number;
      maxSizeMB: number;
      supportedFormats: string[];
      supportedExtensions: string[];
      activeStorageProvider: string;
      decentralizedProvider: string;
      isDecentralizedConfigured: boolean;
      recommendations: {
        avatarResolution: string;
        bannerResolution: string;
        maxFileSize: string;
      };
    }>('/api/upload/capabilities');
  },

  async getNfts(params: { collectionId?: string; creatorId?: string; ownerId?: string; status?: string; sort?: string; search?: string } = {}) {
    const q = new URLSearchParams();
    if (params.collectionId) q.set('collectionId', params.collectionId);
    if (params.creatorId) q.set('creatorId', params.creatorId);
    if (params.ownerId) q.set('ownerId', params.ownerId);
    if (params.status) q.set('status', params.status);
    if (params.sort) q.set('sort', params.sort);
    if (params.search) q.set('search', params.search);
    return request<{ nfts: NFT[] }>(`/api/nfts?${q.toString()}`);
  },

  async getNft(id: string) {
    return request<{ nft: NFT; auction: Auction | null; collection: NFTCollection | null }>(`/api/nfts/${id}`);
  },

  async mintNft(data: { collectionId: string; txSignature?: string; traits?: any[] }) {
    return request<{ nft: NFT; collection: NFTCollection }>('/api/nfts/mint', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async listNft(id: string, price: number) {
    return request<{ nft: NFT }>(`/api/nfts/${id}/list`, {
      method: 'POST',
      body: JSON.stringify({ price })
    });
  },

  async delistNft(id: string) {
    return request<{ nft: NFT }>(`/api/nfts/${id}/delist`, {
      method: 'POST'
    });
  },

  async buyNft(id: string, txSignature?: string) {
    return request<{ nft: NFT; success: boolean }>(`/api/nfts/${id}/buy`, {
      method: 'POST',
      body: JSON.stringify({ txSignature })
    });
  },

  async likeNft(id: string) {
    return request<{ likes: number }>(`/api/nfts/${id}/like`, {
      method: 'POST'
    });
  },

  // Auctions
  async getAuctions(params: { status?: string; creatorId?: string; sort?: string } = {}) {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.creatorId) q.set('creatorId', params.creatorId);
    if (params.sort) q.set('sort', params.sort);
    return request<{ auctions: Auction[] }>(`/api/auctions?${q.toString()}`);
  },

  async getAuction(id: string) {
    return request<{ auction: Auction }>(`/api/auctions/${id}`);
  },

  async createAuction(data: {
    customTitle: string;
    nftId: string;
    startingPrice: number;
    reservePrice?: number;
    buyNowPrice?: number;
    durationHours?: number;
    minBidIncrement?: number;
    description?: string;
  }) {
    return request<{ auction: Auction }>('/api/auctions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async bidAuction(id: string, amount: number, txSignature?: string) {
    return request<{ auction: Auction; immediateBuy: boolean }>(`/api/auctions/${id}/bid`, {
      method: 'POST',
      body: JSON.stringify({ amount, txSignature })
    });
  },

  async settleAuction(id: string) {
    return request<{ auction: Auction; success: boolean }>(`/api/auctions/${id}/settle`, {
      method: 'POST'
    });
  },

  // Bounties
  async getBounties(params: { category?: string; status?: string; creatorId?: string; sort?: string } = {}) {
    const q = new URLSearchParams();
    if (params.category) q.set('category', params.category);
    if (params.status) q.set('status', params.status);
    if (params.creatorId) q.set('creatorId', params.creatorId);
    if (params.sort) q.set('sort', params.sort);
    return request<{ bounties: Bounty[] }>(`/api/bounties?${q.toString()}`);
  },

  async getBounty(id: string) {
    return request<{ bounty: Bounty }>(`/api/bounties/${id}`);
  },

  async createBounty(data: {
    title: string;
    description: string;
    reward: number;
    deadlineDays?: number;
    category: string;
    requirements: string[];
  }) {
    return request<{ bounty: Bounty }>('/api/bounties', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async submitBounty(id: string, data: { notes: string; previewUrl: string }) {
    return request<{ bounty: Bounty; submission: any }>(`/api/bounties/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async completeBounty(id: string, submissionId: string, payoutTxSignature?: string) {
    return request<{ bounty: Bounty; success: boolean }>(`/api/bounties/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ submissionId, payoutTxSignature })
    });
  },

  // Users & Portfolio
  async getUserProfile(identifier: string) {
    return request<{ user: User; stats: any }>(`/api/users/${identifier}`);
  },

  async getUserPortfolio(identifier: string) {
    return request<{ user: User; portfolio: any }>(`/api/users/${identifier}/portfolio`);
  },

  // General & Notifications
  async getActivity(limit = 40) {
    return request<{ activity: ActivityEvent[] }>(`/api/activity?limit=${limit}`);
  },

  async search(query: string) {
    return request<{
      collections: NFTCollection[];
      nfts: NFT[];
      creators: User[];
      auctions: Auction[];
      bounties: Bounty[];
    }>(`/api/search?q=${encodeURIComponent(query)}`);
  },

  async getNotifications() {
    return request<{ notifications: Notification[]; unreadCount: number }>('/api/notifications');
  },

  async markNotificationRead(id: string) {
    return request<{ success: boolean }>(`/api/notifications/${id}/read`, { method: 'POST' });
  },

  async markAllNotificationsRead() {
    return request<{ success: boolean }>('/api/notifications/read-all', { method: 'POST' });
  },

  async getConfig() {
    return request<{ config: PlatformConfig }>('/api/config');
  },

  // Solana RPC endpoints
  async getSolanaBalance(address: string) {
    return request<{ address: string; sol: number; lamports: number; network: string }>(`/api/solana/balance/${address}`);
  },

  async requestDevnetAirdrop(address: string) {
    return request<{ success: boolean; signature: string; sol: number; explorerUrl: string }>('/api/solana/airdrop', {
      method: 'POST',
      body: JSON.stringify({ address })
    });
  },

  // Admin
  async getAdminUsers() {
    return request<{ users: User[] }>('/api/admin/users');
  },

  async toggleVerifyUser(userId: string, isVerified: boolean) {
    return request<{ success: boolean; user: User }>('/api/admin/verify-user', {
      method: 'POST',
      body: JSON.stringify({ userId, isVerified })
    });
  },

  async updateConfig(data: Partial<PlatformConfig>) {
    return request<{ config: PlatformConfig; success: boolean }>('/api/admin/config', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async moderateNft(nftId: string, action: 'delist') {
    return request<{ success: boolean; nft: NFT }>('/api/admin/moderate-nft', {
      method: 'POST',
      body: JSON.stringify({ nftId, action })
    });
  },

  async testTelegramAlert(message?: string, eventType?: string) {
    return request<{ success: boolean; disabled: boolean; note?: string }>('/api/admin/telegram-test', {
      method: 'POST',
      body: JSON.stringify({ message, eventType })
    });
  },

  // MintBot Native Assistant APIs
  async queryMintBot(query: string) {
    return request<MintBotQueryResponse>('/api/mintbot/query', {
      method: 'POST',
      body: JSON.stringify({ query })
    });
  },

  async getMintBotUsage() {
    return request<{ usage: MintBotUsage }>('/api/mintbot/usage');
  },

  async getMintBotStatus() {
    return request<{
      database: { provider: string; status: string; latency: string };
      solanaRpc: { endpoint: string; network: string; status: string; latencyMs?: number; slot?: number };
      indexingProvider: { isConfigured: boolean; provider: string; message: string };
      aiEngine: { provider: string; status: string; note: string };
    }>('/api/mintbot/status');
  },

  async getMintBotSuggestions() {
    return request<{ suggestions: MintBotSuggestionGroup[] }>('/api/mintbot/suggestions');
  },

  // Likes System
  async getMyLikes() {
    return request<{ likedIds: string[] }>('/api/likes/my-likes');
  },

  async toggleLike(targetType: 'nft' | 'collection' | 'auction' | 'post' | 'bounty', targetId: string) {
    return request<{ liked: boolean; likes: number }>('/api/likes/toggle', {
      method: 'POST',
      body: JSON.stringify({ targetType, targetId })
    });
  },

  async validateDeviceSessions(tokens: string[]) {
    return request<{ accounts: { token: string; user: User }[] }>('/api/auth/validate-device-sessions', {
      method: 'POST',
      body: JSON.stringify({ tokens })
    });
  },

  // Verification
  async getVerificationStatus() {
    return request<{
      isVerified: boolean;
      role: string;
      status: string;
      isEligible: boolean;
      requirements: { id: string; label: string; required: number; current: number; met: boolean; unit?: string }[];
      activeRequest: any;
      lastRequest: any;
      cooldownUntil: string | null;
      communityLimits: {
        max: number;
        currentVerifiedCount: number;
        isAdmin: boolean;
        canVerifyAnotherCommunity: boolean;
        verifiedCommunities: { id: string; name: string; slug: string }[];
      };
    }>('/api/users/verification/status');
  },

  async requestUserVerification(data: { justification?: string; portfolioUrl?: string }) {
    return request<{ request: any }>('/api/users/verification/request', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async requestCommunityVerification(communityId: string, data?: { justification?: string }) {
    return request<{ request: any }>(`/api/communities/${encodeURIComponent(communityId)}/verify-request`, {
      method: 'POST',
      body: JSON.stringify(data || {})
    });
  },

  async getAdminVerificationRequests() {
    return request<{ requests: any[] }>('/api/admin/verification-requests');
  },

  async reviewVerificationRequest(id: string, action: 'approve' | 'reject', reason?: string) {
    return request<{ success: boolean; request: any }>(`/api/admin/verification-requests/${encodeURIComponent(id)}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, reason })
    });
  },

  // Communities & Posts
  async getCommunities() {
    return request<{ communities: Community[] }>('/api/communities');
  },

  async getCommunity(id: string) {
    return request<{ community: Community }>(`/api/communities/${encodeURIComponent(id)}`);
  },

  async createCommunity(data: { name: string; description?: string; avatar?: string; banner?: string; category?: string; collectionId?: string; socialLinks?: any }) {
    return request<{ community: Community }>('/api/communities', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateCommunity(id: string, data: { name?: string; description?: string; avatar?: string; banner?: string; category?: string; socialLinks?: any; rules?: string[] }) {
    return request<{ community: Community; success: boolean }>(`/api/communities/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async getCommunityMembers(id: string) {
    return request<{ members: CommunityMember[] }>(`/api/communities/${encodeURIComponent(id)}/members`);
  },

  async joinCommunity(id: string) {
    return request<{ community: Community; success: boolean }>(`/api/communities/${encodeURIComponent(id)}/join`, {
      method: 'POST'
    });
  },

  async leaveCommunity(id: string) {
    return request<{ community: Community; success: boolean }>(`/api/communities/${encodeURIComponent(id)}/leave`, {
      method: 'POST'
    });
  },

  async updateCommunityMemberRole(communityId: string, userId: string, role: 'moderator' | 'member') {
    return request<{ success: boolean; member: CommunityMember }>(`/api/communities/${encodeURIComponent(communityId)}/members/${encodeURIComponent(userId)}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    });
  },

  async removeCommunityMember(communityId: string, userId: string) {
    return request<{ success: boolean }>(`/api/communities/${encodeURIComponent(communityId)}/members/${encodeURIComponent(userId)}`, {
      method: 'DELETE'
    });
  },

  async getFeedPosts(params?: { communityId?: string; authorId?: string; tab?: string }) {
    const query = new URLSearchParams();
    if (params?.communityId) query.set('communityId', params.communityId);
    if (params?.authorId) query.set('authorId', params.authorId);
    if (params?.tab) query.set('tab', params.tab);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<{ posts: CommunityPost[] }>(`/api/communities/feed/posts${qs}`);
  },

  async createPost(data: { content: string; communityId?: string; mediaUrl?: string; nftId?: string }) {
    return request<{ post: CommunityPost }>('/api/communities/posts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};
