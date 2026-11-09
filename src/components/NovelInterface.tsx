"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Book, Sparkles, Settings2, PanelRight, AlignLeft,
    LogOut, RefreshCw, X, Edit2, Trash2, Check, 
    Save, ArrowUp, Sun, Moon, FileText, Square,
    AlertTriangle, HardDrive,
} from "lucide-react";
import { CHARACTERS, type NovelDraft } from "../types";
import { fallbackModelGroups, type LocalModelGroup, type PublicLocalProvider } from "../lib/localProviders";
import { useSavedModels } from "../hooks/useSavedModels";
import { NovelArchiveActions } from "./NovelArchiveActions";
import { SuggestionModal } from "./Modals";
import { StoryWorldlineFateModal } from "./StoryWorldlineFateModal";
import { StoryCastPicker } from "./StoryCastPicker";
import { parseStoryWorldline, describeStoryWorldline, type StoryWorldline } from "../lib/storyWorldline";
import { MiniPlayer } from "./MiniPlayer";
import { MusicPlayerModal } from "./MusicPlayerModalV2";
import { useMusic } from "../context/MusicContext";
import { smartColorize } from "../lib/textFormatter";
import { selfName } from "../lib/chartaSelf";
import { parseDrawTag } from "../lib/parseDraw";
import { buildDrawRequest } from "../lib/drawRequest";
import { cleanDrawTag } from "../lib/parseDraw"; 
import { MemoryPreviewButton, MemoryVaultModal } from "./MemoryVaultModal";
import { useLanguage } from "../context/LanguageContext";
import { characterDisplayName } from "../lib/characterNames";
import { localText } from "../lib/i18nLocal";
import { deepText } from "../lib/i18nDeep";
import { IllustratedImage, ImageLightbox } from "./IllustrationImage";
import { stripNovelState } from "../lib/novelState";
import { extractNovelSuggestions, stripNovelSuggestions } from "../lib/novelSuggestions";

const THEMES = {
    sage: {
        bg: "bg-[#f1f4ee]",
        sidebar: "bg-[#e6ece3]",
        accent: "text-[#486d5b]",
        border: "border-[#cad7c9]",
        text: "text-[#3b5146]",
        title: "text-[#263e34]",
        inputBg: "bg-[#fffefa]/95",
        placeholder: "placeholder-[#758779]/70",
        hover: "hover:bg-[#dce7da]",
        prose: "",
        button: "bg-[#385f50] hover:bg-[#294d40] text-[#fffdf6] shadow-[#385f50]/20",
        subButton: "bg-[#e0e9df] text-[#3c6251] hover:bg-[#d4e3d4] hover:text-[#263e34]",
        selectBorder: "border-[#638e75]",
        selectBg: "bg-[#d9e9dc]",
        selectDot: "bg-[#638e75]",
        focus: "focus:border-[#638e75]"
    },
    paper: {
        bg: "bg-[#fdf6e3]",
        sidebar: "bg-[#f5eecf]",
        accent: "text-[#d97706]",
        border: "border-[#d0c8a0]",
        text: "text-[#5c5546]",
        title: "text-[#2c2518]",
        inputBg: "bg-[#fffef8]/90",
        placeholder: "placeholder-[#5c5546]/40",
        hover: "hover:bg-[#e6dfc0]",
        prose: "",
        button: "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-[#fffef8] shadow-orange-900/20",
        subButton: "bg-[#5c5546]/10 text-[#5c5546]/40 hover:text-[#2c2518]",
        selectBorder: "border-[#d97706]",
        selectBg: "bg-[#d97706]/10",
        selectDot: "bg-[#d97706]",
        focus: "focus:border-[#d97706]"
    }
};

const PRESETS = [
    { name: "放学闲谈 · 日常", environment: "放学后的街角", event: "围绕一件微不足道的小事拌嘴、闲聊，发展自然的关系互动", style: "轻快、生活感、自然幽默、群像互动" },
    { name: "周末小冒险 · 日常", environment: "休息日的街道与小店", event: "一次随性的外出计划带来意外的小发现", style: "明朗、轻松、富有生活气息、节奏活泼" },
    { name: "未寄出的信 · 哀伤", environment: "傍晚的房间", event: "某件旧物勾起遗憾，让人物小心触碰未说出口的话", style: "哀而不伤、克制留白、怀念与遗憾" },
    { name: "雨后告别 · 哀伤", environment: "雨停后的车站", event: "一段关系正面临分别，人物必须面对现实而非仓促和解", style: "低回、细腻、真实而有余韵" },
    { name: "秘密的重量 · 重力", environment: "深夜的排练室", event: "一个被长期掩藏的秘密将各人的信任推向临界点", style: "高压心理博弈、复杂动机、情绪拉扯" },
    { name: "命运岔路 · 重力", environment: "人生的重大抉择之前", event: "无法两全的选择迫使角色承担后果，避免轻易的圆满结局", style: "沉重、充满张力、因果清晰、保留人物缺点" },
];

