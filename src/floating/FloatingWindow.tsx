import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import React, { useCallback, useEffect, useState } from "react";
import { Copy, Sparkles, X } from "lucide-react";

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
    const handleFocus = () => {
      void syncText();
    };

    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("focus", handleFocus);

    return () => {
      unlistenResult.then((fn) => fn());
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("focus", handleFocus);
    };
  }, [close, syncText]);

  useEffect(() => {
    if (text.trim()) {
      return;
    }

    const pollId = window.setInterval(() => {
      void syncText();
    }, 450);

    return () => window.clearInterval(pollId);
  }, [syncText, text]);

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,18,27,0.97),rgba(10,12,18,0.99))] text-white shadow-[0_22px_50px_rgba(0,0,0,0.48)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(123,110,246,0.2),transparent_32%),radial-gradient(circle_at_left_bottom,rgba(94,162,255,0.12),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(138,125,255,0.45),transparent)]" />

      <div className="relative flex shrink-0 items-center justify-between border-b border-white/8 px-4 py-3 select-none">
        <div
          className="flex min-w-0 flex-1 cursor-move items-center gap-2 py-1"
          onMouseDown={() => void startDragging()}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-[#8a7dff]/18 bg-[#8a7dff]/12 text-[#cfcaff]">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="text-[11px] font-medium tracking-[0.18em] text-[#a79eff]">
            ECHO AI
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copy}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/72 transition-colors hover:border-white/16 hover:bg-white/[0.08] hover:text-white"
            title="复制"
          >
            <Copy className="h-3.5 w-3.5" />
            复制
          </button>
          <button
            onClick={close}
            className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] p-1.5 text-white/70 transition-colors hover:border-red-300/20 hover:bg-red-400/12 hover:text-red-100"
            title="关闭"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-y-auto px-4 py-4">
        <div className="rounded-[18px] border border-white/8 bg-white/[0.035] px-4 py-3.5">
          <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/34">
            Result
          </div>
          <div className="min-h-[132px] whitespace-pre-wrap break-words text-[13px] leading-7 text-white/90">
            {text || (
              <span className="italic text-white/38">等待识别结果...</span>
            )}
          </div>
        </div>
      </div>

      <div
        className="relative cursor-move border-t border-white/8 py-2 text-center text-[10px] text-white/28 select-none"
        onMouseDown={() => void startDragging()}
      >
        按 ESC 关闭 · 拖动移动
      </div>
    </div>
  );
};

export default FloatingWindow;
