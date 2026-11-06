"use client";

import { memo, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownUp, ChevronDown, ChevronRight, Disc3, ListMusic, Music2, Pause, Play, Repeat1, Shuffle, SkipBack, SkipForward, Volume2, X, FolderClosed, PlayCircle } from "lucide-react";
import { useMusic } from "../context/MusicContext";
import { musicFolderTree, type MusicFolder } from "../lib/musicPlaylists";
import { parseLrc, type LyricLine } from "../lib/lrcParser";

const seconds = (n: number) => {
  if (!Number.isFinite(n) || n < 0) return "0:00";
  return `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
};

function PlaylistTree({ folders, selected, onSelect, depth = 0 }: {
  folders: MusicFolder[]; selected: string | null; onSelect: (key: string) => void; depth?: number;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ "本地音乐": true });
  return <div className="space-y-1">
    {folders.map(folder => <div key={folder.key}>
      <div className="flex items-center gap-1 rounded-lg hover:bg-white/5" style={{ paddingLeft: `${depth * 13 + 6}px` }}>
        <button type="button" aria-label={`展开 ${folder.name}`} onClick={() => setExpanded(p => ({ ...p, [folder.key]: !p[folder.key] }))} className="rounded p-1.5 text-[#a8b8c9] hover:text-[#ecd9b8]">
          {folder.children.length ? (expanded[folder.key] ? <ChevronDown size={14}/> : <ChevronRight size={14}/>) : <span className="block w-3.5"/>}
        </button>
        <button type="button" onClick={() => onSelect(folder.key)} aria-pressed={selected === folder.key} className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-xs ${selected === folder.key ? "bg-[#c2a577]/20 text-[#eedbb5]" : "text-[#c4d0db]"}`}>
          <FolderClosed size={14} className="shrink-0 text-[#c7af80]"/>
          <span className="min-w-0 flex-1 truncate">{folder.name}</span>
          <span className="text-[10px] opacity-60">{folder.count}</span>
        </button>
      </div>
      {expanded[folder.key] && folder.children.length > 0 && <PlaylistTree folders={folder.children} selected={selected} onSelect={onSelect} depth={depth + 1}/>}
    </div>)}
  </div>;
}

const VinylRecord = memo(function VinylRecord({ cover, isPlaying }: {
  cover?: string; isPlaying: boolean;
}) {
  return (
    <div className="relative aspect-square w-[min(73vw,400px)] max-h-[48vh] max-w-[48vh] md:w-[min(40vw,430px)] md:max-h-[60vh] md:max-w-[60vh]">
      <div className="absolute inset-0 rounded-full border-[8px] border-[#c2a978] bg-[#080e16] shadow-[0_20px_65px_rgba(0,0,0,0.55),inset_0_0_0_2px_rgba(241,224,187,0.24)] md:border-[10px]">
        {/* The grooves are rotationally symmetric: keep the large gradient
            stationary and animate only the small center artwork layer. */}
        <div className="absolute inset-[2%] flex items-center justify-center overflow-hidden rounded-full bg-[repeating-radial-gradient(circle,#101720_0px,#0b121b_3px,#1b2530_4px,#101720_6px)]">
          <div className="absolute inset-[6%] rounded-full border border-[#d4c09a]/10"/>
          <div className={`relative z-10 flex h-[36%] w-[36%] items-center justify-center overflow-hidden rounded-full border-[5px] border-[#c8b17f] bg-[#d8c79f] text-[#334961] shadow-[0_0_0_5px_rgba(0,0,0,0.6)] ${Boolean(cover) ? "animate-spin-slow transform-gpu will-change-transform" : ""}`} style={Boolean(cover) ? { animationDuration: "12s", animationPlayState: isPlaying ? "running" : "paused" } : undefined}>
            {cover ? <img src={cover} alt="音乐封面" className="h-full w-full object-cover"/> : <span className="flex flex-col items-center gap-1 text-center"><Music2 size={25}/><span className="text-[7px] font-bold tracking-widest">SHIORIVIA</span></span>}
          </div>
          <div className="absolute left-1/2 top-1/2 z-20 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#263c54] shadow"/>
        </div>
      </div>
      <div className={`pointer-events-none absolute -right-[5%] -top-[7%] z-20 h-[54%] w-[20%] origin-[50%_5%] transition-transform duration-700 ${isPlaying ? "rotate-[8deg]" : "-rotate-[15deg]"}`}>
        <div className="absolute left-1/2 top-0 h-7 w-7 -translate-x-1/2 rounded-full border-[5px] border-[#ac9062] bg-[#ead4a2] shadow-lg"/>
        <div className="absolute left-1/2 top-5 h-[78%] w-[9px] -translate-x-1/2 -rotate-[15deg] rounded-full border border-[#93774d] bg-gradient-to-r from-[#b79a6b] to-[#f2dfb7] shadow-md"/>
        <div className="absolute bottom-[1%] left-[14%] h-9 w-5 rotate-[20deg] rounded-sm border border-[#97784d] bg-[#e8d4a6] shadow-md"/>
      </div>
    </div>
  );
});

