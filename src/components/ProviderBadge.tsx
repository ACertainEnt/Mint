import React from 'react';

interface ProviderBadgeProps {
  provider?: string;
  size?: 'sm' | 'md' | 'xs';
  className?: string;
}

export const ProviderBadge: React.FC<ProviderBadgeProps> = ({
  provider,
  size = 'sm',
  className = ''
}) => {
  const p = (provider || 'wallet').toLowerCase();

  const sizeClasses =
    size === 'xs'
      ? 'w-3 h-3'
      : size === 'sm'
      ? 'w-3.5 h-3.5'
      : 'w-4 h-4';

  const renderIcon = () => {
    switch (p) {
      case 'google':
        return (
          <svg className="w-full h-full" viewBox="0 0 24 24" aria-label="Google">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 10.02 0 12c0 1.98.45 3.84 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
        );

      case 'apple':
        return (
          <svg className="w-full h-full text-white fill-current" viewBox="0 0 24 24" aria-label="Apple">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.84c.62-.75 1.04-1.8 0.92-2.84-.9.04-2 .6-2.65 1.35-.57.65-1.06 1.7-0.93 2.71 1.01.08 2.04-.47 2.66-1.22z" />
          </svg>
        );

      case 'github':
        return (
          <svg className="w-full h-full text-white fill-current" viewBox="0 0 24 24" aria-label="GitHub">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            />
          </svg>
        );

      case 'x':
      case 'twitter':
        return (
          <svg className="w-full h-full text-white fill-current" viewBox="0 0 24 24" aria-label="X">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        );

      case 'wallet':
      case 'solana':
      case 'phantom':
        return (
          <svg className="w-full h-full" viewBox="0 0 128 128" fill="none" aria-label="Solana">
            <path
              d="M102.5 87.2H29.5c-2.3 0-4.2-1.9-4.2-4.2 0-1.1.4-2.2 1.2-3l15.5-15.5c.8-.8 1.9-1.2 3-1.2h73c2.3 0 4.2 1.9 4.2 4.2 0 1.1-.4 2.2-1.2 3L105.5 86c-.8.8-1.9 1.2-3 1.2z"
              fill="url(#sol-grad-1)"
            />
            <path
              d="M25.5 40.8h73c2.3 0 4.2 1.9 4.2 4.2 0 1.1-.4 2.2-1.2 3L86 63.5c-.8.8-1.9 1.2-3 1.2H10c-2.3 0-4.2-1.9-4.2-4.2 0-1.1.4-2.2 1.2-3l15.5-15.5c.8-.8 1.9-1.2 3-1.2z"
              fill="url(#sol-grad-2)"
            />
            <defs>
              <linearGradient id="sol-grad-1" x1="25.3" y1="75.2" x2="106.7" y2="75.2" gradientUnits="userSpaceOnUse">
                <stop stopColor="#00FFA3" />
                <stop offset="1" stopColor="#DC1FFF" />
              </linearGradient>
              <linearGradient id="sol-grad-2" x1="5.8" y1="52.8" x2="102.7" y2="52.8" gradientUnits="userSpaceOnUse">
                <stop stopColor="#00FFA3" />
                <stop offset="1" stopColor="#DC1FFF" />
              </linearGradient>
            </defs>
          </svg>
        );

      default:
        return (
          <span className="text-[8px] font-bold text-white font-mono-code leading-none">@</span>
        );
    }
  };

  return (
    <div
      className={`rounded-full bg-[#0d0f14] border border-[#232938] shadow-sm flex items-center justify-center p-[2px] ${sizeClasses} ${className}`}
      title={`Connected via ${p.toUpperCase()}`}
    >
      {renderIcon()}
    </div>
  );
};
