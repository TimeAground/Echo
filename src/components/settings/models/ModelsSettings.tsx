import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ask } from "@tauri-apps/plugin-dialog";
import { ChevronDown, Globe, Layers3 } from "lucide-react";
import { createPortal } from "react-dom";
import type { ModelCardStatus } from "@/components/onboarding";
import { ModelCard } from "@/components/onboarding";
import { useModelStore } from "@/stores/modelStore";
import {
  LANGUAGES,
  getNativeLanguageLabel,
} from "@/lib/constants/languages.ts";
import type { ModelInfo } from "@/bindings";
import { useFloatingMenuPosition } from "@/components/ui/useFloatingMenuPosition";

// check if model supports a language based on its supported_languages list
const modelSupportsLanguage = (model: ModelInfo, langCode: string): boolean => {
  return model.supported_languages.includes(langCode);
};

export const ModelsSettings: React.FC = () => {
  const { t } = useTranslation();
  const [switchingModelId, setSwitchingModelId] = useState<string | null>(null);
  const [languageFilter, setLanguageFilter] = useState("all");
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const languageSearchInputRef = useRef<HTMLInputElement>(null);
  const { menuRef, menuStyle } = useFloatingMenuPosition(
    languageDropdownRef,
    languageDropdownOpen,
    { maxHeight: 336 },
  );
  const {
    models,
    currentModel,
    downloadingModels,
    downloadProgress,
    downloadStats,
    verifyingModels,
    extractingModels,
    loading,
    downloadModel,
    cancelDownload,
    selectModel,
    deleteModel,
  } = useModelStore();

  // click outside handler for language dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        languageDropdownRef.current &&
        !languageDropdownRef.current.contains(target) &&
        (!menuRef.current || !menuRef.current.contains(target))
      ) {
        setLanguageDropdownOpen(false);
        setLanguageSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  // focus search input when dropdown opens
  useEffect(() => {
    if (languageDropdownOpen && languageSearchInputRef.current) {
      languageSearchInputRef.current.focus();
    }
  }, [languageDropdownOpen]);

  // filtered languages for dropdown (exclude "auto")
  const filteredLanguages = useMemo(() => {
    return LANGUAGES.filter(
      (lang) =>
        lang.value !== "auto" &&
        `${lang.label} ${getNativeLanguageLabel(lang.value)}`
          .toLowerCase()
          .includes(languageSearch.toLowerCase()),
    );
  }, [languageSearch]);

  // Get selected language label
  const selectedLanguageLabel = useMemo(() => {
    if (languageFilter === "all") {
      return t("settings.models.filters.allLanguages");
    }
    return LANGUAGES.find((lang) => lang.value === languageFilter)
      ? getNativeLanguageLabel(languageFilter)
      : "";
  }, [languageFilter, t]);

  const isLanguageFilterActive = languageFilter !== "all";

  const getModelStatus = (modelId: string): ModelCardStatus => {
    if (modelId in extractingModels) {
      return "extracting";
    }
    if (modelId in verifyingModels) {
      return "verifying";
    }
    if (modelId in downloadingModels) {
      return "downloading";
    }
    if (switchingModelId === modelId) {
      return "switching";
    }
    if (modelId === currentModel) {
      return "active";
    }
    const model = models.find((m: ModelInfo) => m.id === modelId);
    if (model?.is_downloaded) {
      return "available";
    }
    return "downloadable";
  };

  const getDownloadProgress = (modelId: string): number | undefined => {
    const progress = downloadProgress[modelId];
    return progress?.percentage;
  };

  const getDownloadSpeed = (modelId: string): number | undefined => {
    const stats = downloadStats[modelId];
    return stats?.speed;
  };

  const handleModelSelect = async (modelId: string) => {
    setSwitchingModelId(modelId);
    try {
      await selectModel(modelId);
    } finally {
      setSwitchingModelId(null);
    }
  };

  const handleModelDownload = async (modelId: string) => {
    await downloadModel(modelId);
  };

  const handleModelDelete = async (modelId: string) => {
    const model = models.find((m: ModelInfo) => m.id === modelId);
    const modelName = model?.name || modelId;
    const isActive = modelId === currentModel;

    const confirmed = await ask(
      isActive
        ? t("settings.models.deleteActiveConfirm", { modelName })
        : t("settings.models.deleteConfirm", { modelName }),
      {
        title: t("settings.models.deleteTitle"),
        kind: "warning",
      },
    );

    if (confirmed) {
      try {
        await deleteModel(modelId);
      } catch (err) {
        console.error(`Failed to delete model ${modelId}:`, err);
      }
    }
  };

  const handleModelCancel = async (modelId: string) => {
    try {
      await cancelDownload(modelId);
    } catch (err) {
      console.error(`Failed to cancel download for ${modelId}:`, err);
    }
  };

  // Filter models based on language filter
  const filteredModels = useMemo(() => {
    return models.filter((model: ModelInfo) => {
      if (languageFilter !== "all") {
        if (!modelSupportsLanguage(model, languageFilter)) return false;
      }
      return true;
    });
  }, [models, languageFilter]);

  // Split filtered models into downloaded (including custom) and available sections
  const { downloadedModels, availableModels } = useMemo(() => {
    const downloaded: ModelInfo[] = [];
    const available: ModelInfo[] = [];

    for (const model of filteredModels) {
      if (
        model.is_custom ||
        model.is_downloaded ||
        model.id in downloadingModels ||
        model.id in extractingModels
      ) {
        downloaded.push(model);
      } else {
        available.push(model);
      }
    }

    // Sort: active model first, then non-custom, then custom at the bottom
    downloaded.sort((a, b) => {
      if (a.id === currentModel) return -1;
      if (b.id === currentModel) return 1;
      if (a.is_custom !== b.is_custom) return a.is_custom ? 1 : -1;
      return 0;
    });

    return {
      downloadedModels: downloaded,
      availableModels: available,
    };
  }, [filteredModels, downloadingModels, extractingModels, currentModel]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <div className="app-panel flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#7b6ef6] border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      {filteredModels.length > 0 ? (
        <div className="space-y-6">
          <div className="app-panel px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/8 bg-white/[0.04] text-[#cfd6ff]">
                  <Layers3 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-white/88">
                    {t("settings.models.yourModels")}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/42">
                    <span>
                      {t("settings.models.yourModels")} {downloadedModels.length}
                    </span>
                    {availableModels.length > 0 && (
                      <span>
                        {t("settings.models.availableModels")} {availableModels.length}
                      </span>
                    )}
                    {isLanguageFilterActive && (
                      <span className="rounded-full border border-[#7b6ef6]/18 bg-[#7b6ef6]/12 px-2 py-0.5 text-[#d8d6ff]">
                        {selectedLanguageLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div
                className="relative w-full min-w-0 sm:w-[240px]"
                ref={languageDropdownRef}
              >
                <button
                  type="button"
                  onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                  className={`flex w-full min-w-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all ${
                    isLanguageFilterActive
                      ? "border-[#7b6ef6]/30 bg-[#7b6ef6]/16 text-[#d8d6ff]"
                      : "border-white/10 bg-white/[0.04] text-white/62 hover:border-white/16 hover:bg-white/[0.06]"
                  }`}
                >
                  <Globe className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate whitespace-nowrap text-left">
                    {selectedLanguageLabel}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                      languageDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {languageDropdownOpen &&
                  menuStyle &&
                  createPortal(
                    <div
                      ref={menuRef}
                      style={menuStyle}
                      className="overflow-hidden rounded-[18px] border border-white/10 bg-[#0d111a]/96 shadow-2xl backdrop-blur-xl"
                    >
                      <div className="border-b border-white/6 p-2.5">
                        <input
                          ref={languageSearchInputRef}
                          type="text"
                          value={languageSearch}
                          onChange={(e) => setLanguageSearch(e.target.value)}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" &&
                              filteredLanguages.length > 0
                            ) {
                              setLanguageFilter(filteredLanguages[0].value);
                              setLanguageDropdownOpen(false);
                              setLanguageSearch("");
                            } else if (e.key === "Escape") {
                              setLanguageDropdownOpen(false);
                              setLanguageSearch("");
                            }
                          }}
                          placeholder={t(
                            "settings.general.language.searchPlaceholder",
                          )}
                          className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/34 focus:border-[#7b6ef6]/34 focus:outline-none"
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto p-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setLanguageFilter("all");
                            setLanguageDropdownOpen(false);
                            setLanguageSearch("");
                          }}
                          className={`w-full rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                            languageFilter === "all"
                              ? "bg-[#7b6ef6]/18 text-[#d8d6ff]"
                              : "text-white/72 hover:bg-white/[0.05]"
                          }`}
                        >
                          {t("settings.models.filters.allLanguages")}
                        </button>
                        {filteredLanguages.map((lang) => (
                          <button
                            key={lang.value}
                            type="button"
                            onClick={() => {
                              setLanguageFilter(lang.value);
                              setLanguageDropdownOpen(false);
                              setLanguageSearch("");
                            }}
                            className={`w-full rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                              languageFilter === lang.value
                                ? "bg-[#7b6ef6]/18 text-[#d8d6ff]"
                                : "text-white/72 hover:bg-white/[0.05]"
                            }`}
                          >
                            {getNativeLanguageLabel(lang.value)}
                          </button>
                        ))}
                        {filteredLanguages.length === 0 && (
                          <div className="px-3 py-3 text-center text-sm text-white/42">
                            {t("settings.general.language.noResults")}
                          </div>
                        )}
                      </div>
                    </div>,
                    document.body,
                  )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <h2 className="text-[11px] font-medium uppercase tracking-[0.24em] text-[#a4b1ff]/70">
                {t("settings.models.yourModels")}
              </h2>
              <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5 text-[11px] text-white/42">
                {downloadedModels.length}
              </span>
            </div>
            {downloadedModels.map((model: ModelInfo) => (
              <ModelCard
                key={model.id}
                model={model}
                status={getModelStatus(model.id)}
                onSelect={handleModelSelect}
                onDownload={handleModelDownload}
                onDelete={handleModelDelete}
                onCancel={handleModelCancel}
                downloadProgress={getDownloadProgress(model.id)}
                downloadSpeed={getDownloadSpeed(model.id)}
                showRecommended={false}
              />
            ))}
          </div>

          {availableModels.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <h2 className="text-[11px] font-medium uppercase tracking-[0.24em] text-[#a4b1ff]/70">
                  {t("settings.models.availableModels")}
                </h2>
                <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5 text-[11px] text-white/42">
                  {availableModels.length}
                </span>
              </div>
              {availableModels.map((model: ModelInfo) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  status={getModelStatus(model.id)}
                  onSelect={handleModelSelect}
                  onDownload={handleModelDownload}
                  onDelete={handleModelDelete}
                  onCancel={handleModelCancel}
                  downloadProgress={getDownloadProgress(model.id)}
                  downloadSpeed={getDownloadSpeed(model.id)}
                  showRecommended={false}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="app-panel px-6 py-12 text-center">
          <div className="mx-auto max-w-md space-y-3">
            <p className="text-sm text-white/42">
              {t("settings.models.noModelsMatch")}
            </p>
            {isLanguageFilterActive && (
              <button
                type="button"
                onClick={() => setLanguageFilter("all")}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/78 transition hover:border-white/16 hover:bg-white/[0.08]"
              >
                {t("settings.models.filters.allLanguages")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
