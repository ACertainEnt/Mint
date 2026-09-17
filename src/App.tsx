import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WalletProvider, useWallet } from './context/WalletContext';
import { Header } from './components/Header';
import { MobileNavbar } from './components/MobileNavbar';
import { AuthModal } from './components/AuthModal';
import { OnboardingModal } from './components/OnboardingModal';
import { SearchModal } from './components/SearchModal';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { TransactionModal } from './components/TransactionModal';

// Views
import { HomeView } from './views/HomeView';
import { ExploreView } from './views/ExploreView';
import { LaunchView } from './views/LaunchView';
import { CommunitiesView } from './views/CommunitiesView';
import { AccountsView } from './views/AccountsView';
import { AuctionsView } from './views/AuctionsView';
import { BountiesView } from './views/BountiesView';
import { PortfolioView } from './views/PortfolioView';
import { AdminView } from './views/AdminView';
import { NFTDetailView } from './views/NFTDetailView';
import { CollectionDetailView } from './views/CollectionDetailView';
import { CreatorProfileView } from './views/CreatorProfileView';
import { MintBotView } from './views/MintBotView';
import { MintBotDrawer } from './components/MintBotDrawer';
import { Bot } from 'lucide-react';

import { NFT, NFTCollection, Auction, Notification } from './types';
import { api } from './lib/api';

