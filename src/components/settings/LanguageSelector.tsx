import React, { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SettingContainer } from "../ui/SettingContainer";
import { ResetButton } from "../ui/ResetButton";
import { useSettings } from "../../hooks/useSettings";
import { LANGUAGES, getNativeLanguageLabel } from "../../lib/constants/languages";
import { createPortal } from "react-dom";
import { useFloatingMenuPosition } from "../ui/useFloatingMenuPosition";

interface LanguageSelectorProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
  supportedLanguages?: string[];
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  descriptionMode = "tooltip",
  grouped = false,
  supportedLanguages,
}) => {
  const { t } = useTranslation();
  const { getSetting, updateSetting, resetSetting, isUpdating } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { menuRef, menuStyle } = useFloatingMenuPosition(dropdownRef, isOpen, {
    maxHeight: 336,
  });

  const selectedLanguage = getSetting("selected_language") || "auto";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        (!menuRef.current || !menuRef.current.contains(target))
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const availableLanguages = useMemo(() => {
    if (!supportedLanguages || supportedLanguages.length === 0)
      return LANGUAGES;
    return LANGUAGES.filter(
      (lang) =>
        lang.value === "auto" || supportedLanguages.includes(lang.value),
    );
  }, [supportedLanguages]);

  const filteredLanguages = useMemo(
    () =>
      availableLanguages.filter((language) =>
        `${language.label} ${getNativeLanguageLabel(language.value)}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
      ),
    [searchQuery, availableLanguages],
  );

  const selectedLanguageName = LANGUAGES.find(
    (lang) => lang.value === selectedLanguage,
  )
    ? getNativeLanguageLabel(selectedLanguage)
    : t("settings.general.language.auto");

  const handleLanguageSelect = async (languageCode: string) => {
    await updateSetting("selected_language", languageCode);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleReset = async () => {
    await resetSetting("selected_language");
  };

  const handleToggle = () => {
    if (isUpdating("selected_language")) return;
    setIsOpen(!isOpen);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && filteredLanguages.length > 0) {
      // Select first filtered language on Enter
      handleLanguageSelect(filteredLanguages[0].value);
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <SettingContainer
      title={t("settings.general.language.title")}
      description={t("settings.general.language.description")}
      descriptionMode={descriptionMode}
      grouped={grouped}
    >
      <div className="flex items-center justify-end space-x-1">
        <div className="relative w-[240px] max-w-full" ref={dropdownRef}>
          <button
            type="button"
            className={`flex w-full min-w-0 items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-start text-sm font-medium text-white transition-all duration-150 ${
              isUpdating("selected_language")
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer hover:border-white/16 hover:bg-white/[0.06]"
            }`}
            onClick={handleToggle}
            disabled={isUpdating("selected_language")}
          >
            <span className="min-w-0 flex-1 truncate whitespace-nowrap">
              {selectedLanguageName}
            </span>
            <svg
              className={`ms-2 h-4 w-4 shrink-0 transition-transform duration-200 ${
                isOpen ? "transform rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {isOpen &&
            !isUpdating("selected_language") &&
            menuStyle &&
            createPortal(
              <div
                ref={menuRef}
                style={menuStyle}
                className="overflow-hidden rounded-[18px] border border-white/10 bg-[#0d111a]/96 shadow-2xl backdrop-blur-xl"
              >
                <div className="border-b border-white/8 p-2">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onKeyDown={handleKeyDown}
                    placeholder={t("settings.general.language.searchPlaceholder")}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/34 focus:border-[#8a7dff]/36 focus:bg-white/[0.08] focus:outline-none"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto">
                  {filteredLanguages.length === 0 ? (
                    <div className="px-3 py-3 text-center text-sm text-white/42">
                      {t("settings.general.language.noResults")}
                    </div>
                  ) : (
                    filteredLanguages.map((language) => (
                      <button
                        key={language.value}
                        type="button"
                        className={`w-full px-3 py-2 text-start text-sm transition-colors duration-150 ${
                          selectedLanguage === language.value
                            ? "bg-[#7b6ef6]/18 font-semibold text-[#d8d6ff]"
                            : ""
                        } ${selectedLanguage === language.value ? "" : "text-white/78 hover:bg-white/[0.05]"}`}
                        onClick={() => handleLanguageSelect(language.value)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="min-w-0 truncate">
                            {getNativeLanguageLabel(language.value)}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>,
              document.body,
            )}
        </div>
        <ResetButton
          onClick={handleReset}
          disabled={isUpdating("selected_language")}
        />
      </div>
      {isUpdating("selected_language") && (
        <div className="absolute inset-0 flex items-center justify-center rounded-[18px] bg-[#0d111a]/68 backdrop-blur-sm">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#8a7dff] border-t-transparent"></div>
        </div>
      )}
    </SettingContainer>
  );
};