// The lyrics list can contain hundreds of nodes. Keep it out of frequent
// playback-progress reconciliation; only update when the active line changes.
const LyricLines = memo(function LyricLines({ lyrics, lineIndex, audioRef }: {
  lyrics: LyricLine[]; lineIndex: number; audioRef: RefObject<HTMLAudioElement | null>;
}) {
  return (
    <>
            {lyrics.length ? <div className="space-y-1 pb-[35%] pt-8 text-left">
              {lyrics.map((line, index) => <button type="button" key={`${index}-${line.time}`} data-lyric-index={index} onClick={() => { if (audioRef.current) audioRef.current.currentTime = line.time; }} className={`relative block w-full border-l-2 py-2 pl-4 pr-2 text-left transition-all duration-300 ${index === lineIndex ? "border-[#d9bc7f] text-[#f3dfb8]" : "border-transparent text-[#8796a7] hover:text-[#bbc8d6]"}`}>
                <span className={`block text-sm leading-8 md:text-lg ${index === lineIndex ? "font-semibold" : "font-normal"}`}>{line.text}</span>
                {line.translation && <span className="mt-1 block text-xs leading-6 text-[#aebbc9]">{line.translation}</span>}
              </button>)}
            </div> : <div className="flex h-full min-h-48 items-center gap-3 text-sm text-[#8ea3b6]"><Disc3 size={20} className="text-[#c3a879]"/> 暂无歌词 · Instrumental</div>}
    </>
  );
});

