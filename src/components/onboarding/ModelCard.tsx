import React from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  Download,
  Globe,
  Languages,
  Loader2,
  Trash2,
} from "lucide-react";
import type { ModelInfo } from "@/bindings";
import { formatModelSize } from "../../lib/utils/format";
import {
  getTranslatedModelDescription,
  getTranslatedModelName,
} from "../../lib/utils/modelTranslation";
import {
  LANGUAGES,
  getNativeLanguageLabel,
} from "../../lib/constants/languages";
import Badge from "../ui/Badge";
import { Button } from "../ui/Button";

type ScenarioBadgeTone = "primary" | "success" | "secondary";

interface ScenarioBadge {
  key: string;
  label: string;
  tone: ScenarioBadgeTone;
}

// Get display text for model's language support
const getLanguageDisplayText = (
  supportedLanguages: string[],
  t: (key: string, options?: Record<string, unknown>) => string,
): string => {
  if (supportedLanguages.length === 1) {
    const langCode = supportedLanguages[0];
    const langName =
      LANGUAGES.find((l) => l.value === langCode) != null
        ? getNativeLanguageLabel(langCode)
        : langCode;
    return t("modelSelector.capabilities.languageOnly", { language: langName });
  }
  return t("modelSelector.capabilities.multiLanguage");
};

const hasAnyLanguage = (supportedLanguages: string[], targets: string[]) =>
  supportedLanguages.some((language) => targets.includes(language));

const getScenarioBadges = (
  model: ModelInfo,
  t: (key: string, options?: Record<string, unknown>) => string,
): ScenarioBadge[] => {
  const badges: ScenarioBadge[] = [];
  const supportedLanguages = model.supported_languages;
  const modelId = model.id.toLowerCase();
  const isEnglishOnly =
    supportedLanguages.length === 1 && supportedLanguages[0] === "en";
  const isChineseFirst =
    modelId.includes("sense-voice") || modelId.includes("breeze");
  const isTaiwanMandarin = modelId.includes("breeze");
  const isRussianFocused = modelId.includes("gigaam");
  const isMultilingual = supportedLanguages.length >= 2;
  const supportsCodeSwitch =
    modelId.includes("sense-voice") || modelId.includes("breeze");
  const isLowLatency =
    model.speed_score >= 0.78 ||
    /sense-voice|moonshine|flash|turbo/.test(modelId);
  const isHighAccuracy =
    model.accuracy_score >= 0.78 || /large|cohere|medium/.test(modelId);
  const isBalanced =
    model.speed_score >= 0.6 &&
    model.accuracy_score >= 0.6 &&
    !isLowLatency &&
    !isHighAccuracy;

  if (isTaiwanMandarin) {
    badges.push({
      key: "taiwanMandarin",
      label: t("modelSelector.scenarios.tags.taiwanMandarin"),
      tone: "primary",
    });
  } else if (isRussianFocused) {
    badges.push({
      key: "russianSpeech",
      label: t("modelSelector.scenarios.tags.russianSpeech"),
      tone: "primary",
    });
  } else if (isChineseFirst) {
    badges.push({
      key: "chineseFirst",
      label: t("modelSelector.scenarios.tags.chineseFirst"),
      tone: "primary",
    });
  } else if (isEnglishOnly) {
    badges.push({
      key: "englishOnly",
      label: t("modelSelector.scenarios.tags.englishOnly"),
      tone: "secondary",
    });
  } else if (isMultilingual) {
    badges.push({
      key: "multilingual",
      label: t("modelSelector.scenarios.tags.multilingual"),
      tone: "secondary",
    });
  }

  if (supportsCodeSwitch) {
    badges.push({
      key: "codeSwitch",
      label: t("modelSelector.scenarios.tags.codeSwitch"),
      tone: "secondary",
    });
  }

  if (isLowLatency) {
    badges.push({
      key: "lowLatency",
      label: t("modelSelector.scenarios.tags.lowLatency"),
      tone: "success",
    });
  } else if (isHighAccuracy) {
    badges.push({
      key: "highAccuracy",
      label: t("modelSelector.scenarios.tags.highAccuracy"),
      tone: "secondary",
    });
  } else if (isBalanced) {
    badges.push({
      key: "balanced",
      label: t("modelSelector.scenarios.tags.balanced"),
      tone: "secondary",
    });
  }

  if (model.supports_translation) {
    badges.push({
      key: "translation",
      label: t("modelSelector.scenarios.tags.translation"),
      tone: "secondary",
    });
  }

  badges.push({
    key: "offline",
    label: t("modelSelector.scenarios.tags.offline"),
    tone: "secondary",
  });

  return badges.slice(0, 4);
};

