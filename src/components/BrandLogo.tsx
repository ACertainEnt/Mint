import React from 'react';

interface BrandLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 28, showText = true, className = '' }) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* 3D Isometric M Vector Logo Matching Uploaded Brand Asset */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200 hover:scale-105"
      >
        <defs>
          <linearGradient id="mintOrangeTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF7A33" />
            <stop offset="100%" stopColor="#FF5500" />
          </linearGradient>
          <linearGradient id="mintOrangeSide" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E64A00" />
            <stop offset="100%" stopColor="#CC3F00" />
          </linearGradient>
          <linearGradient id="mintOrangeDark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#B33600" />
            <stop offset="100%" stopColor="#8C2B00" />
          </linearGradient>
        </defs>

        {/* Isometric 3D Ribbon 'M' geometry */}
        {/* Left vertical block top/side */}
        <polygon points="32,26 44,34 26,46 15,38" fill="url(#mintOrangeTop)" />
        <polygon points="15,38 26,46 26,64 15,55" fill="url(#mintOrangeDark)" />
        
        {/* Center M V-dip ribbon */}
        <polygon points="44,34 65,20 78,28 56,43" fill="url(#mintOrangeTop)" />
        <polygon points="56,43 78,28 78,64 66,74" fill="url(#mintOrangeSide)" />
        <polygon points="66,74 50,62 50,47 66,59" fill="url(#mintOrangeDark)" />

        {/* Lower folded loop of M */}
        <polygon points="26,46 56,43 50,62 26,64" fill="url(#mintOrangeTop)" />
        <polygon points="26,64 42,75 56,66 50,62" fill="url(#mintOrangeSide)" />
        <polygon points="42,75 50,81 66,74 56,66" fill="url(#mintOrangeDark)" />

        {/* Dynamic bright central facet */}
        <polygon points="34,38 52,50 42,56 24,44" fill="#FF8C4D" opacity="0.9" />
      </svg>

      {showText && (
        <div className="flex items-center tracking-tight">
          <span className="font-display font-extrabold text-white text-lg tracking-wider">
            MINT
          </span>
        </div>
      )}
    </div>
  );
};