export function MusicPlayerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const music = useMusic();
  const { currentTrack, isPlaying, togglePlay, playNext, playPrev, setTrackId,
    playMode, setPlayMode, volume, setVolume, progress, duration, audioRef,
    playQueue, allTracks, selectedPlaylist, selectPlaylist } = music;
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryTab, setLibraryTab] = useState<"folders" | "queue">("folders");
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const lyricBox = useRef<HTMLDivElement>(null);
  const [showMobileLyrics, setShowMobileLyrics] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showLibrary) setShowLibrary(false);
        else onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, showLibrary]);

  useEffect(() => {
    let alive = true;
    setLyrics([]);
    if (!currentTrack?.lrc) return;
    fetch(currentTrack.lrc)
      .then(response => response.ok ? response.text() : Promise.reject(new Error("No lyrics")))
      .then(text => { if (alive) setLyrics(parseLrc(text)); })
      .catch(() => { if (alive) setLyrics([]); });
    return () => { alive = false; };
  }, [currentTrack?.id, currentTrack?.lrc]);

  const lineIndex = useMemo(() => {
    if (!lyrics.length) return -1;
    for (let i = lyrics.length - 1; i >= 0; i--) if (progress >= lyrics[i].time) return i;
    return -1;
  }, [lyrics, progress]);

  useEffect(() => {
    if (!isOpen || lineIndex < 0 || !lyricBox.current) return;
    const box = lyricBox.current;
    const active = box.querySelector<HTMLElement>(`[data-lyric-index="${lineIndex}"]`);
    if (!active) return;
    // offsetTop and the lyric pane can have different offset parents. Use
    // viewport-relative coordinates, then scroll only this pane (not the dialog).
    const lineTop = active.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
    box.scrollTo({ top: Math.max(0, lineTop - box.clientHeight * 0.35), behavior: "smooth" });
  }, [lineIndex, isOpen, lyrics]);

  const folders = useMemo(() => musicFolderTree(allTracks), [allTracks]);
  const pct = duration > 0 ? Math.min(100, progress / duration * 100) : 0;
  const modes = ["sequence", "reverse", "loop", "shuffle"] as const;
  const toggleMode = () => setPlayMode(modes[(modes.indexOf(playMode) + 1) % modes.length]);
  const modeIcon = playMode === "reverse" ? <ArrowDownUp size={18}/> : playMode === "loop" ? <Repeat1 size={18}/> : playMode === "shuffle" ? <Shuffle size={18}/> : <ListMusic size={18}/>;

  return <AnimatePresence>
    {isOpen && <motion.div role="dialog" aria-modal="true" aria-label="Shiorivia 音乐播放器"
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.23 }} className="fixed inset-0 z-[210] flex flex-col overflow-hidden bg-[#152941] text-[#e8e4dc]">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_42%,rgba(184,160,113,0.11),transparent_48%),linear-gradient(135deg,#152941,#0f1f33)]"/>
      <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-[#d1b982]/20 px-5 py-4 md:px-10">
        <button type="button" onClick={onClose} aria-label="关闭播放器" className="rounded-xl border border-[#c6b187]/30 p-2 text-[#e0cfb2] transition hover:bg-white/10"><ChevronDown size={21}/></button>
        <div className="text-center"><p className="text-[10px] font-semibold tracking-[0.3em] text-[#ccb887]">SHIORIVIA / MUSIC</p><p className="mt-1 max-w-[55vw] truncate font-serif text-sm text-[#ead9b8]">Where stories find their way.</p></div>
        <span aria-hidden="true" className="h-9 w-9"/>
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-hidden px-5 py-3 md:flex-row md:gap-10 md:px-10 lg:gap-16">
        <section className={`relative flex h-full min-h-0 w-full items-center justify-center md:w-[47%] ${showMobileLyrics ? "hidden md:flex" : "flex"}`} onClick={() => { if (window.innerWidth < 768) setShowMobileLyrics(true); }}>
          <VinylRecord cover={currentTrack?.cover} isPlaying={isPlaying}/>
        </section>
        <section className={`flex h-full max-h-full min-h-0 w-full max-w-xl flex-1 flex-col overflow-hidden md:max-w-[48%] ${!showMobileLyrics ? "hidden md:flex" : "flex"}`}>
          <div className="shrink-0 pb-4 pt-5 md:pt-7"><h2 className="truncate font-serif text-xl font-semibold text-[#ebd8ad] md:text-2xl">{currentTrack?.name || "Shiorivia"}</h2><p className="mt-1 truncate text-sm text-[#9bafc2]">{currentTrack?.artist || "Music Library"}</p></div>
          <div ref={lyricBox} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain pr-4 scrollbar-thin">
            <LyricLines lyrics={lyrics} lineIndex={lineIndex} audioRef={audioRef}/>
          </div>
          {showMobileLyrics && <button type="button" onClick={() => setShowMobileLyrics(false)} className="mt-2 self-start text-xs text-[#d5be93] md:hidden">返回唱片</button>}
        </section>
      </main>

      <footer className="relative z-20 shrink-0 border-t border-[#d0b784]/20 bg-[#0c1b2c]/95 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 md:px-12">
        <div className="mx-auto flex max-w-5xl items-center gap-3 text-[11px] text-[#96a9ba]"><span>{seconds(progress)}</span><div className="relative h-1 flex-1 rounded-full bg-[#d9c39b]/15"><div className="h-full rounded-full bg-[#c6aa79]" style={{ width: `${pct}%` }}/><input aria-label="歌曲进度" type="range" min={0} max={duration || 1} step={0.1} value={Math.min(progress, duration || 1)} onChange={e => { if (audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="absolute inset-x-0 -top-3 h-7 w-full cursor-pointer opacity-0"/></div><span>{seconds(duration)}</span></div>
        <div className="mx-auto mt-4 flex max-w-5xl items-center justify-between gap-3">
          <button type="button" onClick={toggleMode} aria-label={`播放模式：${playMode}`} className="rounded-lg p-2 text-[#b5c1cc] hover:bg-white/10">{modeIcon}</button>
          <div className="flex items-center gap-5 md:gap-9"><button type="button" onClick={playPrev} aria-label="上一首" className="text-[#c6d0d9] hover:text-[#f0d8a8]"><SkipBack size={25}/></button><button type="button" onClick={togglePlay} aria-label={isPlaying ? "暂停" : "播放"} className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e5d2aa] text-[#223951] transition-transform hover:scale-105 md:h-14 md:w-14">{isPlaying ? <Pause size={23} fill="currentColor"/> : <Play size={23} fill="currentColor" className="ml-1"/>}</button><button type="button" onClick={playNext} aria-label="下一首" className="text-[#c6d0d9] hover:text-[#f0d8a8]"><SkipForward size={25}/></button></div>
          <div className="flex items-center gap-2"><Volume2 size={16} className="hidden text-[#a9b9c8] sm:block"/><input aria-label="音量" aria-valuetext={`${Math.round(volume * 100)}%`} type="range" min={0} max={1} step={0.01} value={volume} onChange={e => setVolume(Number(e.target.value))} className="hidden w-20 accent-[#c9ae7b] sm:block"/><span aria-live="off" className="hidden w-9 text-right text-[11px] tabular-nums text-[#cbb993] sm:inline-block">{Math.round(volume * 100)}%</span><button type="button" onClick={() => setShowLibrary(p => !p)} aria-label="歌单与播放列表" aria-expanded={showLibrary} className="relative left-2 rounded-lg p-2 text-[#d7c29c] hover:bg-white/10 md:left-5"><ListMusic size={22}/></button></div>
        </div>
      </footer>

      <AnimatePresence>{showLibrary && <motion.div role="dialog" aria-label="歌单与播放列表" initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 12 }} className="absolute bottom-[112px] right-3 z-30 flex h-[min(68vh,500px)] w-[min(94vw,365px)] flex-col overflow-hidden rounded-2xl border border-[#c6a978]/35 bg-[#1b3048] shadow-[0_20px_80px_rgba(0,0,0,0.56)] md:bottom-[120px] md:right-8">
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3"><p className="text-xs font-semibold tracking-[0.15em] text-[#e1c995]">MUSIC LIBRARY</p><button type="button" aria-label="关闭歌单" onClick={() => setShowLibrary(false)} className="rounded-lg p-1 text-[#c6d1da] hover:bg-white/10"><X size={17}/></button></div>
        <div className="flex shrink-0 gap-2 border-b border-white/10 px-4 py-2 text-xs"><button type="button" onClick={() => setLibraryTab("folders")} className={`flex-1 rounded-lg py-2 ${libraryTab === "folders" ? "bg-[#d3bc90] text-[#20364f]" : "text-[#aabbd0] hover:bg-white/10"}`}>歌单</button><button type="button" onClick={() => setLibraryTab("queue")} className={`flex-1 rounded-lg py-2 ${libraryTab === "queue" ? "bg-[#d3bc90] text-[#20364f]" : "text-[#aabbd0] hover:bg-white/10"}`}>播放列表</button></div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 scrollbar-thin">
          {libraryTab === "folders" ? <>
            <button type="button" onClick={() => selectPlaylist(null)} className={`mb-2 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs ${selectedPlaylist === null ? "bg-[#c2a577]/20 text-[#eedbb5]" : "text-[#bdcad6] hover:bg-white/5"}`}><span>全部歌曲</span><span className="opacity-60">{allTracks.length}</span></button>
            <PlaylistTree folders={folders} selected={selectedPlaylist} onSelect={selectPlaylist}/>
            <p className="mt-4 border-t border-white/10 px-2 pt-3 text-[11px] leading-5 text-[#95aabe]">选择文件夹将其及子文件夹的歌曲设为播放列表。扫描入口位于设置 → 媒体。</p>
          </> : <div className="space-y-1">
            {playQueue.length ? playQueue.map((track, index) => <button type="button" key={track.id} onClick={() => setTrackId(track.id)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-white/10 ${currentTrack?.id === track.id ? "bg-[#c2a577]/15 text-[#e9d6b3]" : "text-[#c4d0de]"}`}><span className="w-5 shrink-0 text-[10px] opacity-50">{index + 1}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs">{track.name}</span><span className="mt-0.5 block truncate text-[10px] opacity-60">{track.artist}</span></span>{currentTrack?.id === track.id && <PlayCircle size={15}/>}</button>) : <p className="py-10 text-center text-xs text-[#99acbd]">当前歌单没有歌曲</p>}
          </div>}
        </div>
      </motion.div>}</AnimatePresence>
    </motion.div>}
  </AnimatePresence>;
}