const getScenarioSummary = (
  model: ModelInfo,
  t: (key: string, options?: Record<string, unknown>) => string,
) => {
  const supportedLanguages = model.supported_languages;
  const modelId = model.id.toLowerCase();
  const phrases: string[] = [];

  if (modelId.includes("breeze")) {
    phrases.push(t("modelSelector.scenarios.phrases.taiwanMandarin"));
  } else if (modelId.includes("gigaam")) {
    phrases.push(t("modelSelector.scenarios.phrases.russianSpeech"));
  } else if (modelId.includes("sense-voice")) {
    phrases.push(t("modelSelector.scenarios.phrases.chineseFirst"));
  } else if (supportedLanguages.length === 1 && supportedLanguages[0] === "en") {
    phrases.push(t("modelSelector.scenarios.phrases.englishOnly"));
  } else if (supportedLanguages.length >= 2) {
    phrases.push(t("modelSelector.scenarios.phrases.multilingual"));
  }

  if (modelId.includes("sense-voice") || modelId.includes("breeze")) {
    phrases.push(t("modelSelector.scenarios.phrases.codeSwitch"));
  }

  if (model.speed_score >= 0.78 || /sense-voice|moonshine|flash|turbo/.test(modelId)) {
    phrases.push(t("modelSelector.scenarios.phrases.lowLatency"));
  } else if (model.accuracy_score >= 0.78 || /large|cohere|medium/.test(modelId)) {
    phrases.push(t("modelSelector.scenarios.phrases.highAccuracy"));
  } else if (model.speed_score >= 0.6 && model.accuracy_score >= 0.6) {
    phrases.push(t("modelSelector.scenarios.phrases.balanced"));
  }

  if (model.supports_translation) {
    phrases.push(t("modelSelector.scenarios.phrases.translation"));
  }

  phrases.push(t("modelSelector.scenarios.phrases.offline"));

  return t("modelSelector.scenarios.summary", {
    items: phrases.slice(0, 3).join(" / "),
  });
};

export type ModelCardStatus =
  | "downloadable"
  | "downloading"
  | "verifying"
  | "extracting"
  | "switching"
  | "active"
  | "available";

interface ModelCardProps {
  model: ModelInfo;
  variant?: "default" | "featured";
  status?: ModelCardStatus;
  disabled?: boolean;
  className?: string;
  onSelect: (modelId: string) => void;
  onDownload?: (modelId: string) => void;
  onDelete?: (modelId: string) => void;
  onCancel?: (modelId: string) => void;
  downloadProgress?: number;
  downloadSpeed?: number; // MB/s
  showRecommended?: boolean;
}

