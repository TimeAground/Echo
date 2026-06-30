import React from "react";
import ReactDOM from "react-dom/client";
import { Bot, Mic, SendHorizontal, Sparkles, X } from "lucide-react";

import "../App.css";
import "../i18n";

const actionButtonClass =
  "flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors";

const FloatingShell = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) => (
  <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(123,110,246,0.18),transparent_44%),linear-gradient(180deg,rgba(16,19,33,0.96),rgba(8,11,20,0.98))] p-4 shadow-[0_30px_120px_rgba(5,8,18,0.55)] backdrop-blur-2xl">
    <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(159,176,255,0.4),transparent)]" />
    <div className="flex items-center justify-between gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#8a7dff]/25 bg-[linear-gradient(135deg,rgba(123,110,246,0.34),rgba(94,162,255,0.22))] text-[#d8ddff]">
          <Bot className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-[0.04em] text-white/92">
            {title}
          </div>
          <div className="text-[12px] text-white/44">{subtitle}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={`${actionButtonClass} border-white/10 bg-white/[0.04] text-white/62`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
    {children}
  </section>
);

const Composer = ({
  placeholder,
  helper,
}: {
  placeholder: string;
  helper: string;
}) => (
  <div className="mt-4 rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-3 py-3">
    <div className="flex items-center gap-3">
      <button
        type="button"
        className={`${actionButtonClass} shrink-0 border-[#75b4ff]/18 bg-[linear-gradient(135deg,rgba(54,116,255,0.32),rgba(82,157,255,0.14))] text-[#dce7ff]`}
      >
        <Mic className="h-4 w-4" />
      </button>
      <div className="flex min-h-[44px] flex-1 items-center rounded-[20px] border border-white/8 bg-[#090d16]/78 px-4 text-[13px] text-white/38">
        {placeholder}
      </div>
      <button
        type="button"
        className={`${actionButtonClass} shrink-0 border-[#8a7dff]/22 bg-[linear-gradient(135deg,rgba(123,110,246,0.94),rgba(94,162,255,0.78))] text-white shadow-[0_12px_32px_rgba(123,110,246,0.28)]`}
      >
        <SendHorizontal className="h-4 w-4" />
      </button>
    </div>
    <div className="mt-2 px-1 text-[11px] text-white/34">{helper}</div>
  </div>
);

const AssistantTurn = ({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,18,31,0.94),rgba(10,13,22,0.98))] px-4 py-4 text-white/88 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
    <div className="mb-3 flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-[#8a7dff]/20 bg-[linear-gradient(135deg,rgba(123,110,246,0.28),rgba(94,162,255,0.18))] text-[#d8ddff]">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="text-[12px] font-medium tracking-[0.08em] text-white/54">
        {title || "ECHO AI"}
      </div>
    </div>
    <div className="space-y-3 text-[14px] leading-7">{children}</div>
  </div>
);

const UserTurn = ({ content }: { content: string }) => (
  <div className="ml-auto max-w-[80%] rounded-[22px] border border-[#7b6ef6]/18 bg-[linear-gradient(135deg,rgba(123,110,246,0.18),rgba(78,123,255,0.08))] px-4 py-3 text-[13px] leading-7 text-[#dde3ff]">
    <div className="mb-1 text-[11px] uppercase tracking-[0.16em] text-white/34">你</div>
    <div>{content}</div>
  </div>
);

const InlineCode = ({ children }: { children: React.ReactNode }) => (
  <code className="rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[12px] text-white/88">
    {children}
  </code>
);

const AltZPreview = () => (
  <FloatingShell
    title="Echo AI"
    subtitle="更像主流聊天智能体的结果态"
  >
    <div className="mt-4 space-y-4 rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
      <AssistantTurn title="优化后的结果">
        <p>我已经把这段口语化表达整理成更适合直接发送的版本：</p>
        <blockquote className="rounded-r-xl border-l-2 border-[#8a7dff]/35 pl-3 text-white/68">
          这周我们先把接口范围锁定，随后安排联调和验收时间，避免排期继续往后拖。
        </blockquote>
        <ul className="list-disc space-y-1 pl-5 text-white/74">
          <li>保留原意</li>
          <li>压缩重复表达</li>
          <li>语气更适合工作沟通</li>
        </ul>
      </AssistantTurn>

      <UserTurn content="改成更正式一点，像周报里会写的话。" />

      <AssistantTurn title="继续处理">
        <p>可以改成下面这个版本：</p>
        <p className="font-medium text-white">
          本周建议先完成接口范围确认，并同步联调与验收安排，以避免项目排期进一步延后。
        </p>
        <p className="text-white/62">
          如果你愿意，还可以继续说：<InlineCode>再简洁一点</InlineCode>、
          <InlineCode>更像汇报口吻</InlineCode> 或 <InlineCode>提炼成 3 条</InlineCode>。
        </p>
      </AssistantTurn>
    </div>
    <Composer
      placeholder="继续提问，或继续告诉 Echo 你想怎么改..."
      helper="AI 回复本身就是最终内容，不再放全局复制按钮。"
    />
  </FloatingShell>
);

