import React from 'react';
import { User } from '../types';

interface UsernameDisplayProps {
  user?: Partial<User> | null;
  username?: string;
  className?: string;
  showAt?: boolean;
}

export const UsernameDisplay: React.FC<UsernameDisplayProps> = ({
  user,
  username: rawUsername,
  className = '',
  showAt = true
}) => {
  const username = rawUsername || user?.username || '';
  const clean = username.replace(/^@/, '');
  const isMintIdentity = clean.toLowerCase() === 'mint' || user?.privilegedType === 'trusted_mint_account';
  const customColor = user?.usernameColor;

  // Determine accent color
  // 1. Official @mint identity is always rendered in MINT's orange accent (#ff5500)
  // 2. Custom usernameColor if specified by verified account
  let inlineColor: string | undefined = undefined;
  if (isMintIdentity) {
    inlineColor = '#ff5500';
  } else if (customColor) {
    inlineColor = customColor;
  }

  return (
    <span
      className={`font-mono-code ${isMintIdentity ? 'font-bold' : ''} ${className}`}
      style={inlineColor ? { color: inlineColor } : undefined}
    >
      {showAt ? `@${clean}` : clean}
    </span>
  );
};
