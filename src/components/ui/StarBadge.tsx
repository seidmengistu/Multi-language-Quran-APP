/**
 * Classic Islamic 8-point star (two overlapping rounded squares) used as the
 * surah-number medallion. Pure SVG so it stays crisp at any size.
 */
export function StarBadge({
  n,
  size = 46,
  fontSize,
}: {
  n: number | string;
  size?: number;
  fontSize?: number;
}) {
  return (
    <span className="star-badge" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <g
          fill="var(--primary-soft)"
          stroke="var(--gold)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        >
          <rect x="18" y="18" width="64" height="64" rx="10" />
          <rect
            x="18"
            y="18"
            width="64"
            height="64"
            rx="10"
            transform="rotate(45 50 50)"
          />
        </g>
      </svg>
      <span
        className="star-badge-num"
        style={{ fontSize: fontSize ?? size * 0.32 }}
      >
        {n}
      </span>
    </span>
  );
}
