import { useState, useRef, useEffect } from "react";
import { CHARACTERS, Session } from "../types";
import { formatLocalMemoryEntries, parseLocalMemoryEntries, LOCAL_STM_SLOTS } from "../lib/localMemory";
import { calculateNewStats } from "../lib/emotionalEngine";
import { uploadImageToCloud } from "../lib/cloudUtils";
import { buildDrawRequest } from "../lib/drawRequest";
import { parseDrawTag, cleanDrawTag } from "../lib/parseDraw"; 
import { useLanguage } from "../context/LanguageContext";
import { asChartaSelfPromptData, selfName } from "../lib/chartaSelf";
import { asChartaPromptData } from "../lib/charta";
import { parseStoryWorldline } from "../lib/storyWorldline";
import { extractNovelState, stripNovelState } from "../lib/novelState";
import { snapshotNovelState, restoreNovelState } from "../lib/novelStateRecovery";
import { stripNovelSuggestions } from "../lib/novelSuggestions";
import { storyCastAllowed, selectStoryCastIds } from "../lib/storyCast";
import { snapshotStoryState, restoreStoryState, emptyStoryState, isUsableStoryProtocol, normalizeStoryProtocol, storyProtocolIssues } from "../lib/storyStateRecovery";
import { completeStoryProtagonist } from "../lib/storyProtagonist";
import { mayReviewSessionTitle, shouldReviewTitleAtTurn } from "../lib/titleReview";