const ModelCard: React.FC<ModelCardProps> = ({
  model,
  variant = "default",
  status = "downloadable",
  disabled = false,
  className = "",
  onSelect,
  onDownload,
  onDelete,
  onCancel,
  downloadProgress,
  downloadSpeed,
  showRecommended = true,
}) => {
  const { t } = useTranslation();
  const isFeatured = variant === "featured";
  const isClickable =
    status === "available" || status === "active" || status === "downloadable";

  // Get translated model name and description
  const displayName = getTranslatedModelName(model, t);
  const displayDescription = getTranslatedModelDescription(model, t);
  const scenarioBadges = getScenarioBadges(model, t);
  const scenarioSummary = getScenarioSummary(model, t);

  const baseClasses =
    "group relative flex flex-col gap-2.5 overflow-hidden rounded-[24px] border px-5 py-4 text-left transition-all duration-200";

  const getVariantClasses = () => {
    if (status === "active") {
      return "border-[#7b6ef6]/24 bg-white/[0.042] shadow-[0_16px_34px_rgba(123,110,246,0.08)]";
    }
    if (isFeatured) {
      return "border-[#7b6ef6]/24 bg-white/[0.045] shadow-[0_18px_36px_rgba(123,110,246,0.1)]";
    }
    return "border-white/10 bg-white/[0.035]";
  };

  const getInteractiveClasses = () => {
    if (!isClickable) return "";
    if (disabled) return "opacity-50 cursor-not-allowed";
    return "cursor-pointer hover:border-[#7b6ef6]/34 hover:bg-white/[0.04] hover:shadow-[0_24px_44px_rgba(0,0,0,0.24)] hover:-translate-y-0.5 active:translate-y-0";
  };

  const handleClick = () => {
    if (!isClickable || disabled) return;
    if (status === "downloadable" && onDownload) {
      onDownload(model.id);
    } else {
      onSelect(model.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(model.id);
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" && isClickable) handleClick();
      }}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={[
        baseClasses,
        getVariantClasses(),
        getInteractiveClasses(),
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_24%)]" />
      <div className="pointer-events-none absolute right-0 top-0 h-px w-24 bg-[linear-gradient(90deg,transparent,rgba(123,110,246,0.35))]" />
      {/* Top section: name/description + score bars */}
      <div className="relative flex w-full items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col items-start">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3
              className={`text-base font-semibold text-white transition-colors ${isClickable ? "group-hover:text-[#d8d6ff]" : ""}`}
            >
              {displayName}
            </h3>
            {showRecommended && model.is_recommended && (
              <Badge variant="primary">{t("onboarding.recommended")}</Badge>
            )}
            {status === "active" && (
              <Badge variant="primary">
                <Check className="w-3 h-3 mr-1" />
                {t("modelSelector.active")}
              </Badge>
            )}
            {model.is_custom && (
              <Badge variant="secondary">{t("modelSelector.custom")}</Badge>
            )}
            {status === "switching" && (
              <Badge variant="secondary">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                {t("modelSelector.switching")}
              </Badge>
            )}
          </div>
          <p className="mt-1.5 text-[13px] leading-7 text-white/60">
            {displayDescription}
          </p>
          <p className="mt-2 text-[12px] leading-6 text-[#aab7ff]/68">
            {scenarioSummary}
          </p>
        </div>
        {(model.accuracy_score > 0 || model.speed_score > 0) && (
          <div className="hidden shrink-0 sm:flex sm:items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="w-16 text-end text-[10px] uppercase tracking-[0.16em] text-white/42">
                  {t("onboarding.modelCard.accuracy")}
                </p>
                <div className="h-1.5 w-14 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,rgba(94,162,255,0.96),rgba(123,110,246,0.98))]"
                    style={{ width: `${model.accuracy_score * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="w-16 text-end text-[10px] uppercase tracking-[0.16em] text-white/42">
                  {t("onboarding.modelCard.speed")}
                </p>
                <div className="h-1.5 w-14 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,rgba(94,162,255,0.96),rgba(123,110,246,0.98))]"
                    style={{ width: `${model.speed_score * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <hr className="relative w-full border-white/8" />

      {/* Bottom row: tags + action buttons (full width) */}
      <div className="relative flex min-h-6 w-full flex-wrap items-center gap-2.5">
        {scenarioBadges.map((badge) => (
          <Badge key={badge.key} variant={badge.tone}>
            {badge.label}
          </Badge>
        ))}
        {model.supported_languages.length > 0 && (
          <div
            className="flex items-center gap-1 text-[11px] text-white/48"
            title={
              model.supported_languages.length === 1
                ? t("modelSelector.capabilities.singleLanguage")
                : t("modelSelector.capabilities.languageSelection")
            }
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{getLanguageDisplayText(model.supported_languages, t)}</span>
          </div>
        )}
        {model.supports_translation && (
          <div
            className="flex items-center gap-1 text-[11px] text-white/48"
            title={t("modelSelector.capabilities.translation")}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{t("modelSelector.capabilities.translate")}</span>
          </div>
        )}
        {status === "downloadable" && (
          <div className="ms-auto flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/52">
              <Download className="w-3.5 h-3.5" />
              <span>{formatModelSize(Number(model.size_mb))}</span>
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDownload?.(model.id);
              }}
              className="text-white/84"
            >
              {t("common.download")}
            </Button>
          </div>
        )}
        {onDelete && (status === "available" || status === "active") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            title={t("modelSelector.deleteModel", { modelName: displayName })}
            className="ms-auto flex items-center gap-1.5 text-white/62 hover:bg-white/[0.06] hover:text-white"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t("common.delete")}</span>
          </Button>
        )}
      </div>

      {/* Download/extract progress */}
      {status === "downloading" && downloadProgress !== undefined && (
        <div className="relative mt-1 w-full rounded-[16px] border border-white/8 bg-white/[0.025] px-3 py-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,rgba(94,162,255,0.96),rgba(123,110,246,0.98))] transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-white/54">
              {t("modelSelector.downloading", {
                percentage: Math.round(downloadProgress),
              })}
            </span>
            <div className="flex items-center gap-2">
              {downloadSpeed !== undefined && downloadSpeed > 0 && (
                <span className="tabular-nums text-white/44">
                  {t("modelSelector.downloadSpeed", {
                    speed: downloadSpeed.toFixed(1),
                  })}
                </span>
              )}
              {onCancel && (
                <Button
                  variant="danger-ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onCancel(model.id);
                  }}
                  aria-label={t("modelSelector.cancelDownload")}
                >
                  {t("modelSelector.cancel")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      {status === "verifying" && (
        <div className="mt-1 w-full rounded-[16px] border border-white/8 bg-white/[0.025] px-3 py-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-full animate-pulse rounded-full bg-[linear-gradient(90deg,rgba(94,162,255,0.96),rgba(123,110,246,0.98))]" />
          </div>
          <p className="mt-2 text-xs text-white/54">
            {t("modelSelector.verifyingGeneric")}
          </p>
        </div>
      )}
      {status === "extracting" && (
        <div className="mt-1 w-full rounded-[16px] border border-white/8 bg-white/[0.025] px-3 py-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-full animate-pulse rounded-full bg-[linear-gradient(90deg,rgba(94,162,255,0.96),rgba(123,110,246,0.98))]" />
          </div>
          <p className="mt-2 text-xs text-white/54">
            {t("modelSelector.extractingGeneric")}
          </p>
        </div>
      )}
    </div>
  );
};

export default ModelCard;