const SelectionPreview = () => (
  <FloatingShell
    title="Echo AI"
    subtitle="多轮聊天态 · AI 回复支持 Markdown"
  >
    <div className="mt-4 space-y-4 rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
      <AssistantTurn title="对话回复">
        <p>这段内容如果改成给老板汇报的语气，建议先给结论，再说风险点：</p>
        <h3 className="text-[15px] font-semibold text-white">建议版本</h3>
        <p className="text-white/84">
          目前项目的主要风险集中在 <strong>排期</strong> 和
          <strong>接口稳定性</strong> 两点，建议本周优先完成接口范围确认，并同步调整联调节奏。
        </p>
        <h3 className="text-[15px] font-semibold text-white">如果继续追问</h3>
        <ol className="list-decimal space-y-1 pl-5 text-white/74">
          <li>可以要求更正式</li>
          <li>可以要求更简洁</li>
          <li>也可以要求输出成要点列表</li>
        </ol>
      </AssistantTurn>

      <UserTurn content="帮我整理成 3 条要点，直接适合放周报里。" />

      <AssistantTurn title="Markdown 回复示例">
        <h3 className="text-[15px] font-semibold text-white">本周风险与安排</h3>
        <ul className="list-disc space-y-1 pl-5 text-white/82">
          <li>接口范围仍需尽快确认，避免后续返工。</li>
          <li>联调节奏受接口稳定性影响，需要同步调整排期。</li>
          <li>建议本周先锁定范围，再安排验收节点。</li>
        </ul>
        <p className="text-white/62">
          这类回复会直接按 Markdown 展示，代码块、列表、引用、表格都能读得更清楚。
        </p>
      </AssistantTurn>
    </div>
    <Composer
      placeholder="继续追问，或直接口述下一条修改要求..."
      helper="消息展示更像聊天智能体，重点放在 AI 回复内容本身。"
    />
  </FloatingShell>
);

const RuleCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-[26px] border border-white/8 bg-white/[0.03] p-5">
    <div className="mb-3 flex items-center gap-2 text-white/88">
      <Sparkles className="h-4 w-4 text-[#92b8ff]" />
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
    <div className="space-y-2 text-[13px] leading-7 text-white/58">
      {children}
    </div>
  </div>
);

const App = () => (
  <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(73,97,194,0.35),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(94,162,255,0.16),transparent_26%),#04070d] px-6 py-10 text-white">
    <div className="mx-auto max-w-7xl">
      <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] tracking-[0.18em] text-[#a8b7ff]">
            FLOATING WINDOW UI PREVIEW
          </div>
          <h1 className="text-3xl font-semibold tracking-[0.02em] text-white/94">
            Echo 浮动窗口聊天化交互预览
          </h1>
          <p className="mt-3 max-w-3xl text-[14px] leading-7 text-white/54">
            这一版参考主流聊天智能体的表达方式：去掉全局复制按钮，把优化后的内容直接放进 AI 回复里，并强化 Markdown 的展示层次。
          </p>
        </div>
      </header>

      <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-8">
          <AltZPreview />
          <SelectionPreview />
        </div>

        <div className="space-y-5">
          <RuleCard title="这一版重点">
            <p>1. 去掉全局复制，减少顶部工具干扰。</p>
            <p>2. AI 回复本身承载优化结果，用户直接阅读和继续追问。</p>
            <p>3. 多轮内容按消息流展开，更接近千问、豆包这类聊天智能体。</p>
          </RuleCard>
          <RuleCard title="展示原则">
            <p>默认让 AI 消息更像“可直接拿去用的内容”，而不是系统提示卡。</p>
            <p>只有必要状态才提示，普通情况下不额外解释“这是结果态/多轮态”。</p>
          </RuleCard>
          <RuleCard title="Markdown 方向">
            <p>列表、引用、标题、表格、代码块默认可读，适合整理要点或结构化回答。</p>
            <p>这和现在真实浮窗里的 Markdown 渲染能力是一致的，只是视觉层次会继续优化。</p>
          </RuleCard>
        </div>
      </section>
    </div>
  </main>
);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
