import { cn } from "@/lib/utils";

// inredia mark: a room corner in one-point perspective with a window of light —
// "your room, seen anew". Works on light and dark backgrounds.
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={cn("shrink-0", className)} aria-hidden="true">
      <defs>
        <linearGradient id="inredia-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1b2540" />
          <stop offset="1" stopColor="#0f1526" />
        </linearGradient>
        <linearGradient id="inredia-glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd6c7" />
          <stop offset="1" stopColor="#ff6a3d" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#inredia-bg)" />
      {/* floor plane */}
      <path d="M12 52 L32 36 L52 52 Z" fill="#ffffff" opacity="0.12" />
      {/* back wall corner */}
      <path d="M32 36 V14" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 52 L32 36 L52 52" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* window of light on the right wall */}
      <polygon points="38,17 47,24.2 47,35 38,27.8" fill="url(#inredia-glow)" />
      {/* sofa silhouette */}
      <rect x="18" y="41" width="18" height="7" rx="3" fill="#ff6a3d" />
      <rect x="20" y="37" width="14" height="5" rx="2" fill="#ffb59a" />
    </svg>
  );
}

export function Logo({ size = 28, className, withText = true }: { size?: number; className?: string; withText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      {withText && <span className="text-[17px] font-semibold tracking-tight">inredia</span>}
    </span>
  );
}
