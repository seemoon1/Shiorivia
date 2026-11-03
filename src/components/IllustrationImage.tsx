"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/** A quiet paper-and-gold frame, shared by the chat stage and Tela. */
export function IllustratedImage({ src, alt, onOpen, compact = false, className = "" }: {
  src: string;
  alt: string;
  onOpen: (src: string) => void;
  compact?: boolean;
  className?: string;
}) {
  return (
    <button type="button" onClick={() => onOpen(src)} aria-label={`预览图片：${alt}`}
      className={`inline-block max-w-full rounded-2xl border border-[#d7c5a5] bg-[#fffdf7] p-1.5 shadow-[0_6px_22px_rgba(40,55,65,0.12)] ring-1 ring-[#f1e8d6] transition hover:-translate-y-0.5 hover:border-[#bba076] hover:shadow-[0_10px_26px_rgba(40,55,65,0.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7655] ${className}`}>
      <img src={src} alt={alt} loading="lazy" className={`${compact ? "h-32" : "max-h-[420px]"} block max-w-full rounded-xl object-contain`} />
    </button>
  );
}

/** Close button, backdrop and Escape all exit the preview without opening a new tab. */
export function ImageLightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!src) return;
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
      previouslyFocused?.focus();
    };
  }, [src, onClose]);

  if (!src) return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="图片预览"
      className="fixed inset-0 z-[10050] flex items-center justify-center bg-[#091729]/90 px-4 py-14 backdrop-blur-md"
      onClick={onClose}>
      <button ref={closeRef} type="button" onClick={onClose} aria-label="关闭图片预览" title="关闭 · Esc"
        className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white shadow-lg transition hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:right-8 sm:top-7">
        <X size={21} />
      </button>
      <img src={src} alt="放大的插图" onClick={event => event.stopPropagation()}
        className="max-h-full max-w-full rounded-xl border border-[#d8c5a1]/70 bg-[#f9f5ed] p-1.5 object-contain shadow-[0_20px_70px_rgba(0,0,0,0.5)]" />
    </div>,
    document.body
  );
}
