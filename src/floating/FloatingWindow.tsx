import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import React, { useCallback, useEffect, useState } from "react";

type AiResultEvent = { text: string };

const FloatingWindow: React.FC = () => {
  const [text, setText] = useState<string>("");

  const close = useCallback(async () => {
    await invoke("close_floating_window");
  }, []);

  const syncText = useCallback(async () => {
    try {
      const current = await invoke<string | null>("get_floating_result");
      setText(current || "");
    } catch {
      // Ignore sync failures; the event listener is still the primary path.
    }
  }, []);

  const copy = useCallback(async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  }, [text]);

  const startDragging = useCallback(async () => {
    try {
      await getCurrentWindow().startDragging();
    } catch {
      // Ignore drag failures on unsupported platforms/states.
    }
  }, []);

  useEffect(() => {
    void syncText();

    const unlistenResult = listen<AiResultEvent>("ai-result", (event) => {
      const payload = event.payload;
      setText(payload.text || "");

      const win = getCurrentWindow();
      void win.show();
      void win.setFocus();
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
  }, [close, syncText]);

  return (
    <div className="h-screen w-screen flex flex-col rounded-[14px] border border-white/10 bg-[#212121]/95 text-white shadow-[0_12px_32px_rgba(0,0,0,0.45)] overflow-hidden backdrop-blur-xl">
      {/* Title bar with drag handle */}
      <div className="flex items-center justify-between border-b border-white/8 px-3 py-2 shrink-0 select-none">
        <div
          className="flex-1 min-w-0 py-1 cursor-move"
          onMouseDown={() => void startDragging()}
        >
          <span className="text-[11px] font-medium text-[#8B80FF] tracking-[0.16em]">
          ECHO AI
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={copy}
            className="cursor-pointer text-[11px] px-2.5 py-1 rounded-md bg-white/8 hover:bg-white/14 text-white/75 hover:text-white transition-colors"
            title="复制"
          >
            复制
          </button>
          <button
            onClick={close}
            className="cursor-pointer text-[11px] px-2.5 py-1 rounded-md bg-white/8 hover:bg-red-400/20 text-white/75 hover:text-red-200 transition-colors"
            title="关闭"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 px-4 py-3 overflow-y-auto">
        <div className="text-[13px] leading-6 text-white/92 whitespace-pre-wrap break-words">
          {text || (
            <span className="text-white/40 italic">等待 AI 结果...</span>
          )}
        </div>
      </div>

      {/* Close hint */}
      <div
        className="border-t border-white/8 text-[10px] text-white/28 text-center py-1.5 select-none cursor-move"
        onMouseDown={() => void startDragging()}
      >
        按 ESC 关闭 · 拖动移动
      </div>
    </div>
  );
};

export default FloatingWindow;
