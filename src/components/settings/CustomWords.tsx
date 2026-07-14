import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../hooks/useSettings";
import { SettingContainer } from "../ui/SettingContainer";
import { DictionaryManager } from "./DictionaryManager";

interface CustomWordsProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const CustomWords: React.FC<CustomWordsProps> = React.memo(
  ({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { getSetting } = useSettings();
    const [showManager, setShowManager] = useState(false);
    const wordCount = (getSetting("custom_words") || []).length;

    return (
      <>
        <SettingContainer
          title={t("settings.advanced.customWords.title")}
          description={t("settings.advanced.customWords.description")}
          descriptionMode={descriptionMode}
          grouped={grouped}
        >
          <button
            onClick={() => setShowManager(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#8a7dff]/25 bg-[#8a7dff]/12 px-4 py-2 text-[13px] font-medium text-[#c4bfff] transition-colors hover:bg-[#8a7dff]/20 cursor-pointer whitespace-nowrap"
          >
            {t("common.manage") || "管理"}
            {wordCount > 0 ? ` (${wordCount})` : ""}
          </button>
        </SettingContainer>

        {showManager && (
          <DictionaryManager
            onClose={() => setShowManager(false)}
          />
        )}
      </>
    );
  },
);
