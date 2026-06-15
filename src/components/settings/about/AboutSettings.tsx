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

export const AboutSettings: React.FC = () => {
  const { t } = useTranslation();
  const [version, setVersion] = useState("");
  const [modelPath, setModelPath] = useState("");

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
      <SettingsGroup title={t("settings.about.title")}>
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

      <SettingsGroup title={t("settings.about.acknowledgments.title")}>
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
      </SettingsGroup>
    </div>
  );
};
