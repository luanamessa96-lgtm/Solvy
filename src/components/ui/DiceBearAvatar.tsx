interface DiceBearAvatarProps {
  name?: string;
  email?: string;
  size?: number;
  borderWidth?: number;
  className?: string;
}

// Genera URL DiceBear avataaars dal nome (o email come fallback).
// Il seed è deterministico: stesso nome → stesso avatar sempre.
function buildUrl(name?: string, email?: string): string {
  const seed = encodeURIComponent(
    (name?.trim() || email?.trim() || 'solvy').toLowerCase()
  );
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&backgroundType=solid`;
}

export default function DiceBearAvatar({
  name,
  email,
  size = 40,
  borderWidth = 2,
  className = '',
}: DiceBearAvatarProps) {
  const innerSize = size - borderWidth * 2;
  const url = buildUrl(name, email);

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
          background: '#e0f2fe',
        }}
      >
        <img
          src={url}
          alt={name || 'avatar'}
          width={innerSize}
          height={innerSize}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    </div>
  );
}