const AppContent: React.FC = () => {
  const { user, showAuthModal, setShowAuthModal, needsOnboarding } = useAuth();
  const { connected, balance, sendSolTransaction, txState, dismissTxModal, retryTx } = useWallet();

  // Navigation State
  // Format: 'home' | 'explore' | 'launch' | 'auctions' | 'bounties' | 'portfolio' | 'admin' | 'nft/:id' | 'collection/:id' | 'user/:username' | 'auctions/:id'
  const [currentRoute, setCurrentRoute] = useState<string>('home');

  // Modals & Drawers
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState(false);
  const [showMintBotDrawer, setShowMintBotDrawer] = useState(false);
  const [mintBotInitialQuery, setMintBotInitialQuery] = useState<string>('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Selected entities for deep views
  const [selectedNft, setSelectedNft] = useState<NFT | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<NFTCollection | null>(null);
  const [selectedCreatorUsername, setSelectedCreatorUsername] = useState<string>('');

  // Notifications polling
  const loadNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch (err) {
      // quiet fail
    }
  };

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 12000);
    return () => clearInterval(timer);
  }, [user]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  // Route Dispatcher
  const handleNavigate = (path: string) => {
    if (path.startsWith('nft/')) {
      const id = path.replace('nft/', '');
      setCurrentRoute(path);
      return;
    }
    if (path.startsWith('collection/')) {
      const id = path.replace('collection/', '');
      setCurrentRoute(path);
      return;
    }
    if (path.startsWith('user/')) {
      const username = path.replace('user/', '');
      setSelectedCreatorUsername(username);
      setCurrentRoute(path);
      return;
    }
    if (path.startsWith('creator/')) {
      const username = path.replace('creator/', '');
      setSelectedCreatorUsername(username);
      setCurrentRoute(`user/${username}`);
      return;
    }
    if (path.startsWith('auctions/')) {
      setCurrentRoute('auctions');
      return;
    }
    if (path.startsWith('mintbot')) {
      if (path.includes('?q=')) {
        const q = decodeURIComponent(path.split('?q=')[1]);
        setMintBotInitialQuery(q);
      } else if (path.includes(':')) {
        const q = path.split(':')[1];
        setMintBotInitialQuery(q);
      }
      setCurrentRoute('mintbot');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (path === 'marketplace') {
      setCurrentRoute('explore');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setCurrentRoute(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Quick Buy Flow
  const handleQuickBuy = async (nft: NFT) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    try {
      // 1. Prompt Solana wallet transaction to seller
      const txResult = await sendSolTransaction(
        nft.ownerAddress,
        nft.price || 0.5,
        `Purchase NFT: ${nft.name}`
      );

      // 2. Perform on-chain transfer in protocol backend
      await api.buyNft(nft.id, txResult.signature);

      // 3. Refresh notifications & state
      loadNotifications();
    } catch (err: any) {
      console.error('Purchase failed:', err);
    }
  };

  // Quick Bid Flow
  const handleQuickBid = (nft: NFT) => {
    setCurrentRoute('auctions');
  };

  // Derive primary tab for header highlighting
  const currentTab = currentRoute.split('/')[0] || 'home';

  return (
    <div className="min-h-screen flex flex-col bg-[#090b0e] text-[#ededed]">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onNavigate={handleNavigate}
        onOpenSearch={() => setShowSearchModal(true)}
        onOpenNotifications={() => setShowNotificationsDrawer(true)}
        unreadNotifications={unreadCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-20 md:pb-10">
        {currentRoute === 'home' && (
          <HomeView
            onNavigate={handleNavigate}
            onSelectNft={(nft) => {
              setSelectedNft(nft);
              handleNavigate(`nft/${nft.id}`);
            }}
            onSelectCollection={(col) => {
              setSelectedCollection(col);
              handleNavigate(`collection/${col.id}`);
            }}
            onQuickBuy={handleQuickBuy}
            onQuickBid={handleQuickBid}
          />
        )}

        {currentRoute === 'explore' && (
          <ExploreView
            onSelectNft={(nft) => {
              setSelectedNft(nft);
              handleNavigate(`nft/${nft.id}`);
            }}
            onQuickBuy={handleQuickBuy}
            onQuickBid={handleQuickBid}
          />
        )}

        {currentRoute === 'launch' && (
          <LaunchView
            onCollectionCreated={(col) => {
              setSelectedCollection(col);
              handleNavigate(`collection/${col.id}`);
            }}
            onNavigate={handleNavigate}
          />
        )}

        {currentRoute === 'auctions' && (
          <AuctionsView
            onSelectAuction={(auc) => {
              handleNavigate(`nft/${auc.nftId}`);
            }}
            onNavigate={handleNavigate}
          />
        )}

        {currentRoute === 'bounties' && (
          <BountiesView
            onNavigate={handleNavigate}
          />
        )}

        {currentRoute === 'communities' && (
          <CommunitiesView
            onNavigate={handleNavigate}
          />
        )}

        {(currentRoute === 'accounts' || currentRoute === 'portfolio') && (
          <AccountsView
            onSelectNft={(nft) => {
              setSelectedNft(nft);
              handleNavigate(`nft/${nft.id}`);
            }}
            onSelectCollection={(col) => {
              setSelectedCollection(col);
              handleNavigate(`collection/${col.id}`);
            }}
            onNavigate={handleNavigate}
          />
        )}

        {currentRoute === 'admin' && (
          <AdminView />
        )}

        {currentRoute === 'mintbot' && (
          <MintBotView
            onSelectNft={(nftId) => handleNavigate(`nft/${nftId}`)}
            onSelectCollection={(colId) => handleNavigate(`collection/${colId}`)}
            onSelectAuction={(aucId) => handleNavigate(`nft/${aucId}`)}
            onNavigate={handleNavigate}
            initialQuery={mintBotInitialQuery}
          />
        )}

        {currentRoute.startsWith('nft/') && (
          <NFTDetailView
            nftId={currentRoute.replace('nft/', '')}
            onBack={() => handleNavigate('explore')}
            onNavigate={handleNavigate}
            onBuy={handleQuickBuy}
            onBid={handleQuickBid}
          />
        )}

        {currentRoute.startsWith('collection/') && (
          <CollectionDetailView
            collectionId={currentRoute.replace('collection/', '')}
            onBack={() => handleNavigate('explore')}
            onSelectNft={(nft) => {
              setSelectedNft(nft);
              handleNavigate(`nft/${nft.id}`);
            }}
            onQuickBuy={handleQuickBuy}
            onQuickBid={handleQuickBid}
            onNavigate={handleNavigate}
          />
        )}

        {currentRoute.startsWith('user/') && (
          <CreatorProfileView
            username={selectedCreatorUsername || currentRoute.replace('user/', '')}
            onBack={() => handleNavigate('home')}
            onSelectNft={(nft) => {
              setSelectedNft(nft);
              handleNavigate(`nft/${nft.id}`);
            }}
            onSelectCollection={(col) => {
              setSelectedCollection(col);
              handleNavigate(`collection/${col.id}`);
            }}
          />
        )}
      </main>

      {/* Mobile Docked Bottom Navbar */}
      <MobileNavbar
        currentTab={currentTab}
        onNavigate={handleNavigate}
      />

      {/* Global Modals & Drawers */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      <OnboardingModal
        isOpen={needsOnboarding}
      />

      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelectNft={(nft) => {
          setSelectedNft(nft);
          handleNavigate(`nft/${nft.id}`);
        }}
        onSelectCollection={(col) => {
          setSelectedCollection(col);
          handleNavigate(`collection/${col.id}`);
        }}
        onSelectUser={(u) => {
          setSelectedCreatorUsername(u.username);
          handleNavigate(`user/${u.username}`);
        }}
      />

      <NotificationsDrawer
        isOpen={showNotificationsDrawer}
        onClose={() => setShowNotificationsDrawer(false)}
        notifications={notifications}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        onNavigate={handleNavigate}
      />

      {/* 6-State Solana Blockchain Transaction Lifecycle Modal */}
      <TransactionModal
        state={txState}
        onDismiss={dismissTxModal}
        onRetry={retryTx}
      />

      {/* MintBot Intel Slide-over Drawer */}
      <MintBotDrawer
        isOpen={showMintBotDrawer}
        onClose={() => setShowMintBotDrawer(false)}
        onOpenFullView={() => {
          setShowMintBotDrawer(false);
          handleNavigate('mintbot');
        }}
        onSelectNft={(nftId) => handleNavigate(`nft/${nftId}`)}
        onSelectCollection={(colId) => handleNavigate(`collection/${colId}`)}
        initialQuery={mintBotInitialQuery}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <WalletProvider>
        <AppContent />
      </WalletProvider>
    </AuthProvider>
  );
}
