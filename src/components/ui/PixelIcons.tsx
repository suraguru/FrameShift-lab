import React from "react";

export interface PixelIconProps extends React.SVGProps<SVGSVGElement> {
  active?: boolean;
}

// Helper to render an SVG with a 16x16 grid coordinate system for pixel perfection
const PixelArtSVG = ({ children, active, className = "", ...props }: PixelIconProps) => (
  <svg
    viewBox="0 0 16 16"
    width="16"
    height="16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    shapeRendering="crispEdges"
    className={`${active ? "text-accent-green" : "text-currentColor"} ${className}`}
    {...props}
  >
    {children}
  </svg>
);

// ── Tracking ──
export const TrackIcon = (props: PixelIconProps) => (
  <PixelArtSVG {...props}>
    <path d="M2 2h4v2H4v2H2V2zm8 0h4v4h-2V4h-2V2zM2 10h2v2h2v2H2v-4zm10 2h-2v2h4v-4h-2v2zM6 6h4v4H6V6z" />
  </PixelArtSVG>
);

// ── Color ──
export const ColorIcon = (props: PixelIconProps) => (
  <PixelArtSVG {...props}>
    <path d="M4 2h8v2h2v6h-2v2H4v-2H2V4h2V2zm2 2v6h4V4H6z" />
  </PixelArtSVG>
);

// ── Retro ──
export const RetroIcon = (props: PixelIconProps) => (
  <PixelArtSVG {...props}>
    <path d="M2 3h12v8H2V3zm2 2v4h8V5H4zm-2 7h12v2H2v-2z" />
  </PixelArtSVG>
);

// ── Distortion ──
export const DistortIcon = (props: PixelIconProps) => (
  <PixelArtSVG {...props}>
    <path d="M2 2h6v2H2V2zm8 2h4v2h-4V4zM4 6h8v2H4V6zm-2 4h4v2H2v-2zm6 2h6v2H8v-2z" />
  </PixelArtSVG>
);

// ── Enhancement ──
export const EnhanceIcon = (props: PixelIconProps) => (
  <PixelArtSVG {...props}>
    <path d="M7 1h2v4h4v2H9v4H7V7H3V5h4V1z" />
  </PixelArtSVG>
);

// ── Default / Fallback ──
export const DefaultIcon = (props: PixelIconProps) => (
  <PixelArtSVG {...props}>
    <path d="M3 3h10v10H3V3zm2 2v6h6V5H5z" />
  </PixelArtSVG>
);

export const getIconForCategory = (category: string) => {
  switch (category) {
    case "tracking": return TrackIcon;
    case "color": return ColorIcon;
    case "retro": return RetroIcon;
    case "distortion": return DistortIcon;
    case "motion": return TrackIcon;
    default: return DefaultIcon;
  }
};

export const getIconForPlugin = (id: string) => {
  // Can map specific plugin IDs to unique icons here later
  return null;
}
