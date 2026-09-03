import React from 'react';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = 'w-12 h-12' }: LogoProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
      </defs>

      {/* Circle Background */}
      <circle cx="60" cy="60" r="56" fill="url(#logoGradient)" opacity="0.1" />

      {/* Microphone Icon */}
      <g transform="translate(35, 30)">
        {/* Microphone Head */}
        <rect x="20" y="0" width="10" height="22" rx="5" fill="#3B82F6" />

        {/* Microphone Stand */}
        <rect x="23" y="22" width="4" height="15" fill="#3B82F6" />

        {/* Sound Waves */}
        <path
          d="M 45 20 Q 50 15 55 20"
          stroke="#1E40AF"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 48 12 Q 55 5 62 12"
          stroke="#3B82F6"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          opacity="0.6"
        />
      </g>

      {/* Text Summary Indicator */}
      <g transform="translate(35, 60)">
        <line x1="0" y1="5" x2="30" y2="5" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
        <line x1="0" y1="15" x2="25" y2="15" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
        <line x1="0" y1="25" x2="28" y2="25" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Decorative Circle Border */}
      <circle cx="60" cy="60" r="56" stroke="url(#logoGradient)" strokeWidth="2" fill="none" />
    </svg>
  );
}
