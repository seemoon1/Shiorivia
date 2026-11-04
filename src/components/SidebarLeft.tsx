"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    PanelLeftClose, Package, ChevronDown, ChevronRight,
    FolderPlus, Plus, Search, Folder, Trash2, Download, Upload,
    Globe, Image as ImageIcon,
    ListChecks, CheckSquare, Square, Sparkles, Terminal, Disc,
    HardDrive, AlertTriangle, Mic,
    RefreshCw, Check, X
} from "lucide-react";
import { fallbackModelGroups, type LocalModelGroup, type PublicLocalProvider } from "../lib/localProviders";
import { useSavedModels } from "../hooks/useSavedModels";
import { useLanguage } from "../context/LanguageContext";
import { localText } from "../lib/i18nLocal";
import { SessionItem } from "./Common";
import { deepText } from "../lib/i18nDeep";
import { BatchDeleteModal } from "./BatchDeleteModal";

const checkEnv = async (feature: 'openrouter' | 'google' | 'tavily' | 'sd' | 'tts' | 'music') => {
    try {
        const res = await fetch("/api/check_env");
        const data = await res.json();

        let isValid = false;
        let errorMsg = "";

        switch (feature) {
            case 'openrouter':
                isValid = data.hasOpenRouter;
                errorMsg = "⚠️ OPENROUTER_API_KEY 未配置！\n请在 .env.local 中填入密钥。\n(详见 README)";
                break;
            case 'google':
                isValid = data.hasGoogle;
                errorMsg = "⚠️ GOOGLE_API_KEY 未配置！\n请在 .env.local 中填入密钥。\n(详见 README)";
                break;
            case 'tavily':
                isValid = data.hasTavily;
                errorMsg = "⚠️ TAVILY_API_KEY (联网) 未配置！\n请在 .env.local 中填入密钥。";
                break;
            case 'sd':
                isValid = data.hasSdUrl;
                errorMsg = "⚠️ 生图后端 (SD_URL) 未连接！\n请确保本地 SD 已启动并在 .env.local 配置地址。";
                break;
            case 'tts':
                isValid = data.hasTtsUrl;
                errorMsg = "⚠️ TTS 后端未连接！\n请配置 GPT-SoVITS 接口地址。";
                break;
            case 'music':
                isValid = data.hasMusic;
                errorMsg = "⚠️ 音乐库为空！\n请在 public/music 放入歌曲并在 data/bgm_library.ts 注册。";
                break;
        }

        if (!isValid) {
            alert(errorMsg); 
            return false;
        }
        return true;
    } catch (e) {
        console.error("Env check failed", e);
        return true; 
    }
};

