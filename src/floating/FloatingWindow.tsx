import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  LoaderCircle,
  Mic,
  Pin,
  SendHorizontal,
  Square,
} from "lucide-react";

// #region debug-point A:floating-runtime-issues
const __DBG_URL = "http://127.0.0.1:7778/event";
const __dbgReport = (
  hypothesisId: string,
  location: string,
  msg: string,
  data?: Record<string, unknown>,
) =>
  fetch(__DBG_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: "floating-runtime-issues",
      runId: "pre-fix",
      hypothesisId,
      location,
      msg: `[DEBUG] ${msg}`,
      data: data || {},
      ts: Date.now(),
    }),
  }).catch(() => {});
// #endregion

type AiResultEvent = {
  text: string;
  hasSelectionContext?: boolean;
  processing?: boolean;
};
type ConversationRole = "assistant" | "user";
type ConversationVariant = "result" | "message";

type ConversationItem = {
  id: string;
  role: ConversationRole;
  content: string;
  variant: ConversationVariant;
  pending?: boolean;
};

const createConversationId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const buildInitialConversation = (value: string): ConversationItem[] =>
  value.trim()
    ? [
        {
          id: createConversationId(),
          role: "assistant",
          content: value,
          variant: "result",
        },
      ]
    : [];

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-2 last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
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
    <h1 className="mb-2 text-[16px] font-semibold text-white/92">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mb-2 text-[15px] font-semibold text-white/92">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mb-2 text-[14px] font-semibold text-white/92">{children}</h3>
  ),
};

const renderMarkdown = (content: string) => (
  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
    {content}
  </ReactMarkdown>
);

