import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { commands } from "@/bindings";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { SettingContainer } from "../../ui/SettingContainer";
import { AppDataDirectory } from "../AppDataDirectory";
import { AppLanguageSelector } from "../AppLanguageSelector";
import { PathDisplay } from "../../ui/PathDisplay";
import { LogDirectory } from "../debug";

const OPEN_SOURCE_DEPENDENCIES = [
  { name: "Tauri", url: "https://tauri.app" },
  { name: "React", url: "https://react.dev" },
  { name: "TypeScript", url: "https://www.typescriptlang.org" },
  { name: "Tailwind CSS", url: "https://tailwindcss.com" },
  { name: "Vite", url: "https://vite.dev" },
  { name: "i18next", url: "https://www.i18next.com" },
  { name: "Zustand", url: "https://zustand.docs.pmnd.rs" },
  { name: "Zod", url: "https://zod.dev" },
  { name: "Sonner", url: "https://sonner.emilkowal.ski" },
  { name: "Lucide", url: "https://lucide.dev" },
  { name: "react-markdown", url: "https://remark.js.org" },
  { name: "Whisper.cpp", url: "https://github.com/ggerganov/whisper.cpp" },
  { name: "SenseVoice", url: "https://github.com/FunAudioLLM/SenseVoice" },
  { name: "ONNX Runtime", url: "https://onnxruntime.ai" },
  { name: "handy-keys", url: "https://github.com/Tetralux/handy-keys" },
  { name: "cpal", url: "https://github.com/RustAudio/cpal" },
  { name: "rusqlite", url: "https://github.com/rusqlite/rusqlite" },
  { name: "tokio", url: "https://tokio.rs" },
  { name: "reqwest", url: "https://github.com/seanmonstar/reqwest" },
  { name: "Serde", url: "https://serde.rs" },
];

export const AboutSettings: React.FC = () => {
  const { t } = useTranslation();
  const [version, setVersion] = useState("");
  const [modelPath, setModelPath] = useState("");
  const [ossExpanded, setOssExpanded] = useState(false);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const appVersion = await getVersion();
        setVersion(appVersion);
      } catch (error) {
        console.error("Failed to get app version:", error);
        setVersion("0.1.2");
      }
    };

    fetchVersion();
  }, []);

  useEffect(() => {
    const fetchModelPath = async () => {
      try {
        const selectedPath = await invoke<string | null>("get_selected_model_path");
        setModelPath(selectedPath || "");
      } catch (error) {
        console.error("Failed to get selected model path:", error);
        setModelPath("");
      }
    };

    fetchModelPath();
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Positioning & Basics */}
      <SettingsGroup title={t("settings.about.title")}>
        {/* Positioning card */}
        <SettingContainer
          title={t("settings.about.positioning.title")}
          description={t("settings.about.positioning.description")}
          grouped={true}
          layout="stacked"
        >
          <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-7 text-white/56">
            {t("settings.about.positioning.details")}
          </div>
        </SettingContainer>

        <AppLanguageSelector descriptionMode="tooltip" grouped={true} />
        <SettingContainer
          title={t("settings.about.version.title")}
          description={t("settings.about.version.description")}
          grouped={true}
        >
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <span className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm font-mono text-white/82">
            v{version}
          </span>
        </SettingContainer>

        <SettingContainer
          title={t("settings.about.sourceCode.title")}
          description={t("settings.about.sourceCode.description")}
          grouped={true}
        >
          <button
            type="button"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/88 transition hover:border-white/16 hover:bg-white/[0.08]"
            onClick={() => openUrl("https://github.com/TimeAground/Echo")}
          >
            {t("settings.about.sourceCode.button")}
          </button>
        </SettingContainer>

        <AppDataDirectory descriptionMode="tooltip" grouped={true} />
        <LogDirectory grouped={true} />
        <SettingContainer
          title={t("settings.about.modelPath.title")}
          description={t("settings.about.modelPath.description")}
          grouped={true}
          layout="stacked"
        >
          {modelPath ? (
            <PathDisplay
              path={modelPath}
              onOpen={() => {
                void commands.openAppDataDir();
              }}
            />
          ) : (
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-white/50">
              {t("settings.about.modelPath.empty")}
            </div>
          )}
        </SettingContainer>
        <SettingContainer
          title={t("settings.about.license.title")}
          description={t("settings.about.license.description")}
          grouped={true}
        >
          <span className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm font-mono text-white/82">
            MIT
          </span>
        </SettingContainer>
      </SettingsGroup>

      {/* Privacy */}
      <SettingsGroup title={t("settings.about.privacy.title")}>
        <SettingContainer
          title={t("settings.about.privacy.local.title")}
          description={t("settings.about.privacy.local.description")}
          grouped={true}
          layout="stacked"
        >
          <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-7 text-white/56">
            {t("settings.about.privacy.local.details")}
          </div>
        </SettingContainer>
        <SettingContainer
          title={t("settings.about.privacy.postProcess.title")}
          description={t("settings.about.privacy.postProcess.description")}
          grouped={true}
          layout="stacked"
        >
          <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-7 text-white/56">
            {t("settings.about.privacy.postProcess.details")}
          </div>
        </SettingContainer>
      </SettingsGroup>

      {/* Acknowledgments */}
      <SettingsGroup title={t("settings.about.acknowledgments.title")}>
        <SettingContainer
          title={t("settings.about.acknowledgments.senseVoice.title")}
          description={t("settings.about.acknowledgments.senseVoice.description")}
          grouped={true}
          layout="stacked"
        >
          <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-7 text-white/56">
            {t("settings.about.acknowledgments.senseVoice.details")}
          </div>
        </SettingContainer>
        <SettingContainer
          title={t("settings.about.acknowledgments.whisper.title")}
          description={t("settings.about.acknowledgments.whisper.description")}
          grouped={true}
          layout="stacked"
        >
          <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-7 text-white/56">
            {t("settings.about.acknowledgments.whisper.details")}
          </div>
        </SettingContainer>

        {/* Open Source Dependencies */}
        <SettingContainer
          title={t("settings.about.acknowledgments.oss.title")}
          description={t("settings.about.acknowledgments.oss.description")}
          grouped={true}
          layout="stacked"
        >
          <div>
            <button
              type="button"
              onClick={() => setOssExpanded(!ossExpanded)}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/78 transition hover:border-white/16 hover:bg-white/[0.08]"
            >
              {ossExpanded
                ? t("settings.about.acknowledgments.oss.collapse")
                : t("settings.about.acknowledgments.oss.expand", {
                    count: OPEN_SOURCE_DEPENDENCIES.length,
                  })}
            </button>
            {ossExpanded && (
              <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {OPEN_SOURCE_DEPENDENCIES.map((dep) => (
                  <a
                    key={dep.name}
                    href={dep.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-white/62 transition hover:border-white/16 hover:bg-white/[0.06] hover:text-white/86"
                    onClick={(e) => {
                      e.preventDefault();
                      openUrl(dep.url);
                    }}
                  >
                    {dep.name}
                  </a>
                ))}
              </div>
            )}
          </div>
        </SettingContainer>
      </SettingsGroup>
    </div>
  );
};