export const useChatEngine = ({
    currentSession, currentSessionId, setSessions,
    activeCharacterId, voiceVariant,
    globalWorldInfo,
    config, 
    setTrackId, showToast, setIsGlobalGenerating,
    manualOutfitId,
    apiProvider, customCharacters = [], customSelves = [], activeSelfId = null, storyWorlds = []
}: any) => {
    
    const { locale } = useLanguage();
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<{ url: string, type: 'image' | 'video' | 'text', name: string } | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const [pendingStoryRegeneration, setPendingStoryRegeneration] = useState<{ sessionId: string; messagesLength: number } | null>(null);

    const stopGeneration = () => { 
        if (abortControllerRef.current) { 
            abortControllerRef.current.abort(); 
            setIsLoading(false); 
        } 
    };

    const requestAutomaticTitle = (history: any[], answer: string, modelName: string, generationId: string) => {
        const mode = currentSession?.memoryMode;
        // Review all four conversation modes; never overwrite user-authored titles.
        const originalTitle = currentSession.title;
        if (!mayReviewSessionTitle(currentSession, mode)) return;
        const userTurns = history.filter(message => message.role === "user").length;
        if (!shouldReviewTitleAtTurn(userTurns)) return;
        const recent = [...history, { role: "assistant", content: answer }].slice(-12)
            .map(message => {
                const role = message.role === "assistant" ? "ASSISTANT" : "USER";
                const raw = typeof message.content === "string" ? message.content : JSON.stringify(message.content || "");
                const clean = stripNovelSuggestions(stripNovelState(raw))
                    .replace(/<file\b[^>]*>[\s\S]*?<\/file>/gi, " [code] ")
                    .replace(/<game_state\b[^>]*>[\s\S]*?<\/game_state>/gi, "")
                    .replace(/<draw\b[^>]*>[\s\S]*?<\/draw>/gi, "")
                    .replace(/<meta\b[^>]*\/?\s*>/gi, "")
                    .replace(/<audio\b[^>]*>[\s\S]*?<\/audio>/gi, "").trim();
                return `${role}: ${clean.slice(0, 500)}`;
            }).join("\n");
        void fetch("/api/summarize", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "title", currentTitle: originalTitle,
                text: recent.slice(-3500), model: modelName, provider: apiProvider, uiLanguage: locale }),
        }).then(response => response.ok ? response.json() : null).then(result => {
            const title = typeof result?.summary === "string" ? result.summary.trim().slice(0, 60) : "";
            if (!title || title === "KEEP" || title === originalTitle || title.length < 2) return;
            setSessions((prev: Session[]) => prev.map(session => {
                if (session.id !== currentSessionId || !mayReviewSessionTitle(session, mode) ||
                    session.title !== originalTitle ||
                    !session.messages.some((message: any) => message.storyGenerationId === generationId) ||
                    session.messages.filter(message => message.role === "user").length !== userTurns) return session;
                return { ...session, title, titleAutoManaged: true };
            }));
        }).catch(error => console.warn("Automatic title review skipped:", error));
    };

    const handleSend = async (
        overrideInput?: string, 
        overrideMessages?: any[], 
        configOverride?: { 
            useMusicControl?: boolean; 
            novelConfig?: any;
            modelOverride?: string; 
        }
    ) => {
        if (isLoading || !currentSession) return;

        if ((currentSession.memoryMode === "sliding" || currentSession.memoryMode === "novel") && !parseStoryWorldline(currentSession.storyWorldline)) {
            showToast("请先打开右侧世界线，设置世界观、ERA 和 PERIOD，再开始故事。");
            return;
        }
        const isRegen = overrideMessages !== undefined;
        const txt = overrideInput !== undefined ? overrideInput : input.trim();
        if (!isRegen && !txt && !selectedFile) return;
        const novelMode = currentSession.memoryMode === "novel";
        const novelLegacySelfId = novelMode && currentSession.storyRole === undefined ? currentSession.novelDraft?.selfId : null;
        const storyRole = (currentSession.memoryMode === "sliding" || novelMode)
            && (currentSession.storyRole === "participant" || (novelLegacySelfId && currentSession.storyRole !== "observer"))
            ? "participant" : "observer";
        const selectedSelfId = (novelMode ? (currentSession.storySelfId || novelLegacySelfId) : currentSession.storySelfId) || activeSelfId;
        const selectedSelf = storyRole === "participant"
            ? (currentSession.storySelfSnapshot || customSelves.find((self: any) => self.id === selectedSelfId))
            : null;
        if ((currentSession.memoryMode === "sliding" || novelMode) && storyRole === "participant" && !selectedSelf) {
            showToast("请先在 Charta 创建并启用一个自设，再开始参与模式");
            return;
        }
        if (novelMode && storyRole === "participant" && selectedSelf?.worldId
            && selectedSelf.worldId !== currentSession.storyWorldline?.worldId) {
            showToast("当前自设与小说世界线不匹配，请重新设置故事身份。");
            return;
        }
        const previousStoryTurns = (overrideMessages || currentSession.messages).filter((message: any) => message.role === "user").length;
        const generationId = crypto.randomUUID();
        const assistantMeta = {
            storyGenerationId: generationId,
            ...(currentSession.memoryMode === "sliding" ? { storyStateBefore: snapshotStoryState(currentSession) } : {}),
            ...(currentSession.memoryMode === "novel" ? { novelStateBefore: snapshotNovelState(currentSession, configOverride?.novelConfig) } : {}),
        };

        if (!isRegen) { setInput(""); setSelectedFile(null); }
        setIsLoading(true);

        let msgs = overrideMessages ? [...overrideMessages] : [...currentSession.messages];
        const modelToUse = configOverride?.modelOverride || config.customModelId?.trim() || config.selectedModel || "";

        if (!isRegen) {
            let content: any = txt;
            if (selectedFile) {
                if (selectedFile.type === 'text') content = (txt ? txt + "\n\n" : "") + `[Attached File: ${selectedFile.name}]\n${selectedFile.url}`;
                else content = [{ type: "text", text: txt || "File" }, { type: "image_url", image_url: { url: selectedFile.url } }];
            }
            msgs.push({ role: "user", content, characterId: activeCharacterId, ...(currentSession.memoryMode === "sliding" ? { storyStateBefore: snapshotStoryState(currentSession) } : {}) });
        }

        setSessions((prev: any) => prev.map((s: any) => s.id === currentSessionId ? {
            ...s,
            messages: [...msgs, { role: "assistant", content: "", modelName: modelToUse, characterId: activeCharacterId, ...assistantMeta }],
            ...(s.memoryMode === "novel" && !s.novelInitialScene ? {
                novelInitialScene: {
                    environment: configOverride?.novelConfig?.environment ?? s.novelDraft?.environment ?? s.novelState?.environment ?? "",
                    event: configOverride?.novelConfig?.event ?? s.novelDraft?.event ?? s.novelState?.event ?? "",
                },
            } : {}),
            ...((s.memoryMode === "sliding" || s.memoryMode === "novel") ? {
                storyRole, storySelfId: storyRole === "participant" ? selectedSelf?.id || selectedSelfId : null,
                storySelfSnapshot: storyRole === "participant" ? selectedSelf : null,
                ...(s.memoryMode === "sliding" ? {
                    storyPovLocked: s.storyPovLocked || (isRegen ? previousStoryTurns >= 2 : previousStoryTurns >= 1),
                } : {}),
            } : {}),
            updatedAt: Date.now(),
            voiceVariant 
        } : s));

        abortControllerRef.current = new AbortController();

        let payloadMessages = msgs;
        const MAX_CONTEXT_MSG = 20;
        if (msgs.length > MAX_CONTEXT_MSG) {
            payloadMessages = [msgs[0], ...msgs.slice(-MAX_CONTEXT_MSG)];
            console.log(`✂️ Context Trimmed: ${msgs.length} -> ${payloadMessages.length}`);
        }

        try {
            const res = await fetch("/api/chat", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: payloadMessages.map((m: any) => ({ role: m.role, content: m.content, characterId: m.characterId })),
                    model: modelToUse,
                    characterId: activeCharacterId,
                    variant: voiceVariant,
                    globalWorldInfo,
                    localWorldInfo: currentSession.localWorldInfo,
                    memoryMode: currentSession.memoryMode || 'sliding',
                    stm: currentSession.stm,
                    ltm: currentSession.ltm,
                    timeline: currentSession.timeline,
                    storyWorldline: (currentSession.memoryMode === "sliding" || currentSession.memoryMode === "novel") ? currentSession.storyWorldline : undefined,
                    novelConfig: configOverride?.novelConfig ?? (currentSession.memoryMode === "novel" ? {
                        environment: currentSession.novelDraft?.environment ?? currentSession.novelState?.environment ?? "",
                        event: currentSession.novelDraft?.event ?? currentSession.novelState?.event ?? "",
                        charNames: "", style: currentSession.novelDraft?.style ?? "",
                        outline: currentSession.novelDraft?.outline ?? currentSession.localWorldInfo ?? "",
                        selfId: currentSession.storySelfId ?? currentSession.novelDraft?.selfId ?? null,
                    } : undefined), 
                    useWebSearch: config.webSearch,
                    useMusicControl: configOverride?.useMusicControl ?? config.musicControl,
                    useImageGen: config.imageGen,
                    charStatus: currentSession.charStatus,
                    codeRepository: currentSession.codeRepository,
                    provider: apiProvider, 
                    uiLanguage: locale,
                    debugRequestPayload: config.terminalRequestLog === true,
                    debugFullOutput: config.terminalLog === true,
                    geminiNarrativeStyle: config.geminiNarrativeStyle === true,
                    ...(currentSession.memoryMode === "novel" ? {
                        storyRole,
                        novelSelf: storyRole === "participant" && selectedSelf ? asChartaSelfPromptData(selectedSelf) : null,
                        storyNextCastIds: currentSession.storyNextCastIds ?? currentSession.novelDraft?.selectedCharIds ?? [],
                        storyAllowCrossWorld: currentSession.storyAllowCrossWorld === true,
                        storyCastWorlds: storyWorlds.map((world: any) => ({ id: world.id, name: world.name, description: world.description, canonTimeline: world.canonTimeline })),
                    } : {}),
                    ...(currentSession.memoryMode === "sliding" ? {
                        storyRole,
                        storyNextCastIds: currentSession.storyNextCastIds ?? currentSession.sceneCastIds ?? [],
                        storyAllowCrossWorld: currentSession.storyAllowCrossWorld === true,
                        storyCastWorlds: storyWorlds.map((world: any) => ({ id: world.id, name: world.name, description: world.description, canonTimeline: world.canonTimeline })),
                        storySelf: selectedSelf ? asChartaSelfPromptData(selectedSelf) : null,
                        storyPovId: storyRole === "observer" ? currentSession.storyPovId : null,
                        storyPovLocked: currentSession.storyPovLocked || (isRegen ? previousStoryTurns >= 2 : previousStoryTurns >= 1),
                        previousProtagonist: currentSession.protagonist,
                    } : {}),
                    customCharacters: customCharacters.map(asChartaPromptData),
                }),
                signal: abortControllerRef.current.signal
            });

            if (res.headers.get('X-Using-Main-Key') === 'true') {
                showToast("⚠️ Warning: Using Main Account Quota!");
            }

            if (!res.ok) throw new Error((await res.json()).error);
            if (!res.body) throw new Error("No response body");

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let fullText = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;

                setSessions((prev: any) => prev.map((s: any) => s.id === currentSessionId ? {
                    ...s, messages: [...msgs, { role: "assistant", content: fullText, modelName: modelToUse, characterId: activeCharacterId, ...assistantMeta }]
                } : s));
            }

            
            if (currentSession.memoryMode === "chat") {
                // Character Chat sends plain text without story/game/IDE commands.
                setSessions((prev: any) => prev.map((s: any) => s.id === currentSessionId ? {
                    ...s,
                    messages: [...msgs, { role: "assistant", content: fullText, modelName: modelToUse, characterId: activeCharacterId, ...assistantMeta }],
                    updatedAt: Date.now(),
                } : s));

                if (fullText.trim()) requestAutomaticTitle(msgs, fullText, modelToUse, generationId);
                // The active provider summarizes Chat memories without changing Local JSON format.
                // Run this after the visible response so memory work does not block the conversation.
                if (fullText.trim()) {
                    void (async () => {
                        try {
                            const r = await fetch("/api/summarize", {
                                method: "POST", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    text: `User: ${txt}\n${customCharacters.find((c: any) => c.id === activeCharacterId)?.names?.[locale] || CHARACTERS.find(c => c.id === activeCharacterId)?.name || 'Character'}: ${fullText}`,
                                    mode: "micro", provider: apiProvider, model: modelToUse, uiLanguage: locale,
                                }),
                            });
                            if (!r.ok) return;
                            const result = await r.json();
                            if (typeof result?.summary !== "string" || !result.summary.trim()) return;
                            const summaryLine = `• ${result.summary.trim()}`;
                            const originalStm = String(currentSession.stm || "");
                            const originalLtm = String(currentSession.ltm || "");
                            const batch = [...parseLocalMemoryEntries(originalStm), summaryLine];
                            let archive = "";
                            if (batch.length >= LOCAL_STM_SLOTS) {
                                const merged = await fetch("/api/summarize", {
                                    method: "POST", headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        text: formatLocalMemoryEntries(batch), previousLtm: originalLtm,
                                        mode: "macro", provider: apiProvider, model: modelToUse, uiLanguage: locale,
                                    }),
                                });
                                if (merged.ok) {
                                    const mergedData = await merged.json();
                                    archive = typeof mergedData?.summary === "string" ? mergedData.summary.trim() : "";
                                }
                            }
                            setSessions((prev: any) => prev.map((session: any) => {
                                if (session.id !== currentSessionId || session.memoryMode !== 'chat') return session;
                                // Never overwrite STM that was edited or updated while summarizing.
                                if (String(session.stm || "") !== originalStm || String(session.ltm || "") !== originalLtm) {
                                    const entries = [...parseLocalMemoryEntries(session.stm), summaryLine];
                                    return { ...session, stm: formatLocalMemoryEntries(entries), turnCount: entries.length, updatedAt: Date.now() };
                                }
                                if (archive) {
                                    // The macro endpoint already returns the merged LTM, not a delta.
                                    return { ...session, stm: "", ltm: archive, turnCount: 0, updatedAt: Date.now() };
                                }
                                return { ...session, stm: formatLocalMemoryEntries(batch), turnCount: batch.length, updatedAt: Date.now() };
                            }));
                        } catch (error) {
                            console.warn("Chat memory summary skipped:", error);
                        }
                    })();
                }
                return;
            }

            // DeepSeek and other compatible gateways occasionally finish after the
            // narrative but before the trailing structured state. Ask for ONE brief
            // state-only extraction; do not regenerate/overwrite the story prose.
            let storyProtocolMissing = false;
            const existingGameBlock = fullText.match(/<game_state>([\s\S]*?)<\/game_state>/i);
            let validGameJson = false;
            if (existingGameBlock) {
                try {
                    const value = normalizeStoryProtocol(JSON.parse(existingGameBlock[1]));
                    validGameJson = isUsableStoryProtocol(value);
                } catch { /* A broken trailing JSON block must not be accepted. */ }
            }
            if (currentSession.memoryMode === "sliding" && !validGameJson) {
                try {
                    const repairPrompt = [
                        "请仅根据下面已生成的故事正文恢复 <game_state> JSON，不要续写剧情。",
                        `此前自身状态: ${JSON.stringify(currentSession.protagonist || null).slice(0, 2400)}`,
                        `此前角色状态: ${JSON.stringify(currentSession.charStatus || []).slice(0, 4000)}`,
                        `世界线: ${JSON.stringify(currentSession.storyWorldline)}`,
                        `故事片段（末尾）:\n${fullText.slice(-10000)}`,
                    ].join("\n\n");
                    const repairResponse = await fetch("/api/chat", {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            stateRepair: true, memoryMode: "sliding", model: modelToUse,
                            provider: apiProvider, uiLanguage: locale,
                            debugRequestPayload: config.terminalRequestLog === true,
                            debugFullOutput: config.terminalLog === true,
                            storyRole, storyPovId: currentSession.storyPovId,
                            storyNextCastIds: currentSession.storyNextCastIds ?? currentSession.sceneCastIds ?? [],
                            storyAllowCrossWorld: currentSession.storyAllowCrossWorld === true,
                            storyCastWorlds: storyWorlds.map((world: any) => ({ id: world.id, name: world.name, description: world.description, canonTimeline: world.canonTimeline })),
                            storySelf: selectedSelf ? asChartaSelfPromptData(selectedSelf) : null,
                            storyWorldline: currentSession.storyWorldline,
                            customCharacters: customCharacters.map(asChartaPromptData),
                            messages: [{ role: "user", content: repairPrompt }],
                        }),
                        signal: abortControllerRef.current?.signal,
                    });
                    if (!repairResponse.ok || !repairResponse.body) throw new Error("State repair unavailable");
                    const repairReader = repairResponse.body.getReader();
                    const repairDecoder = new TextDecoder();
                    let repairText = "";
                    while (repairText.length < 25000) {
                        const { value, done } = await repairReader.read();
                        if (done) break;
                        repairText += repairDecoder.decode(value, { stream: true });
                    }
                    repairText += repairDecoder.decode();
                    const match = repairText.match(/<game_state>([\s\S]*?)<\/game_state>/i);
                    if (!match) throw new Error("State repair returned no game_state");
                    const recovered = normalizeStoryProtocol(JSON.parse(match[1]));
                    if (!isUsableStoryProtocol(recovered)) {
                        throw new Error("State repair returned incomplete fields: " + storyProtocolIssues(recovered).join("; "));
                    }
                    // Replace malformed completed blocks so the first-match parser sees the repaired state.
                    const openTagIndex = fullText.toLowerCase().lastIndexOf("<game_state>");
                    const preservedProse = existingGameBlock ? fullText.replace(existingGameBlock[0], "").trimEnd()
                        : openTagIndex >= 0 ? fullText.slice(0, openTagIndex).trimEnd() : fullText;
                    fullText = `${preservedProse}\n\n<game_state>${JSON.stringify(recovered)}</game_state>`;
                } catch (error) {
                    console.warn("Story state recovery skipped:", error);
                }
                const finalGameBlock = fullText.match(/<game_state>([\s\S]*?)<\/game_state>/i);
                try {
                    const state = finalGameBlock ? normalizeStoryProtocol(JSON.parse(finalGameBlock[1])) : null;
                    storyProtocolMissing = !isUsableStoryProtocol(state);
                } catch { storyProtocolMissing = true; }
                if (storyProtocolMissing) showToast("本轮故事没有返回完整状态；已保留正文和上一轮状态，建议重试本轮。");
            }
            // Some providers occasionally omit or truncate the trailing novel_state.
            // Recover only the state, never regenerate and replace the chapter itself.
            if (currentSession.memoryMode === "novel" && !extractNovelState(fullText)) {
                try {
                    const worldline = parseStoryWorldline(currentSession.storyWorldline);
                    const knownCast = [...CHARACTERS, ...customCharacters].filter((character: any) =>
                        worldline && storyCastAllowed(character, worldline))
                        .map((character: any) => ({ id: character.id, name: character.name || character.names?.[locale] || character.names?.[character.primaryLanguage] }));
                    const earlier = currentSession.novelState || {
                        environment: configOverride?.novelConfig?.environment || "",
                        event: configOverride?.novelConfig?.event || "",
                        nextSceneCastIds: currentSession.storyNextCastIds || [],
                    };
                    const repairPrompt = [
                        "请仅恢复以下已生成小说章节末尾的 <novel_state> JSON，禁止续写正文。",
                        `既有 Environment/Event: ${JSON.stringify(earlier).slice(0, 5000)}`,
                        `允许角色 ID 与姓名: ${JSON.stringify(knownCast).slice(0, 7000)}`,
                        `已生成的小说章节: ${stripNovelState(fullText).slice(-16000)}`,
                    ].join("\n\n");
                    const response = await fetch("/api/chat", {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            novelStateRepair: true, memoryMode: "novel", model: modelToUse,
                            provider: apiProvider, uiLanguage: locale,
                            storyWorldline: currentSession.storyWorldline,
                            debugRequestPayload: config.terminalRequestLog === true,
                            debugFullOutput: config.terminalLog === true,
                            messages: [{ role: "user", content: repairPrompt }],
                        }), signal: abortControllerRef.current?.signal,
                    });
                    if (!response.ok || !response.body) throw new Error("novel_state recovery unavailable");
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let text = "";
                    while (text.length < 16000) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        text += decoder.decode(value, { stream: true });
                    }
                    text += decoder.decode();
                    const recovered = extractNovelState(text);
                    if (!recovered) throw new Error("novel_state recovery returned invalid JSON");
                    fullText = stripNovelState(fullText) + "\n\n<novel_state>" + JSON.stringify(recovered) + "</novel_state>";
                } catch (error) {
                    console.warn("Novel state recovery skipped:", error);
                }
            }
            let currentText = fullText;
            let novelState = currentSession.memoryMode === "novel" ? extractNovelState(fullText) : null;
            if (currentSession.memoryMode === "novel") {
                // A malformed or missing chapter state must never erase the last good state.
                if (!novelState) {
                    showToast("本章没有返回完整的 novel_state：正文已保留，环境、事件和下章阵容未更新。");
                } else {
                    const worldline = parseStoryWorldline(currentSession.storyWorldline);
                    const allowed = new Set([...CHARACTERS, ...customCharacters].filter((char: any) =>
                        worldline && storyCastAllowed(char, worldline)
                    ).map((char: any) => char.id as string));
                    novelState = {
                        ...novelState,
                        nextSceneCastIds: selectStoryCastIds(novelState.nextSceneCastIds, allowed),
                    };
                }
                currentText = stripNovelState(currentText);
            }
            let capturedState: any = null;
            let newFiles: Record<string, any> = {};

            const drawCmd = parseDrawTag(currentText);
            
            if (false && drawCmd && drawCmd.trigger && config.imageGen) { // Legacy auto-render path disabled; requests require user confirmation.
                const targetDrawTag = `<draw>${currentText.match(/<draw>([\s\S]*?)<\/draw>/)?.[1] || ""}</draw>`;

                (async () => {
                    try {
                        setIsGlobalGenerating(true);
                        
                        const subjectId = drawCmd.charId || activeCharacterId;
                        const subjectName = customCharacters.find((c: any) => c.id === subjectId)?.names?.[locale]
                            || CHARACTERS.find(c => c.id === subjectId)?.name || subjectId;
                        const rawStatus = currentSession?.charStatus;
                        const subjectStatus = Array.isArray(rawStatus)
                            ? rawStatus.find((s: any) => s?.name === subjectName) || rawStatus[0]
                            : rawStatus;
                        const appearance = [subjectStatus?.clothing, subjectStatus?.bodyState, subjectStatus?.innerState]
                            .filter((item: unknown) => typeof item === 'string').join('; ').slice(0, 600);
                        const scenePrompt = [drawCmd.description, `character: ${subjectName}`,
                            `outfit: ${drawCmd.outfitId || manualOutfitId || 'default'}`,
                            appearance ? `current state: ${appearance}` : ''].filter(Boolean).join(', ');
                        const drawPayload = {
                            outfitId: drawCmd.outfitId || manualOutfitId || "casual", 
                            charId: drawCmd.charId || activeCharacterId,
                            description: scenePrompt,
                            provider: config.imageSettings?.provider || 'comfyui',
                            model: config.imageSettings?.model || '',
                            positive: config.imageSettings?.positive || '',
                            negative: config.imageSettings?.negative || '',
                            width: config.imageSettings?.width,
                            height: config.imageSettings?.height,
                            steps: config.imageSettings?.steps,
                            cfg: config.imageSettings?.cfg
                        };

                        const configRes = await fetch("/api/draw", {
                            method: "POST", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(drawPayload)
                        });
                        
                        const drawData = await configRes.json();
                        
                        if (drawData.success && drawData.image) {
                            const url = await uploadImageToCloud(drawData.image, drawData.meta);
                            
                            if (url) {
                                setSessions((prev: any) => prev.map((s: any) => {
                                    if (s.id !== currentSessionId) return s;
                                    
                                    const newMessages = s.messages.map((m: any) => {
                                        if (typeof m.content === 'string' && m.content.includes(targetDrawTag)) {
                                            const logTag = targetDrawTag.replace('<draw>', '<draw_log>').replace('</draw>', '</draw_log>');
                                            
                                            const newContent = m.content.replace(
                                                targetDrawTag, 
                                                `${logTag}\n\n![Generated](${url})\n`
                                            );
                                            return { ...m, content: newContent };
                                        }
                                        return m;
                                    });

                                    return { ...s, messages: newMessages };
                                }));
                                showToast("🎨 Render Complete");
                            }
                        } else {
                            showToast(`❌ Render Failed: ${drawData.error || 'Unknown image error'}`);
                        }
                    } catch (e) { 
                        console.error("Auto-Draw Failed:", e); 
                        showToast("❌ Render Failed");
                    } finally { 
                        setIsGlobalGenerating(false); 
                    }
                })();
            }

            const audioRegex = /<audio>(.*?)<\/audio>/;
            const audioMatch = currentText.match(audioRegex);
            if (audioMatch) {
                try {
                    const audioData = JSON.parse(audioMatch[1]);
                    if (setTrackId && (audioData.name || audioData.trackId))
                        setTrackId(audioData.name || audioData.trackId, audioData.artist);
                    currentText = currentText.replace(audioRegex, "");
                } catch(e) { console.error("Audio Parse Error", e); }
            }

            const gameRegex = /<game_state>([\s\S]*?)<\/game_state>/i;
            const gameMatch = currentText.match(gameRegex);
            if (currentSession.memoryMode === "novel") {
                // Novel owns <novel_state>; a stray Story protocol must not mutate
                // novel character/status fields or leak into the reading view.
                currentText = currentText.replace(gameRegex, "").trim();
            }
            if (gameMatch && currentSession.memoryMode === "sliding") {
                try {
                    const parsed = normalizeStoryProtocol(JSON.parse(gameMatch[1]));
                    currentText = currentText.replace(gameRegex, "").trim();
                    if (currentSession.memoryMode === "sliding" && !isUsableStoryProtocol(parsed)) {
                        throw new Error("Incomplete game_state JSON: " + storyProtocolIssues(parsed).join("; "));
                    }
                    capturedState = parsed;

                    if (currentSession.memoryMode === "sliding") {
                        const worldline = parseStoryWorldline(currentSession.storyWorldline);
                        const catalog = [...CHARACTERS, ...customCharacters.map((c: any) => ({ id: c.id, name: c.names?.[locale] || c.names?.[c.primaryLanguage] || c.id, worldId: c.worldId }))]
                            .filter(char => worldline && storyCastAllowed(char, worldline));
                        const knownCast = new Set(catalog.map(c => c.id));
                        capturedState.nextSceneCastIds = selectStoryCastIds(
                            Array.isArray(capturedState.nextSceneCastIds) ? capturedState.nextSceneCastIds : capturedState.sceneCastIds,
                            knownCast,
                        );
                        const rawIds = Array.isArray(capturedState.sceneCastIds)
                            ? capturedState.sceneCastIds.filter((id: unknown) => typeof id === "string" && knownCast.has(id as string)) : [];
                        const normalizedProse = currentText.replace(/\s+/g, "");
                        const namedInProse = catalog.filter((c: any) => {
                            const alternatives = [c.name, ...Object.values(customCharacters.find((item: any) => item.id === c.id)?.names || {})];
                            return alternatives.some((name: unknown) => typeof name === "string" && name.trim().length >= 2
                                && normalizedProse.includes(name.replace(/\s+/g, "")));
                        }).map(c => c.id);
                        const legacyIds = (Array.isArray(capturedState.character) ? capturedState.character : []).flatMap((s: any) => {
                            const match = catalog.find(c => c.name === s?.name);
                            return match ? [match.id] : [];
                        });
                        // Prefer an explicit on-stage list; for older models, fall back
                        // to names actually mentioned in the visible story.
                        capturedState.sceneCastIds = [...new Set(rawIds.length ? rawIds : namedInProse.length ? namedInProse : legacyIds)];
                        if (storyRole === "observer" && !currentSession.storyPovId) {
                            // No player-character status exists until a POV is selected.
                            capturedState.protagonist = undefined;
                            capturedState.character = undefined;
                        } else {
                            const chosenPov = catalog.find(c => c.id === currentSession.storyPovId);
                            if (storyRole === "participant" && selectedSelf) {
                                capturedState.protagonist = completeStoryProtagonist({
                                    raw: capturedState.protagonist, previous: currentSession.protagonist,
                                    name: selfName(selectedSelf, locale),
                                    environment: capturedState.environment,
                                    era: currentSession.storyWorldline?.era, period: currentSession.storyWorldline?.period,
                                });
                            } else if (chosenPov) {
                                const povStats = (Array.isArray(capturedState.character) ? capturedState.character : [])
                                    .find((item: any) => item?.name === chosenPov.name);
                                capturedState.protagonist = completeStoryProtagonist({
                                    raw: capturedState.protagonist, previous: currentSession.protagonist,
                                    currentCharacter: povStats, name: chosenPov.name,
                                    environment: capturedState.environment,
                                    era: currentSession.storyWorldline?.era, period: currentSession.storyWorldline?.period,
                                });
                            }
                            const oldStats = Array.isArray(currentSession.charStatus) ? currentSession.charStatus : currentSession.charStatus ? [currentSession.charStatus] : [];
                            const newStats = Array.isArray(capturedState.character) ? capturedState.character : capturedState.character ? [capturedState.character] : [];
                            // A model may echo the participant self (or observer POV) in character[].
                            // Match both IDs and all localized self names before applying relationship scores.
                            const ownerIdentities = storyRole === "participant" && selectedSelf
                                ? [selectedSelf.id, ...Object.values(selectedSelf.names || {})]
                                : chosenPov ? [chosenPov.id, chosenPov.name] : [];
                            const normalizedIdentity = (value: unknown) => typeof value === "string"
                                ? value.replace(/\s+/g, "").toLocaleLowerCase() : "";
                            const excluded = new Set(ownerIdentities.map(normalizedIdentity).filter(Boolean));
                            const knownNames = new Set([
                                ...catalog.map(char => char.name),
                                ...customCharacters.filter((char: any) => knownCast.has(char.id))
                                    .flatMap((char: any) => Object.values(char.names || {})),
                            ].map(normalizedIdentity).filter(Boolean));
                            capturedState.character = newStats.filter((stats: any) =>
                                stats && typeof stats === "object" &&
                                (knownCast.has(stats.id) || knownNames.has(normalizedIdentity(stats.name))) &&
                                !excluded.has(normalizedIdentity(stats.id)) &&
                                !excluded.has(normalizedIdentity(stats.name)))
                                .map((stats: any) => {
                                    const prev = oldStats.find((item: any) => item.name === stats.name);
                                    const previousMetrics = {
                                         affection: Number(prev?.affection) || 0,
                                         Possessiveness: Number(prev?.Possessiveness) || 0,
                                         Obsession: Number(prev?.Obsession) || 0,
                                         Intimacy: Number(prev?.Intimacy) || 0,
                                     };
                                     // Missing score fields mean "unchanged", not 0.
                                     // A state-only extraction may supply favorability and trust,
                                     // but only favorability has a defined mapping to affection.
                                     const suggestedMetrics = Object.fromEntries(
                                         (["affection", "Possessiveness", "Obsession", "Intimacy"] as const)
                                             .map(key => [key, typeof stats[key] === "number" && Number.isFinite(stats[key])
                                                 ? stats[key] : previousMetrics[key]]),
                                     ) as typeof previousMetrics;
                                     const damped = calculateNewStats(previousMetrics, suggestedMetrics);
                                    const updated = { ...prev, ...stats,
                                        affection: damped.affection, Possessiveness: damped.Possessiveness,
                                        Obsession: damped.Obsession, Intimacy: damped.Intimacy };
                                    // Static biography and retired renderer fields are not relationship state.
                                    for (const key of ["age", "gender", "environment", "timeDesc", "live2d", "effect"]) delete updated[key];
                                    return updated;
                                });
                        }
                    }

                    if (false && capturedState.imageGen?.trigger && config.imageGen) { // No automatic rendering from legacy game_state.
                        setIsGlobalGenerating(true);
                        showToast("🎨 Visualizer: Rendering...");
                        
                        (async () => {
                            try {
                                const drawPayload = {
                                    charId: capturedState.imageGen.charId || activeCharacterId,
                                    outfitId: capturedState.imageGen.outfitId || manualOutfitId || "casual",
                                    
                                    description: (capturedState.imageGen.emotion || "") + ", " + (capturedState.imageGen.description || ""),
                                    
                                    negativePrompt: capturedState.imageGen.negativePrompt, 
                                    ...capturedState.imageGen.parameters 
                                };

                                const configRes = await fetch("/api/draw", {
                                    method: "POST", headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify(drawPayload)
                                });
                                const drawData = await configRes.json();
                                
                                if (drawData.success && drawData.image) {
                                    const url = await uploadImageToCloud(drawData.image, drawData.meta);
                                    if (url) {
                                        setSessions((prev: any) => prev.map((s: any) => s.id === currentSessionId ? {
                                            ...s, messages: s.messages.map((m: any, i: number) => i === s.messages.length - 1 ? { ...m, content: currentText + `\n\n![Visual](${url})` } : m)
                                        } : s));
                                        showToast("🎨 Scene Captured");
                                    }
                                }
                            } catch (e) { console.error(e); }
                            finally { setIsGlobalGenerating(false); }
                        })();
                    }

                    if (capturedState.imageGen?.trigger && config.imageGen && !/<draw>[\s\S]*?<\/draw>/.test(currentText)) {
                        const image = capturedState.imageGen;
                        const instruction = {
                            charId: image.charId || activeCharacterId,
                            outfitId: image.outfitId || manualOutfitId || 'default',
                            description: [image.emotion, image.description].filter(Boolean).join(', '),
                        };
                        currentText += `

<draw>${JSON.stringify(instruction)}</draw>`;
                    }

                    if (capturedState.music?.trigger && (capturedState.music?.name || capturedState.music?.trackId) && setTrackId) {
                        setTimeout(() => setTrackId(capturedState.music.name || capturedState.music.trackId, capturedState.music.artist), 500);
                    }

                } catch (e) { console.error("Game State Error", e); }
            }


            const fileRegex = /<file name="(.*?)">([\s\S]*?)<\/file>/g;
            currentText = currentText.replace(fileRegex, (match, fileName, fileContent) => {
                const ext = fileName.split('.').pop()?.toLowerCase() || '';
                if (['txt', 'md', 'markdown', 'log'].includes(ext)) {
                    return `\n**[Document: ${fileName}]**\n\`\`\`${ext}\n${fileContent}\n\`\`\`\n`;
                }
                newFiles[fileName] = { name: fileName, language: ext || 'text', content: fileContent.trim() };
                return ""; 
            }).trim();


            setSessions((prev: any) => prev.map((s: any) => {
                if (s.id === currentSessionId) {
                    const oldRepo = s.codeRepository || {};
                    const updatedRepo = { ...oldRepo, ...newFiles };
                    
                    return {
                        ...s,
                        messages: [...msgs, { role: "assistant", content: currentText, modelName: modelToUse, characterId: activeCharacterId, ...assistantMeta, storyProtocolMissing }],
                        codeRepository: updatedRepo,
                        ...(s.memoryMode === "novel" && novelState ? {
                            novelState,
                            storyNextCastIds: novelState.nextSceneCastIds,
                            novelDraft: {
                                ...(s.novelDraft || {}),
                                environment: novelState.environment,
                                event: novelState.event,
                                selectedCharIds: novelState.nextSceneCastIds,
                            },
                        } : {}),
                        ...(capturedState ? {
                            protagonist: capturedState.protagonist,
                            charStatus: capturedState.character,
                            ...(s.memoryMode === "sliding" ? {
                                sceneCastIds: capturedState.sceneCastIds || [],
                                storyNextCastIds: capturedState.nextSceneCastIds || [],
                            } : {}),
                            plotSuggestions: capturedState.suggestions,
                            lastDanmaku: capturedState.danmaku,
                            timeline: capturedState.timeline,
                            ...(s.memoryMode === "sliding" && s.storyWorldline && typeof capturedState.timeline?.minor === "string" && capturedState.timeline.minor.trim()
                                ? { storyWorldline: { ...s.storyWorldline, event: capturedState.timeline.minor.trim().slice(0, 500) } }
                                : {}),
                            
                            // Background/Live2D state remains readable from legacy saves, but
                            // new story replies no longer supply those retired automation fields.
                            currentOutfitId: capturedState.imageGen?.outfitId || s.currentOutfitId 
                        } : {})
                    };
                }
                return s;
            }));

            if (currentText.trim()) requestAutomaticTitle(msgs, currentText, modelToUse, generationId);
            if ((currentSession.memoryMode === 'sliding' && !storyProtocolMissing) || currentSession.memoryMode === 'novel') {
                const textToSummarize = currentSession.memoryMode === 'novel' ? stripNovelSuggestions(currentText) : `User: ${txt}\nAI: ${currentText}\n`;
                const summarizeMode = currentSession.memoryMode === 'novel' ? 'novel_chapter' : 'micro';

                fetch("/api/summarize", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: textToSummarize, mode: summarizeMode, provider: apiProvider, model: modelToUse, uiLanguage: locale })
                })
                .then(res => res.json())
                .then(microData => {
                    if (microData.summary) {
                        const prefix = currentSession.memoryMode === 'novel' ? `[Chapter]: ` : `• `;
                        const summaryLine = `${prefix}${microData.summary}\n`;
                        
                        setSessions((prev: any) => prev.map((s: any) => {
                            if (s.id === currentSessionId && ((s.memoryMode !== "sliding" && s.memoryMode !== "novel") ||
                                s.messages.some((message: any) => message.storyGenerationId === generationId))) {
                                const newStm = (s.stm || "") + summaryLine;
                                const newCount = (s.turnCount || 0) + 1;
                                
                                if (newCount >= 7) {
                                    fetch("/api/summarize", {
                                        method: "POST", headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ text: newStm, previousLtm: s.ltm, mode: 'macro', provider: apiProvider, model: modelToUse, uiLanguage: locale })
                                    }).then(r => r.json()).then(macroData => {
                                        if (macroData.summary) {
                                            setSessions((inner: any) => inner.map((innerS: any) => innerS.id === currentSessionId && ((innerS.memoryMode !== "sliding" && innerS.memoryMode !== "novel") || innerS.messages.some((message: any) => message.storyGenerationId === generationId)) ? { ...innerS, ltm: macroData.summary, stm: "", turnCount: 0 } : innerS));
                                            showToast("✨ Memory Consolidated");
                                        }
                                    });
                                    return { ...s, stm: newStm, stmBackup: s.stm, turnCount: 0 };
                                }
                                return { ...s, stm: newStm, stmBackup: s.stm, turnCount: newCount };
                            }
                            return s;
                        }));
                    }
                });
            }

        } catch (e: any) {
            if (e.name !== 'AbortError') showToast(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    // A draw request is executed ONLY after a user click and explicit confirmation.
    const generateDraw = async (messageIndex: number): Promise<void> => {
        if (!config.imageGen) throw new Error('请先在设置中启用生图功能');
        if (isLoading || !currentSession) throw new Error('请等待当前回复完成');
        const message = currentSession.messages[messageIndex];
        if (!message || message.role !== 'assistant' || typeof message.content !== 'string') throw new Error('找不到待生成的插图');
        const match = message.content.match(/<draw>[\s\S]*?<\/draw>/);
        if (!match) throw new Error('该插图已经生成或已被移除');
        const payload = buildDrawRequest(message.content, {
            activeCharacterId: message.characterId || activeCharacterId,
            manualOutfitId,
            characters: [...CHARACTERS, ...customCharacters.map((c: any) => ({ id: c.id, name: c.names?.[locale] || c.name || c.id }))],
            charStatus: currentSession.charStatus,
            settings: config.imageSettings,
        });
        if (!payload) throw new Error('插图提示词无效');
        setIsGlobalGenerating(true);
        try {
            const response = await fetch('/api/draw', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!response.ok || !result.success || !result.image) throw new Error(result.error || `生图服务返回 HTTP ${response.status}`);
            const url = await uploadImageToCloud(result.image, result.meta);
            if (!url) throw new Error('图片已生成，但保存到本地画廊失败');
            const originalTag = match[0];
            const completedTag = originalTag.replace('<draw>', '<draw_log>').replace('</draw>', '</draw_log>');
            setSessions((prev: any) => prev.map((s: any) => s.id !== currentSessionId ? s : ({
                ...s,
                messages: s.messages.map((m: any, index: number) => index !== messageIndex ||
                  typeof m.content !== 'string' || !m.content.includes(originalTag) ? m : ({
                    ...m, content: m.content.replace(originalTag, `${completedTag}\n\n![Generated](${url})`),
                  })),
            })));
            showToast('🎨 插图已保存');
        } finally {
            setIsGlobalGenerating(false);
        }
    };

    // Regeneration and user edits must both restore the *whole* prior story state
    // BEFORE a new request is dispatched. Keep the restored state in the same
    // session update as the shortened/edited message history.
    const rewindStoryTurn = (messages: Session["messages"], snapshot?: Session["messages"][number]["storyStateBefore"]) => {
        setSessions((prev: Session[]) => prev.map(session => session.id === currentSessionId
            ? { ...restoreStoryState(session, snapshot), messages, updatedAt: Date.now() }
            : session));
        setPendingStoryRegeneration({ sessionId: currentSessionId, messagesLength: messages.length });
    };

    const rewindNovelTurn = (messages: Session["messages"], snapshot?: Session["messages"][number]["novelStateBefore"]) => {
        setSessions((prev: Session[]) => prev.map(session => session.id === currentSessionId
            ? { ...restoreNovelState(session, snapshot), messages, updatedAt: Date.now() }
            : session));
        setPendingStoryRegeneration({ sessionId: currentSessionId, messagesLength: messages.length });
    };

    // This effect runs only after the previous story state AND message history have committed.
    useEffect(() => {
        if (!pendingStoryRegeneration || isLoading || !currentSession ||
            pendingStoryRegeneration.sessionId !== currentSessionId ||
            currentSession.messages.length !== pendingStoryRegeneration.messagesLength) return;
        setPendingStoryRegeneration(null);
        if (currentSession.messages[currentSession.messages.length - 1]?.role !== "user") {
            showToast("没有找到可以重新生成的用户输入。"); return;
        }
        void handleSend(undefined, [...currentSession.messages]);
    }, [pendingStoryRegeneration, currentSession, currentSessionId, isLoading]);

    const handleRegenerate = (idx: number) => {
        if (!currentSession || isLoading) return;
        const target = currentSession.messages[idx];
        if (!target || target.role !== "assistant") return;
        if ((currentSession.memoryMode === "sliding" || currentSession.memoryMode === "novel") && idx !== currentSession.messages.length - 1) {
            showToast("请从最后一轮开始刷新，以便正确回退状态与记忆。"); return;
        }
        if (!window.confirm(currentSession.memoryMode === "sliding"
            ? "确认刷新这轮故事吗？将恢复本轮之前的自身状态、角色数值、剧情引导与记忆，然后重新生成。"
            : currentSession.memoryMode === "novel"
              ? "确认重写最后一章吗？将回退本章的环境、事件、下章阵容与记忆，保留世界线和 Style。"
              : "确认重新生成这条 AI 回复吗？当前回复会被替换。")) return;
        if (currentSession.memoryMode !== "sliding" && currentSession.memoryMode !== "novel") {
            void handleSend(undefined, currentSession.messages.slice(0, idx));
            return;
        }
        const keptMessages = currentSession.messages.slice(0, idx);
        if (keptMessages[keptMessages.length - 1]?.role !== "user") {
            showToast("没有找到可用于重新生成的最后一条用户消息。");
            return;
        }
        const snapshot = target.storyStateBefore || currentSession.messages[idx - 1]?.storyStateBefore;
        if (currentSession.memoryMode === "novel") {
            rewindNovelTurn(keptMessages, target.novelStateBefore || currentSession.messages[idx - 1]?.novelStateBefore);
        } else {
            rewindStoryTurn(keptMessages, snapshot);
        }
    };

    const handleEditMessage = (idx: number, revisedText: string) => {
        if (!currentSession || isLoading) return;
        const target = currentSession.messages[idx];
        if (!target || target.role !== "user" || !revisedText.trim()) {
            showToast("请输入要重新生成的用户消息。");
            return;
        }
        if (currentSession.memoryMode !== "sliding") {
            void handleSend(undefined, [...currentSession.messages.slice(0, idx), { ...target, content: revisedText }]);
            return;
        }
        const trailing = currentSession.messages.slice(idx + 1);
        if (trailing.length > 1 || (trailing.length === 1 && trailing[0].role !== "assistant")) {
            showToast("故事模式只能修改最后一轮的用户消息，以保证故事状态正确回退。");
            return;
        }
        const snapshot = target.storyStateBefore || trailing[0]?.storyStateBefore;
        const keptMessages = [...currentSession.messages.slice(0, idx), { ...target, content: revisedText }];
        rewindStoryTurn(keptMessages, snapshot);
    };

    const handleDeleteMessage = (idx: number, role: string) => {
        if (!currentSession || isLoading) return;
        const oldMessages = currentSession.messages as any[];
        const latestAssistant = role === "assistant" ? oldMessages[idx] : oldMessages[idx + 1]?.role === "assistant" ? oldMessages[idx + 1] : null;
        const lastTurn = idx === oldMessages.length - 1 || (role === "user" && idx === oldMessages.length - 2);
        if ((currentSession.memoryMode === "sliding" || currentSession.memoryMode === "novel") && !lastTurn) {
            showToast("故事／小说模式仅支持从最后一轮向前删除，以确保状态与记忆同步回退。");
            return;
        }
        if (!confirm(currentSession.memoryMode === "novel"
            ? "确定删除最新章节并回退环境、事件、下章阵容和记忆吗？世界线与 Style 会保留。"
            : "确定删除最后一条消息并回退故事状态与记忆吗？")) return;
        const newMsgs = [...oldMessages];
        if (role === "assistant") newMsgs.splice(idx, 1);
        else if (role === "user") newMsgs.splice(idx, newMsgs[idx + 1]?.role === "assistant" ? 2 : 1);
        setSessions((prev: any) => prev.map((s: any) => {
            if (s.id !== currentSessionId) return s;
            if (s.memoryMode === "novel") {
                const checkpoint = latestAssistant?.novelStateBefore || (role === "user" ? oldMessages[idx]?.novelStateBefore : undefined);
                // Old archives may lack checkpoints: clear the stale AI state rather than
                // snapshotting the state of a chapter that is being deleted.
                return { ...restoreNovelState(s, checkpoint), messages: newMsgs, updatedAt: Date.now() };
            }
            if (s.memoryMode !== "sliding") return { ...s, messages: newMsgs, updatedAt: Date.now() };
            // Prefer the saved pre-turn snapshot even when deleting the FIRST turn:
            // this restores the user's original cast selection, not the AI's forecast.
            const checkpoint = latestAssistant?.storyStateBefore || (role === "user" ? oldMessages[idx]?.storyStateBefore : undefined);
            const restored = checkpoint || newMsgs.some((m: any) => m.role === "user")
                ? restoreStoryState(s, checkpoint)
                : emptyStoryState(s);
            return { ...restored, messages: newMsgs, updatedAt: Date.now() };
        }));
    };

    const handleRepoUpdate = (newRepo: any) => {
        setSessions((prev: any) => prev.map((s: any) => s.id === currentSessionId ? { ...s, codeRepository: newRepo } : s));
    };

    return {
        input, setInput,
        isLoading,
        selectedFile, setSelectedFile,
        handleSend,
        stopGeneration,
        handleRegenerate,
        handleEditMessage,
        handleDeleteMessage,
        handleRepoUpdate,
        generateDraw
    };
};