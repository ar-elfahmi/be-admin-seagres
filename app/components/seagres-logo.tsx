import Image from "next/image";

interface SeagresLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

/**
 * Logo SeaGres dimuat dari /logo.png (sumber daya statis publik).
 * Tampilkan wordmark "SeaGres" di samping mark sesuai kebutuhan.
 */
export default function SeagresLogo({ size = 36, showText = false, className }: SeagresLogoProps) {
  const ratio = showText ? 2.6 : 1;
  const height = size;
  const width = size * ratio;
  const fontSize = Math.max(14, Math.round(size * 0.55));

  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, lineHeight: 1 }}
    >
      <Image
        src="/logo.png"
        alt="Logo SeaGres"
        width={width}
        height={height}
        sizes={`${Math.round(width)}px`}
        unoptimized
        style={{ height, width: "auto", display: "block" }}
      />
      {showText ? (
        <strong
          style={{
            fontSize: fontSize,
            color: "#0d3a72",
            letterSpacing: 0.2,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          sea<span style={{ color: "#1e9bd7" }}>gres</span>
        </strong>
      ) : null}
    </span>
  );
}
