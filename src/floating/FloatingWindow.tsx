import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import React, { useCallback, useEffect, useState } from "react";

type AiResultEvent = { text: string };

const FloatingWindow: React.FC = () => {
  const [text, setText] = useState<string>("");

  const close = useCallback(async () => {
    const win = getCurrentWebviewWindow();
    await win.hide();
  }, []);

  const copy = useCallback(async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  }, [text]);

  useEffect(() => {
    const unlistenResult = listen<AiResultEvent>("ai-result", (event) => {
      const payload = event.payload;
      setText(payload.text || "");

      const win = getCurrentWebviewWindow();
      win.show();
      win.setFocus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      unlistenResult.then((fn) => fn());
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [close]);

  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-b from-gray-900 to-gray-950 text-white rounded-xl overflow-hidden">
      {/* Title bar with drag handle */}
      <div
        data-tauri-drag-region
        className="flex items-center justify-between px-3 py-2 shrink-0 select-none"
      >
        <span className="text-xs font-semibold text-sky-400 tracking-wide">
          ECHO AI
        </span>
        <div className="flex gap-1">
          <button
            onClick={copy}
            className="text-[10px] px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
            title="复制"
          >
            复制
          </button>
          <button
            onClick={close}
            className="text-[10px] px-2 py-0.5 rounded bg-white/10 hover:bg-red-400/30 text-white/70 hover:text-red-300 transition-colors"
            title="关闭"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 px-3 pb-3 overflow-y-auto">
        <div className="text-sm leading-relaxed text-white/90 whitespace-pre-wrap break-words">
          {text || (
            <span className="text-white/40 italic">等待 AI 结果...</span>
          )}
        </div>
      </div>

      {/* Close hint */}
      <div className="text-[10px] text-white/20 text-center pb-1 select-none">
        按 ESC 关闭 · 拖动移动
      </div>
    </div>
  );
};

export default FloatingWindow;
