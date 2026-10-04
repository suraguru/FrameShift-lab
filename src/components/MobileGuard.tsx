"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const MOBILE_BREAKPOINT = 1024; // px — anything below this is considered mobile/tablet

export default function MobileGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    setMounted(true);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Avoid hydration mismatch — render nothing until client-side check is done
  if (!mounted) return null;

  if (!isMobile) return <>{children}</>;

  return (
    <div className="mobile-guard">
      {/* Scanline overlay for CRT effect */}
      <div className="mobile-guard__scanlines" />

      {/* Animated background grid */}
      <div className="mobile-guard__grid" />

      {/* Main content */}
      <div className="mobile-guard__content">
        {/* Logo */}
        <div className="mobile-guard__icon">
          <Image
            src="/logo.png"
            alt="FrameShift Logo"
            width={320}
            height={64}
            className="w-72 sm:w-80 h-auto object-contain drop-shadow-[0_0_12px_rgba(0,255,156,0.25)]"
            priority
          />
          <div className="mobile-guard__icon-glow" />
        </div>

        {/* Title */}
        <h1 className="mobile-guard__title">
          <span className="mobile-guard__title-bracket">[</span>
          DESKTOP ONLY
          <span className="mobile-guard__title-bracket">]</span>
        </h1>

        {/* Divider */}
        <div className="mobile-guard__divider">
          <span className="mobile-guard__divider-line" />
          <span className="mobile-guard__divider-dot" />
          <span className="mobile-guard__divider-line" />
        </div>

        {/* Message */}
        <p className="mobile-guard__message">
          <span className="mobile-guard__label">FrameShift Lab </span> is
          engineered for desktop &amp; laptop displays.
        </p>

        <p className="mobile-guard__sub-message">
          A responsive mobile experience is currently in development&nbsp;—
          <br />
          please switch to a larger screen to continue.
        </p>

        {/* Status badge */}
        <div className="mobile-guard__status">
          <span className="mobile-guard__status-led" />
          <span className="mobile-guard__status-text">
            MOBILE VERSION &bull; COMING SOON
          </span>
        </div>

        {/* Terminal-style footer */}
        <div className="mobile-guard__terminal">
          <span className="mobile-guard__terminal-prompt">&gt;</span>
          <span className="mobile-guard__terminal-text">
            min_viewport: 1024px
          </span>
          <span className="mobile-guard__terminal-cursor" />
        </div>
      </div>
    </div>
  );
}
