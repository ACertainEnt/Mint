import React from 'react';
import { Award } from 'lucide-react';

interface FoundingBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

export const FoundingBadge: React.FC<FoundingBadgeProps> = ({
  size = 'md',
  className = '',
  showText = false
}) => {
  const sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.5 gap-1',
    md: 'text-[10px] px-2 py-0.5 gap-1.5',
    lg: 'text-xs px-2.5 py-1 gap-1.5'
  };

  const iconSizes = {
    sm: 10,
    md: 12,
    lg: 14
  };

  if (showText) {
    return (
      <span
        title="MINT Founding Member - Early Genesis Protocol Participant"
        className={`inline-flex items-center font-mono-code font-bold tracking-tight rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 ${sizeClasses[size]} ${className}`}
      >
        <Award size={iconSizes[size]} className="text-amber-400 shrink-0" />
        <span>Founding Member</span>
      </span>
    );
  }

  const iconOnlySizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <span
      title="MINT Founding Member - Early Genesis Protocol Participant"
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-black font-bold shrink-0 shadow-sm shadow-amber-500/20 ${iconOnlySizes[size]} ${className}`}
    >
      <Award size={iconSizes[size]} className="stroke-[2.5]" />
    </span>
  );
};
