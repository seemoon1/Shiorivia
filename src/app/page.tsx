"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { CHARACTERS, Session } from "../types";
import { CHAR_DATA } from "../data/char_config";
import LOCAL_LIVE2D_CONFIG from "../data/live2d_config.json";
import { WorldInfoModal, EditModal } from "../components/Modals";
import { SidebarLeft } from "../components/SidebarLeft";
import { SidebarRight } from "../components/SidebarRight";
import { DanmakuOverlay } from "../components/DanmakuOverlay";
import { ChatInterface } from "../components/ChatInterface";
import { Background } from "../components/Background";
import { TransitionEffects } from "../components/TransitionEffects";
import { SaveLoadModal } from "../components/SaveLoadModal";
import { CodeRepositoryModal } from "../components/CodeRepositoryPanel";
import { TachieStage } from "../components/TachieStage";
import { NovelInterface } from "../components/NovelInterface";
import { LimeInterface } from "../components/LimeInterface";
import { MemoryVaultModal } from "../components/MemoryVaultModal";
import { ModeHub } from "../components/ModeHub";
import { SettingsCenter, type SettingKey, type StoryTheme } from "../components/SettingsCenter";
import { DEFAULT_LOCAL_PROVIDERS, defaultModelForProvider, getVisibleLocalProviders, type PublicLocalProvider } from "../lib/localProviders";
import { EffectType } from "../components/TransitionEffects";

import { useMusic } from "../context/MusicContext";
import { useLocalFileSync } from "../hooks/useLocalFileSync";
import { useChatEngine } from "../hooks/useChatEngine";
import { useUI } from "../hooks/useUI";
import { useFileHandler } from "../hooks/useFileHandler";

const Live2DStage = dynamic(() => import("../components/Live2DStage").then(m => m.Live2DStage), { ssr: false });

