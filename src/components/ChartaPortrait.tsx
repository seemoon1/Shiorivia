"use client";
import type { ChartaCharacter } from "../lib/charta";

export function ChartaPortrait({ character, className = "" }: { character: Pick<ChartaCharacter, "avatar" | "hex">; className?: string }) {
  return <div className={`flex items-center justify-center overflow-hidden ${className}`} style={{ backgroundColor: `${character.hex}20` }}>
    {character.avatar.startsWith("data:image/")
      ? <img src={character.avatar} alt="" className="h-full w-full object-cover" />
      : <span aria-hidden className="text-4xl">{character.avatar}</span>}
  </div>;
}
