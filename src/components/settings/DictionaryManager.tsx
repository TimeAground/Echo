import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../hooks/useSettings";
import { toast } from "sonner";

interface DictGroup {
  name: string;
  words: string[];
  enabled: boolean;
}

interface DictionaryManagerProps {
  onClose: () => void;
}

export const DictionaryManager: React.FC<DictionaryManagerProps> = ({
  onClose,
}) => {
  const { t } = useTranslation();
  const { getSetting, updateSetting } = useSettings();

  // Initialize groups from storage, migrating custom_words if needed
  const [groups, setGroups] = useState<DictGroup[]>(() => {
    const stored = (getSetting as any)("dictionary_groups");
    if (stored && Array.isArray(stored) && stored.length > 0) {
      return stored as DictGroup[];
    }
    // Migrate from flat custom_words
    const existingWords = (getSetting("custom_words") || []) as string[];
    return existingWords.length > 0
      ? [{ name: "通用", words: existingWords, enabled: true }]
      : [{ name: "通用", words: [], enabled: true }];
  });

  const [activeGroup, setActiveGroup] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [newWord, setNewWord] = useState("");
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeWords = groups[activeGroup]?.words || [];

  const filteredWords = useMemo(() => {
    if (!searchQuery.trim()) return activeWords;
    const q = searchQuery.toLowerCase();
    return activeWords.filter((w) => w.toLowerCase().includes(q));
  }, [activeWords, searchQuery]);

  // Save groups to settings + update custom_words
  const saveGroups = useCallback(
    (newGroups: DictGroup[]) => {
      setGroups(newGroups);
      // Save groups structure
      (updateSetting as any)("dictionary_groups", newGroups);
      // Flatten all enabled groups' words into custom_words for Rust backend
      const allWords = newGroups
        .filter((g) => g.enabled)
        .flatMap((g) => g.words);
      updateSetting("custom_words", allWords);
    },
    [updateSetting],
  );

  const addWord = useCallback(() => {
    const trimmed = newWord.trim().replace(/[<>"'&]/g, "");
    if (!trimmed) return;
    if (trimmed.length > 50) {
      toast.error("词汇长度不能超过50个字符");
      return;
    }
    if (activeWords.includes(trimmed)) {
      toast.error(`词汇「${trimmed}」已存在`);
      return;
    }
    const updated = groups.map((g, i) =>
      i === activeGroup ? { ...g, words: [...g.words, trimmed] } : g,
    );
    saveGroups(updated);
    setNewWord("");
  }, [newWord, activeGroup, groups, activeWords, saveGroups]);

  const removeWord = useCallback(
    (word: string) => {
      const updated = groups.map((g, i) =>
        i === activeGroup
          ? { ...g, words: g.words.filter((w) => w !== word) }
          : g,
      );
      saveGroups(updated);
    },
    [activeGroup, groups, saveGroups],
  );

  const addGroup = useCallback(() => {
    const name = newGroupName.trim();
    if (!name) return;
    if (groups.some((g) => g.name === name)) {
      toast.error(`分组「${name}」已存在`);
      return;
    }
    const updated = [...groups, { name, words: [], enabled: true }];
    saveGroups(updated);
    setActiveGroup(updated.length - 1);
    setNewGroupName("");
    setShowNewGroupInput(false);
  }, [newGroupName, groups, saveGroups]);

  const deleteGroup = useCallback(
    (index: number) => {
      if (groups.length <= 1) return; // Can't delete last group
      const updated = groups.filter((_, i) => i !== index);
      saveGroups(updated);
      if (activeGroup >= updated.length) {
        setActiveGroup(updated.length - 1);
      } else if (activeGroup >= index) {
        setActiveGroup(Math.max(0, activeGroup - 1));
      }
    },
    [groups, activeGroup, saveGroups],
  );

  const toggleGroupEnabled = useCallback(
    (index: number) => {
      const updated = groups.map((g, i) =>
        i === index ? { ...g, enabled: !g.enabled } : g,
      );
      saveGroups(updated);
    },
    [groups, saveGroups],
  );

  const handleImportFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const content = evt.target?.result as string;
        if (!content) return;

        const importedWords = content
          .split("\n")
          .map((w) => w.trim().replace(/[<>"'&]/g, ""))
          .filter((w) => w && w.length <= 50);

        if (importedWords.length === 0) {
          toast.error("文件中没有有效的词汇");
          return;
        }

        // Add to current group
        const updated = groups.map((g, i) => {
          if (i !== activeGroup) return g;
          const existing = new Set(g.words);
          const newOnes = importedWords.filter((w) => !existing.has(w));
          return { ...g, words: [...g.words, ...newOnes] };
        });
        saveGroups(updated);
        toast.success(`已导入 ${importedWords.length} 个词汇`);
      };
      reader.onerror = () => {
        toast.error("导入失败：无法读取文件");
      };
      reader.readAsText(file);

      // Reset input so same file can be imported again
      e.target.value = "";
    },
    [groups, activeGroup, saveGroups],
  );

  const handleImport = useCallback(() => {
    // Try Tauri dialog first, fall back to browser file input
    fileInputRef.current?.click();
  }, []);

  const handleExport = useCallback(async () => {
    const groupName = groups[activeGroup]?.name || "词汇";
    const text = activeWords.join("\n");

    try {
      // Try native save dialog
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      const path = await save({
        defaultPath: `${groupName}.txt`,
        filters: [{ name: "文本文件", extensions: ["txt"] }],
      });
      if (path) {
        await writeTextFile(path, text);
        toast.success(`已导出到 ${path}`);
      }
    } catch {
      // Fallback: download via blob
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${groupName}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`已导出「${groupName}」分组`);
    }
  }, [activeWords, groups, activeGroup]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addWord();
      }
    },
    [addWord],
  );

  const activeGroupName = groups[activeGroup]?.name || "";

  // Lock body scroll while modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {/* Hidden file input for browser-fallback import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt"
        onChange={handleImportFile}
        className="hidden"
      />

      <div className="w-[640px] max-h-[80vh] bg-[#12141f] border border-white/10 rounded-3xl shadow-[0_28px_80px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col">
        {/* Title bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/6 bg-white/[0.02]">
          <h2 className="text-[16px] font-semibold text-white/92">
            {t("settings.advanced.customWords.title")}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleImport}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] text-white/60 hover:text-white/85 hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              {t("common.import")}
            </button>
            <button
              onClick={handleExport}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] text-white/60 hover:text-white/85 hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              {t("common.export")}
            </button>
            <button
              onClick={onClose}
              className="rounded-xl border border-[#8a7dff]/22 bg-[#8a7dff]/12 px-3 py-2 text-[12px] text-[#c4bfff] hover:bg-[#8a7dff]/20 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Group tabs */}
        <div className="flex gap-2 px-6 py-3 border-b border-white/5 flex-wrap">
          {groups.map((group, i) => (
            <div key={i} className="relative group/tab">
              <button
                onClick={() => setActiveGroup(i)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] transition-colors cursor-pointer ${
                  i === activeGroup
                    ? "bg-[#8a7dff]/18 border border-[#8a7dff]/30 text-[#d0cbff]"
                    : "bg-white/[0.04] border border-white/6 text-white/55 hover:text-white/75 hover:bg-white/[0.07]"
                }`}
              >
                {group.name}
                <span className="text-[10px] opacity-50">
                  ({group.words.length})
                </span>
                {!group.enabled && (
                  <span className="text-[10px] text-white/30 ml-0.5">(已停用)</span>
                )}
              </button>
              {/* Group actions on hover */}
              <div className="absolute -top-1.5 -right-1.5 flex gap-0.5 opacity-0 group-hover/tab:opacity-100 transition-opacity">
                {i !== 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteGroup(i);
                    }}
                    className="w-4 h-4 rounded-full bg-red-500/70 text-white text-[9px] flex items-center justify-center hover:bg-red-500 cursor-pointer"
                    title="删除分组"
                  >
                    ✕
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGroupEnabled(i);
                  }}
                  className={`w-4 h-4 rounded-full text-white text-[9px] flex items-center justify-center cursor-pointer ${
                    group.enabled
                      ? "bg-green-500/70 hover:bg-green-500"
                      : "bg-gray-500/70 hover:bg-gray-500"
                  }`}
                  title={group.enabled ? "停用" : "启用"}
                >
                  {group.enabled ? "✓" : "○"}
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => setShowNewGroupInput(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-white/10 px-3 py-1.5 text-[13px] text-white/30 hover:text-white/50 transition-colors cursor-pointer"
          >
            + 新建
          </button>
        </div>

        {/* New group input */}
        {showNewGroupInput && (
          <div className="flex items-center gap-2 px-6 py-2 border-b border-white/5">
            <input
              autoFocus
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addGroup();
                if (e.key === "Escape") setShowNewGroupInput(false);
              }}
              placeholder="分组名称"
              className="flex-1 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2 text-[13px] text-white outline-none placeholder:text-white/20"
            />
            <button
              onClick={addGroup}
              className="rounded-xl bg-[#8a7dff]/20 px-3 py-2 text-[12px] text-[#c4bfff] hover:bg-[#8a7dff]/30 cursor-pointer"
            >
              确定
            </button>
            <button
              onClick={() => setShowNewGroupInput(false)}
              className="text-[12px] text-white/40 hover:text-white/60 cursor-pointer"
            >
              取消
            </button>
          </div>
        )}

        {/* Search */}
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-white/5">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索词汇…"
            className="flex-1 rounded-xl bg-white/[0.04] border border-white/8 px-3 py-2 text-[13px] text-white outline-none placeholder:text-white/20"
          />
        </div>

        {/* Word list */}
        <div className="flex-1 overflow-y-auto min-h-0 py-1">
          {filteredWords.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-white/20">
              {searchQuery ? "没有匹配的词汇" : "暂无词汇，添加一些吧"}
            </div>
          ) : (
            filteredWords.map((word) => (
              <div
                key={word}
                className="flex items-center justify-between px-6 py-2.5 hover:bg-white/[0.015] transition-colors group"
              >
                <span className="text-[14px] font-medium text-white/88">
                  {word}
                </span>
                <button
                  onClick={() => removeWord(word)}
                  className="opacity-0 group-hover:opacity-100 rounded-lg px-2 py-1 text-[13px] text-white/35 hover:text-[#ff6b6b] hover:bg-[rgba(255,80,80,0.1)] transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer: add word */}
        <div className="flex items-center gap-3 px-6 py-3.5 border-t border-white/5 bg-white/[0.015]">
          <input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入新词汇…"
            className="flex-1 rounded-xl bg-white/[0.04] border border-white/8 px-3.5 py-2.5 text-[13px] text-white outline-none placeholder:text-white/20 focus:border-[#8a7dff]/35 transition-colors"
          />
          <button
            onClick={addWord}
            disabled={!newWord.trim()}
            className="rounded-xl bg-gradient-to-r from-[#8a7dff]/85 to-[#5ea2ff]/70 px-4 py-2.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-30 disabled:cursor-default transition-all cursor-pointer whitespace-nowrap"
          >
            添加到 {activeGroupName}
          </button>
        </div>
      </div>
    </div>
  );
};
