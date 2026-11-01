import { useState, useEffect, useRef, useCallback } from "react";
import { Session, ChatFolder } from "../types";

export const useLocalFileSync = (isGlobalGenerating: boolean, showToast: (msg: string) => void) => {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [folders, setFolders] = useState<ChatFolder[]>([]);
    const [globalWorldInfo, setGlobalWorldInfo] = useState("");
    const [bgImage, setBgImage] = useState<string | null>(null);
    
    const [status, setStatus] = useState<'idle'|'syncing'|'error'|'success'|'unsaved'>('idle');
    const [initLoaded, setInitLoaded] = useState(false);
    const [lastServerTime, setLastServerTime] = useState(0);

    const lastSavedMsgCount = useRef(0);
    const hasUnsavedChanges = useRef(false);

    const [conflictModal, setConflictModal] = useState<{
        isOpen: boolean; cloudData: any; localData: any; reason: 'conflict'|'mass_loss';
    }>({ isOpen: false, cloudData: null, localData: null, reason: 'conflict' });

    // String length is not a hash: equal-sized edits were silently skipped.
    const serialize = (d: unknown) => JSON.stringify(d);
    const lastSnapshot = useRef("");

    const countTotalMessages = (sess: Session[]) => sess.reduce((acc, s) => acc + (s.messages ? s.messages.length : 0), 0);

    const performSync = useCallback(async (mode: 'auto' | 'manual' | 'force_push' | 'force_pull') => {
        console.log(`[Sync] Triggered. Mode: ${mode}`); 

        if (isGlobalGenerating && mode === 'auto') {
            console.log(`[Sync] Skipped: Generating...`);
            return;
        }

        // A smaller message count is normal after deletions, regeneration or slot loads.
        // Severe losses are checked against the last saved snapshot below, not blocked forever.

        if (mode === 'manual') {
            if (!confirm("💾 确定要将当前状态写入硬盘吗？\n(覆盖存档)")) {
                console.log(`[Sync] User cancelled.`);
                return;
            }
        }

        setStatus('syncing');

        try {
            const localPayload = { sessions, folders, globalWorldInfo, bgImage };
            const currentSnapshot = serialize(localPayload);

            const res = await fetch("/api/local/sync", { cache: "no-store" });
            if (!res.ok) throw new Error(`Local sync read failed: ${res.status}`);
            const { data: serverData, lastModified } = await res.json();
            const serverSnapshot = serverData ? serialize(serverData) : "";

            if (mode === 'force_pull' || !initLoaded) {
                console.log(`[Sync] Force Pull Executing...`);
                if (serverData) {
                    setSessions(serverData.sessions || []);
                    setFolders(serverData.folders || []);
                    setGlobalWorldInfo(serverData.globalWorldInfo || "");
                    setBgImage(serverData.bgImage || null);
                    
                    setLastServerTime(lastModified);
                    lastSnapshot.current = serverSnapshot;
                    lastSavedMsgCount.current = countTotalMessages(serverData.sessions || []);
                    hasUnsavedChanges.current = false;
                }
                setInitLoaded(true);
                setStatus('idle');
                return;
            }

            if (mode !== 'force_push' && lastModified > lastServerTime && serverSnapshot !== lastSnapshot.current) {
                console.warn(`[Sync] Conflict Detected!`);
                if (mode === 'manual') {
                    setConflictModal({
                        isOpen: true,
                        cloudData: { ...serverData, _ts: lastModified },
                        localData: { ...localPayload, _ts: Date.now() },
                        reason: 'conflict'
                    });
                } else {
                    setStatus('error');
                }
                return;
            }

            const currentCount = countTotalMessages(sessions);
            const diskCount = countTotalMessages(serverData?.sessions || []);
            const missingMostMessages = diskCount >= 10 && currentCount < diskCount * 0.5;
            if (mode === 'auto' && missingMostMessages) {
                // A drastic shrink needs an explicit manual decision; never autosave over it.
                hasUnsavedChanges.current = true;
                setStatus('unsaved');
                return;
            }
            if (mode === 'manual' && missingMostMessages) {
                    setConflictModal({
                        isOpen: true,
                        cloudData: { ...serverData, _ts: lastModified },
                        localData: { ...localPayload, _ts: Date.now() },
                        reason: 'mass_loss'
                    });
                    setStatus('unsaved');
                    return;
            }

            const hasChanges = currentSnapshot !== lastSnapshot.current;
            
            if (mode === 'manual' && !hasChanges) {
                console.log(`[Sync] Manual check - No changes.`);
                showToast("✅ Already synced");
                hasUnsavedChanges.current = false; 
                lastSavedMsgCount.current = countTotalMessages(sessions); 
                setStatus('idle');
                return; 
            }

            if (hasChanges || mode === 'force_push' || mode === 'manual') {
                console.log(`[Sync] Pushing to disk...`);
                const saveRes = await fetch("/api/local/sync", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ data: localPayload })
                });
                
                if (saveRes.ok) {
                    const json = await saveRes.json();
                    setLastServerTime(json.lastModified);
                    lastSnapshot.current = currentSnapshot;
                    lastSavedMsgCount.current = countTotalMessages(sessions);
                    hasUnsavedChanges.current = false;

                    setStatus('success');
                    if (mode === 'manual') showToast("💾 Saved to Disk");
                    setTimeout(() => setStatus('idle'), 2000);
                } else {
                    console.error(`[Sync] Save Failed: ${saveRes.status}`);
                    setStatus('error');
                }
            } else {
                setStatus('idle');
            }

        } catch (e) {
            console.error("[Sync] CRITICAL ERROR:", e);
            setStatus('error');
        }
    }, [sessions, folders, globalWorldInfo, bgImage, initLoaded, lastServerTime]);

    useEffect(() => {
        if (!initLoaded) return;
        hasUnsavedChanges.current = true;
        setStatus('unsaved');
        const timer = setTimeout(() => { performSync('auto'); }, 2000);
        return () => clearTimeout(timer);
    }, [sessions, folders, globalWorldInfo, bgImage]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges.current || status === 'syncing') {
                e.preventDefault(); e.returnValue = ''; return '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [status]);

    useEffect(() => { performSync('force_pull'); }, []);

    return {
        sessions, setSessions, folders, setFolders,
        globalWorldInfo, setGlobalWorldInfo, bgImage, setBgImage,
        status, conflictModal, setConflictModal, initLoaded,
        triggerSync: performSync
    };
};