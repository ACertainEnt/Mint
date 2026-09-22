import React from 'react';
import { Home, Compass, PlusCircle, Users, User } from 'lucide-react';

interface MobileNavbarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
}

export const MobileNavbar: React.FC<MobileNavbarProps> = ({ currentTab, onNavigate }) => {
  const isHomeActive = currentTab === 'home';
  const isExploreActive = currentTab === 'explore';
  const isLaunchActive = currentTab === 'launch';
  const isCommunitiesActive = currentTab === 'communities';
  const isAccountsActive = currentTab === 'accounts' || currentTab === 'portfolio';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0f15]/95 backdrop-blur-lg border-t border-[#1b202d] safe-area-pb">
      <div className="flex items-center justify-between h-16 px-2">
        {/* Left Wing: Home & Explore */}
        <div className="flex-1 flex items-center justify-around">
          <button
            onClick={() => onNavigate('home')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 min-h-[44px] transition-colors ${
              isHomeActive ? 'text-[#ff5500]' : 'text-[#8e97a8] hover:text-white'
            }`}
          >
            <Home size={18} className={isHomeActive ? 'text-[#ff5500]' : 'text-[#8e97a8]'} />
            <span className={`text-[10px] mt-1 ${isHomeActive ? 'font-bold' : 'font-medium'}`}>
              Home
            </span>
          </button>

          <button
            onClick={() => onNavigate('explore')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 min-h-[44px] transition-colors ${
              isExploreActive ? 'text-[#ff5500]' : 'text-[#8e97a8] hover:text-white'
            }`}
          >
            <Compass size={18} className={isExploreActive ? 'text-[#ff5500]' : 'text-[#8e97a8]'} />
            <span className={`text-[10px] mt-1 ${isExploreActive ? 'font-bold' : 'font-medium'}`}>
              Coins
            </span>
          </button>
        </div>

        {/* Center: Primary Elevated Launch Action */}
        <div className="shrink-0 px-2 flex justify-center">
          <button
            onClick={() => onNavigate('launch')}
            className="flex flex-col items-center justify-center -mt-4 focus:outline-none"
          >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center border-2 border-[#0c0f15] transition-transform active:scale-95 ${
              isLaunchActive
                ? 'bg-[#ff5500] text-white ring-2 ring-[#ff5500]/40'
                : 'bg-[#ff5500] text-white'
            }`}>
              <PlusCircle size={22} />
            </div>
            <span className="text-[10px] font-semibold text-[#ff5500] mt-0.5">
              Launch
            </span>
          </button>
        </div>

        {/* Right Wing: Communities & Accounts */}
        <div className="flex-1 flex items-center justify-around">
          <button
            onClick={() => onNavigate('communities')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 min-h-[44px] transition-colors ${
              isCommunitiesActive ? 'text-[#ff5500]' : 'text-[#8e97a8] hover:text-white'
            }`}
          >
            <Users size={18} className={isCommunitiesActive ? 'text-[#ff5500]' : 'text-[#8e97a8]'} />
            <span className={`text-[10px] mt-1 ${isCommunitiesActive ? 'font-bold' : 'font-medium'}`}>
              Communities
            </span>
          </button>

          <button
            onClick={() => onNavigate('accounts')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 min-h-[44px] transition-colors ${
              isAccountsActive ? 'text-[#ff5500]' : 'text-[#8e97a8] hover:text-white'
            }`}
          >
            <User size={18} className={isAccountsActive ? 'text-[#ff5500]' : 'text-[#8e97a8]'} />
            <span className={`text-[10px] mt-1 ${isAccountsActive ? 'font-bold' : 'font-medium'}`}>
              Accounts
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
};
