"use client";
import React, { useState, useEffect } from "react"; 
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, User, Heart, Zap, Skull, Thermometer, Shirt, Footprints, Sparkles, Radio, ChevronLeft, Send, Copy, Lock, Check, Brain, Activity, Moon, Ghost, Bot, ToggleLeft, ToggleRight, X } from "lucide-react";
import { CHAR_DATA } from "../data/char_config";
import { useLanguage } from "../context/LanguageContext";
import { characterDisplayName } from "../lib/characterNames";
import { SuggestionModal } from "./Modals";
import { StoryWorldlineModal } from "./StoryWorldlineModal";
import { describeStoryWorldline, type StoryWorldline } from "../lib/storyWorldline";
import { selfName } from "../lib/chartaSelf";
import { MemoryPreviewButton } from "./MemoryVaultModal";

const SidebarRightComponent = ({
    isOpen, onClose,
    activeCharacterId, setActiveCharacterId,
    createNewSession,
    currentSession,
    onOpenMemory,
    handleSend,
    setSessions,
    currentSessionId,
    handleToggleVariant, 
    voiceVariant,
    onRepoUpdate, 
    onCharSwitch,
    dbChars,
    currentBgmId, setBgmId,
    activeStorySelf, storySelf, onStoryRoleChange, onStoryPovChange,
    worlds = [], setInput, onOpenChartaWorld
}: any) => {

    const isStoryMode = currentSession?.memoryMode === 'sliding';

    const rawStats = currentSession?.charStatus;
    const charList = isStoryMode && currentSession?.storyRole !== 'participant' && !currentSession?.storyPovId
        ? [] : Array.isArray(rawStats) ? rawStats : (rawStats ? [rawStats] : []);

    const prota = isStoryMode && currentSession?.storyRole !== 'participant' && !currentSession?.storyPovId
        ? null : currentSession?.protagonist;
    const suggestions = currentSession?.plotSuggestions;

    const [pageIndex, setPageIndex] = useState(0);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, text: string }>({ isOpen: false, text: "" });
    const [worldlineOpen, setWorldlineOpen] = useState(false);

    useEffect(() => {
        if (pageIndex >= charList.length) setPageIndex(0);
    }, [charList.length]);

    const storyRole = currentSession?.storyRole === "participant" ? "participant" : "observer";
    const storyStarted = (currentSession?.messages || []).some((m: any) => m.role === "user");
    const possiblePovs = (currentSession?.sceneCastIds || []).flatMap((id: string) => {
        const char = (dbChars?.length ? dbChars : CHAR_DATA).find((item: any) => item.id === id);
        return char ? [char] : [];
    });
    const { locale } = useLanguage();
    const currentChar = charList[pageIndex];

    const themeColor = currentChar ? (
        (dbChars?.length ? dbChars : CHAR_DATA).find((c: any) => {
            if (c.name === currentChar.name) return true;

            const keywords = c.keys || c.trigger_keys || [];
            return keywords.includes(currentChar.name);
        })?.hex
        || "#9ca3af"
    ) : "#9ca3af";

    const handleWorldlineUpdate = (next: StoryWorldline) => {
        if (!setSessions || !currentSessionId) return;
        setSessions((prev: any) => prev.map((s: any) =>
            s.id === currentSessionId ? { ...s, storyWorldline: next } : s
        ));
    };
    const viewpointColor = (dbChars?.length ? dbChars : CHAR_DATA).find((char: any) => char.id === currentSession?.storyPovId)?.hex || "#637e6e";

    const StatBar = ({ label, value, color, max = 100, icon: Icon }: any) => {
        let difficultyColor = "bg-gray-200"; 
        if (value >= 90) difficultyColor = "bg-red-900/20"; 

        return (
            <div className="mb-2">
                <div className="flex justify-between text-[10px] mb-1 font-bold text-gray-600">
                    <span className="flex items-center gap-1">
                        {Icon && typeof Icon === 'function' && <Icon size={10} />}
                        {label}
                    </span>
                    <span className={value >= 100 ? "text-red-500 animate-pulse" : ""}>
                        {value >= 100 ? "MAX" : `${value}/${max}`}
                    </span>
                </div>
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${difficultyColor}`}>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((value / max) * 100, 100)}%` }}
                        className="h-full relative"
                        style={{ backgroundColor: color }}
                    >
                        <div className="absolute top-0 right-0 bottom-0 w-[2px] bg-white/50 shadow-[0_0_5px_white]"></div>
                    </motion.div>
                </div>
            </div>
        );
    };

    const SuggestionItem = ({ type, content, colorBg, colorText, colorBorder, icon }: any) => (
        <div className={`group relative p-2.5 rounded border ${colorBg} ${colorBorder} ${colorText} text-xs transition-all hover:shadow-sm`}>
            <div className="font-bold flex items-start justify-between gap-2 mb-1.5">
                <span className="flex items-center gap-1">{icon} {type}</span>
                <button type="button" disabled={!String(content || "").trim()} onClick={() => setConfirmModal({ isOpen: true, text: String(content) })}
                    className="flex shrink-0 items-center gap-1 rounded-md border border-current/20 bg-white/60 px-2 py-1 text-[9px] font-medium hover:bg-white disabled:opacity-40"
                    title="确认后填入发送框，可以继续编辑"><Send size={10} /> 填入发送文本框</button>
            </div>
            <div className="leading-relaxed opacity-90">{content}</div>
            <button
                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(content); alert("已复制"); }}
                className="absolute bottom-1 right-1 p-1 bg-white/50 hover:bg-white rounded text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <Copy size={10} />
            </button>
        </div>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="sidebar-right-panel"
                    initial={{ width: 0 }} animate={{ width: 280 }} exit={{ width: 0 }}
                    className="h-full bg-white flex flex-col shadow-xl z-30 border-l-0 overflow-hidden"
                >
                    <div className="p-3 flex justify-between items-center font-bold text-xs text-gray-500 border-b bg-gray-50/50  pt-[calc(0.75rem+env(safe-area-inset-top))]">
                        <span>{isStoryMode ? "VIA LATA · STORY" : currentSession?.memoryMode === "chat" ? "UMBRA · CHARACTERS" : "OFFICINA · CAST"}</span>
                        <button onClick={onClose}><ChevronRight size={16} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-thin">
                        {isStoryMode ? (
                            <div className="p-3 space-y-4">
                                <div className="rounded-xl border border-[#e4e8e5] bg-[#fafcf9] p-3 space-y-3">
                                    <div className="text-[10px] font-bold tracking-widest text-[#6f8678]">故事身份 · STORY ROLE</div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <button type="button" disabled={storyStarted} onClick={() => onStoryRoleChange("observer")} className={`rounded-lg border p-2 ${storyRole === "observer" ? "border-[#7d9c8a] bg-[#e8f0e9] text-[#365943]" : "border-[#dce6dd] text-[#77887c]"} disabled:opacity-70`}>旁观模式</button>
                                        <button type="button" disabled={storyStarted || !activeStorySelf} onClick={() => onStoryRoleChange("participant")} title={!activeStorySelf ? "先在 Charta 创建并启用自设" : ""} className={`rounded-lg border p-2 ${storyRole === "participant" ? "border-[#7d9c8a] bg-[#e8f0e9] text-[#365943]" : "border-[#dce6dd] text-[#77887c]"} disabled:opacity-50`}>参与模式</button>
                                    </div>
                                    {storyRole === "participant" ? <p className="text-xs leading-5 text-[#75877b]">使用身份：<span style={{ color: storySelf?.hex || "#799783" }}>{storySelf ? selfName(storySelf, locale) : "自设不存在，请新建故事"}</span></p>
                                    : <div className="space-y-2"><p className="text-[11px] leading-5 text-[#7d8e82]">以旁观者身份开始，不预设用户姓名。第一轮故事结束后可以选定一位已出场角色的主视角。</p>
                                        {storyStarted && <label className="block text-xs text-[#718678]">当前主视角<select value={currentSession?.storyPovId || ""} disabled={currentSession?.storyPovLocked || (currentSession?.messages || []).filter((m: any) => m.role === "user").length !== 1} onChange={e => onStoryPovChange(e.target.value)} className="mt-1 w-full rounded-lg border border-[#dce6dd] bg-white p-2 text-xs disabled:opacity-60"><option value="">尚未选择 · 第三人称旁观</option>{possiblePovs.map((char: any) => <option key={char.id} value={char.id}>{characterDisplayName(char.id, char.name, locale)}</option>)}</select></label>}
                                        {currentSession?.storyPovLocked && <p className="flex items-center gap-1 text-[10px] text-[#a18c6f]"><Lock size={11}/>视角已在下一轮发送时锁定</p>}
                                    </div>}
                                </div>
                                {!prota && charList.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 space-y-3 opacity-60">
                                        <Radio size={40} className="animate-pulse" />
                                        <div className="text-xs font-mono text-center">WAITING FOR<br />NEURAL LINK...</div>
                                    </div>
                                )}

                                <button type="button" onClick={() => setWorldlineOpen(true)} className="w-full rounded-xl border border-emerald-100 bg-white p-3 text-left shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/40">
                                    <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-[#52745e]">✧ WORLDLINE · 世界线</span><span className="text-[10px] text-[#82988a]">打开管理 ↗</span></div>
                                    <p className="mt-2 text-xs leading-5 text-[#6b8071]">{currentSession?.storyWorldline ? describeStoryWorldline(currentSession.storyWorldline) : currentSession?.timeline?.major ? `旧时间线：${currentSession.timeline.major} / ${currentSession.timeline.medium || "未设定"}` : "尚未设定 · 点击选择世界观与时间线"}</p>
                                </button>

                                <MemoryPreviewButton stm={currentSession?.stm} ltm={currentSession?.ltm} onOpen={onOpenMemory} tone="story" />

                                {prota && (
                                    <div className="rounded-lg border shadow-sm relative overflow-hidden" style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}>
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-[#E0E0FF]/30 rounded-bl-full -mr-4 -mt-4"></div>
                                        <div className="p-3 relative z-10">
                                            <div className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider flex items-center gap-1"><User size={10} /> 自身状态</div>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="text-gray-500">Name: <span className="font-bold" style={{ color: storyRole === "participant" ? storySelf?.hex || "#799783" : viewpointColor }}>{storyRole === "participant" && storySelf ? selfName(storySelf, locale) : prota.name || "未命名"}</span></div>
                                                <div className="text-gray-500">Time: <span className="text-gray-800">{prota.timeDesc}</span></div>
                                                <div className="text-gray-500 col-span-2">Env: <span className="text-gray-800">{prota.environment}</span></div>
                                                <div className="text-gray-500 col-span-2 flex items-center gap-1"><Thermometer size={10} /> {prota.temperature} | {prota.sensation}</div>
                                                <div className="text-gray-500 col-span-2 italic text-[10px] border-t pt-1 mt-1 border-slate-200">"{prota.innerState}"</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentChar && (
                                    <div className="rounded-lg border shadow-sm transition-colors duration-500" style={{ backgroundColor: `${themeColor}10`, borderColor: `${themeColor}40` }}>
                                        <div className="p-3">
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: themeColor }}><Heart size={10} /> Target: {characterDisplayName((dbChars?.length ? dbChars : CHAR_DATA).find((c: any) => c.name === currentChar.name)?.id, currentChar.name, locale)}</div>
                                                {charList.length > 1 && (
                                                    <div className="flex gap-1">
                                                        <button onClick={() => setPageIndex(p => p > 0 ? p - 1 : charList.length - 1)} className="p-1 hover:bg-white rounded shadow-sm"><ChevronLeft size={10} /></button>
                                                        <span className="text-[9px] text-gray-400 self-center">{pageIndex + 1}/{charList.length}</span>
                                                        <button onClick={() => setPageIndex(p => p < charList.length - 1 ? p + 1 : 0)} className="p-1 hover:bg-white rounded shadow-sm"><ChevronRight size={10} /></button>
                                                    </div>
                                                )}
                                            </div>

                                            <StatBar label="Affection" value={currentChar.affection} color={themeColor} icon={Heart} />
                                            <StatBar label="Possessiveness" value={currentChar.Possessiveness} color="#9333ea" icon={Zap} />
                                            <StatBar label="Obsession" value={currentChar.Obsession} color="#dc2626" icon={Skull} />
                                            <StatBar label="Intimacy" value={currentChar.Intimacy} color="#fb7185" icon={Sparkles} />

                                            <div className="mt-3 text-[10px] space-y-2 text-gray-600 border-t pt-2" style={{ borderColor: `${themeColor}30` }}>
                                                {currentChar.innerState && (
                                                    <div className="bg-white/60 p-2 rounded border border-black/5 italic relative">
                                                        <span className="absolute -top-2 left-1 bg-white px-1 text-[9px] text-gray-400 font-bold not-italic">💭 Inner</span>
                                                        "{currentChar.innerState}"
                                                    </div>
                                                )}
                                                <div><div className="font-bold text-gray-400 flex items-center gap-1 mb-0.5"><Shirt size={10} /> Clothing:</div><div className="leading-relaxed pl-1">{currentChar.clothing}</div></div>
                                                <div><div className="font-bold text-gray-400 flex items-center gap-1 mb-0.5"><Footprints size={10} /> Legs/Shoes:</div><div className="leading-relaxed pl-1">{currentChar.shoes} {currentChar.legState}</div></div>
                                                <div>
                                                    <div className="font-bold text-gray-400 flex items-center gap-1 mb-0.5">
                                                        <Activity size={10} /> Deep Link:
                                                    </div>
                                                    <div className="font-mono text-purple-600 pl-1">
                                                        {currentChar.bondDepth || "0"}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {suggestions && (
                                    <div className="space-y-3 pb-4">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1"><Sparkles size={10} /> {storyRole === "observer" ? "旁观引导" : "剧情指引"}</div>
                                        <SuggestionItem type="Fun / Chaos" content={suggestions.fun} colorBg="bg-yellow-50" colorBorder="border-yellow-200" colorText="text-yellow-800" icon="🤪" />
                                        <SuggestionItem type="Rational" content={suggestions.rational} colorBg="bg-blue-50" colorBorder="border-blue-200" colorText="text-blue-800" icon="🧠" />
                                        <SuggestionItem type="Radical" content={suggestions.radical} colorBg="bg-red-50" colorBorder="border-red-200" colorText="text-red-800" icon="🔥" />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-2 space-y-4">
                                <div className="space-y-2">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{currentSession?.memoryMode === 'chat' ? 'Umbra · Characters' : 'Officina · Persona'}</div>
                                    {(dbChars.length > 0 ? dbChars : CHAR_DATA).map((char: any, index: number) => (
                                        <div
                                            key={char.id || index}
                                            onClick={() => {
                                                if (activeCharacterId === char.id) return;
                                                onCharSwitch(char.id);
                                            }}
                                            className="w-full flex items-center gap-3 p-2 rounded-lg transition-all border relative overflow-hidden group cursor-pointer"
                                            style={{
                                                backgroundColor: activeCharacterId === char.id ? char.hex : `${char.hex}08`,
                                                borderColor: activeCharacterId === char.id ? char.hex : 'transparent',
                                                color: activeCharacterId === char.id ? 'white' : '#374151'
                                            }}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-lg shadow-sm z-10 flex-shrink-0">
                                                {char.avatar}
                                            </div>

                                            <div className="text-left z-10 flex-1 min-w-0">
                                                <div className="text-xs font-bold truncate">{characterDisplayName(char.id, char.name, locale)}</div>
                                                <div className={`text-[9px] truncate ${activeCharacterId === char.id ? 'text-white/80' : 'text-gray-400'}`}>
                                                    {char.sub}
                                                </div>
                                            </div>

                                            {activeCharacterId === char.id && (
                                                <div className="z-20 flex gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                                                    {char.id === 'sakiko' && <button onClick={handleToggleVariant} className="p-1.5 bg-white/20 rounded-full hover:bg-white/40 text-white transition-all">{voiceVariant === 'white' ? <Sparkles size={12} /> : <Moon size={12} />}</button>}
                                                    {char.id === 'mutsu' && <button onClick={handleToggleVariant} className="p-1.5 bg-white/20 rounded-full hover:bg-white/40 text-white transition-all">{voiceVariant === 'mortis' ? <Ghost size={12} /> : <Bot size={12} />}</button>}
                                                    {char.id === 'soyo' && <button onClick={handleToggleVariant} className="p-1.5 bg-white/20 rounded-full hover:bg-white/40 text-white transition-all">{voiceVariant === 'down' ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}</button>}
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-4 border-t border-gray-100 text-center">
                                    <div className="text-[9px] text-gray-300 font-mono">IDE MOVED TO TOP BAR ↗</div>
                                </div>
                            </div>
                        )}
                    </div>

                    <SuggestionModal
                        isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                        content={confirmModal.text}
                        mode="insert"
                        onConfirm={() => { setInput?.(confirmModal.text); setConfirmModal({ ...confirmModal, isOpen: false }); }}
                    />
                    <StoryWorldlineModal isOpen={worldlineOpen} value={currentSession?.storyWorldline}
                        legacyTimeline={currentSession?.timeline} worlds={worlds}
                        onSave={handleWorldlineUpdate} onClose={() => setWorldlineOpen(false)}
                        onOpenCharta={onOpenChartaWorld ? () => { setWorldlineOpen(false); onOpenChartaWorld(); } : undefined}/>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
export const SidebarRight = React.memo(SidebarRightComponent);