/** Toolbar icon button with native tooltip */
const ToolbarBtn = ({
  icon,
  tooltip,
  onClick,
  active,
  className = "",
}: {
  icon: React.ReactNode;
  tooltip: string;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) => (
  <button
    title={tooltip}
    onClick={onClick}
    className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-[15px] transition-colors ${
      active
        ? "text-[#9a8eff] bg-[#7b6ef6]/12"
        : "text-white/55 hover:text-white/85 hover:bg-white/[0.06]"
    } ${className}`}
  >
    {icon}
  </button>
);



const isLikelyQuestion = (value: string) => {
  if (/[?？]$/.test(value)) {
    return true;
  }

  return /^(请问|帮我|能不能|可不可以|可以|怎么|为什么|是否|是不是|要不要|要怎么|如何)/.test(
    value,
  );
};

const normalizeVoiceInstruction = (value: string) => {
  let normalized = value
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  normalized = normalized.replace(
    /(^|[\s，。！？；、,.!?;])(?:嗯+|呃+|额+|啊+|唉+|诶+)(?=($|[\s，。！？；、,.!?;]))/g,
    "$1",
  );
  normalized = normalized.replace(
    /^(?:那个|这个|就是|然后|那么|嗯那个|呃那个)[，,\s]*/g,
    "",
  );
  normalized = normalized
    .replace(/\s*([，。！？；、,.!?;])\s*/g, "$1")
    .replace(/[，,]{2,}/g, "，")
    .replace(/[。.]{2,}/g, "。")
    .replace(/[？?]{2,}/g, "？")
    .replace(/[！!]{2,}/g, "！")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  if (!/[。！？?!]$/.test(normalized)) {
    normalized = `${normalized}${isLikelyQuestion(normalized) ? "？" : "。"} `;
  }

  return normalized.trim();
};

const FloatingWindow: React.FC = () => {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [hasSelectionContext, setHasSelectionContext] = useState(false);
  const [actionError, setActionError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [followUpInput, setFollowUpInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [isVoiceTranscribing, setIsVoiceTranscribing] = useState(false);
  const [isPinned, setIsPinned] = useState(true);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const lastExternalTextRef = useRef("");

  const hydrateFromExternalResult = useCallback(
    (nextText: string, nextHasSelectionContext: boolean) => {
      void __dbgReport(
        "C",
        "src/floating/FloatingWindow.tsx:hydrateFromExternalResult",
        "Hydrating floating window from external result",
        {
          textLength: nextText.length,
          preview: nextText.slice(0, 120),
          hasSelectionContext: nextHasSelectionContext,
        },
      );
      setText(nextText);
      setHasSelectionContext(nextHasSelectionContext);
      setConversation(buildInitialConversation(nextText));
      setActionError("");
      setInfoMessage("");
      setIsProcessing(false);
      lastExternalTextRef.current = nextText;
    },
    [],
  );

  const close = useCallback(async () => {
    if (isVoiceRecording || isVoiceTranscribing) {
      try {
        await invoke("cancel_floating_voice_recording");
      } catch {
        // ignore
      }
      setIsVoiceRecording(false);
      setIsVoiceTranscribing(false);
    }
    await invoke("close_floating_window");
  }, [isVoiceRecording, isVoiceTranscribing]);

  const togglePin = useCallback(async () => {
    const next = !isPinned;
    setIsPinned(next);
    try {
      const win = getCurrentWindow();
      await win.setAlwaysOnTop(next);
    } catch {
      // ignore
    }
  }, [isPinned]);

  const syncText = useCallback(async () => {
    try {
      const current = await invoke<string | null>("get_floating_result");
      const nextText = current || "";
      const selectionContext = await invoke<boolean>(
        "get_floating_selection_context",
      );

      setHasSelectionContext(selectionContext);

      if (nextText !== lastExternalTextRef.current) {
        hydrateFromExternalResult(nextText, selectionContext);
      } else {
        setText(nextText);
      }
    } catch {
      // Ignore sync failures; the event listener is still the primary path.
    }
  }, [hydrateFromExternalResult]);

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

      const userMessageId = createConversationId();
      const pendingMessageId = createConversationId();

      setIsProcessing(true);
      setActionError("");
      setInfoMessage("");
      setConversation((previous) => [
        ...(previous.length ? previous : buildInitialConversation(text)),
        {
          id: userMessageId,
          role: "user",
          content: instruction.trim(),
          variant: "message",
        },
        {
          id: pendingMessageId,
          role: "assistant",
          content: "",
          variant: "message",
          pending: true,
        },
      ]);

      try {
        void __dbgReport(
          "C",
          "src/floating/FloatingWindow.tsx:runFollowUp:enter",
          "Invoking floating follow-up",
          {
            instruction: instruction.trim(),
            instructionLength: instruction.trim().length,
            currentTextLength: text.trim().length,
            currentTextPreview: text.trim().slice(0, 120),
          },
        );
        const result = await invoke<string>("run_floating_follow_up", {
          instruction,
        });
        const nextText = result || "";
        void __dbgReport(
          "C",
          "src/floating/FloatingWindow.tsx:runFollowUp:ok",
          "Floating follow-up resolved",
          {
            resultLength: nextText.length,
            resultPreview: nextText.slice(0, 120),
          },
        );
        setText(nextText);
        lastExternalTextRef.current = nextText;
        setConversation((previous) =>
          previous.map((item) =>
            item.id === pendingMessageId
              ? {
                  ...item,
                  pending: false,
                  content: nextText || t("floating.empty"),
                }
              : item,
          ),
        );
      } catch (error) {
        void __dbgReport(
          "C",
          "src/floating/FloatingWindow.tsx:runFollowUp:error",
          "Floating follow-up failed",
          {
            error:
              typeof error === "string"
                ? error
                : error instanceof Error
                  ? error.message
                  : String(error),
          },
        );
        setConversation((previous) =>
          previous.filter((item) => item.id !== pendingMessageId),
        );
        setActionError(resolveFollowUpError(error));
      } finally {
        if (shouldClearInput) {
          setFollowUpInput("");
        }
        setIsProcessing(false);
      }
    },
    [resolveFollowUpError, t, text],
  );

  const startVoiceRecording = useCallback(async () => {
    if (isProcessing || isVoiceTranscribing) {
      setInfoMessage(t("floating.voiceBusy"));
      return;
    }

    setActionError("");
    setInfoMessage(t("floating.voiceStarting"));
    try {
      await invoke("start_floating_voice_recording");
      setIsVoiceRecording(true);
      setInfoMessage(t("floating.voiceListening"));
    } catch {
      setInfoMessage("");
      setActionError(t("floating.voiceFailed"));
    }
  }, [isProcessing, isVoiceTranscribing, t]);

  const stopVoiceRecording = useCallback(async () => {
    setIsVoiceRecording(false);
    setIsVoiceTranscribing(true);
    setActionError("");
    setInfoMessage(t("floating.voiceTranscribing"));

    try {
      const transcript = await invoke<string>("stop_floating_voice_recording");
      const normalized = normalizeVoiceInstruction(transcript || "");
      if (!normalized) {
        setInfoMessage(t("floating.voiceEmpty"));
        return;
      }

      const mergedInstruction = (() => {
        const existing = followUpInput.trim();
        return existing ? `${existing} ${normalized}` : normalized;
      })();

      setFollowUpInput(() => {
        const existing = followUpInput.trim();
        return existing ? `${existing} ${normalized}` : normalized;
      });
      setInfoMessage(t("floating.voiceReady"));
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });

      await runFollowUp(mergedInstruction, true);
    } catch {
      setInfoMessage("");
      setActionError(t("floating.voiceFailed"));
    } finally {
      setIsVoiceTranscribing(false);
    }
  }, [followUpInput, runFollowUp, t]);

  const toggleVoiceRecording = useCallback(() => {
    if (isVoiceRecording) {
      void stopVoiceRecording();
      return;
    }

    void startVoiceRecording();
  }, [isVoiceRecording, startVoiceRecording, stopVoiceRecording]);

  useEffect(() => {
    void syncText();
    void invoke("floating_window_ready");

    const unlistenResult = listen<AiResultEvent>("ai-result", (event) => {
      const payload = event.payload;
      void __dbgReport(
        "C",
        "src/floating/FloatingWindow.tsx:ai-result",
        "Received ai-result event",
        {
          textLength: (payload.text || "").length,
          preview: (payload.text || "").slice(0, 120),
          hasSelectionContext: Boolean(payload.hasSelectionContext),
          processing: Boolean(payload.processing),
        },
      );

      if (payload.processing) {
        setText(payload.text || "");
        setHasSelectionContext(Boolean(payload.hasSelectionContext));
        setConversation(buildInitialConversation(payload.text || ""));
        setIsProcessing(true);
        setActionError("");
        setInfoMessage(t("floating.optimizing"));
        lastExternalTextRef.current = payload.text || "";
      } else {
        hydrateFromExternalResult(
          payload.text || "",
          Boolean(payload.hasSelectionContext),
        );
      }

      const win = getCurrentWindow();
      void win.show();
      void win.setFocus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        void close();
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
  }, [close, hydrateFromExternalResult, syncText]);

  useEffect(() => {
    if (!contentRef.current) return;

    const node = contentRef.current;
    requestAnimationFrame(() => {
      node.scrollTop = node.scrollHeight;
    });
  }, [conversation, isProcessing]);

  const hasContent = conversation.length > 0;

  return (
    <div className="flex h-screen w-screen flex-col bg-[#12141e] text-white">
      {/* Toolbar */}
      <div
        data-tauri-drag-region
        className="relative flex shrink-0 cursor-move items-center justify-end gap-1.5 px-3 py-2.5 select-none"
      >
        <div className="group relative">
          <button
            title="始终置顶"
            onClick={togglePin}
            className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-[15px] transition-colors ${
              isPinned
                ? "text-[#9a8eff] bg-[#7b6ef6]/12"
                : "text-white/55 hover:text-white/85 hover:bg-white/[0.06]"
            }`}
          >
            <Pin className="h-4 w-4" />
          </button>
          <div className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#1e1e2e] px-3 py-1.5 text-[12px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
            始终置顶
          </div>
        </div>
        <div className="mx-0.5 h-5 w-px bg-white/[0.06]" />
        <button
          onClick={close}
          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-white/45 transition-colors hover:text-white/80 hover:bg-white/[0.06]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="6" y1="12" x2="18" y2="12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div ref={contentRef} className="relative flex-1 overflow-y-auto px-4 py-2">
        <div className="flex flex-col gap-3">
          {!hasContent ? (
            <div className="flex flex-1 items-center justify-center py-16">
              <div className="text-[13px] text-white/25">{t("floating.empty")}</div>
            </div>
          ) : null}

          {conversation.map((item) => {
            if (item.role === "assistant") {
              return (
                <div key={item.id} className="max-w-[90%]">
                  {item.pending ? (
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-[#1e2030] px-4 py-3 text-[13px] text-white/56">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      {t("floating.processing")}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-[#1e2030] px-4 py-3 text-[14px] leading-7 text-white/88">
                      {renderMarkdown(item.content)}
                    </div>
                  )}
                </div>
              );
            }

            // User message
            return (
              <div key={item.id} className="ml-auto max-w-[80%]">
                <div className="rounded-2xl rounded-br-[6px] bg-gradient-to-br from-[#5b5ef7] to-[#6b7aff] px-4 py-3 text-[13px] leading-7 text-white shadow-sm">
                  {item.content}
                </div>
              </div>
            );
          })}

          {infoMessage ? (
            <div className="rounded-2xl border border-[#5ea2ff]/18 bg-[#5ea2ff]/10 px-4 py-3 text-[12px] leading-6 text-[#d3e4ff]">
              {infoMessage}
            </div>
          ) : null}

          {actionError ? (
            <div className="rounded-2xl border border-red-300/14 bg-red-400/10 px-4 py-3 text-[12px] leading-6 text-red-100/88">
              {actionError}
            </div>
          ) : null}
        </div>
      </div>

      {/* Input */}
      <div className="relative shrink-0 border-t border-white/6 px-4 py-3">
        <div className="flex items-end gap-2.5">
          <button
            type="button"
            onClick={toggleVoiceRecording}
            disabled={isProcessing || isVoiceTranscribing}
            className={`relative shrink-0 rounded-xl p-2.5 transition-colors ${
              isVoiceRecording
                ? "bg-[#ff4e7d]/20 text-[#ff8aac]"
                : "bg-[#5b5ef7]/15 text-[#9ca3ff] hover:bg-[#5b5ef7]/22"
            } disabled:opacity-30`}
          >
            {isVoiceTranscribing ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : isVoiceRecording ? (
              <Square className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>

          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={followUpInput}
              onChange={(event) => setFollowUpInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void runFollowUp(followUpInput, true);
                }
              }}
              disabled={isProcessing || isVoiceTranscribing}
              placeholder="输入指令…"
              rows={1}
              className="max-h-24 min-h-[40px] w-full resize-none rounded-2xl border border-white/8 bg-[#1e2030] px-4 py-2.5 text-[13px] leading-6 text-white/88 outline-none transition-colors placeholder:text-white/22 focus:border-[#7b6ef6]/35"
            />
          </div>

          <button
            type="button"
            onClick={() => void runFollowUp(followUpInput, true)}
            disabled={
              !text.trim() ||
              !followUpInput.trim() ||
              isProcessing ||
              isVoiceRecording ||
              isVoiceTranscribing
            }
            className="flex shrink-0 cursor-pointer items-center justify-center rounded-xl bg-gradient-to-br from-[#5b5ef7] to-[#7b6aff] p-2.5 text-white shadow-[0_4px_16px_rgba(91,94,247,0.22)] transition-opacity hover:opacity-92 disabled:opacity-25 disabled:cursor-default disabled:shadow-none"
          >
            {isProcessing ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizontal className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FloatingWindow;
