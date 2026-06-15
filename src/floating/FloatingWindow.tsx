import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Copy,
  CornerDownLeft,
  LoaderCircle,
  SendHorizontal,
  Sparkles,
  X,
} from "lucide-react";

type AiResultEvent = { text: string; hasSelectionContext?: boolean };

const FloatingWindow: React.FC = () => {
  const { t } = useTranslation();
  const [text, setText] = useState<string>("");
  const [hasSelectionContext, setHasSelectionContext] = useState(false);
  const [actionError, setActionError] = useState("");
  const [followUpInput, setFollowUpInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const close = useCallback(async () => {
    await invoke("close_floating_window");
  }, []);

  const syncText = useCallback(async () => {
    try {
      const current = await invoke<string | null>("get_floating_result");
      setText(current || "");
      const selectionContext = await invoke<boolean>(
        "get_floating_selection_context",
      );
      setHasSelectionContext(selectionContext);
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

  const applyResult = useCallback(async () => {
    if (!text.trim()) return;

    setActionError("");
    try {
      await invoke("apply_floating_result");
    } catch {
      setActionError(t("floating.applyFailed"));
    }
  }, [text, t]);

  const resolveFollowUpError = useCallback(
    (error: unknown) => {
      const message =
        typeof error === "string"
          ? error
          : error instanceof Error
            ? error.message
            : "";

      if (message.includes("EMPTY_INSTRUCTION")) {
        return t("floating.followUpEmpty");
      }
      if (message.includes("POST_PROCESS_CONFIG_INVALID")) {
        return t("floating.followUpNeedsSetup");
      }
      if (message.includes("NO_FLOATING_RESULT")) {
        return t("floating.empty");
      }
      return t("floating.followUpFailed");
    },
    [t],
  );

  const runFollowUp = useCallback(
    async (instruction: string, shouldClearInput = false) => {
      if (!instruction.trim()) {
        setActionError(t("floating.followUpEmpty"));
        return;
      }

      setIsProcessing(true);
      setActionError("");

      try {
        const result = await invoke<string>("run_floating_follow_up", {
          instruction,
        });
        setText(result || "");
        if (shouldClearInput) {
          setFollowUpInput("");
        }
      } catch (error) {
        setActionError(resolveFollowUpError(error));
      } finally {
        setIsProcessing(false);
      }
    },
    [resolveFollowUpError, t],
  );

  const startDragging = useCallback(async () => {
    try {
      await getCurrentWindow().startDragging();
    } catch {
      // Ignore drag failures on unsupported platforms/states.
    }
  }, []);

  const quickActions = useMemo(
    () => [
      {
        id: "polish",
        label: t("floating.quickActions.polish"),
        instruction: t("floating.quickPrompts.polish"),
      },
      {
        id: "shorten",
        label: t("floating.quickActions.shorten"),
        instruction: t("floating.quickPrompts.shorten"),
      },
      {
        id: "formal",
        label: t("floating.quickActions.formal"),
        instruction: t("floating.quickPrompts.formal"),
      },
      {
        id: "summarize",
        label: t("floating.quickActions.summarize"),
        instruction: t("floating.quickPrompts.summarize"),
      },
    ],
    [t],
  );

  useEffect(() => {
    void syncText();
    void invoke("floating_window_ready");

    const unlistenResult = listen<AiResultEvent>("ai-result", (event) => {
      const payload = event.payload;
      setText(payload.text || "");
      setHasSelectionContext(Boolean(payload.hasSelectionContext));
      setActionError("");
      setIsProcessing(false);

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

  const markdownComponents = useMemo(
    () => ({
      p: ({ children }: { children?: React.ReactNode }) => (
        <p className="mb-2 last:mb-0">{children}</p>
      ),
      ul: ({ children }: { children?: React.ReactNode }) => (
        <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
      ),
      ol: ({ children }: { children?: React.ReactNode }) => (
        <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">
          {children}
        </ol>
      ),
      li: ({ children }: { children?: React.ReactNode }) => (
        <li className="leading-7">{children}</li>
      ),
      a: ({
        children,
        href,
      }: {
        children?: React.ReactNode;
        href?: string;
      }) => (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-[#a79eff] underline decoration-[#a79eff]/35 underline-offset-4 transition-colors hover:text-white"
        >
          {children}
        </a>
      ),
      code: ({
        children,
        className,
        inline,
      }: {
        children?: React.ReactNode;
        className?: string;
        inline?: boolean;
      }) => {
        if (inline) {
          return (
            <code className="rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[12px] text-white/88">
              {children}
            </code>
          );
        }

        return (
          <code
            className={`block overflow-x-auto rounded-2xl border border-white/10 bg-[#090b12]/85 px-3.5 py-3 text-[12px] leading-6 text-white/88 ${className || ""}`}
          >
            {children}
          </code>
        );
      },
      pre: ({ children }: { children?: React.ReactNode }) => (
        <pre className="mb-2 last:mb-0">{children}</pre>
      ),
      blockquote: ({ children }: { children?: React.ReactNode }) => (
        <blockquote className="mb-2 border-l-2 border-white/10 pl-3 text-white/72 last:mb-0">
          {children}
        </blockquote>
      ),
      table: ({ children }: { children?: React.ReactNode }) => (
        <div className="mb-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] last:mb-0">
          <table className="w-full border-collapse text-left text-[12px] leading-6">
            {children}
          </table>
        </div>
      ),
      th: ({ children }: { children?: React.ReactNode }) => (
        <th className="border-b border-white/10 px-3 py-2 font-medium text-white/70">
          {children}
        </th>
      ),
      td: ({ children }: { children?: React.ReactNode }) => (
        <td className="border-b border-white/5 px-3 py-2 text-white/78">
          {children}
        </td>
      ),
      hr: () => <hr className="my-3 border-white/10" />,
      h1: ({ children }: { children?: React.ReactNode }) => (
        <h1 className="mb-2 text-[16px] font-semibold text-white/92">
          {children}
        </h1>
      ),
      h2: ({ children }: { children?: React.ReactNode }) => (
        <h2 className="mb-2 text-[15px] font-semibold text-white/92">
          {children}
        </h2>
      ),
      h3: ({ children }: { children?: React.ReactNode }) => (
        <h3 className="mb-2 text-[14px] font-semibold text-white/92">
          {children}
        </h3>
      ),
    }),
    [],
  );

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
            {t("floating.title")}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={applyResult}
            disabled={!text.trim()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#8a7dff]/18 bg-[#8a7dff]/12 px-3 py-1.5 text-[11px] text-[#e7e3ff] transition-colors hover:border-[#a89dff]/28 hover:bg-[#8a7dff]/18 hover:text-white disabled:cursor-default disabled:border-white/8 disabled:bg-white/[0.04] disabled:text-white/36"
            title={
              hasSelectionContext
                ? t("floating.replaceSelection")
                : t("floating.insertCurrent")
            }
          >
            <CornerDownLeft className="h-3.5 w-3.5" />
            {hasSelectionContext
              ? t("floating.replaceSelection")
              : t("floating.insertCurrent")}
          </button>
          <button
            onClick={copy}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/72 transition-colors hover:border-white/16 hover:bg-white/[0.08] hover:text-white"
            title={t("floating.copy")}
          >
            <Copy className="h-3.5 w-3.5" />
            {t("floating.copy")}
          </button>
          <button
            onClick={close}
            className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] p-1.5 text-white/70 transition-colors hover:border-red-300/20 hover:bg-red-400/12 hover:text-red-100"
            title={t("common.close")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-3">
          <div className="rounded-[18px] border border-white/8 bg-white/[0.035] px-4 py-3.5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/34">
                {t("floating.result")}
              </div>
              {hasSelectionContext ? (
                <div className="rounded-full border border-[#7ba3ff]/18 bg-[#7ba3ff]/10 px-2.5 py-1 text-[10px] text-[#bfd3ff]">
                  {t("floating.selectionBadge")}
                </div>
              ) : null}
            </div>
            <div className="min-h-[120px] whitespace-pre-wrap break-words text-[13px] leading-7 text-white/90">
              {text ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {text}
                </ReactMarkdown>
              ) : (
                <span className="italic text-white/38">{t("floating.empty")}</span>
              )}
            </div>
          </div>

          <div className="rounded-[18px] border border-[#8a7dff]/14 bg-[#8a7dff]/[0.045] px-4 py-3.5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#b6aeff]/66">
                  {t("floating.followUpTitle")}
                </div>
                <div className="mt-1 text-[12px] text-white/52">
                  {t("floating.followUpDescription")}
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/56">
                {isProcessing ? (
                  <>
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    {t("floating.processing")}
                  </>
                ) : (
                  t("floating.ready")
                )}
              </div>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => void runFollowUp(action.instruction)}
                  disabled={!text.trim() || isProcessing}
                  className="inline-flex cursor-pointer items-center rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[12px] text-white/76 transition-colors hover:border-[#8a7dff]/24 hover:bg-[#8a7dff]/14 hover:text-white disabled:cursor-default disabled:border-white/8 disabled:bg-white/[0.03] disabled:text-white/30"
                >
                  {action.label}
                </button>
              ))}
            </div>

            {actionError ? (
              <div className="mb-3 rounded-xl border border-red-300/14 bg-red-400/10 px-3 py-2 text-[12px] text-red-100/88">
                {actionError}
              </div>
            ) : null}

            <textarea
              value={followUpInput}
              onChange={(event) => setFollowUpInput(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  void runFollowUp(followUpInput, true);
                }
              }}
              disabled={isProcessing}
              placeholder={t("floating.followUpPlaceholder")}
              className="min-h-[92px] w-full resize-none rounded-2xl border border-white/10 bg-[#090b12]/85 px-3.5 py-3 text-[13px] leading-6 text-white/88 outline-none transition-colors placeholder:text-white/24 focus:border-[#8a7dff]/32"
            />

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-[11px] text-white/34">
                {t("floating.followUpHint")}
              </div>
              <button
                type="button"
                onClick={() => void runFollowUp(followUpInput, true)}
                disabled={!text.trim() || !followUpInput.trim() || isProcessing}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#8a7dff]/18 bg-[#8a7dff]/12 px-3 py-2 text-[12px] text-[#e7e3ff] transition-colors hover:border-[#a89dff]/28 hover:bg-[#8a7dff]/18 hover:text-white disabled:cursor-default disabled:border-white/8 disabled:bg-white/[0.04] disabled:text-white/30"
              >
                {isProcessing ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <SendHorizontal className="h-3.5 w-3.5" />
                )}
                {t("floating.send")}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        className="relative cursor-move border-t border-white/8 py-2 text-center text-[10px] text-white/28 select-none"
        onMouseDown={() => void startDragging()}
      >
        {t("floating.footer")}
      </div>
    </div>
  );
};

export default FloatingWindow;