export default function Home() {
    const [currentSessionId, setCurrentSessionId] = useState<string>("");
    const [activeCharacterId, setActiveCharacterId] = useState("sakiko");
    const [voiceVariant, setVoiceVariant] = useState("black");
    const [manualOutfitId, setManualOutfitId] = useState<string | undefined>(undefined);
    const [isGlobalGenerating, setIsGlobalGenerating] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [tempTitle, setTempTitle] = useState("");
    const [activeMenuSessionId, setActiveMenuSessionId] = useState<string | null>(null);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [playingIndex, setPlayingIndex] = useState<number | null>(null); 
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const ui = useUI();
    const [showModeHub, setShowModeHub] = useState(true);
    const [showSettingsCenter, setShowSettingsCenter] = useState(false);
    const [showMemoryVault, setShowMemoryVault] = useState(false);

    useEffect(() => {
        console.log("🔍 [Page Debug] Current Char:", activeCharacterId);
        console.log("🔍 [Page Debug] Live2D Config:", LOCAL_LIVE2D_CONFIG);
        
        const config = (LOCAL_LIVE2D_CONFIG as any)[activeCharacterId];
        console.log("🔍 [Page Debug] Effective Config:", config);
        
        if (!config) console.warn("⚠️ Config is missing! Live2DStage will NOT render.");
    }, [activeCharacterId]);

    const cloud = useLocalFileSync(isGlobalGenerating, ui.showToast);

    const music = useMusic();

    const [config, setConfig] = useState({
        webSearch: false,
        imageGen: false,
        tts: false,
        musicControl: false,
        storyTheme: "sky" as StoryTheme,
        selectedModel: "google/gemini-3-flash-preview",
        customModelId: "",
        expandedGroups: ["Gemini (Google)"] as string[]
    });

    const [apiProvider, setApiProvider] = useState<string>('openrouter');
    const [settingsHydrated, setSettingsHydrated] = useState(false);
    const [disabledProviders, setDisabledProviders] = useState<string[]>([]);
    const [allProviders, setAllProviders] = useState<PublicLocalProvider[]>(DEFAULT_LOCAL_PROVIDERS);
    useEffect(() => {
        try {
            const raw = window.localStorage.getItem("shiorivia_local_preferences_v1");
            const saved = raw ? JSON.parse(raw) : null;
            if (saved && typeof saved === "object") {
                if (Array.isArray(saved.disabledProviders)) setDisabledProviders(saved.disabledProviders.filter((x: unknown) => typeof x === "string"));
                if (typeof saved.apiProvider === "string") setApiProvider(saved.apiProvider);
                setConfig(prev => ({
                    ...prev,
                    webSearch: typeof saved.webSearch === "boolean" ? saved.webSearch : prev.webSearch,
                    imageGen: typeof saved.imageGen === "boolean" ? saved.imageGen : prev.imageGen,
                    tts: typeof saved.tts === "boolean" ? saved.tts : prev.tts,
                    musicControl: typeof saved.musicControl === "boolean" ? saved.musicControl : prev.musicControl,
                    storyTheme: (["sky", "sage", "rose"].includes(saved.storyTheme) ? saved.storyTheme : prev.storyTheme) as StoryTheme,
                }));
            }
        } catch {
            // Invalid or unavailable browser storage should not block Local.
        } finally {
            setSettingsHydrated(true);
        }
    }, []);

    useEffect(() => {
        if (!settingsHydrated) return;
        try {
            const { webSearch, imageGen, tts, musicControl, storyTheme } = config;
            window.localStorage.setItem("shiorivia_local_preferences_v1", JSON.stringify({ webSearch, imageGen, tts, musicControl, storyTheme, disabledProviders, apiProvider }));
        } catch {
            // Local settings are best-effort; chat saves use their own storage.
        }
    }, [settingsHydrated, config.webSearch, config.imageGen, config.tts, config.musicControl, config.storyTheme, disabledProviders, apiProvider]);

    const visibleProviders = useMemo(() => getVisibleLocalProviders(allProviders, disabledProviders), [allProviders, disabledProviders]);
    useEffect(() => {
        let active = true;
        fetch('/api/providers', { cache: 'no-store' }).then(r => r.json()).then(data => {
            if (active && Array.isArray(data.providers)) setAllProviders(data.providers);
        }).catch(() => ui.showToast('无法加载供应商配置，请检查本地服务。'));
        return () => { active = false; };
    }, []);
    useEffect(() => {
        if (!settingsHydrated || !allProviders.some(p => p.configured)) return;
        if (!visibleProviders.some(p => p.id === apiProvider)) {
            const nextId = visibleProviders[0]?.id || '';
            if (nextId === apiProvider) return;
            setApiProvider(nextId);
            setConfig(prev => ({ ...prev, selectedModel: defaultModelForProvider(nextId), customModelId: '' }));
        }
    }, [settingsHydrated, visibleProviders, apiProvider, allProviders]);
    const selectProvider = (id: string) => {
        if (!visibleProviders.some(p => p.id === id)) return;
        if (id === apiProvider) return;
        setApiProvider(id);
        setConfig(prev => ({ ...prev, selectedModel: defaultModelForProvider(id), customModelId: '' }));
    };
    const toggleProviderDisabled = (id: string) => setDisabledProviders(prev =>
        prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );

    const toggleSetting = async (key: SettingKey) => {
        if (!config[key]) {
            try {
                const res = await fetch("/api/check_env");
                if (!res.ok) throw new Error("Environment check failed");
                const env = await res.json();
                const available: Record<SettingKey, boolean> = {
                    webSearch: Boolean(env.hasTavily),
                    imageGen: Boolean(env.hasSdUrl),
                    tts: Boolean(env.hasTtsUrl),
                    musicControl: Boolean(env.hasMusic),
                };
                if (!available[key]) {
                    ui.showToast("请先配置对应的本地服务或 API 密钥。");
                    return;
                }
            } catch {
                ui.showToast("无法验证本地服务配置。");
                return;
            }
        }
        setConfig(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const currentSession = cloud.sessions.find(s => s.id === currentSessionId);

    // Switching sessions must also restore the character on the Live2D stage.
    useEffect(() => {
        if (currentSession?.characterId) setActiveCharacterId(currentSession.characterId);
    }, [currentSession?.id, currentSession?.characterId]);

    const engine = useChatEngine({
        currentSession, currentSessionId, setSessions: cloud.setSessions,
        activeCharacterId, voiceVariant,
        globalWorldInfo: cloud.globalWorldInfo,
        config: config,
        setTrackId: music.setTrackId,
        showToast: ui.showToast,
        setIsGlobalGenerating,
        manualOutfitId,
        apiProvider,
    });

    const fileHandler = useFileHandler({
        setSessions: cloud.setSessions,
        setFolders: cloud.setFolders,
        setGlobalWorldInfo: cloud.setGlobalWorldInfo,
        setBgImage: cloud.setBgImage,
        setSelectedFile: engine.setSelectedFile,
        showToast: ui.showToast
    });

    useEffect(() => {
        if (cloud.initLoaded && cloud.sessions.length === 0 && !currentSessionId) {
            console.log("🌱 Creating Genesis Session...");
            const newId = Date.now().toString();
            const genesisSession: Session = {
                id: newId,
                title: "Shiorivia",
                folderId: null,
                characterId: "mutsu", 
                voiceVariant: "default",
                memoryMode: "infinite",
                messages: [{
                    role: "assistant",
                    content: "Shiorivia is ready.\n我是若叶睦。请下达指令。",
                    modelName: "System"
                }],
                updatedAt: Date.now()
            };
            cloud.setSessions([genesisSession]);
            setCurrentSessionId(newId);
            setActiveCharacterId("mutsu");
            ui.setEffect("math"); 
        }
        else if (cloud.sessions.length > 0 && (!currentSessionId || !cloud.sessions.find(s => s.id === currentSessionId))) {
            setCurrentSessionId(cloud.sessions[0].id);
            if (cloud.sessions[0].characterId) setActiveCharacterId(cloud.sessions[0].characterId);
        }
    }, [cloud.sessions, currentSessionId, cloud.initLoaded]);

    const dynamicCharacter = useMemo(() => {
        const base = CHAR_DATA.find(c => c.id === activeCharacterId) || CHAR_DATA[0];

        let finalChar = { ...base };

        if (activeCharacterId === 'sakiko') {
            if (voiceVariant === 'black' || voiceVariant === 'oblivionis') {
                finalChar.name = "Oblivionis";
                finalChar.avatar = "🎭"; 
                finalChar.hex = "#483d8b"; 
            } else {
                finalChar.name = "丰川 祥子";
                finalChar.avatar = "🎹";
                finalChar.hex = "#7799CC"; 
            }
        }
        else if (activeCharacterId === 'mutsu') {
            if (voiceVariant === 'mortis') {
                finalChar.name = "Mortis";
                finalChar.avatar = "💀";
                finalChar.hex = "#2f4f4f"; 
            } else {
                finalChar.name = "若叶 睦";
                finalChar.avatar = "🥒";
                finalChar.hex = "#779977";
            }
        }
        else if (activeCharacterId === 'soyo') {
            if (voiceVariant === 'down') {
                finalChar.name = "长崎 素世 (Broken)";
                finalChar.avatar = "💔"; 
                finalChar.hex = "#5c5c5c"; 
            } else {
                finalChar.name = "长崎 素世";
                finalChar.avatar = "🥐";
                finalChar.hex = "#FFDD88";
            }
        }

        return finalChar;
    }, [activeCharacterId, voiceVariant]);

    const createNewSession = (charId: string = activeCharacterId, targetMode?: 'sliding' | 'infinite' | 'novel' | 'chat' | 'lime') => {
        const newId = Date.now().toString();
        const currentMode = currentSession?.memoryMode || 'sliding';
        const nextMode = targetMode || currentMode; 

        const charName = CHARACTERS.find(c => c.id === charId)?.name;

        let initContent = "";
        if (nextMode === 'infinite') initContent = `我是${charName}。欢迎来到 Shiorivia。请下达指令。`;
        if (nextMode === 'chat') initContent = `我是${charName || '你的聊天伙伴'}。今天想聊些什么？`;

        const initialMessages: any[] = [];
        if (initContent) {
            initialMessages.push({ 
                role: "assistant", 
                content: initContent, 
                modelName: "System" 
            });
        }

        const newSession: Session = {
            id: newId,
            title: nextMode === 'lime' ? "Viae Workspace" : nextMode === 'novel' ? "New Dream" : nextMode === 'chat' ? "新对话" : "New Chat",
            folderId: null,
            characterId: charId,
            voiceVariant: "default",
            messages: initialMessages,
            updatedAt: Date.now(),
            memoryMode: nextMode,
            ...(nextMode === 'lime' ? { limeGroups: [], limeGroupId: null } : {})
        };

        cloud.setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newId);
        setActiveCharacterId(charId);

        if (targetMode) {
            if (targetMode === 'infinite') ui.setEffect("math");
            else if (targetMode === 'novel') ui.setEffect("curtain");
        }
    };

    const enterMode = (mode: 'infinite' | 'sliding' | 'novel' | 'chat' | 'lime') => {
        const existing = cloud.sessions.find(session => session.memoryMode === mode);
        if (existing) {
            setCurrentSessionId(existing.id);
            setActiveCharacterId(existing.characterId || "mutsu");
        } else {
            createNewSession(activeCharacterId, mode);
        }
        setShowModeHub(false);
    };

    const deleteSession = (e: any, id: string) => {
        e.stopPropagation();
        if (!confirm("⚠️ Delete this timeline?")) return;

        const remainingSessions = cloud.sessions.filter(s => s.id !== id);

        const sameModeSessions = remainingSessions.filter(s => s.memoryMode === currentSession?.memoryMode);
        const realitySessions = [
            ...sameModeSessions,
            ...remainingSessions.filter(s => s.memoryMode !== 'lime' && !sameModeSessions.includes(s))
        ];

        let finalSessions = remainingSessions;
        let nextSessionId = currentSessionId; 
        let nextCharId = activeCharacterId;   

        if (id === currentSessionId) {
            if (realitySessions.length > 0) {
                const next = realitySessions[0];
                nextSessionId = next.id;
                nextCharId = next.characterId;
            } else if (remainingSessions.length > 0) {
                const next = remainingSessions[0];
                nextSessionId = next.id;
                nextCharId = next.characterId;
            } else {
                nextSessionId = "GENESIS";
            }
        }

        if (nextSessionId === "GENESIS") {
            const genesisId = Date.now().toString();
            const genesisSession: Session = {
                id: genesisId,
                title: "Shiorivia",
                folderId: null,
                characterId: "mutsu",
                voiceVariant: "default",
                memoryMode: "infinite",
                messages: [{
                    role: "assistant",
                    content: "Shiorivia is ready.\n我是若叶睦。所有旧世界已归零。",
                    modelName: "System"
                }],
                updatedAt: Date.now()
            };

            finalSessions = [genesisSession];
            nextSessionId = genesisId;
            nextCharId = "mutsu";

            ui.setEffect("math");
            ui.showToast("♻️ System Reset");
        } else {
            ui.showToast("🗑️ Timeline Deleted");
        }

        if (nextSessionId !== currentSessionId) {
            setCurrentSessionId(nextSessionId);
            if (nextCharId) setActiveCharacterId(nextCharId);
        }

        cloud.setSessions(finalSessions);
    };

    const stageCharId = currentSession?.memoryMode === 'infinite' || currentSession?.memoryMode === 'chat'
        ? activeCharacterId
        : (currentSession?.live2dCharId || activeCharacterId); 

    const effectiveConfig = useMemo(() => {
        const rawConfig = LOCAL_LIVE2D_CONFIG as Record<string, any>;
        
        if (rawConfig[stageCharId]) {
            console.log(`🎯 [Smart Match] Exact: ${stageCharId}`);
            return rawConfig[stageCharId];
        }

        const fuzzyKey = Object.keys(rawConfig).find(key => 
            key.toLowerCase().includes(stageCharId.toLowerCase()) || 
            stageCharId.toLowerCase().includes(key.toLowerCase())
        );

        if (fuzzyKey) {
            console.log(`🎯 [Smart Match] Fuzzy: ${stageCharId} -> ${fuzzyKey}`);
            return rawConfig[fuzzyKey];
        }

        console.warn(`⚠️ [Smart Match] Failed to find config for: ${stageCharId}`);
        return null;
    }, [stageCharId]);

    const stageMotion = currentSession?.memoryMode === 'chat' ? "idle" : (currentSession?.currentEmotion || "idle");
    const stageOutfit = currentSession?.memoryMode === 'chat'
        ? (manualOutfitId || "default")
        : (currentSession?.currentOutfitId || manualOutfitId || "default");
    const stageDbChar = useMemo(() =>
        CHAR_DATA.find(c => c.id === stageCharId),
        [stageCharId]);

    const showLive2D = effectiveConfig && (
        effectiveConfig.modelUrl ||
        (effectiveConfig.outfits && Object.keys(effectiveConfig.outfits).length > 0)
    );

    if (cloud.initLoaded && showModeHub) {
        return (
            <>
                <ModeHub
                    onEnter={enterMode}
                    onResume={() => setShowModeHub(false)}
                    onOpenSettings={() => setShowSettingsCenter(true)}
                    hasSession={Boolean(currentSession)}
                />
                <SettingsCenter
                    open={showSettingsCenter}
                    onClose={() => setShowSettingsCenter(false)}
                    values={config}
                    onToggle={toggleSetting}
                    debugMode={ui.debugMode}
                    onToggleDebug={() => ui.setDebugMode(prev => !prev)}
                    onTestEffect={ui.setEffect}
                    isStory={false}
                    storyTheme={config.storyTheme}
                    onStoryThemeChange={(value) => setConfig(prev => ({ ...prev, storyTheme: value }))}
                    activeProvider={apiProvider}
                    providers={allProviders}
                    disabledProviders={disabledProviders}
                    onToggleProvider={toggleProviderDisabled}
                />
                <TransitionEffects effect={ui.effect} onComplete={() => ui.setEffect("none")} />
            </>
        );
    }

    if (currentSession?.memoryMode === 'lime') {
        return (
            <>
                <LimeInterface
                    session={currentSession}
                    updateSession={(updater) => cloud.setSessions(prev => prev.map(s => s.id === currentSession.id ? updater(s) : s))}
                    characters={CHAR_DATA}
                    onExit={() => setShowModeHub(true)}
                    onSettings={() => setShowSettingsCenter(true)}
                    providers={visibleProviders}
                    provider={apiProvider}
                    onProviderChange={selectProvider}
                    model={config.selectedModel}
                    customModel={config.customModelId}
                    onModelChange={id => setConfig(prev => ({ ...prev, selectedModel: id, customModelId: '' }))}
                    onCustomModelChange={id => setConfig(prev => ({ ...prev, customModelId: id }))}
                    notify={ui.showToast}
                />
                <SettingsCenter
                    open={showSettingsCenter}
                    onClose={() => setShowSettingsCenter(false)}
                    values={config}
                    onToggle={toggleSetting}
                    debugMode={ui.debugMode}
                    onToggleDebug={() => ui.setDebugMode(prev => !prev)}
                    onTestEffect={ui.setEffect}
                    isStory={false}
                    storyTheme={config.storyTheme}
                    onStoryThemeChange={value => setConfig(prev => ({ ...prev, storyTheme: value }))}
                    activeProvider={apiProvider}
                    providers={allProviders}
                    disabledProviders={disabledProviders}
                    onToggleProvider={toggleProviderDisabled}
                />
                {ui.toast && <div role="status" className="fixed bottom-5 left-1/2 z-[300] -translate-x-1/2 rounded-xl bg-slate-900 px-5 py-3 text-sm text-white shadow-lg">{ui.toast}</div>}
            </>
        );
    }

    if (currentSession?.memoryMode === 'novel') {
        return (
            <NovelInterface
                currentSession={currentSession}
                initialSelectedModel={config.customModelId || config.selectedModel}
                handleSend={engine.handleSend}
                isLoading={engine.isLoading}
                createNewSession={createNewSession}
                dbChars={CHAR_DATA}
                stopGeneration={engine.stopGeneration}
                handleRegenerate={engine.handleRegenerate}
                setIsGlobalGenerating={setIsGlobalGenerating}
                onImageGenerated={async (base64: string, meta: any) => {
                    const res = await fetch("/api/upload", {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ base64 })
                    });
                    const data = await res.json();
                    if (data.url) {
                        ui.showToast("💾 Image Saved Locally");
                        return data.url;
                    }
                    return "";
                }}
                onManualSync={() => cloud.triggerSync('manual')}
                syncStatus={cloud.status}

                setSessions={cloud.setSessions}
                onExit={() => setShowModeHub(true)}
                updateSessionTitle={(id: string, t: string) => cloud.setSessions(p => p.map(s => s.id === id ? { ...s, title: t } : s))}
                deleteMessage={engine.handleDeleteMessage}
                updateSessionInfo={(id: string, up: any) => cloud.setSessions(p => p.map(s => s.id === id ? { ...s, ...up } : s))}
            />
        );
    }

    if (!cloud.initLoaded) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#0a0a0c] text-white flex-col gap-4 font-mono">
                <Loader2 className="animate-spin text-emerald-500" size={48} />
                <div className="text-xs tracking-[0.3em] opacity-50 animate-pulse">INITIALIZING LOCAL MEMORY...</div>
            </div>
        );
    }

    return (
        <div
            className="flex h-screen text-slate-800 font-sans overflow-hidden relative"
            onDrop={fileHandler.handleBgDrop}
            onDragOver={(e) => e.preventDefault()}
        >
            <Background hex={currentSession?.memoryMode === 'sliding'
                ? ({ sky: "#e0f2fe", sage: "#b7d3b0", rose: "#f4c6d2" }[config.storyTheme])
                : dynamicCharacter.hex} bgImage={cloud.bgImage} bgName={currentSession?.currentBackground} />

            {stageDbChar && (
                showLive2D ? (
                    <Live2DStage
                        key={stageCharId}
                        characterId={stageCharId}
                        config={effectiveConfig}
                        emotion={stageMotion}
                        outfitId={stageOutfit}
                        rightSidebarOpen={ui.rightSidebarOpen}
                        leftSidebarOpen={ui.leftSidebarOpen}
                    />
                ) : (
                    <TachieStage
                        characters={[{
                            name: stageDbChar.name, 
                            id: stageDbChar.id,     
                            current_sprite: stageMotion
                        }]}
                        dbChars={CHAR_DATA} 
                    />
                )
            )}

            <div className="relative z-10 flex w-full h-full">
                <AnimatePresence>
                    {ui.toast && (
                        <motion.div
                            initial={{ opacity: 0, y: -20, x: "-50%" }} 
                            animate={{ opacity: 1, y: 0, x: "-50%" }}
                            exit={{ opacity: 0 }}
                            className="fixed left-1/2 z-[9999] bg-zinc-900/90 text-emerald-400 px-6 py-3 rounded-xl text-sm font-bold shadow-2xl flex gap-3 items-center border border-zinc-700/50 backdrop-blur-md"
                            style={{ top: "80px" }} 
                        >
                            <Check size={18} className="animate-bounce" /> {ui.toast}
                        </motion.div>
                    )}
                </AnimatePresence>

                <SidebarLeft
                    isOpen={ui.leftSidebarOpen} onClose={() => ui.setLeftSidebarOpen(false)}
                    showModelPanel={ui.showModelPanel} setShowModelPanel={ui.setShowModelPanel}
                    showChatPanel={ui.showChatPanel} setShowChatPanel={ui.setShowChatPanel}

                    expandedGroups={Array.isArray(config.expandedGroups) ? config.expandedGroups : []}
                    setExpandedGroups={(action: any) => {
                        setConfig(prev => {
                            const currentList = Array.isArray(prev.expandedGroups) ? prev.expandedGroups : [];
                            const nextList = typeof action === 'function' ? action(currentList) : action;
                            return { ...prev, expandedGroups: nextList };
                        });
                    }}
                    selectedModel={config.selectedModel}
                    setSelectedModel={(v: string) => setConfig(prev => ({ ...prev, selectedModel: v }))}
                    customModelId={config.customModelId}
                    setCustomModelId={(v: string) => setConfig(prev => ({ ...prev, customModelId: v }))}

                    folders={cloud.folders} setFolders={cloud.setFolders}
                    sessions={cloud.sessions} currentSessionId={currentSessionId} setCurrentSessionId={setCurrentSessionId}
                    createFolder={() => cloud.setFolders(prev => [...prev, { id: Date.now().toString(), name: "New Folder", isExpanded: true }])}
                    toggleFolder={(id: string) => cloud.setFolders(prev => prev.map(f => f.id === id ? { ...f, isExpanded: !f.isExpanded } : f))}
                    deleteFolder={(e: any, id: string) => { e.stopPropagation(); if (confirm("Delete?")) cloud.setFolders(prev => prev.filter(f => f.id !== id)) }}
                    createNewSession={createNewSession}
                    deleteSession={deleteSession}

                    searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                    editingSessionId={editingSessionId} setEditingSessionId={setEditingSessionId}
                    tempTitle={tempTitle} setTempTitle={setTempTitle}
                    activeMenuSessionId={activeMenuSessionId} setActiveMenuSessionId={setActiveMenuSessionId}
                    updateSessionTitle={(id: string, t: string) => { cloud.setSessions(prev => prev.map(s => s.id === id ? { ...s, title: t } : s)); setEditingSessionId(null) }}
                    moveSessionToFolder={(sid: string, fid: string | null) => { cloud.setSessions(prev => prev.map(s => s.id === sid ? { ...s, folderId: fid } : s)); setActiveMenuSessionId(null) }}

                    handleExportData={() => { const d = { sessions: cloud.sessions, folders: cloud.folders, globalWorldInfo: cloud.globalWorldInfo, bgImage: cloud.bgImage }; const b = new Blob([JSON.stringify(d)], { type: "application/json" }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = "backup.json"; a.click(); }}
                    handleImportData={fileHandler.handleImportData}
                    importInputRef={fileHandler.importInputRef}

                    apiProvider={apiProvider}
                    setApiProvider={selectProvider}
                    providers={visibleProviders}
                    isMobile={false} 

                    useWebSearch={config.webSearch}
                    toggleWebSearch={() => {
                        setConfig(prev => {
                            const next = !prev.webSearch;
                            if (next) ui.setEffect("cyber");
                            ui.showToast(next ? "🌐 Link Start" : "🔌 Offline");
                            return { ...prev, webSearch: next };
                        });
                    }}

                    useImageGen={config.imageGen}
                    toggleImageGen={() => {
                        setConfig(prev => {
                            const next = !prev.imageGen;
                            ui.showToast(next ? "🎨 Art: ON" : "🚫 Art: OFF");
                            return { ...prev, imageGen: next, tts: next ? false : prev.tts };
                        });
                    }}

                    useTTS={config.tts}
                    toggleTTS={() => {
                        setConfig(prev => {
                            const next = !prev.tts;
                            ui.showToast(next ? "🗣️ TTS: ON" : "🔇 TTS: OFF");
                            return { ...prev, tts: next, imageGen: next ? false : prev.imageGen };
                        });
                    }}

                    onManualSync={() => cloud.triggerSync('manual')}
                    syncStatus={cloud.status}

                    useMusicControl={config.musicControl}
                    toggleMusicControl={() => setConfig(prev => ({ ...prev, musicControl: !prev.musicControl }))}

                    triggerEffect={ui.setEffect}
                    batchDelete={(ids: string[]) => cloud.setSessions(prev => prev.filter(s => !ids.includes(s.id)))}
                />

                <ChatInterface
                    onOpenHub={() => setShowModeHub(true)}
                    onOpenSettings={() => setShowSettingsCenter(true)}
                    onOpenMemory={() => setShowMemoryVault(true)}
                    leftSidebarOpen={ui.leftSidebarOpen} setLeftSidebarOpen={ui.setLeftSidebarOpen}
                    rightSidebarOpen={ui.rightSidebarOpen} setRightSidebarOpen={ui.setRightSidebarOpen}
                    setShowLocalWorld={ui.setShowLocalWorld} setShowGlobalWorld={ui.setShowGlobalWorld}
                    debugMode={ui.debugMode} setDebugMode={ui.setDebugMode}

                    currentCharacter={dynamicCharacter} currentSession={currentSession}
                    input={engine.input} setInput={engine.setInput}
                    isLoading={engine.isLoading}
                    showToast={ui.showToast} outfits={effectiveConfig?.outfits || {}}

                    selectedModel={config.selectedModel} customModelId={config.customModelId} isMultimodal={true}
                    useTTS={config.tts} 

                    selectedFile={engine.selectedFile} setSelectedFile={engine.setSelectedFile}
                    fileInputRef={fileHandler.fileInputRef} handleFileSelect={fileHandler.handleFileSelect}

                    dbChars={CHAR_DATA} currentOutfitId={manualOutfitId} setManualOutfitId={setManualOutfitId}
                    isGlobalGenerating={isGlobalGenerating}

                    apiProvider={apiProvider}
                    setApiProvider={selectProvider}

                    handleSend={engine.handleSend} stopGeneration={engine.stopGeneration}
                    handleRegenerate={engine.handleRegenerate} handleDeleteMessage={engine.handleDeleteMessage}
                    handleCopy={(t: string, i: number) => {
                        navigator.clipboard.writeText(t);
                        setCopiedIndex(i); 
                        setTimeout(() => setCopiedIndex(null), 2000);
                    }}
                    copiedIndex={copiedIndex}
                    triggerEffect={ui.setEffect}

                    openEditModal={(i: number, c: any) => {
                        ui.setEditModal({ isOpen: true, text: typeof c === 'string' ? c : c[0].text, index: i });
                    }}
                    toggleSaveModal={() => ui.setShowSaveModal(true)}
                    toggleCodeRepo={() => ui.setShowCodeRepo(true)}

                    playingIndex={playingIndex}
                    handlePlayAudio={async (text: string, index: number, charId?: string) => {
                        setPlayingIndex(index); 
                        try {
                            const res = await fetch("/api/tts", {
                                method: "POST",
                                body: JSON.stringify({ text, characterId: charId || activeCharacterId, variant: voiceVariant })
                            });
                            if (!res.ok) throw new Error();
                            const url = URL.createObjectURL(await res.blob());
                            const audio = new Audio(url);
                            audioRef.current = audio; 
                            audio.play();

                            audio.onended = () => setPlayingIndex(null);
                            audio.onerror = () => setPlayingIndex(null);
                        } catch {
                            setPlayingIndex(null);
                        }
                    }}
                    createNewSession={createNewSession}
                />

                <DanmakuOverlay danmakuList={currentSession?.lastDanmaku} />
                <AnimatePresence>{(ui.leftSidebarOpen || ui.rightSidebarOpen) && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { ui.setLeftSidebarOpen(false); ui.setRightSidebarOpen(false) }} className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" />}</AnimatePresence>

                <SidebarRight
                    isOpen={ui.rightSidebarOpen} onClose={() => ui.setRightSidebarOpen(false)}
                    currentCharacter={dynamicCharacter} currentSession={currentSession}
                    onOpenMemory={() => setShowMemoryVault(true)}
                    activeCharacterId={activeCharacterId} setActiveCharacterId={setActiveCharacterId}
                    createNewSession={createNewSession} handleSend={engine.handleSend} setSessions={cloud.setSessions} currentSessionId={currentSessionId}
                    handleToggleVariant={() => {
                        let n = "default", e: EffectType = "none";
                        if (activeCharacterId === "sakiko") { n = voiceVariant === "black" ? "white" : "black"; e = n === "white" ? "rain" : "curtain"; }
                        else if (activeCharacterId === "mutsu") { n = voiceVariant === "normal" ? "mortis" : "normal"; e = n === "mortis" ? "curtain" : "math"; }
                        else if (activeCharacterId === "soyo") { n = voiceVariant === "up" ? "down" : "up"; }
                        setVoiceVariant(n); ui.setEffect(e);
                    }}
                    voiceVariant={voiceVariant} onRepoUpdate={engine.handleRepoUpdate}
                    onCharSwitch={(id: string) => { setActiveCharacterId(id); setVoiceVariant("default"); cloud.setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, characterId: id } : s)) }}
                    dbChars={CHAR_DATA}
                />
            </div>

            <TransitionEffects effect={ui.effect} onComplete={() => ui.setEffect("none")} />

            <CodeRepositoryModal isOpen={ui.showCodeRepo} onClose={() => ui.setShowCodeRepo(false)} repository={currentSession?.codeRepository || {}} onUpdate={engine.handleRepoUpdate} />
            <WorldInfoModal isOpen={ui.showGlobalWorld} onClose={() => ui.setShowGlobalWorld(false)} title="Global" content={cloud.globalWorldInfo} setContent={cloud.setGlobalWorldInfo} onSave={() => localStorage.setItem("shiorivia_global_world", cloud.globalWorldInfo)} />
            <WorldInfoModal isOpen={ui.showLocalWorld} onClose={() => ui.setShowLocalWorld(false)} title="Local" content={currentSession?.localWorldInfo || ""} setContent={(v: string) => cloud.setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, localWorldInfo: v } : s))} onSave={() => { }} />

            <EditModal
                isOpen={ui.editModal.isOpen}
                onClose={() => ui.setEditModal({ ...ui.editModal, isOpen: false })}
                content={ui.editModal.text}
                setContent={(v: string) => ui.setEditModal({ ...ui.editModal, text: v })}
                onConfirm={() => {
                    if (!currentSession) return;
                    ui.setEditModal({ ...ui.editModal, isOpen: false });
                    engine.handleSend(undefined, [...currentSession.messages.slice(0, ui.editModal.index), { role: 'user', content: ui.editModal.text }])
                }}
            />

            <SaveLoadModal
                isOpen={ui.showSaveModal}
                onClose={() => ui.setShowSaveModal(false)}
                currentSession={currentSession}
                onLoadSession={(sess: any) => {
                    cloud.setSessions(prev => {
                        const idx = prev.findIndex(s => s.id === sess.id);
                        return idx !== -1 ? prev.map((s, i) => i === idx ? sess : s) : [sess, ...prev];
                    });
                    setCurrentSessionId(sess.id);
                    ui.showToast(`Loaded: ${sess.title}`);
                }}
            />

            <SettingsCenter
                open={showSettingsCenter}
                onClose={() => setShowSettingsCenter(false)}
                values={config}
                onToggle={toggleSetting}
                debugMode={ui.debugMode}
                onToggleDebug={() => ui.setDebugMode(prev => !prev)}
                onTestEffect={ui.setEffect}
                isStory={currentSession?.memoryMode === 'sliding'}
                storyTheme={config.storyTheme}
                onStoryThemeChange={(value) => setConfig(prev => ({ ...prev, storyTheme: value }))}
                activeProvider={apiProvider}
                providers={allProviders}
                disabledProviders={disabledProviders}
                onToggleProvider={toggleProviderDisabled}
            />
            <MemoryVaultModal
                open={showMemoryVault}
                onClose={() => setShowMemoryVault(false)}
                sessionId={currentSession?.id || ""}
                stm={currentSession?.stm}
                ltm={currentSession?.ltm}
                tone={currentSession?.memoryMode === "sliding" ? "story" : "engineering"}
                onSave={({ stm, ltm }) => {
                    if (!currentSession) return;
                    cloud.setSessions(prev => prev.map(s => s.id === currentSession.id
                        ? { ...s, stm, ltm, turnCount: stm.split(/\n/).filter(Boolean).length, updatedAt: Date.now() }
                        : s));
                    ui.showToast("Memory Vault saved");
                }}
            />
        </div>
    );
}