import { useState, useRef, useEffect } from "react";
import { CHARACTERS, Session } from "../types";
import { formatLocalMemoryEntries, parseLocalMemoryEntries, LOCAL_STM_SLOTS } from "../lib/localMemory";
import { calculateNewStats } from "../lib/emotionalEngine";
import { uploadImageToCloud } from "../lib/cloudUtils";
import { buildDrawRequest } from "../lib/drawRequest";
import { parseDrawTag, cleanDrawTag } from "../lib/parseDraw"; 
import { useLanguage } from "../context/LanguageContext";
import { asChartaPromptData } from "../lib/charta";

export const useChatEngine = ({
    currentSession, currentSessionId, setSessions,
    activeCharacterId, voiceVariant,
    globalWorldInfo,
    config, 
    setTrackId, showToast, setIsGlobalGenerating,
    manualOutfitId,
    apiProvider, customCharacters = []
}: any) => {
    
    const { locale } = useLanguage();
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<{ url: string, type: 'image' | 'video' | 'text', name: string } | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const stopGeneration = () => { 
        if (abortControllerRef.current) { 
            abortControllerRef.current.abort(); 
            setIsLoading(false); 
        } 
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

        const isRegen = overrideMessages !== undefined;
        const txt = overrideInput !== undefined ? overrideInput : input.trim();
        if (!isRegen && !txt && !selectedFile) return;

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
            msgs.push({ role: "user", content, characterId: activeCharacterId });
        }

        setSessions((prev: any) => prev.map((s: any) => s.id === currentSessionId ? {
            ...s,
            messages: [...msgs, { role: "assistant", content: "", modelName: modelToUse, characterId: activeCharacterId }],
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
                    novelConfig: configOverride?.novelConfig, 
                    useWebSearch: config.webSearch,
                    useMusicControl: configOverride?.useMusicControl ?? config.musicControl,
                    useImageGen: config.imageGen,
                    charStatus: currentSession.charStatus,
                    codeRepository: currentSession.codeRepository,
                    provider: apiProvider, 
                    uiLanguage: locale,
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
                    ...s, messages: [...msgs, { role: "assistant", content: fullText, modelName: modelToUse, characterId: activeCharacterId }]
                } : s));
            }

            
            if (currentSession.memoryMode === "chat") {
                // Character Chat sends plain text without story/game/IDE commands.
                setSessions((prev: any) => prev.map((s: any) => s.id === currentSessionId ? {
                    ...s,
                    messages: [...msgs, { role: "assistant", content: fullText, modelName: modelToUse, characterId: activeCharacterId }],
                    updatedAt: Date.now(),
                } : s));

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

            let currentText = fullText; 
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

            const gameRegex = /<game_state>([\s\S]*?)<\/game_state>/;
            const gameMatch = currentText.match(gameRegex);
            if (gameMatch) {
                try {
                    capturedState = JSON.parse(gameMatch[1]);
                    currentText = currentText.replace(gameRegex, "").trim();

                    if (capturedState.character) {
                        const currentStatsRaw = Array.isArray(currentSession.charStatus) ? currentSession.charStatus[0] : currentSession.charStatus;
                        const currentStats = {
                            affection: currentStatsRaw?.affection || 0,
                            monopoly: currentStatsRaw?.monopoly || 0,
                            yandere: currentStatsRaw?.yandere || 0,
                            lust: currentStatsRaw?.lust || 0,
                            ...currentStatsRaw
                        };
                        const aiSuggestedRaw = Array.isArray(capturedState.character) ? capturedState.character[0] : capturedState.character;
                        const finalStats = calculateNewStats(currentStats, aiSuggestedRaw);
                        capturedState.character = [{ ...aiSuggestedRaw, ...finalStats }];
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
                        messages: [...msgs, { role: "assistant", content: currentText, modelName: modelToUse, characterId: activeCharacterId }],
                        codeRepository: updatedRepo,
                        ...(capturedState ? {
                            protagonist: capturedState.protagonist,
                            charStatus: capturedState.character,
                            plotSuggestions: capturedState.suggestions,
                            lastDanmaku: capturedState.danmaku,
                            timeline: capturedState.timeline,
                            
                            currentBackground: capturedState.environment?.bgId || s.currentBackground,
                            live2dCharId: capturedState.live2d?.charId || null,
                            currentEmotion: capturedState.live2d?.motion || "idle", 
                            
                            currentOutfitId: capturedState.imageGen?.outfitId || s.currentOutfitId 
                        } : {})
                    };
                }
                return s;
            }));

            if (currentSession.memoryMode === 'sliding' || currentSession.memoryMode === 'novel') {
                const textToSummarize = currentSession.memoryMode === 'novel' ? currentText : `User: ${txt}\nAI: ${currentText}\n`;
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
                            if (s.id === currentSessionId) {
                                const newStm = (s.stm || "") + summaryLine;
                                const newCount = (s.turnCount || 0) + 1;
                                
                                if (newCount >= 7) {
                                    fetch("/api/summarize", {
                                        method: "POST", headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ text: newStm, previousLtm: s.ltm, mode: 'macro', provider: apiProvider, model: modelToUse, uiLanguage: locale })
                                    }).then(r => r.json()).then(macroData => {
                                        if (macroData.summary) {
                                            setSessions((inner: any) => inner.map((innerS: any) => innerS.id === currentSessionId ? { ...innerS, ltm: macroData.summary, stm: "", turnCount: 0 } : innerS));
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

    const handleRegenerate = (idx: number) => {
        if (!currentSession) return;
        if (idx === currentSession.messages.length - 1) {
            setSessions((prev: any) => prev.map((s: any) => s.id === currentSessionId && s.stmBackup !== undefined ? { ...s, stm: s.stmBackup } : s));
            showToast("⏳ Timeline Reverted");
        }
        handleSend(undefined, currentSession.messages.slice(0, idx));
    };

    const handleDeleteMessage = (idx: number, role: string) => {
        if (!currentSession) return;
        if (!confirm("⚠️ Delete this message?")) return;
        
        let newMsgs = [...currentSession.messages];
        if (role === 'assistant') newMsgs.splice(idx, 1);
        else if (role === 'user') newMsgs.splice(idx, idx === newMsgs.length - 2 ? 2 : 1);
        
        setSessions((prev: any) => prev.map((s: any) => s.id === currentSessionId ? { ...s, messages: newMsgs } : s));
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
        handleDeleteMessage,
        handleRepoUpdate,
        generateDraw
    };
};