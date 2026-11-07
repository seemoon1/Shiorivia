"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Download, Trash2, X, Camera, HardDrive, Loader2, Sparkles, Orbit } from "lucide-react";
import { toJpeg } from 'html-to-image';

export const SaveLoadModal = ({ isOpen, onClose, currentSession, onLoadSession }: any) => {
    const [slots, setSlots] = useState<Record<number, any>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);

    const fetchSlots = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/local/slots");
            const data = await res.json();
            
            const map: Record<number, any> = {};
            if (data.slots) {
                data.slots.forEach((meta: any) => {
                    map[meta.slotIndex] = meta;
                });
            }
            setSlots(map);
        } catch (e) {
            console.error("Fetch slots failed", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchSlots();
    }, [isOpen]);

    const captureScreen = async () => {
        setIsCapturing(true); 
        
        await new Promise(r => setTimeout(r, 800)); 

        try {
            const dataUrl = await toJpeg(document.body, {
                quality: 0.6,
                pixelRatio: 0.5,
                filter: (node) => {
                    if (node instanceof HTMLElement) {
                        const style = window.getComputedStyle(node);
                        if (style.position === 'fixed' && style.zIndex && parseInt(style.zIndex) > 100) {
                            return false; 
                        }
                    }
                    return true;
                }
            });
            return dataUrl;
        } catch (e) {
            console.error("Capture failed", e);
            return null; 
        } finally {
            setIsCapturing(false); 
        }
    };

    const handleSave = async (index: number) => {
        if (!currentSession) return;
        if (slots[index] && !confirm(`⚠️ 覆盖 Slot ${index + 1}？`)) return;

        const base64 = await captureScreen();
        setIsLoading(true);

        const lastMsg = currentSession.messages[currentSession.messages.length - 1];
        let preview = "New Memory";
        if (lastMsg) preview = typeof lastMsg.content === 'string' ? lastMsg.content.slice(0, 30) + "..." : "[Image]";

        try {
            const res = await fetch("/api/local/slots", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    slotIndex: index,
                    session: currentSession,
                    meta: {
                        slotIndex: index,
                        name: `Save ${index + 1}`,
                        previewText: preview,
                    },
                    thumbnailBase64: base64
                })
            });

            if (!res.ok) throw new Error("Save failed");
            await fetchSlots();
        } catch (e) {
            alert("Save failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoad = async (index: number) => {
        if (!confirm(`读取 Slot ${index + 1}？\n当前未保存的进度将丢失。`)) return;
        
        setIsLoading(true);
        try {
            const res = await fetch("/api/local/slots/read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slotIndex: index })
            });
            const data = await res.json();
            
            if (data.session) {
                onLoadSession(data.session);
                onClose();
            }
        } catch (e) {
            alert("Load failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (e: any, index: number) => {
        e.stopPropagation();
        if (!confirm("永久删除此存档？")) return;
        setIsLoading(true);
        await fetch("/api/local/slots", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slotIndex: index })
        });
        await fetchSlots();
        setIsLoading(false);
    };

    if (isCapturing) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] flex items-center justify-center bg-[#112521]/75 p-3 backdrop-blur-[9px] sm:p-6">
                    <motion.div initial={{ scale: 0.95, y: 14 }} animate={{ scale: 1, y: 0 }} className="flex h-[87dvh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-[#d9e4d6] bg-[#f7faf5] shadow-[0_35px_100px_rgba(7,35,27,.5)]">
                        
                        <div className="relative isolate flex shrink-0 items-center justify-between overflow-hidden border-b border-[#b8c6b8]/20 bg-[#1d3933] px-5 py-5 text-[#f3f6eb] sm:px-8 sm:py-6">
                            <div aria-hidden className="pointer-events-none absolute -right-8 -top-24 h-64 w-64 rounded-full border border-[#cfb985]/30" />
                            <div aria-hidden className="pointer-events-none absolute right-4 top-0 h-32 w-32 rounded-full border border-[#cfb985]/20" />
                            <div className="relative flex items-center gap-4">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d9c397]/40 bg-[#e6ce9c]/10 text-[#e4c997]"><Orbit size={24} strokeWidth={1.3}/></div>
                                <div><div className="flex items-center gap-2 text-[10px] font-semibold tracking-[.25em] text-[#dbc998]"><Sparkles size={12}/> SHIORIVIA · STAR ARCHIVE</div><h2 className="mt-1 text-xl font-semibold tracking-[.14em]" style={{ fontFamily: 'Bahnschrift, "Arial Narrow", sans-serif' }}>LOCAL STORAGE <span className="font-normal text-[#b9cab8]">/ 星路存档</span></h2><p className="mt-1 text-[11px] text-[#b7c8bb]">将旅途中的瞬间，珍藏为可以再次抵达的星光。</p></div>
                            </div>
                            <button type="button" onClick={onClose} aria-label="关闭存档管理" className="relative rounded-full border border-white/20 p-2 text-[#cfdbcf] hover:bg-white/10"><X size={20}/></button>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_15%_0%,#e6efe5_0%,transparent_53%),radial-gradient(ellipse_at_95%_95%,#f3efdf_0%,transparent_50%)] p-4 sm:p-7">
                            <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-[#dbe4d8] pb-3"><span className="text-[11px] font-bold tracking-[.17em] text-[#68806d]">ARCHIVED TIMELINES · 12 SLOTS</span><span className="text-[11px] text-[#8c9e8e]">{Object.keys(slots).length} / 12 已收藏 {isLoading && <Loader2 size={12} className="ml-1 inline animate-spin"/>}</span></div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
                                {Array.from({ length: 12 }).map((_, i) => {
                                    const slot = slots[i];
                                    return (
                                        <div key={i} className={`relative group flex aspect-[1.48] flex-col overflow-hidden rounded-2xl border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${slot ? 'border-[#c4d9c6] bg-white' : 'border-[#e0e8dc] bg-white/90 hover:border-[#a8c3aa]'}`}>
                                            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#e9f0e8]">
                                                {slot?.thumbnail ? (
                                                    <img src={slot.thumbnail} alt={`存档 ${i+1} 缩略图`} className="h-full w-full object-cover opacity-85 transition-opacity duration-500 group-hover:opacity-100"/>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2 text-[#adbea9]"><Sparkles size={24} strokeWidth={1}/><span className="text-3xl font-light tracking-[.2em]">{String(i+1).padStart(2, "0")}</span><span className="text-[10px] tracking-[.16em]">EMPTY / 尚未存档</span></div>
                                                )}
                                                
                                                <div className="absolute inset-0 flex items-center justify-center gap-4 bg-[#142b27]/75 opacity-100 backdrop-blur-[2px] transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                                                    <button type="button" disabled={isLoading || !currentSession} onClick={(e)=>{e.stopPropagation(); void handleSave(i)}} aria-label={`保存到槽位 ${i+1}`} className="flex flex-col items-center gap-1 rounded-lg p-2 text-[#eff8e9] hover:bg-white/10 hover:text-[#e0c896] disabled:opacity-40"><Save size={22}/><span className="text-[10px] font-bold tracking-wider">保存</span></button>
                                                    {slot && <button type="button" disabled={isLoading} onClick={(e)=>{e.stopPropagation(); void handleLoad(i)}} aria-label={`读取槽位 ${i+1}`} className="flex flex-col items-center gap-1 rounded-lg p-2 text-[#eff8e9] hover:bg-white/10 hover:text-[#c1dcca] disabled:opacity-40"><Download size={22}/><span className="text-[10px] font-bold tracking-wider">读取</span></button>}
                                                    {slot && <button type="button" disabled={isLoading} onClick={(e)=>{e.stopPropagation(); void handleDelete(e, i)}} aria-label={`删除槽位 ${i+1}`} className="flex flex-col items-center gap-1 rounded-lg p-2 text-[#eff8e9] hover:bg-white/10 hover:text-[#f0b4ae] disabled:opacity-40"><Trash2 size={22}/><span className="text-[10px] font-bold tracking-wider">删除</span></button>}
                                                </div>
                                            </div>

                                            <div className="flex h-[58px] flex-col justify-center border-t border-[#e0e8df] bg-[#fafcf8] px-4">
                                                <div className="flex justify-between items-center">
                                                    <span className={`text-[11px] font-bold tracking-[.16em] ${slot ? 'text-[#406b50]' : 'text-[#a7b4a7]'}`}>SLOT {String(i+1).padStart(2, "0")}</span>
                                                    {slot && <span className="text-[10px] text-[#8b9a88]">{new Date(slot.timestamp).toLocaleDateString()}</span>}
                                                </div>
                                                {slot && <div className="mt-1 truncate text-[10px] text-[#768d7c]">{slot.previewText}</div>}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};