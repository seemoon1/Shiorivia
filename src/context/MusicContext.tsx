"use client";
import React, { createContext, useContext, useState, useRef, useEffect, useMemo, useCallback } from "react";
import { BGM_LIBRARY, BGMTrack } from "../data/bgm_library";

type MusicContextType = {
  isPlaying: boolean;
  togglePlay: () => void;
  currentTrack: BGMTrack;
  setTrackId: (id: string, artist?: string) => void;
  progress: number;
  duration: number;
  audioRef: React.RefObject<HTMLAudioElement | null>; 
  volume: number;
  setVolume: (v: number) => void;
  playMode: 'sequence' | 'reverse' | 'loop' | 'shuffle';
  setPlayMode: (m: 'sequence' | 'reverse' | 'loop' | 'shuffle') => void;
  playNext: () => void;
  playPrev: () => void;
  playQueue: BGMTrack[];
  activeTab: 'band' | 'solo';
  setActiveTab: (t: 'band' | 'solo') => void;
  refreshLibrary: () => Promise<void>;
};

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider = ({ children }: { children: React.ReactNode }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState<string>("silence"); 
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [playMode, setPlayMode] = useState<'sequence' | 'reverse' | 'loop' | 'shuffle'>('sequence');
  const [activeTab, setActiveTab] = useState<'band' | 'solo'>('solo');
  const [localTracks, setLocalTracks] = useState<BGMTrack[]>([]);
  const refreshLibrary = useCallback(async () => {
    const res = await fetch('/api/local/music', { cache: 'no-store' });
    if (!res.ok) throw new Error('Unable to load the local music index');
    const data = await res.json();
    if (Array.isArray(data.tracks)) setLocalTracks(data.tracks);
  }, []);
  useEffect(() => { void refreshLibrary().catch(() => {}); }, [refreshLibrary]);
  const allTracks = useMemo(() => [...BGM_LIBRARY, ...localTracks], [localTracks]);
  const currentTrack = useMemo(() =>
    allTracks.find(t => t.id === currentTrackId) || allTracks[0],
  [currentTrackId, allTracks]);
  const setTrackId = useCallback((id: string, artist?: string) => {
    if (!id) return;
    const found = allTracks.find(t => t.id === id)
      || allTracks.find(t => t.name === id && (!artist || t.artist === artist));
    if (found) setCurrentTrackId(found.id);
  }, [allTracks]);
  const playQueue = useMemo(() => {
      let queue = [...allTracks];
      if (playMode === 'reverse') queue.reverse();
      if (playMode === 'shuffle') {
          queue = queue.sort(() => Math.random() - 0.5);
      }
      return queue;
  }, [allTracks, playMode]);

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    const expected = new URL(currentTrack.src, window.location.href).href;
    if (audioRef.current.src !== expected) {
      audioRef.current.src = expected;
      audioRef.current.load();
      if (currentTrackId !== 'silence') {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    }
  }, [currentTrackId, currentTrack?.src]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
        setProgress(audioRef.current.currentTime);
        setDuration(audioRef.current.duration || 0);
    }
  };

  const handleEnded = () => {
      if (playMode === 'loop') {
          audioRef.current?.play();
      } else {
          playNext();
      }
  };

  const togglePlay = () => {
      if (audioRef.current) {
          if (isPlaying) audioRef.current.pause();
          else audioRef.current.play();
          setIsPlaying(!isPlaying);
      }
  };

  const playNext = () => {
      if (!playQueue.length) return;
      const idx = playQueue.findIndex(t => t.id === currentTrack?.id);
      const next = playQueue[(idx + 1) % playQueue.length];
      setCurrentTrackId(next.id);
  };

  const playPrev = () => {
      if (!playQueue.length) return;
      const idx = playQueue.findIndex(t => t.id === currentTrack?.id);
      const prev = playQueue[(idx - 1 + playQueue.length) % playQueue.length];
      setCurrentTrackId(prev.id);
  };

  useEffect(() => {
      if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  return (
    <MusicContext.Provider value={{
        isPlaying, togglePlay, currentTrack, setTrackId,
        progress, duration, audioRef, volume, setVolume,
        playMode, setPlayMode, playNext, playPrev, playQueue,
        activeTab, setActiveTab, refreshLibrary
    }}>
        <audio 
            ref={audioRef} 
            onTimeUpdate={handleTimeUpdate} 
            onEnded={handleEnded}
            onError={(e) => console.error("Audio Error:", e)}
        />
        {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) throw new Error("useMusic must be used within a MusicProvider");
  return context;
};