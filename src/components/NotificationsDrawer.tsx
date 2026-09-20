import React from 'react';
import { X, Check, Bell, Gavel, DollarSign, Award, ArrowUpRight, Heart, UserPlus, MessageSquare, MessageCircle } from 'lucide-react';
import { Notification } from '../types';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigate: (link: string) => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onNavigate
}) => {
  if (!isOpen) return null;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'like':
        return <Heart size={14} className="text-[#ff5500] fill-[#ff5500]" />;
      case 'comment':
        return <MessageSquare size={14} className="text-[#ff5500]" />;
      case 'reply':
        return <MessageCircle size={14} className="text-[#ff5500]" />;
      case 'follow':
        return <UserPlus size={14} className="text-[#ff5500]" />;
      case 'bid':
      case 'outbid':
        return <Gavel size={14} className="text-amber-400" />;
      case 'sale':
      case 'auction_won':
        return <DollarSign size={14} className="text-emerald-400" />;
      case 'bounty_submission':
      case 'bounty_completed':
        return <Award size={14} className="text-[#ff5500]" />;
      default:
        return <Bell size={14} className="text-blue-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#11141a] border-l border-[#212634] shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#212634] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-[#ff5500]" />
              <h3 className="font-display font-bold text-white text-base">Notifications</h3>
            </div>
            <div className="flex items-center gap-3">
              {notifications.some(n => !n.read) && (
                <button
                  onClick={onMarkAllRead}
                  className="text-xs text-[#ff5500] hover:underline font-medium"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-[#6b7280] hover:text-white hover:bg-[#1a1f2b]"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-3 divide-y divide-[#1b202c]">
            {notifications.length === 0 ? (
              <div className="py-16 text-center text-[#6b7280]">
                <Bell size={28} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold text-white">No notifications yet</p>
                <p className="text-xs mt-1">Activity on your NFTs and bids will appear here</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!notif.read) onMarkRead(notif.id);
                    if (notif.link) {
                      onNavigate(notif.link);
                      onClose();
                    }
                  }}
                  className={`p-3 rounded-lg transition-colors cursor-pointer flex items-start gap-3 my-1 ${
                    notif.read ? 'hover:bg-[#151922] opacity-75' : 'bg-[#161a24] hover:bg-[#1b212f]'
                  }`}
                >
                  <div className="mt-0.5 w-7 h-7 rounded-lg bg-[#0c0e14] border border-[#232938] flex items-center justify-center shrink-0">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-white truncate">{notif.title}</h4>
                      <span className="text-[10px] font-mono-code text-[#6b7280] shrink-0">
                        {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-[#9ca3af] mt-0.5 leading-relaxed">{notif.message}</p>
                  </div>
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-[#ff5500] shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
