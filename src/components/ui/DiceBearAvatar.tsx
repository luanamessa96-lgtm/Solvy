import { useState } from 'react';

interface DiceBearAvatarProps {
  name?: string;
  email?: string;
  size?: number;
  borderWidth?: number;
  className?: string;
}

function getInitials(name?: string, email?: string): string {
  const src = name?.trim() || email?.trim() || '?';
  return src
    .split(/\s+/)
    .map(w => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

function buildUrl(name?: string, email?: string): string {
  const seed = encodeURIComponent(
    (name?.trim() || email?.trim() || 'solvy').toLowerCase()
  );
  // PNG invece di SVG: evita il blocco browser su SVG cross-origin con risorse esterne
  return `https://api.dicebear.com/7.x/avataaars/png?seed=${seed}&size=128`;
}

export default function DiceBearAvatar({
  name,
  email,
  size = 40,
  borderWidth = 2,
  className = '',
}: DiceBearAvatarProps) {
  const [failed, setFailed] = useState(false);
  const innerSize = size - borderWidth * 2;
  const url = buildUrl(name, email);
  const initials = getInitials(name, email);

  return (
    <div
      className={`shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #4FD1C5 0%, #C855F7 100%)',
        padding: borderWidth,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: '50%',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #e0f2fe, #ede9fe)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {failed ? (
          // Fallback: iniziali con gradiente
          <span
            style={{
              fontSize: innerSize * 0.35,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #4FD1C5, #C855F7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              userSelect: 'none',
            }}
          >
            {initials}
          </span>
        ) : (
          <img
            src={url}
            alt={initials}
            width={innerSize}
            height={innerSize}
            loading="lazy"
            onError={() => setFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
      </div>
    </div>
  );
}
