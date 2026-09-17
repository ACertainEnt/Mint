import React from 'react';
import { Check } from 'lucide-react';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  tooltip?: string;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  size = 'md',
  className = '',
  tooltip = 'Verified Protocol Creator'
}) => {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5 text-[8px]',
    md: 'w-4 h-4 text-[10px]',
    lg: 'w-5 h-5 text-xs'
  };

  const iconSizes = {
    sm: 9,
    md: 11,
    lg: 13
  };

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center justify-center rounded-full bg-[#ff5500] text-white shrink-0 shadow-sm shadow-[#ff5500]/20 ${sizeClasses[size]} ${className}`}
    >
      <Check size={iconSizes[size]} strokeWidth={3.2} />
    </span>
  );
};
