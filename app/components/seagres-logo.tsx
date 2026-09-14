interface SeagresLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

/**
 * Logo SeaGres: tetes air + ikan stilasi + wordmark.
 * SVG inline sehingga tidak butuh asset eksternal dan otomatis
 * meniru warna brand biru/cyan primer aplikasi.
 */
export default function SeagresLogo({ size = 36, showText = true, className }: SeagresLogoProps) {
  const height = size;
  const width = showText ? size * 2.4 : size;
  const gradientId = "seagres-logo-grad";

  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        width={height}
        height={height}
        aria-hidden="true"
        role="img"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1e5aa8" />
            <stop offset="1" stopColor="#3aa6ff" />
          </linearGradient>
        </defs>
        {/* Tetes air */}
        <path
          d="M32 4 C20 22 12 32 12 44 a20 20 0 0 0 40 0 C52 32 44 22 32 4 Z"
          fill={`url(#${gradientId})`}
        />
        {/* Ombak putih di dalam tetes */}
        <path
          d="M14 42 q6 -6 12 0 t12 0 t12 0"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 50 q6 -5 12 0 t12 0 t12 0"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />
        {/* Ikan stilasi */}
        <path
          d="M36 30 c4 0 10 3 12 7 c-2 4 -8 7 -12 7 c-3 0 -5 -1 -7 -3 l-5 3 l2 -7 l-2 -7 l5 3 c2 -2 4 -3 7 -3 Z"
          fill="#ffffff"
          opacity="0.95"
        />
        <circle cx="44" cy="36" r="1.6" fill="#1e5aa8" />
      </svg>
      {showText ? (
        <strong style={{ fontSize: Math.max(14, size * 0.55), color: "#0d3a72", letterSpacing: 0.2 }}>
          sea<span style={{ color: "#1e9bd7" }}>gres</span>
        </strong>
      ) : null}
    </span>
  );
}
