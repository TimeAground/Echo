import React from "react";
import { useTranslation } from "react-i18next";
import { Cog, FlaskConical, History, Info, Sparkles, Cpu } from "lucide-react";
import EchoTextLogo from "./icons/EchoTextLogo";
import { MicIcon } from "lucide-react";
import { useSettings } from "../hooks/useSettings";
import {
  GeneralSettings,
  AdvancedSettings,
  HistorySettings,
  DebugSettings,
  AboutSettings,
  PostProcessingSettings,
  ModelsSettings,
} from "./settings";

export type SidebarSection = keyof typeof SECTIONS_CONFIG;

interface IconProps {
  width?: number | string;
  height?: number | string;
  size?: number | string;
  className?: string;
  [key: string]: any;
}

interface SectionConfig {
  labelKey: string;
  icon: React.ComponentType<IconProps>;
  component: React.ComponentType;
  enabled: (settings: any) => boolean;
}

export const SECTIONS_CONFIG = {
  general: {
    labelKey: "sidebar.general",
    icon: MicIcon,
    component: GeneralSettings,
    enabled: () => true,
  },
  models: {
    labelKey: "sidebar.models",
    icon: Cpu,
    component: ModelsSettings,
    enabled: () => true,
  },
  postprocessing: {
    labelKey: "sidebar.postProcessing",
    icon: Sparkles,
    component: PostProcessingSettings,
    enabled: () => true,
  },
  history: {
    labelKey: "sidebar.history",
    icon: History,
    component: HistorySettings,
    enabled: () => true,
  },
  advanced: {
    labelKey: "sidebar.advanced",
    icon: Cog,
    component: AdvancedSettings,
    enabled: () => true,
  },
  debug: {
    labelKey: "sidebar.debug",
    icon: FlaskConical,
    component: DebugSettings,
    enabled: (settings) => settings?.debug_mode ?? false,
  },
  about: {
    labelKey: "sidebar.about",
    icon: Info,
    component: AboutSettings,
    enabled: () => true,
  },
} as const satisfies Record<string, SectionConfig>;

interface SidebarProps {
  activeSection: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSectionChange,
}) => {
  const { t } = useTranslation();
  const { settings } = useSettings();

  const availableSections = Object.entries(SECTIONS_CONFIG)
    .filter(([_, config]) => config.enabled(settings))
    .map(([id, config]) => ({ id: id as SidebarSection, ...config }));

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-e border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_30%)] px-3 py-4">
      <div className="mb-4 px-3 pb-2 pt-1">
        <EchoTextLogo width={146} className="block max-w-full text-white" />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {availableSections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;

          return (
            <button
              key={section.id}
              type="button"
              className={`group relative flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
                isActive
                  ? "border-[#7b6ef6]/35 bg-[linear-gradient(135deg,rgba(123,110,246,0.26),rgba(94,162,255,0.14))] text-white shadow-[0_12px_28px_rgba(123,110,246,0.18)]"
                  : "border-white/0 bg-white/[0.02] text-white/72 hover:border-white/10 hover:bg-white/[0.05] hover:text-white"
              }`}
              onClick={() => onSectionChange(section.id)}
            >
              {isActive && (
                <span className="absolute inset-y-3 left-2 w-[3px] rounded-full bg-[linear-gradient(180deg,rgba(94,162,255,0.96),rgba(123,110,246,0.98))] shadow-[0_0_16px_rgba(123,110,246,0.32)]" />
              )}
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                  isActive
                    ? "border-white/15 bg-white/10 text-white"
                    : "border-white/6 bg-white/[0.03] text-white/65 group-hover:text-white/90"
                }`}
              >
                <Icon width={18} height={18} className="shrink-0" />
              </span>
              <span
                className="truncate text-sm font-medium"
                title={t(section.labelKey)}
              >
                {t(section.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
