"use client";
import { useMusic } from "../context/MusicContext";
import { Play, Pause, SkipForward, SkipBack, Disc, ChevronUp, ChevronDown, X, Music } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export const MiniPlayer = ({
    onExpand,
    rightSidebarOpen,
    themeMode = 'light'
}: {
    onExpand: () => void,
    rightSidebarOpen?: boolean,
    themeMode?: 'light' | 'sage' | 'paper'
}) => {
    const { isPlaying, togglePlay, currentTrack, playNext, playPrev, progress, duration } = useMusic();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setIsMobile(window.innerWidth < 768);
    }, []);

    if (!currentTrack || currentTrack.id === 'silence') return null;

    const percent = duration > 0 ? (progress / duration) * 100 : 0;

    // All main modes share a quiet white surface; only Tela adopts its page palette.
    const containerStyle = themeMode === 'sage' ? "bg-[#e1ebdf]/95 border-[#9db6a2] text-[#395845] shadow-[0_3px_12px_rgba(50,86,60,.12)]"
      : themeMode === 'paper' ? "bg-[#f8efd9]/95 border-[#dfd0b0] text-[#725e43]"
      : "bg-white/95 border-slate-200 text-slate-700";
    const playBtnStyle = themeMode === 'sage' ? "bg-[#bcd4c0] text-[#2e6041] hover:bg-[#a9c9b0]"
      : themeMode === 'paper' ? "bg-[#eaddc1] text-[#806747] hover:bg-[#ded0b1]"
      : "bg-[#edf2ef] text-[#557a66] hover:bg-[#e1ebe5]";
    const progressColor = themeMode === 'sage' ? "bg-[#608969]" : themeMode === 'paper' ? "bg-[#c0a06d]" : "bg-[#91ad9c]";

    const discStyle = themeMode === "sage"
      ? "border-[#638a71] bg-[#304a38] ring-[#b7ceb9]"
      : themeMode === "paper" ? "border-[#b3996d] bg-[#463c2e] ring-[#d6bc8a]"
      : "border-[#182b3a] bg-[#111e2b] ring-[#c9ae7b]";

    return (
        <AnimatePresence mode="wait">
            {!isCollapsed && (
                <motion.div
                    key="expanded"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`w-full backdrop-blur-md border-b shadow-sm relative overflow-hidden group z-10 ${containerStyle}`}
                >
                    <div className={`absolute top-0 left-0 h-0.5 z-10 transition-all duration-300 ${progressColor}`} style={{ width: `${percent}%` }}></div>

                    <div className="flex items-center justify-between p-2 px-4 gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={onExpand}>
                            <div className={`relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] ring-1 shadow-sm ${discStyle} ${isPlaying ? 'animate-spin-slow' : ''}`} style={{ animationDuration: '6s' }}>
                                {currentTrack.cover ? <><img src={currentTrack.cover} alt="" className="h-full w-full rounded-full object-cover"/><span aria-hidden="true" className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e6d1a5] shadow"/></> : <Disc size={16} className={themeMode === "sage" ? "text-[#d1e4d4]" : "text-[#d3be93]"} />}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <div className="text-xs font-bold truncate flex items-center gap-1 opacity-90">
                                    {currentTrack.name}
                                    <span className="rounded border border-current/20 px-1 text-[9px] font-normal opacity-60">MUSIC</span>
                                </div>
                                <div className="text-[10px] truncate opacity-60">{currentTrack.artist}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={playPrev} className="hover:opacity-60 transition-opacity"><SkipBack size={16} /></button>
                            <button onClick={togglePlay} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${playBtnStyle}`}>
                                {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                            </button>
                            <button onClick={playNext} className="hover:opacity-60 transition-opacity"><SkipForward size={16} /></button>
                            <div className="w-px h-4 bg-current opacity-20 mx-1"></div>
                            <button onClick={() => setIsCollapsed(true)} className="hover:opacity-60 transition-opacity"><ChevronUp size={16} /></button>
                        </div>
                    </div>
                </motion.div>
            )}

            {isCollapsed && (
                <motion.div
                    key="collapsed"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{
                        opacity: 1, scale: 1,
                        left: isMobile ? "50%" : "auto",
                        x: isMobile ? "-50%" : 0,
                    }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 250, damping: 20 }}
                    className={`
                    fixed z-[9999] cursor-pointer
                    top-[calc(env(safe-area-inset-top)+60px)]
                    md:top-[70px]
                `}
                    style={{
                        right: !isMobile ? (rightSidebarOpen ? '320px' : '20px') : 'auto'
                    }}

                    onClick={() => setIsCollapsed(false)}
                >
                    {isMobile ? (
                        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-full shadow-xl min-w-[140px] justify-center ${containerStyle}`}>
                            <div className="flex gap-0.5 items-end h-3">
                                <motion.div animate={{ height: isPlaying ? [4, 10, 4] : 4 }} transition={{ repeat: Infinity, duration: 0.5 }} className={`w-1 ${progressColor} rounded-full`} />
                                <motion.div animate={{ height: isPlaying ? [4, 14, 4] : 4 }} transition={{ repeat: Infinity, duration: 0.7 }} className={`w-1 ${progressColor} rounded-full`} />
                                <motion.div animate={{ height: isPlaying ? [4, 8, 4] : 4 }} transition={{ repeat: Infinity, duration: 0.6 }} className={`w-1 ${progressColor} rounded-full`} />
                            </div>
                            <span className="text-xs font-bold truncate max-w-[120px]">{currentTrack.name}</span>
                        </div>
                    ) : (
                        <div className={`flex items-center gap-2 backdrop-blur-md border px-3 py-1.5 rounded-full shadow-lg text-xs font-bold hover:scale-105 transition-all ${containerStyle}`}>
                            <Music size={14} className={isPlaying ? "animate-spin-slow" : ""} />
                            <span>Now Playing</span>
                            <ChevronDown size={14} />
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};