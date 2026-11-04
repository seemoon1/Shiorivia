"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, ChevronUp, ChevronDown, MoreHorizontal, Edit2, CornerDownRight, Folder, Trash2,
  BookMarked, BookOpen, MessageCircle, Code2
} from "lucide-react";

export const ThinkingBlock = ({ thought }: { thought: string }) => {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="w-full mb-2">
      <div onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 bg-gray-100/80 hover:bg-gray-200/80 px-3 py-1.5 rounded-t-lg cursor-pointer transition-colors border border-gray-200 select-none">
        <Sparkles size={12} className="text-gray-400 animate-pulse" /><span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Thought Process</span>
        <div className="flex-1"></div>{isOpen ? <ChevronUp size={12} className="text-gray-400" /> : <ChevronDown size={12} className="text-gray-400" />}
      </div>
      <AnimatePresence>
        {isOpen && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-gray-50/50 border border-t-0 rounded-b-lg p-3 text-xs font-mono text-gray-500 whitespace-pre-wrap">{thought}</motion.div>}
      </AnimatePresence>
    </div>
  );
};

export const SessionItem = ({ session, isActive, isEditing, tempTitle, showMenu, folders, onSelect, onEditStart, onEditSave, onDelete, onMenuToggle, onMoveTo, setTempTitle, props }: any) => (
  <div className={`relative group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors ${isActive ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'}`} onClick={onSelect}>
    {session.memoryMode === 'novel' ? <BookMarked size={15} className="shrink-0 text-[#b49760]" /> :
      session.memoryMode === 'sliding' ? <BookOpen size={15} className="shrink-0 text-[#c07c98]" /> :
      session.memoryMode === 'infinite' ? <Code2 size={15} className="shrink-0 text-[#607d9b]" /> :
      <MessageCircle size={15} className="shrink-0 text-[#70987f]" />}
    {isEditing ? (
      <input autoFocus className="flex-1 bg-white border border-emerald-300 rounded px-1 py-0.5 outline-none min-w-0" value={tempTitle} onChange={e => setTempTitle(e.target.value)} onBlur={onEditSave} onKeyDown={e => e.key === 'Enter' && onEditSave()} onClick={e => e.stopPropagation()} />
    ) : <span className="flex-1 truncate">{session.title}</span>}
    {!isEditing && (
      <div className="relative">
        <button onClick={onMenuToggle} className={`p-1 rounded hover:bg-gray-200 ${showMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}><MoreHorizontal size={12} /></button>
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden py-1">
            <button onClick={(e) => { e.stopPropagation(); onEditStart(); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"><Edit2 size={12} /> 重命名</button>
            <div className="border-t border-gray-100 my-1"></div>
            <button onClick={(e) => { e.stopPropagation(); onMoveTo(null); }} className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2"><CornerDownRight size={12} /> 最外层</button>
            {folders.map((f: any) => <button key={f.id} onClick={(e) => { e.stopPropagation(); onMoveTo(f.id); }} className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2 truncate"><Folder size={12} /> {f.name}</button>)}
            <div className="border-t border-gray-100 my-1"></div>
            <button onClick={onDelete} className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-500 flex items-center gap-2"><Trash2 size={12} /> 删除</button>
          </div>
        )}
      </div>
    )}
  </div>
);