export const SidebarLeft = ({
    isOpen, onClose,
    expandedGroups, setExpandedGroups,
    selectedModel, setSelectedModel,
    customModelId, setCustomModelId,
    folders, setFolders,
    sessions, currentSessionId, setCurrentSessionId,
    createFolder, toggleFolder, deleteFolder,
    createNewSession, deleteSession,
    searchQuery, setSearchQuery,
    editingSessionId, setEditingSessionId,
    tempTitle, setTempTitle,
    activeMenuSessionId, setActiveMenuSessionId,
    updateSessionTitle, moveSessionToFolder,
    handleExportData, handleImportData,
    useWebSearch, toggleWebSearch,
    useImageGen, toggleImageGen,
    batchDelete,
    useMusicControl,
    toggleMusicControl,
    triggerEffect,
    useTTS, toggleTTS,
    syncStatus, onManualSync,
    apiProvider, setApiProvider, providers = [],
}: any) => {
    const { locale } = useLanguage();
    const importInputRef = useRef<HTMLInputElement>(null);

    const [showNewChatMenu, setShowNewChatMenu] = useState(false);
    const showSession = (session: any) => session.memoryMode !== 'lime';
    const [isBatchMode, setIsBatchMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showBatchConfirm, setShowBatchConfirm] = useState(false);
    const [showDebug, setShowDebug] = useState(false);
    const [modelGroups, setModelGroups] = useState<LocalModelGroup[]>(fallbackModelGroups(apiProvider));
    const [catalogSource, setCatalogSource] = useState("fallback");
    const { savedModels, saveModel, forgetModel } = useSavedModels();
    const saveCustomModel = () => saveModel(apiProvider, String(customModelId || ""));
    const forgetCustomModel = (id: string) => forgetModel(apiProvider, id);
    useEffect(() => {
        let active = true;
        setModelGroups(fallbackModelGroups(apiProvider));
        setCatalogSource("fallback");
        if (!apiProvider) return;
        fetch(`/api/providers?models=${encodeURIComponent(apiProvider)}`)
            .then(async (res) => { if (!res.ok) throw new Error("Catalog unavailable"); return res.json(); })
            .then((data) => { if (active && Array.isArray(data.groups)) { setModelGroups(data.groups); setCatalogSource(data.source || "fallback"); } })
            .catch(() => { /* Offline fallback remains visible. */ });
        return () => { active = false; };
    }, [apiProvider]);

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 300, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="h-full bg-white flex flex-col shadow-xl z-40 border-r border-gray-200 md:border-r-0 fixed inset-y-0 left-0 md:relative overflow-hidden"
                >
                    <div className="p-3 flex items-center justify-between pt-[calc(0.75rem+env(safe-area-inset-top))]">
                        <div className="flex items-center gap-2 font-bold text-gray-800">
                            <img src="/shiorivia-app-icon.png" alt="" width={24} height={24} className="h-6 w-6 rounded-md" />
                            <span className="text-xs uppercase tracking-widest">Shiorivia</span>
                        </div>
                        <button onClick={onClose} className="rounded-lg bg-[#f4f6f2] p-2 text-[#76877c] transition hover:bg-[#e7ede6] hover:text-[#456c56]" title="收起左侧栏" aria-label="收起左侧栏"><PanelLeftClose size={15} /></button>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            <div className="h-[42%] min-h-[160px] shrink-0 overflow-y-auto border-b border-[#e6e9e2] bg-[#fbfcfa] p-3 scrollbar-thin">
                                <div className="mb-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-[#728578]"><span>Models · 模型</span><Package size={13} /></div>

                                <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 text-xs font-bold">
                                    {(providers as PublicLocalProvider[]).map((p) => (
                                        <button key={p.id} type="button" onClick={() => setApiProvider(p.id)}
                                            className={`truncate rounded px-2 py-1.5 transition-all ${apiProvider === p.id ? 'bg-white text-emerald-700 shadow' : 'text-gray-500 hover:text-gray-800'}`} title={p.label}>
                                            {p.label}
                                        </button>
                                    ))}
                                    {providers.length === 0 && <p className="col-span-2 px-2 py-2 text-[11px] text-amber-600">{deepText(locale, "explorer.noKey")}</p>}
                                </div>
                                <p className="mb-2 text-[10px] text-slate-400">{catalogSource === "live" ? "Live models" : "Offline model fallbacks"}</p>

                                {modelGroups.map((g: any) => (
                                    <div key={g.groupName} className="mb-1">
                                        <button onClick={() => setExpandedGroups((prev: any) => prev.includes(g.groupName) ? prev.filter((x: any) => x !== g.groupName) : [...prev, g.groupName])} className="w-full flex justify-between p-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded">
                                            <span>{g.groupName}</span>
                                            {expandedGroups.includes(g.groupName) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                        </button>
                                        {expandedGroups.includes(g.groupName) && (
                                            <div className="pl-2 border-l border-gray-100 ml-1">
                                                {g.models.map((m: any) => (
                                                    <button key={m.id} onClick={() => { setSelectedModel(m.id); setCustomModelId("") }} className={`block w-full text-left text-[11px] py-1 truncate ${selectedModel === m.id && !customModelId ? 'text-emerald-600 font-bold' : 'text-gray-400 hover:text-gray-900'}`}>
                                                        {m.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                <div className="mt-3 border-t border-[#e1e8df] pt-3">
                                    <div className="mb-2 flex items-center justify-between text-[10px] text-[#6f8175]"><span className="font-semibold tracking-wide">自定义模型</span><span>当前供应商</span></div>
                                    <div className="flex gap-1.5">
                                        <input aria-label="自定义模型 ID" value={customModelId} onChange={(e: any) => setCustomModelId(e.target.value)} placeholder="输入模型 ID" className="min-w-0 flex-1 rounded-lg border border-[#dfe7df] bg-white px-2 py-1.5 text-xs outline-none focus:border-[#8ba897]" />
                                        <button type="button" onClick={saveCustomModel} disabled={!apiProvider || !String(customModelId || "").trim() || String(customModelId).length > 200 || (savedModels[apiProvider] || []).includes(String(customModelId).trim())}
                                            className="shrink-0 rounded-lg border border-[#bcd2c1] bg-[#e8f1e9] px-2.5 py-1.5 text-[11px] font-medium text-[#456c55] transition hover:bg-[#d9e9dc] disabled:opacity-40">保存</button>
                                    </div>
                                    {(savedModels[apiProvider] || []).length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            {(savedModels[apiProvider] || []).map(id => (
                                                <div key={id} className={`flex items-center gap-1 rounded-lg px-1.5 py-1 ${customModelId === id ? 'bg-[#e9f2e9]' : 'hover:bg-white'}`}>
                                                    <button type="button" onClick={() => setCustomModelId(id)} title={id} className="flex min-w-0 flex-1 items-center gap-2 text-left text-[11px] text-[#60756a]">
                                                        <span className="min-w-0 flex-1 truncate">{id}</span>
                                                        <span className="shrink-0 rounded border border-[#d5e1d7] px-1 py-0.5 text-[9px] text-[#829987]">自定义</span>
                                                    </button>
                                                    <button type="button" onClick={() => forgetCustomModel(id)} title={`移除保存的模型 ${id}`} aria-label={`移除保存的模型 ${id}`} className="rounded p-1 text-[#b5bdb7] hover:bg-[#f9e9e5] hover:text-[#aa6857]"><X size={12} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col min-h-0 bg-white p-2">
                                <div className="flex justify-between items-center mb-2 px-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Explorer · {deepText(locale, "explorer.title")}</span>
                                    <div className="flex gap-1">
                                        <button onClick={createFolder} className="p-1 hover:bg-gray-50 rounded text-gray-400" title={deepText(locale, "explorer.newFolder")}><FolderPlus size={14} /></button>
                                        <button onClick={() => { setIsBatchMode(!isBatchMode); setSelectedIds(new Set()); }} className={`p-1 rounded transition-colors ${isBatchMode ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'text-gray-400 hover:bg-gray-50'}`} title={deepText(locale, "explorer.batch")}><ListChecks size={14} /></button>
                                        <div className="relative">
                                            <button onClick={() => setShowNewChatMenu(!showNewChatMenu)} title={deepText(locale, "explorer.new")} className="p-1 hover:bg-emerald-50 rounded text-emerald-600 flex items-center gap-0.5"><Plus size={14} /><ChevronDown size={10} /></button>
                                            <AnimatePresence>
                                                {showNewChatMenu && (
                                                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
                                                        <button onClick={() => { createNewSession(undefined, 'sliding'); setShowNewChatMenu(false) }} className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 text-emerald-700 flex items-center gap-2"><Sparkles size={12} /> Via Lata</button>
                                                        <button onClick={() => { createNewSession(undefined, 'infinite'); setShowNewChatMenu(false) }} className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 text-blue-700 flex items-center gap-2"><Terminal size={12} /> Officina</button>
                                                        <button onClick={() => { createNewSession(undefined, 'chat'); setShowNewChatMenu(false) }} className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 text-[#527762] flex items-center gap-2"><Sparkles size={12} /> Umbra</button>
                                                        <button onClick={() => { createNewSession(undefined, 'novel'); setShowNewChatMenu(false) }} className="w-full text-left px-3 py-2 text-xs hover:bg-lime-50 text-lime-700 flex items-center gap-2"><Sparkles size={12} /> Tela</button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative mb-2"><Search size={12} className="absolute left-2 top-2 text-gray-400" /><input className="w-full bg-gray-50 border rounded-lg py-1 pl-7 pr-2 text-xs outline-none focus:ring-1 focus:ring-gray-200" placeholder="Search..." value={searchQuery} onChange={(e: any) => setSearchQuery(e.target.value)} /></div>

                                <div className="flex-1 overflow-y-auto scrollbar-thin">
                                    {folders.map((f: any) => (
                                        <div key={f.id} className="mb-1">
                                            <div className="flex items-center justify-between px-2 py-1 hover:bg-gray-50 rounded cursor-pointer group" onClick={() => toggleFolder(f.id)}>
                                                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                                                    <Folder size={12} className="text-yellow-400 fill-yellow-400" />
                                                    {f.name}
                                                </div>
                                                <button onClick={(e) => { deleteFolder(e, f.id) }} className="opacity-0 group-hover:opacity-100"><Trash2 size={10} /></button>
                                            </div>
                                            {f.isExpanded && (
                                                <div className="ml-3 pl-2 border-l border-gray-100">
                                                    {sessions.filter((s: any) => showSession(s) && s.folderId === f.id && s.title.toLowerCase().includes(searchQuery)).map((s: any) => (
                                                        <div key={s.id} className="flex items-center gap-1">
                                                            {isBatchMode && (
                                                                <button onClick={() => toggleSelect(s.id)} className="p-1">
                                                                    {selectedIds.has(s.id) ? <CheckSquare size={16} className="text-indigo-500" /> : <Square size={16} className="text-gray-300" />}
                                                                </button>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <SessionItem session={s} isActive={currentSessionId === s.id} isEditing={editingSessionId === s.id} tempTitle={tempTitle} showMenu={activeMenuSessionId === s.id} folders={folders} onSelect={() => setCurrentSessionId(s.id)} onEditStart={() => { setEditingSessionId(s.id); setTempTitle(s.title); setActiveMenuSessionId(null) }} onEditSave={() => updateSessionTitle(s.id, tempTitle)} onDelete={(e: any) => deleteSession(e, s.id)} onMenuToggle={(e: any) => { e.stopPropagation(); setActiveMenuSessionId(activeMenuSessionId === s.id ? null : s.id) }} onMoveTo={(fid: any) => moveSessionToFolder(s.id, fid)} setTempTitle={setTempTitle} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {sessions.filter((s: any) => showSession(s) && !s.folderId && s.title.toLowerCase().includes(searchQuery)).map((s: any) => (
                                        <div key={s.id} className="flex items-center gap-1 mb-0.5">
                                            {isBatchMode && (
                                                <button onClick={() => toggleSelect(s.id)} className="p-1">
                                                    {selectedIds.has(s.id) ? <CheckSquare size={16} className="text-indigo-500" /> : <Square size={16} className="text-gray-300" />}
                                                </button>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <SessionItem session={s} isActive={currentSessionId === s.id} isEditing={editingSessionId === s.id} tempTitle={tempTitle} showMenu={activeMenuSessionId === s.id} folders={folders} onSelect={() => setCurrentSessionId(s.id)} onEditStart={() => { setEditingSessionId(s.id); setTempTitle(s.title); setActiveMenuSessionId(null) }} onEditSave={() => updateSessionTitle(s.id, tempTitle)} onDelete={(e: any) => deleteSession(e, s.id)} onMenuToggle={(e: any) => { e.stopPropagation(); setActiveMenuSessionId(activeMenuSessionId === s.id ? null : s.id) }} onMoveTo={(fid: any) => moveSessionToFolder(s.id, fid)} setTempTitle={setTempTitle} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                    </div>


                    <div className="p-3">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                                <HardDrive size={10} /> Local Sync
                            </span>

                            <div className="flex gap-1 opacity-50 hover:opacity-100 transition-opacity">
                                <button onClick={handleExportData} className="p-1 hover:bg-gray-200 rounded text-gray-500" title={deepText(locale, "explorer.export")}>
                                    <Download size={12} />
                                </button>
                                <button onClick={() => importInputRef.current?.click()} className="p-1 hover:bg-gray-200 rounded text-gray-500" title={deepText(locale, "explorer.import")}>
                                    <Upload size={12} />
                                </button>
                                <input type="file" ref={importInputRef} onChange={handleImportData} className="hidden" accept=".json" />
                            </div>
                        </div>

                        <button
                            onClick={onManualSync}
                            disabled={syncStatus === 'syncing'}
                            className={`
                            w-full py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm
                                ${syncStatus === 'syncing'
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-500 cursor-wait'
                                    : syncStatus === 'error'
                                        ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100'
                                        : syncStatus === 'success'
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                            : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-md active:scale-[0.98]'
                                }
                            `}
                        >
                            {syncStatus === 'syncing' ? (
                                <>
                                    <RefreshCw size={14} className="animate-spin" />
                                    <span>{localText(locale, "sync.syncing")}</span>
                                </>
                            ) : syncStatus === 'error' ? (
                                <>
                                    <AlertTriangle size={14} />
                                    <span>{localText(locale, "sync.failed")}</span>
                                </>
                            ) : syncStatus === 'success' ? (
                                <>
                                    <Check size={14} />
                                    <span>{localText(locale, "sync.saved")}</span>
                                </>
                            ) : (
                                <>
                                    <HardDrive size={14} />
                                    <span>{localText(locale, "sync.now")}</span>
                                </>
                            )}
                        </button>

                        <div className="text-[9px] text-center mt-1.5 text-gray-300 font-mono">
                            {syncStatus === "idle" ? localText(locale, "sync.auto") : syncStatus === "success" ? localText(locale, "sync.success") : syncStatus === "unsaved" ? localText(locale, "sync.pending") : syncStatus === "error" ? localText(locale, "sync.check") : localText(locale, "sync.syncing")}
                        </div>
                    </div>

                    <AnimatePresence>
                        {isBatchMode && (
                            <motion.div
                                initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
                                className="absolute bottom-16 left-4 right-4 bg-white border border-indigo-200 shadow-2xl rounded-xl p-3 z-50 flex items-center justify-between"
                            >
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-indigo-400 uppercase">Selected</span>
                                    <span className="text-lg font-black text-indigo-600 leading-tight">{selectedIds.size}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setIsBatchMode(false); setSelectedIds(new Set()); }} className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:bg-gray-100 rounded-lg">CANCEL</button>
                                    <button onClick={() => setShowBatchConfirm(true)} disabled={selectedIds.size === 0} className="px-4 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg shadow-md disabled:opacity-50">DELETE</button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <BatchDeleteModal
                        isOpen={showBatchConfirm}
                        onClose={() => setShowBatchConfirm(false)}
                        count={selectedIds.size}
                        onConfirm={() => {
                            batchDelete(Array.from(selectedIds));
                            setIsBatchMode(false);
                            setSelectedIds(new Set());
                        }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
};