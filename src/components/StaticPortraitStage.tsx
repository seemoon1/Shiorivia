"use client";
import { motion } from "framer-motion";

/** Static full-body Charta portrait; never substitutes a profile avatar. */
export function StaticPortraitStage({ src, leftSidebarOpen, rightSidebarOpen }: {
  src: string; leftSidebarOpen: boolean; rightSidebarOpen: boolean;
}) {
  return <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden="true">
    <motion.img
      key={src}
      src={src}
      alt=""
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="absolute bottom-0 right-0 h-[78dvh] max-w-[92vw] object-contain object-bottom drop-shadow-[0_22px_35px_rgba(25,47,36,0.16)] md:h-[88dvh] md:max-w-[min(68vw,780px)]"
      style={{
        // Match Live2D's stage behavior: keep the figure out of open desktop sidebars.
        right: rightSidebarOpen ? "clamp(0px, 23vw, 360px)" : "clamp(0px, 3vw, 48px)",
        maxWidth: leftSidebarOpen && rightSidebarOpen ? "44vw" : leftSidebarOpen ? "56vw" : undefined,
      }}
    />
  </div>;
}
