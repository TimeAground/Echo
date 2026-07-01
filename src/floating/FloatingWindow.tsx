import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  LoaderCircle,
  Mic,
  SendHorizontal,
  Square,
  X,
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

const AssistantMessageCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,18,31,0.94),rgba(10,13,22,0.98))] px-4 py-4 text-white/88 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
    <div className="mb-3 flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-[#8a7dff]/20 bg-[linear-gradient(135deg,rgba(123,110,246,0.28),rgba(94,162,255,0.18))] text-[#d8ddff]">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="text-[12px] font-medium tracking-[0.08em] text-white/54">
        {title}
      </div>
    </div>
    <div className="space-y-3 text-[14px] leading-7">{children}</div>
  </div>
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
  const contentRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const lastExternalTextRef = useRef("");

  const hydrateFromExternalResult = useCallback(
    (nextText: string, nextHasSelectionContext: boolean) => {
      // #region debug-point C:hydrate-external-result
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
      // #endregion
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
        // #region debug-point C:followup-invoke-enter
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
        // #endregion
        const result = await invoke<string>("run_floating_follow_up", {
          instruction,
        });
        const nextText = result || "";
        // #region debug-point C:followup-invoke-ok
        void __dbgReport(
          "C",
          "src/floating/FloatingWindow.tsx:runFollowUp:ok",
          "Floating follow-up resolved",
          {
            resultLength: nextText.length,
            resultPreview: nextText.slice(0, 120),
          },
        );
        // #endregion
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
        if (shouldClearInput) {
          setFollowUpInput("");
        }
      } catch (error) {
        // #region debug-point C:followup-invoke-error
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
        // #endregion
        setConversation((previous) =>
          previous.filter((item) => item.id !== pendingMessageId),
        );
        setActionError(resolveFollowUpError(error));
      } finally {
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
      // #region debug-point C:ai-result-event
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
      // #endregion

      if (payload.processing) {
        // Show raw transcription with processing state (方案 A)
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

  const subtitle = useMemo(
    () =>
      hasSelectionContext
        ? t("floating.subtitleSelection")
        : t("floating.subtitleResult"),
    [hasSelectionContext, t],
  );

  const helperText = useMemo(
    () =>
      hasSelectionContext
        ? t("floating.inputHelperSelection")
        : t("floating.inputHelper"),
    [hasSelectionContext, t],
  );

  const hasContent = conversation.length > 0;

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(123,110,246,0.18),transparent_42%),linear-gradient(180deg,rgba(16,19,33,0.97),rgba(8,11,20,0.99))] text-white shadow-[0_28px_80px_rgba(0,0,0,0.52)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(123,110,246,0.16),transparent_30%),radial-gradient(circle_at_left_bottom,rgba(94,162,255,0.1),transparent_24%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(138,125,255,0.45),transparent)]" />

      <div className="relative shrink-0 px-4 pt-4 select-none">
        <div
          data-tauri-drag-region
          className="flex cursor-move items-center justify-between gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-3"
          onMouseDown={(event) => {
            // #region debug-point E:drag-header-mousedown
            void __dbgReport(
              "E",
              "src/floating/FloatingWindow.tsx:header:onMouseDown",
              "Floating header received mouse down",
              {
                button: event.button,
              },
            );
            // #endregion
          }}
        >
          <div className="pointer-events-none flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#8a7dff]/25 bg-[linear-gradient(135deg,rgba(123,110,246,0.34),rgba(94,162,255,0.22))] text-[#d8ddff]">
              <Bot className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold tracking-[0.04em] text-white/92">
                {t("floating.title")}
              </div>
              <div className="text-[12px] text-white/42">{subtitle}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={close}
              onMouseDown={(event) => event.stopPropagation()}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/68 transition-colors hover:border-red-300/20 hover:bg-red-400/12 hover:text-red-100"
              title={t("common.close")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div ref={contentRef} className="relative flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          {!hasContent ? (
            <AssistantMessageCard title={t("floating.result")}>
              <div className="text-[14px] leading-8 text-white/40">
                {t("floating.empty")}
              </div>
            </AssistantMessageCard>
          ) : null}

          {conversation.map((item) => {
            if (item.role === "assistant" && item.variant === "result") {
              return (
                <AssistantMessageCard key={item.id} title={t("floating.result")}>
                  <div className="text-[14px] leading-8 text-white/88">
                    {renderMarkdown(item.content)}
                  </div>
                </AssistantMessageCard>
              );
            }

            if (item.role === "user") {
              return (
                <div key={item.id} className="ml-auto max-w-[80%]">
                  <div className="rounded-[22px] border border-[#7b6ef6]/18 bg-[linear-gradient(135deg,rgba(123,110,246,0.18),rgba(78,123,255,0.08))] px-4 py-3 text-[#dde3ff]">
                    <div className="mb-1 text-[11px] uppercase tracking-[0.16em] text-white/34">
                      {t("floating.you")}
                    </div>
                    <div className="text-[13px] leading-7">{item.content}</div>
                  </div>
                </div>
              );
            }

            return (
              <AssistantMessageCard
                key={item.id}
                title={t("floating.followUpTitle")}
              >
                {item.pending ? (
                  <div className="inline-flex items-center gap-2 text-[13px] text-white/56">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    {t("floating.processing")}
                  </div>
                ) : (
                  <div className="text-[14px] leading-7 text-white/84">
                    {renderMarkdown(item.content)}
                  </div>
                )}
              </AssistantMessageCard>
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

      <div className="relative shrink-0 border-t border-white/8 px-4 py-4">
        <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-3 py-3">
          <div className="flex items-end gap-3">
            <button
              type="button"
              onClick={toggleVoiceRecording}
              disabled={isProcessing || isVoiceTranscribing}
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-colors ${
                isVoiceRecording
                  ? "cursor-pointer border-red-300/18 bg-[linear-gradient(135deg,rgba(255,78,125,0.34),rgba(255,117,166,0.16))] text-[#ffe3ec] hover:border-red-300/26 hover:bg-[linear-gradient(135deg,rgba(255,78,125,0.42),rgba(255,117,166,0.22))]"
                  : "cursor-pointer border-[#75b4ff]/18 bg-[linear-gradient(135deg,rgba(54,116,255,0.32),rgba(82,157,255,0.14))] text-[#dce7ff] hover:border-[#9ccaff]/24 hover:bg-[linear-gradient(135deg,rgba(54,116,255,0.4),rgba(82,157,255,0.2))]"
              } disabled:cursor-default disabled:border-white/8 disabled:bg-white/[0.04] disabled:text-white/30`}
              title={t("floating.voiceInput")}
            >
              {isVoiceTranscribing ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : isVoiceRecording ? (
                <Square className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>

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
              placeholder={t("floating.followUpPlaceholder")}
              rows={1}
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-[20px] border border-white/8 bg-[#090d16]/78 px-4 py-3 text-[13px] leading-6 text-white/88 outline-none transition-colors placeholder:text-white/24 focus:border-[#8a7dff]/32"
            />

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
              className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-[#8a7dff]/22 bg-[linear-gradient(135deg,rgba(123,110,246,0.94),rgba(94,162,255,0.78))] text-white shadow-[0_12px_32px_rgba(123,110,246,0.28)] transition-opacity hover:opacity-95 disabled:cursor-default disabled:border-white/8 disabled:bg-white/[0.05] disabled:text-white/28 disabled:shadow-none"
              title={t("floating.send")}
            >
              {isProcessing ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizontal className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="mt-2 px-1 text-[11px] text-white/34">
            {helperText}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloatingWindow;