const NovelContent = ({ content, onOptionClick, onOptionInsert, onImageOpen, theme, selfColors = {}, locale = "zh-CN", disabled = false }: any) => {
    let clean = cleanDrawTag(stripNovelState(content)) 
        .replace(/<meta.*?\/>/g, "")
        .replace(/<audio>.*?<\/audio>/g, "")
        .trim();

    const suggestions = extractNovelSuggestions(clean);
    clean = stripNovelSuggestions(clean);
    const labels: Record<string, [string, string, string]> = {
        "zh-CN": ["趣味", "理智", "激进"], "zh-TW": ["趣味", "理智", "激進"],
        en: ["Playful", "Rational", "Bold"], ja: ["遊び心", "理性的", "大胆"], ko: ["흥미", "이성적", "과감"],
    };
    const translated = labels[locale] || labels["zh-CN"];
    const options = suggestions ? [
        { label: translated[0], text: suggestions.fun, icon: "✦" },
        { label: translated[1], text: suggestions.rational, icon: "◇" },
        { label: translated[2], text: suggestions.radical, icon: "◆" },
    ] : [];

    const parts = clean.split(/(!\[.*?\]\(.*?\))/g);

    const renderedText = (
        <span className="whitespace-pre-wrap">
            {parts.map((part: string, i: number) => {
                const imgMatch = part.match(/!\[(.*?)\]\((.*?)\)/);
                if (imgMatch) {
                    const src = imgMatch[2];
                    return (
                        <span key={i} className="my-6 flex w-full justify-center animate-fade-in">
                            <IllustratedImage src={src} alt={imgMatch[1] || "小说插图"} onOpen={onImageOpen} />
                        </span>
                    );
                }

                const coloredSegments = smartColorize(part, selfColors);

                return (
                    <span key={i}>
                        {coloredSegments.map((seg, j) => (
                            <span
                                key={j}
                                style={seg.type === 'colored' ? {
                                    color: seg.color,
                                    fontWeight: seg.bold ? 'bold' : 'normal'
                                } : {}}
                            >
                                {seg.text}
                            </span>
                        ))}
                    </span>
                );
            })}
        </span>
    );

    return (
        <div className="space-y-6">
            <div className="leading-loose text-justify text-base md:text-lg">
                {renderedText}
            </div>

            {options.length > 0 && (
                <div className={`grid grid-cols-1 gap-3 mt-10 pt-8 border-t ${theme.border}`}>
                    <div className={`text-xs font-mono ${theme.accent} tracking-widest uppercase mb-2 opacity-70`}>
                        {locale === "en" ? "Next possibilities" : locale === "ja" ? "次の展開" : locale === "ko" ? "다음 전개" : locale === "zh-TW" ? "後續發展" : "后续发展"}
                    </div>
                    {options.map((opt, i) => (
                        <div key={i} className={`rounded-xl border ${theme.border} ${theme.inputBg} overflow-hidden`}>
                            <button type="button" onClick={() => onOptionClick(opt.text)} disabled={disabled}
                                className={`text-left w-full p-4 ${theme.hover} transition-all flex gap-4 disabled:opacity-55 disabled:cursor-not-allowed`}>
                                <span className={`font-bold ${theme.accent} shrink-0`}>{opt.icon}</span>
                                <span className="min-w-0"><span className={`block text-[10px] font-semibold tracking-widest ${theme.accent} mb-1`}>{opt.label}</span><span className={`block text-sm ${theme.text} font-medium leading-relaxed`}>{opt.text}</span></span>
                            </button>
                            <div className={`border-t ${theme.border} px-3 py-2 flex justify-end`}>
                                <button type="button" disabled={disabled} onClick={() => onOptionInsert(opt.text)}
                                    className={`rounded-lg border ${theme.border} px-3 py-1.5 text-[11px] font-semibold ${theme.accent} ${theme.hover} disabled:opacity-40`}>填入输入框</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const NovelInterface = ({
    currentSession, handleSend,
    isLoading, onExit, onOpenSettings,
    dbChars, updateSessionTitle,
    deleteMessage, updateSessionInfo,
    handleRegenerate, createNewSession,
    stopGeneration, setIsGlobalGenerating,
    onImageGenerated, setSessions,
    onGenerateDraw, imageSettings, debugMode, useImageGen, showToast,
    syncStatus, onManualSync,
    initialSelectedModel,
    provider, providers = [], onProviderChange,
    selectedModel, customModelId, onModelChange, onCustomModelChange,
    onImportNovelSession,
    storyWorlds = [], customCharacters = [], customSelves = [], activeNovelSelf = null, onOpenCharta,
}: any) => {
    const { locale } = useLanguage();
    const [leftOpen, setLeftOpen] = useState(true);
    const [rightOpen, setRightOpen] = useState(true);
    const [showMemoryVault, setShowMemoryVault] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [themeMode, setThemeMode] = useState<'sage' | 'paper'>('paper');
    const theme = THEMES[themeMode];

    const [showFullPlayer, setShowFullPlayer] = useState(false);
    const [worldlineOpen, setWorldlineOpen] = useState(false);

    const [directorInput, setDirectorInput] = useState("");
    const [pendingNovelChoice, setPendingNovelChoice] = useState<string | null>(null);
    const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]);
    const novelWorldline = parseStoryWorldline(currentSession.storyWorldline);
    const novelRole = currentSession.storyRole === "participant"
        || (currentSession.storyRole === undefined && Boolean(currentSession.novelDraft?.selfId))
        ? "participant" : "observer";
    const novelStarted = currentSession.messages.some((message: any) =>
        message.role === "user" || (message.role === "assistant" && message.modelName !== "System"
          && typeof message.content === "string" && Boolean(message.content.trim())));
    const novelSelf = novelRole === "participant"
        ? currentSession.storySelfSnapshot
          || customSelves.find((item: any) => item.id === (currentSession.storySelfId || currentSession.novelDraft?.selfId))
          || null
        : null;
    const novelSelfId = novelRole === "participant" ? novelSelf?.id || null : null;
    const selfColors: Record<string, string> = novelSelf?.hex && novelSelf?.names
        ? Object.fromEntries(Object.values(novelSelf.names).map(name => [String(name), novelSelf.hex]))
        : {};
    // Identity can be chosen before worldline setup; compatibility is checked after world selection.
    const canParticipate = Boolean(activeNovelSelf && (!novelWorldline || !activeNovelSelf.worldId
        || activeNovelSelf.worldId === novelWorldline.worldId));
    // The same model/provider state powers Engineering, Chat, VIAE and Novel.
    const activeModel = (customModelId || "").trim() || selectedModel || initialSelectedModel || "";
    const [providerModels, setProviderModels] = useState<LocalModelGroup[]>([]);
    useEffect(() => {
        let alive = true;
        if (!provider) { setProviderModels([]); return; }
        fetch(`/api/providers?models=${encodeURIComponent(provider)}`, { cache: "no-store" })
            .then(r => r.json()).then(data => { if (alive) setProviderModels(Array.isArray(data.groups) ? data.groups : []); })
            .catch(() => { if (alive) setProviderModels([]); });
        return () => { alive = false; };
    }, [provider]);
    const availableModels = (providerModels.length ? providerModels : fallbackModelGroups(provider || "")).flatMap(g => g.models);
    const { savedModels, saveModel, forgetModel } = useSavedModels();
    const savedIds = savedModels[provider] || [];
    const [environment, setEnvironment] = useState("");
    const [event, setEvent] = useState("");
    const [manualStateEdit, setManualStateEdit] = useState(false);
    const [style, setStyle] = useState("温馨、细腻、富有生活感");

    const [outline, setOutline] = useState(currentSession.localWorldInfo || "");
    // Restore the draft carried by an imported Novel JSON when its new session opens.
    useEffect(() => {
        const draft = currentSession?.novelDraft as NovelDraft | undefined;
        setSelectedCharIds(Array.isArray(currentSession?.storyNextCastIds) ? currentSession.storyNextCastIds
            : Array.isArray(draft?.selectedCharIds) ? draft.selectedCharIds : []);
        setEnvironment(draft?.environment || currentSession?.novelState?.environment || draft?.scenario || "");
        setEvent(draft?.event || currentSession?.novelState?.event || draft?.action || "");
        setManualStateEdit(false);
        setStyle(draft?.style || "温馨、细腻、富有生活感");
        setOutline(currentSession?.localWorldInfo || draft?.outline || "");
        setThemeMode(draft?.themeMode === "sage" ? "sage" : "paper");
    }, [currentSession?.id]);
    // AI state updates arrive after every chapter; reflect them in the editor.
    useEffect(() => {
        // Synchronize the editor after a completed chapter or checkpoint restoration.
        // Style is global and deliberately never rewound.
        const draft = currentSession.novelDraft;
        setEnvironment(draft?.environment ?? currentSession.novelState?.environment ?? draft?.scenario ?? "");
        setEvent(draft?.event ?? currentSession.novelState?.event ?? draft?.action ?? "");
        setSelectedCharIds(Array.isArray(currentSession.storyNextCastIds)
            ? currentSession.storyNextCastIds
            : Array.isArray(draft?.selectedCharIds) ? draft.selectedCharIds : currentSession.novelState?.nextSceneCastIds ?? []);
        setManualStateEdit(false);
    }, [currentSession?.id, currentSession?.messages?.length, currentSession?.novelState]);
    const hasNovelChapters = currentSession?.messages?.some((message: any) =>
        message.role === "assistant" && typeof message.content === "string"
          && !message.content.includes("（...正在") && Boolean(message.content.trim()));
    const inputsLocked = hasNovelChapters && !manualStateEdit;
    const allowSceneEdit = () => {
        if (isLoading) return;
        if (!hasNovelChapters || window.confirm("本章已经开始。确定手动覆盖 AI 自动更新的 Environment / Event 吗？修改后会在下一章使用。")) {
            setManualStateEdit(true);
        }
    };
    const { currentTrack } = useMusic();
    const lastDrawPromptRef = useRef("");

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chars = dbChars && dbChars.length > 0 ? dbChars : CHARACTERS;

    const [dynamicBg, setDynamicBg] = useState<string | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const [drawingIndex, setDrawingIndex] = useState<number | null>(null);
    const confirmNovelDraw = async (index: number) => {
        if (drawingIndex !== null) return;
        if (!useImageGen) { showToast('请先在设置中启用生图功能'); return; }
        if (!window.confirm('确认按当前设置生成这幅插图吗？')) return;
        setDrawingIndex(index);
        try { await onGenerateDraw(index); }
        catch (error) { showToast(`插图生成失败：${error instanceof Error ? error.message : '未知错误'}`); }
        finally { setDrawingIndex(null); }
    };

    const generateImage = async (cmdOrPrompt: any) => {
        const cmd = typeof cmdOrPrompt === 'string' ? { description: cmdOrPrompt } : cmdOrPrompt;
        setIsDrawing(true);
        if (setIsGlobalGenerating) setIsGlobalGenerating(true);

        let anchorIndex = -1;
        if (currentSession && currentSession.messages) {
            for (let i = currentSession.messages.length - 1; i >= 0; i--) {
                if (currentSession.messages[i].role === 'assistant') {
                    anchorIndex = i;
                    break;
                }
            }
        }
        console.log(`⚓ Image anchored to message index: ${anchorIndex}`);

        try {
            const configRes = await fetch("/api/draw", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    charId: cmd.charId || selectedCharIds[0], 
                    outfitId: "casual", 
                    description: cmd.description,
                    negativePrompt: cmd.negativePrompt,
                    ...cmd.parameters
                })
            });
            const { payload } = await configRes.json();

            const sdUrl = process.env.NEXT_PUBLIC_SD_API_URL; 

            if (sdUrl) {
                const drawRes = await fetch(`${sdUrl}/sdapi/v1/txt2img`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "69420" },
                    body: JSON.stringify(payload)
                });
                const drawData = await drawRes.json();

                if (drawData.images?.length > 0) {
                    const base64Img = `data:image/jpeg;base64,${drawData.images[0]}`;

                    setDynamicBg(base64Img);

                    if (onImageGenerated) {
                        const meta = {
                            charId: selectedCharIds[0] || 'unknown',
                            outfitId: 'novel_generated',
                            isNSFW: true
                        };

                        onImageGenerated(base64Img, meta).then((url: string) => {
                            console.log("☁️ Novel Image Saved:", url);

                            if (setSessions && currentSession && anchorIndex !== -1) {
                                const sessionId = currentSession.id;
                                const drawTag = `<draw>${cmd.description}</draw>`;

                                setSessions((prevSessions: any[]) => {
                                    return prevSessions.map(s => {
                                        if (s.id !== sessionId) return s;

                                        const newMessages = [...s.messages];

                                        if (newMessages[anchorIndex]) {
                                            const targetContent = newMessages[anchorIndex].content;

                                            if (!targetContent.includes(url)) {
                                                if (targetContent.includes(drawTag)) {
                                                    newMessages[anchorIndex] = {
                                                        ...newMessages[anchorIndex],
                                                        content: targetContent.replace(
                                                            drawTag,
                                                            `\n\n![Illustration](${url})\n\n`
                                                        )
                                                    };
                                                } else {
                                                    newMessages[anchorIndex] = {
                                                        ...newMessages[anchorIndex],
                                                        content: targetContent + `\n\n![Illustration](${url})\n\n`
                                                    };
                                                }
                                            }
                                        }
                                        return { ...s, messages: newMessages };
                                    });
                                });
                            }
                        });
                    }
                }
            }
        } catch (e) {
            console.error("Auto-Draw Error:", e);
        } finally {
            setIsDrawing(false);
            if (setIsGlobalGenerating) setIsGlobalGenerating(false);
        }
    };

    useEffect(() => {
        const color = themeMode === 'paper' ? '#fdf6e3' : '#edf2ea';

        document.body.style.backgroundColor = color;
        document.documentElement.style.backgroundColor = color;

        return () => {
            document.body.style.backgroundColor = '';
            document.documentElement.style.backgroundColor = '';
        };
    }, [themeMode]);

    const handleOutlineChange = (val: string) => {
        setOutline(val);
        if (updateSessionInfo) updateSessionInfo(currentSession.id, { localWorldInfo: val });
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [currentSession?.messages, isLoading]);

    const handleGenerate = (type: 'new' | 'continue', optionText?: string) => {
        if (isLoading) return;
        if (!novelWorldline) {
            showToast?.("请先在右侧设置小说世界线：WORLD、ERA、PERIOD；AU 还需选择基准时间线。");
            setWorldlineOpen(true);
            setRightOpen(true);
            return;
        }
        if (novelRole === "participant" && (!novelSelf || (novelSelf.worldId
            && novelSelf.worldId !== novelWorldline.worldId))) {
            showToast?.("当前自设不属于选定世界观，请重新选择自设主角。");
            return;
        }
        const targetNames = chars.filter((c: any) => selectedCharIds.includes(c.id)).map((c: any) => characterDisplayName(c.id, c.name, locale)).join(", ");
        if (!environment.trim() || !event.trim()) {
            showToast?.("Environment（环境）和 Event（当前事件）都是必填项。");
            return;
        }
        const novelConfig = { charNames: targetNames, environment:environment.trim(), event:event.trim(), style, outline, selfId:novelRole === "participant" ? novelSelfId : null };
        saveDraft();

        if (type === 'new') {
            const chapterCount = currentSession.messages.filter((m: any) => m.role === 'assistant' && !m.content.includes("（...正在")).length;

            if (chapterCount > 0) {
                if (confirm("⚠️ 当前梦境已有剧情，是否保存并开启一段【全新的梦境】？\n(这会创建一个新的会话)")) {
                    createNewSession(selectedCharIds[0] || "sakiko", 'novel');
                    return;
                } else {
                    return; 
                }
            } else {
                const prompt = `[Action]: Start Chapter 1 based on the [Dream Outline]. Introduce the scene and start the action immediately.`;
                handleSend(prompt, undefined, {
                    novelConfig,
                    modelOverride: activeModel
                });
            }
        }
        else {
            let prompt = "";
            if (optionText) prompt = `[User Choice]: ${optionText}\n[Instruction]: Continue story.`;
            else if (directorInput.trim()) prompt = `[Director Instruction]: ${directorInput}`;
            else prompt = `[SYSTEM]: Continue the novel. Next Chapter.`;

            handleSend(prompt, undefined, {
                novelConfig,
                modelOverride: activeModel
            });
        }

        setDirectorInput("");
        if (isMobile) { setLeftOpen(false); setRightOpen(false); }
    };

    const saveDraft = (patch: Partial<NovelDraft> = {}) => {
        updateSessionInfo?.(currentSession.id, {
            novelDraft: { selectedCharIds, selfId:novelRole === "participant" ? novelSelfId : null, environment, event, style, outline, themeMode, ...patch },
            updatedAt: Date.now(),
        });
    };
    const updateNovelRole = (role: "observer" | "participant") => {
        if (isLoading || novelStarted) return;
        if (role === "participant" && !canParticipate) {
            showToast?.("请先在 Charta 创建并启用自设；世界线确定后再验证所属世界观。");
            return;
        }
        const self = role === "participant" ? activeNovelSelf : null;
        updateSessionInfo?.(currentSession.id, {
            storyRole: role,
            storySelfId: self?.id || null,
            storySelfSnapshot: self,
            novelDraft: {
                ...(currentSession.novelDraft || {}),
                selectedCharIds, selfId: self?.id || null, environment, event, style, outline, themeMode,
            },
            updatedAt: Date.now(),
        });
    };
    const updateWorldline = (next: StoryWorldline) => {
        const changedWorld = currentSession.storyWorldline?.worldId !== next.worldId;
        if (changedWorld && novelStarted && novelRole === "participant" && novelSelf?.worldId
            && novelSelf.worldId !== next.worldId) {
            showToast?.("已开始的小说绑定了自设身份；请新建小说以切换到不兼容的世界观。");
            return;
        }
        if (changedWorld && !novelStarted && novelRole === "participant" && novelSelf?.worldId
            && novelSelf.worldId !== next.worldId) {
            showToast?.("所选世界线与当前自设不兼容，已恢复为旁观模式。");
        }
        updateSessionInfo?.(currentSession.id, {
            storyWorldline: next,
            ...(changedWorld ? {
                storyNextCastIds: [], storyAllowCrossWorld: false, sceneCastIds: [],
                ...(!novelStarted && novelRole === "participant" && novelSelf?.worldId && novelSelf.worldId !== next.worldId
                    ? { storyRole: "observer", storySelfId: null, storySelfSnapshot: null } : {}),
                novelDraft: {
                    ...(currentSession.novelDraft || {}), selectedCharIds: [],
                    selfId: novelRole === "participant" && (!novelSelf?.worldId || novelSelf.worldId === next.worldId) ? novelSelfId : null,
                },
            } : {}),
            updatedAt: Date.now(),
        });
        if (changedWorld) setSelectedCharIds([]);
    };
    const updateCast = (ids: string[], allowCrossWorld: boolean) => {
        setSelectedCharIds(ids);
        updateSessionInfo?.(currentSession.id, {
            storyNextCastIds: ids, storyAllowCrossWorld: allowCrossWorld,
            novelDraft: { selectedCharIds: ids, selfId:novelRole === "participant" ? novelSelfId : null, environment, event, style, outline, themeMode },
            updatedAt: Date.now(),
        });
    };

    const chapters = currentSession?.messages.map((m: any, i: number) => ({ ...m, realIndex: i })).filter((m: any) => m.role === 'assistant' && !m.content.includes("（...正在")) || [];

    return (
        <div
            className={`fixed inset-0 z-[500] ${theme.bg} ${theme.text} flex overflow-hidden font-serif transition-colors duration-500 h-[100dvh] w-screen overscroll-none`}
            style={{ backgroundColor: themeMode === 'paper' ? '#fdf6e3' : '#f1f4ee' }}
        >
            <div className="fixed inset-0 z-0 pointer-events-none">
                <AnimatePresence>
                    {(dynamicBg || currentTrack?.cover) && (
                        <motion.div
                            key={dynamicBg || currentTrack?.cover}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.3 }} 
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.5 }}
                            className="absolute inset-[-20px] bg-cover bg-center blur-[50px] scale-110" 
                            style={{ backgroundImage: `url(${dynamicBg || currentTrack?.cover})` }}
                        />
                    )}
                </AnimatePresence>
                <div className={`absolute inset-0 ${themeMode === 'sage' ? 'bg-[#f1f4ee]/85' : 'bg-white/60'}`}></div>
            </div>
            <AnimatePresence>
                {leftOpen && (
                    <motion.div
                        key="novel-left-sidebar"
                        initial={isMobile ? { x: "-100%" } : { width: 0, opacity: 0 }}
                        animate={isMobile ? { x: 0 } : { width: 280, opacity: 1 }}
                        exit={isMobile ? { x: "-100%" } : { width: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        className={`
                flex flex-col shrink-0 border-r ${theme.border} ${theme.sidebar}
                ${isMobile
                                ? "fixed inset-y-0 left-0 z-[100] w-[280px] shadow-[10px_0_30px_rgba(0,0,0,0.5)]" // 手机：加重阴影，覆盖在最上层
                                : "relative z-10 shadow-xl" 
                            }
            `}
                    >
                        <div className="w-[280px] h-full flex flex-col">
                            <div className={`
                            border-b ${theme.border} flex items-center justify-between
                            pt-[calc(1.5rem+env(safe-area-inset-top))] pb-6 px-6 
                        `}>
                                <div className="flex items-center gap-3 overflow-hidden"><Book className={theme.accent} size={20} /><span className={`font-bold text-lg tracking-widest ${theme.title} truncate`}>{currentSession.title}</span></div>
                                <button onClick={() => setLeftOpen(false)} className={`${theme.text} hover:${theme.accent}`}><X size={18} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
                                <div className={`text-[10px] font-bold ${theme.text} opacity-60 uppercase mb-2`}>Chapters</div>
                                {chapters.map((msg: any, i: number) => {
                                    const match = msg.content.match(/chapter="(.*?)"/);
                                    const title = match ? match[1] : `Chapter ${i + 1}`;
                                    return (
                                        <div key={i} className="group relative">
                                            <button className={`w-full text-left p-3 rounded-lg ${theme.hover} transition-all border border-transparent`} onClick={() => document.getElementById(`chapter-${i}`)?.scrollIntoView({ behavior: 'smooth' })}>
                                                <div className={`text-xs ${theme.accent} mb-1 font-mono flex justify-between`}><span>Chapter {i + 1}</span>{i === chapters.length - 1 && <span className="opacity-100 md:opacity-0 md:group-hover:opacity-100 flex gap-1"><span onClick={(e) => { e.stopPropagation(); const userIndex = msg.realIndex - 1; deleteMessage?.(userIndex >= 0 && currentSession.messages[userIndex]?.role === "user" ? userIndex : msg.realIndex, userIndex >= 0 && currentSession.messages[userIndex]?.role === "user" ? "user" : "assistant"); }} title="删除最新章节及其导演指令，并回退场景与记忆" className="opacity-60 hover:opacity-100 hover:text-red-400 cursor-pointer p-1"><Trash2 size={12} /></span></span>}</div>
                                                <div className={`text-sm ${theme.title} font-bold truncate`}>{title}</div>
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className={`p-4 border-t ${theme.border}`}><button onClick={onExit} className={`flex items-center gap-2 opacity-60 hover:opacity-100 hover:text-red-400 transition-colors w-full p-2 rounded ${theme.hover} justify-center`}><LogOut size={16} /> <span className="text-xs font-bold">返回模式导航</span></button></div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className={` relative z-10  flex-1 flex flex-col relative min-w-0 ${theme.bg} transition-colors duration-500`}>
                <div className={`
                    grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 border-b ${theme.border} shrink-0
                    pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 h-auto
                    min-h-[3.5rem]
                `}>
                    <div className="justify-self-start">
                        <button type="button" onClick={() => setLeftOpen(!leftOpen)} className={`rounded-lg p-2 transition-colors ${theme.text} ${theme.hover}`} title="切换章节目录" aria-label="切换章节目录"><AlignLeft size={19} /></button>
                    </div>
                    <h1 className={`whitespace-nowrap text-sm font-semibold tracking-[0.24em] sm:text-base ${theme.title}`}>TELA</h1>
                    <div className="flex items-center justify-self-end gap-0.5 sm:gap-1">
                        <button type="button" onClick={() => {
                            const next = themeMode === 'sage' ? 'paper' : 'sage';
                            setThemeMode(next);
                            saveDraft({ themeMode: next });
                        }} className={`rounded-lg p-2 transition-colors ${theme.accent} ${theme.hover}`} title={`切换小说主题（当前：${themeMode === 'sage' ? '鼠尾草' : '羊皮纸'}）`} aria-label="切换小说主题">{themeMode === 'sage' ? <Sun size={19} /> : <Moon size={19} />}</button>
                        <button type="button" onClick={onOpenSettings} className={`rounded-lg p-2 transition-colors ${theme.text} ${theme.hover}`} title="打开 Shiorivia 设置中心" aria-label="打开设置中心"><Settings2 size={19} /></button>
                        <button type="button" onClick={() => setRightOpen(!rightOpen)} className={`rounded-lg p-2 transition-colors ${theme.text} ${theme.hover}`} title="切换小说设定面板" aria-label="切换小说设定面板"><PanelRight size={19} /></button>
                    </div>
                </div>

                <div className="z-10"><MiniPlayer onExpand={() => setShowFullPlayer(true)} rightSidebarOpen={rightOpen} themeMode={themeMode === "sage" ? "sage" : "paper"} /></div>
                <ImageLightbox src={previewImage} onClose={() => setPreviewImage(null)} />

                <div className="flex-1 overflow-y-auto p-6 md:p-16 scroll-smooth pb-32">
                    <div className="max-w-3xl mx-auto space-y-16">
                        {chapters.map((msg: any, i: number) => {
                            const cleanContent = stripNovelState(msg.content).replace(/<meta.*?\/>/, '').trim();
                            const match = msg.content.match(/chapter="(.*?)"/);
                            const title = match ? match[1] : `Chapter ${i + 1}`;
                            return (
                                <div key={i} id={`chapter-${i}`} className="animate-fade-in-up">
                                    <div className="flex items-center gap-4 mb-8 opacity-30 justify-center"><div className={`h-px ${theme.text} w-12`}></div><span className="font-mono text-xs tracking-widest uppercase">{title}</span><div className={`h-px ${theme.text} w-12`}></div></div>
                                    <div className={`prose ${theme.prose} prose-lg md:prose-xl leading-loose ${theme.text} font-serif whitespace-pre-wrap`}>
                                        <NovelContent content={msg.content}
                                            onOptionClick={(opt: string) => setPendingNovelChoice(opt)}
                                            onOptionInsert={(opt: string) => { setDirectorInput(opt); showToast?.("剧情建议已填入导演输入框，可继续修改。"); }}
                                            onImageOpen={setPreviewImage} theme={theme} selfColors={selfColors} locale={locale}
                                            disabled={isLoading || i !== chapters.length - 1} />

                                        {useImageGen && parseDrawTag(msg.content)?.trigger && (
                                            <button type="button" disabled={drawingIndex !== null || isLoading}
                                                onClick={() => void confirmNovelDraw(msg.realIndex)}
                                                className={`mt-5 flex items-center gap-3 rounded-xl border ${theme.border} ${theme.inputBg} px-4 py-3 text-xs ${theme.text} transition ${theme.hover} disabled:opacity-50`}>
                                                <Sparkles size={15}/><span>插图待生成</span>
                                                <span className="ml-auto text-[11px]">{drawingIndex === msg.realIndex ? '生成中…' : '点击生成'}</span>
                                            </button>
                                        )}
                                        {debugMode && (msg.content.includes('<draw>') || msg.content.includes('<draw_log>')) && (
                                            <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[#18232f] p-3 text-left font-mono text-[11px] text-[#d7e7df]">
                                                {JSON.stringify({ instruction: msg.content.match(/<(?:draw|draw_log)>([\s\S]*?)<\/(?:draw|draw_log)>/)?.[1], request: buildDrawRequest(msg.content.replaceAll('<draw_log>', '<draw>').replaceAll('</draw_log>', '</draw>'), { activeCharacterId: selectedCharIds[0] || currentSession.characterId, characters: chars, charStatus: currentSession.charStatus, settings: imageSettings }) }, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                        {isLoading && <div className="flex justify-center py-10"><Sparkles className={`animate-spin ${theme.accent}`} size={32} /></div>}
                        <div ref={messagesEndRef} className="h-10"></div>
                    </div>
                </div>

                <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${themeMode === 'sage' ? 'from-[#f1f4ee] via-[#f1f4ee]' : 'from-[#fdf6e3] via-[#fdf6e3]'} to-transparent p-4 pb-6 z-20`}>
                    <div className="max-w-2xl mx-auto">
                        {!novelWorldline && <div role="status" className={`mb-3 flex items-center justify-between gap-3 rounded-xl border ${theme.border} ${theme.inputBg} px-3 py-2 text-xs ${theme.text}`}>
                            <span>请先设定世界线，才能开始或续写小说。</span>
                            <button type="button" onClick={() => { setRightOpen(true); setWorldlineOpen(true); }} className={`shrink-0 rounded-lg border ${theme.border} px-3 py-1.5 font-semibold ${theme.hover}`}>设置世界线</button>
                        </div>}
                        <div className="flex items-end gap-2">
                        <button onClick={() => { const lastAssistIdx = currentSession.messages.map((m: any, i: number) => ({ ...m, i })).filter((m: any) => m.role === 'assistant').pop()?.i; if (lastAssistIdx) handleRegenerate(lastAssistIdx); }} disabled={isLoading || !novelWorldline} className={`p-3 mb-1 rounded-full ${theme.inputBg} backdrop-blur border ${theme.border} opacity-60 hover:opacity-100 hover:text-red-400 transition-all shadow-lg ${theme.subButton}`}><RefreshCw size={18} className={isLoading ? "animate-spin" : ""} /></button>

                        <div className={`flex-1 ${theme.inputBg} backdrop-blur-md border ${theme.border} rounded-2xl flex items-center p-2 shadow-2xl transition-all`}>
                            <input value={directorInput} onChange={(e) => setDirectorInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !isLoading && novelWorldline && handleGenerate('continue')} placeholder={novelWorldline ? "导演指令..." : "请先在右侧设定世界线..."} className={`flex-1 bg-transparent border-none outline-none text-sm ${theme.title} px-3 font-sans ${theme.placeholder} disabled:cursor-not-allowed disabled:opacity-60`} disabled={isLoading || !novelWorldline} />

                            {isLoading ? (
                                <button
                                    onClick={stopGeneration}
                                    className={`p-2 rounded-xl transition-all shadow-lg bg-red-600 text-white hover:bg-red-500 animate-pulse`}
                                    title="Stop Generation"
                                >
                                    <Square size={18} fill="currentColor" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleGenerate('continue')}
                                    disabled={!novelWorldline}
                                    className={`p-2 rounded-xl transition-all shadow-lg ${theme.button} disabled:cursor-not-allowed disabled:opacity-40`}
                                    title="Continue"
                                >
                                    <ArrowUp size={18} />
                                </button>
                            )}

                        </div>
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {rightOpen && (
                    <motion.div
                        key="novel-right-sidebar"
                        initial={isMobile ? { x: "100%" } : { width: 0, opacity: 0 }}
                        animate={isMobile ? { x: 0 } : { width: 320, opacity: 1 }}
                        exit={isMobile ? { x: "100%" } : { width: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        className={`
                flex flex-col shrink-0 border-l ${theme.border} ${theme.sidebar}
                ${isMobile
                                ? "fixed inset-y-0 right-0 z-[100] w-[320px] shadow-[-10px_0_30px_rgba(0,0,0,0.5)]" // 手机：覆盖层
                                : "relative z-10 shadow-xl"
                            }
                pt-safe
            `}
                    >
                        <div className="w-[320px] h-full flex flex-col">
                            <div className={`
                            border-b ${theme.border} flex justify-between items-center
                            pt-[calc(1.5rem+env(safe-area-inset-top))] pb-6 px-6
                        `}>
                                <div><div className={`text-[10px] font-bold ${theme.text} opacity-50 uppercase tracking-widest mb-1`}>TELA · CREATION</div><h2 className={`text-xl font-serif ${theme.title}`}>{deepText(locale, "novel.controls")}</h2></div>{isMobile && <button onClick={() => setRightOpen(false)} className={`${theme.text} hover:${theme.accent}`}><X /></button>}</div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
                                <MemoryPreviewButton stm={currentSession.stm} ltm={currentSession.ltm} onOpen={() => setShowMemoryVault(true)} tone={themeMode === "sage" ? "novel-sage" : "novel-paper"} />

                                <div>
                                    <label className={`text-xs ${theme.accent} font-bold mb-2 block flex items-center gap-2`}><FileText size={14} /> GLOBAL SETTING · {deepText(locale, "novel.outline")}</label>
                                    <textarea
                                        value={outline}
                                        onChange={e => handleOutlineChange(e.target.value)}
                                        onBlur={() => saveDraft()}
                                        placeholder={deepText(locale, "novel.outlinePlaceholder")}
                                        className={`w-full h-32 ${theme.inputBg} border ${theme.border} rounded p-3 text-xs ${theme.text} ${theme.focus} outline-none resize-none font-mono ${theme.placeholder}`}
                                    />
                                </div>

                                <div className={`${theme.inputBg} p-4 rounded-2xl border ${theme.border} space-y-5 shadow-sm`}>

                                    <div className="space-y-2">
                                        <label className={`text-[10px] ${theme.text} opacity-50 font-black uppercase tracking-widest mb-2 block`}>AI Architect · Shared Model</label>
                                        <select aria-label="小说模型供应商" value={provider || ""} onChange={e => onProviderChange(e.target.value)} className={`w-full ${theme.bg} border ${theme.border} rounded-lg px-3 py-2 text-xs ${theme.text} outline-none ${theme.focus}`}>
                                            {providers.map((p: PublicLocalProvider) => <option key={p.id} value={p.id}>{p.label}</option>)}
                                            {!providers.some((p: PublicLocalProvider) => p.id === provider) && <option value={provider}>{provider || "未配置供应商"}</option>}
                                        </select>
                                        <select aria-label="小说模型" value={customModelId && savedIds.includes(customModelId) ? `saved:${customModelId}` : (!customModelId && availableModels.some(m => m.id === selectedModel) ? selectedModel : "")} onChange={e => e.target.value.startsWith("saved:") ? onCustomModelChange(e.target.value.slice(6)) : onModelChange(e.target.value)} className={`w-full ${theme.bg} border ${theme.border} rounded-lg px-3 py-2 text-xs ${theme.text} outline-none ${theme.focus}`}>
                                            <option value="">{deepText(locale, "novel.manual")}</option>
                                            {availableModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                            {savedIds.map(id => <option key={`saved:${id}`} value={`saved:${id}`}>{id} · 自定义</option>)}
                                        </select>
                                        <div className="flex gap-2">
                                            <input aria-label="小说自定义模型 ID" value={customModelId || ""} onChange={e => onCustomModelChange(e.target.value)} placeholder="Custom Model ID（可选）" className={`min-w-0 flex-1 ${theme.inputBg} border ${theme.border} rounded-lg px-3 py-2 text-xs ${theme.text} outline-none ${theme.focus}`} />
                                            <button type="button" onClick={() => saveModel(provider, customModelId || "")} disabled={!customModelId?.trim() || savedIds.includes(customModelId.trim())} className="rounded-lg border border-[#bda77c] px-3 text-xs text-[#a48b5c] disabled:opacity-40">保存</button>
                                        </div>
                                        {savedIds.length > 0 && <div className="flex flex-wrap gap-2">{savedIds.map(id => <span key={id} className={`inline-flex items-center gap-1 rounded-lg border ${theme.border} px-2 py-1 text-[10px] ${theme.text}`}><button type="button" onClick={() => onCustomModelChange(id)}>{id} · 自定义</button><button type="button" onClick={() => forgetModel(provider, id)} aria-label={`移除 ${id}`} className="ml-1 opacity-60 hover:opacity-100">×</button></span>)}</div>}
                                        <p className={`text-[10px] ${theme.text} opacity-50`}>{deepText(locale, "novel.current")}：{activeModel || deepText(locale, "novel.manual")} · {deepText(locale, "novel.sync")}</p>
                                    </div>

                                    <div>
                                        <button
                                            onClick={onManualSync}
                                            disabled={syncStatus === 'syncing'}
                                            className={`
                                            w-full py-2.5 rounded-xl text-[11px] font-black tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.97]
                                                ${syncStatus === 'syncing'
                                                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 cursor-wait'
                                                    : syncStatus === 'error'
                                                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                        : syncStatus === 'success'
                                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                            : `${theme.subButton} border border-transparent hover:border-purple-500/30`}
                                            `}
                                        >
                                            {syncStatus === 'syncing' ? <RefreshCw size={14} className="animate-spin" /> :
                                                syncStatus === 'success' ? <Check size={14} /> :
                                                    syncStatus === 'error' ? <AlertTriangle size={14} /> :
                                                        <HardDrive size={14} />}

                                            <span>{syncStatus === "syncing" ? localText(locale, "sync.syncing") : syncStatus === "success" ? localText(locale, "sync.saved") : syncStatus === "error" ? localText(locale, "sync.failed") : localText(locale, "sync.now")}</span>
                                        </button>

                                        <p className={`text-[9px] text-center mt-2 ${theme.text} opacity-30 font-mono italic`}>
                                            {syncStatus === "syncing" ? localText(locale, "sync.syncing") : localText(locale, "novel.ready")}
                                        </p>
                                    </div>
                                </div>

                                <NovelArchiveActions
                                    session={currentSession}
                                    draft={{ selectedCharIds, selfId:novelRole === "participant" ? novelSelfId : null, environment, event, style, outline, themeMode }}
                                    onImport={onImportNovelSession}
                                    disabled={isLoading}
                                    tone={themeMode}
                                    className={themeMode === "paper"
                                      ? "rounded-2xl border-2 border-[#c5a97a] bg-[#fffaf0] p-4 text-[#67533a] shadow-[0_6px_22px_rgba(121,89,45,.12)]"
                                      : "rounded-2xl border-2 border-[#9db7a3] bg-[#fbfdfa] p-4 text-[#405e4a] shadow-[0_6px_22px_rgba(52,92,62,.13)]"}
                                />

                                <section className={`space-y-3 rounded-2xl border ${theme.border} ${theme.inputBg} p-4 shadow-sm`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`text-xs font-bold ${theme.accent}`}>世界线 · WORLDLINE</span>
                                        <span className={`text-[10px] ${theme.text} opacity-60`}>小说背景</span>
                                    </div>
                                    <p className={`text-[11px] leading-5 ${theme.text}`}>
                                        {novelWorldline ? describeStoryWorldline({ ...novelWorldline, event:"" }) : "尚未设定 · 请先选择世界观与时期"}
                                    </p>
                                    <button type="button" onClick={() => setWorldlineOpen(true)} disabled={isLoading}
                                        className={`w-full rounded-xl border ${theme.border} px-3 py-2 text-xs font-semibold transition ${theme.hover} disabled:opacity-50`}>
                                        {novelWorldline ? "编辑世界线" : "创建世界线"}
                                    </button>
                                </section>
                                <StoryCastPicker session={currentSession} worlds={storyWorlds}
                                    customCharacters={customCharacters} busy={isLoading}
                                    onApply={updateCast} mode="novel" tone={themeMode} />
                                <section className={`rounded-2xl border ${theme.border} ${theme.inputBg} p-4 space-y-3`}>
                                    <div className={`text-xs font-bold ${theme.accent}`}>故事身份 · STORY ROLE</div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <button type="button" disabled={isLoading || novelStarted}
                                            aria-pressed={novelRole === "observer"}
                                            onClick={() => updateNovelRole("observer")}
                                            className={`rounded-xl border p-2.5 ${novelRole === "observer" ? theme.selectBorder + " " + theme.selectBg : theme.border} disabled:opacity-55`}>旁观模式</button>
                                        <button type="button" disabled={isLoading || novelStarted || !canParticipate}
                                            aria-pressed={novelRole === "participant"}
                                            title={!canParticipate ? "请先在 Charta 创建并启用当前世界观可用的自设" : ""}
                                            onClick={() => updateNovelRole("participant")}
                                            className={`rounded-xl border p-2.5 ${novelRole === "participant" ? theme.selectBorder + " " + theme.selectBg : theme.border} disabled:opacity-55`}>参与模式</button>
                                    </div>
                                    {novelRole === "participant"
                                        ? <p className={`text-[11px] leading-5 ${theme.text}`}>使用身份：<span className="font-semibold" style={{ color: novelSelf?.hex || "#799783" }}>{novelSelf ? selfName(novelSelf, locale) : "自设不存在，请检查 Charta"}</span></p>
                                        : <p className={`text-[11px] leading-5 ${theme.text} opacity-65`}>旁观模式不注入用户自设身份。参与模式使用 Charta 当前启用的自设，不提供主视角选择。</p>}
                                    {novelStarted && <p className={`text-[10px] ${theme.text} opacity-60`}>小说开始后故事身份保持固定。</p>}
                                </section>


                                <div><label className={`text-xs ${theme.text} opacity-70 font-bold mb-2 block uppercase`}>Quick Presets · 六种剧情方向</label><div className="grid grid-cols-2 gap-2">{PRESETS.map((p, i) => (<button key={i} type="button" disabled={isLoading || inputsLocked} onClick={() => { setEnvironment(p.environment); setEvent(p.event); setStyle(p.style); saveDraft({ environment:p.environment, event:p.event, style:p.style }); }} className={`px-3 py-2.5 rounded-xl text-left ${theme.inputBg} border ${theme.border} text-[11px] ${theme.text} hover:shadow-sm transition-all`}>{p.name}</button>))}</div></div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`text-[10px] ${theme.text} opacity-75`}>{hasNovelChapters ? "每章结束由 AI 自动更新环境、事件和下章阵容" : "第一章开始前请填写环境与当前事件"}</span>
                                        {inputsLocked && <button type="button" onClick={allowSceneEdit} className={`shrink-0 rounded-lg border ${theme.border} px-2 py-1 text-[10px] font-semibold ${theme.hover}`}>确认后修改</button>}
                                        {manualStateEdit && <button type="button" disabled={isLoading || !environment.trim() || !event.trim()}
                                            onClick={() => { saveDraft(); setManualStateEdit(false); showToast?.("环境与事件已保存并重新锁定。"); }}
                                            className={`shrink-0 rounded-lg border ${theme.selectBorder} ${theme.selectBg} px-3 py-1 text-[10px] font-semibold ${theme.title} disabled:opacity-40`}>保存并锁定</button>
                                    </div>
                                    <div><label className={`text-xs ${theme.text} opacity-80 font-bold mb-1 block`}>Environment · 环境 *</label><textarea required value={environment} readOnly={inputsLocked} onChange={e => setEnvironment(e.target.value)} onBlur={() => saveDraft()} placeholder="地点、天气、温度及周边环境" className={`w-full h-20 ${theme.inputBg} border ${theme.border} rounded p-2 text-xs ${theme.text} ${theme.focus} outline-none resize-y read-only:opacity-65`} /></div>
                                    <div><label className={`text-xs ${theme.text} opacity-80 font-bold mb-1 block`}>Event · 当前事件 *</label><textarea required value={event} readOnly={inputsLocked} onChange={e => setEvent(e.target.value)} onBlur={() => saveDraft()} placeholder="当前正在发生的事情" className={`w-full h-20 ${theme.inputBg} border ${theme.border} rounded p-2 text-xs ${theme.text} ${theme.focus} outline-none resize-y read-only:opacity-65`} /></div>
                                    <div><label className={`text-xs ${theme.text} opacity-70 font-bold mb-1 block`}>Style</label><input value={style} onChange={e => setStyle(e.target.value)} onBlur={() => saveDraft()} placeholder="默认正文 1000–2000 字；可在此自行指定字数" className={`w-full ${theme.inputBg} border ${theme.border} rounded p-2 text-xs ${theme.text} ${theme.focus} outline-none`} /></div>
                                </div>

                                <button onClick={() => handleGenerate('new')} disabled={isLoading || !novelWorldline} className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-lg ${theme.button}`}><Sparkles size={16} /> 编织新篇章</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <SuggestionModal isOpen={pendingNovelChoice !== null} content={pendingNovelChoice || ""}
                mode="send" onClose={() => setPendingNovelChoice(null)}
                onConfirm={() => {
                    const choice = pendingNovelChoice;
                    setPendingNovelChoice(null);
                    if (choice && !isLoading) handleGenerate("continue", choice);
                }} />
            <StoryWorldlineFateModal elevated isOpen={worldlineOpen}
                value={novelWorldline ? { ...novelWorldline, event:"" } : undefined}
                worlds={storyWorlds}
                onSave={updateWorldline}
                showEvent={false}
                onClose={() => setWorldlineOpen(false)}
                onOpenCharta={onOpenCharta}
            />
            {/* Mobile Overlay Mask */}
            {(leftOpen || rightOpen) && isMobile && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 z-[90] backdrop-blur-sm"
                    onClick={() => { setLeftOpen(false); setRightOpen(false) }}
                />
            )}
            <MemoryVaultModal
                open={showMemoryVault}
                onClose={() => setShowMemoryVault(false)}
                sessionId={currentSession.id}
                stm={currentSession.stm}
                ltm={currentSession.ltm}
                tone={themeMode === "sage" ? "novel-sage" : "novel-paper"}
                onSave={({ stm, ltm }) => updateSessionInfo(currentSession.id, {
                    stm, ltm, turnCount: stm.split(/\n/).filter(Boolean).length, updatedAt: Date.now(),
                })}
            />
            <div className="z-[200]">
                <MusicPlayerModal isOpen={showFullPlayer} onClose={() => setShowFullPlayer(false)} />
            </div>
        </div>
    );
};