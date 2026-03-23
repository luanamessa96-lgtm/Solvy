import React from 'react';

const COUNTRY_CONFIG: Record<string, { flag: string; name: string; nameEs: string }> = {
  'Italy': { flag: '🇮🇹', name: 'Italia', nameEs: 'Italia' },
  'Spain': { flag: '🇪🇸', name: 'Spagna', nameEs: 'España' },
  // future countries go here
};

interface CountryBadgeProps {
  country: string;
  size?: 'sm' | 'md';
}

export const CountryBadge: React.FC<CountryBadgeProps> = ({ country, size = 'sm' }) => {
  const config = COUNTRY_CONFIG[country] ?? { flag: '🌍', name: country, nameEs: country };

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5 gap-1'
    : 'text-sm px-3 py-1 gap-1.5';

  return (
    <span className={`inline-flex items-center ${sizeClasses} rounded-full bg-white/15 backdrop-blur-sm border border-white/20 font-medium text-white`}>
      <span>{config.flag}</span>
      <span>{config.name}</span>
    </span>
  );
};
