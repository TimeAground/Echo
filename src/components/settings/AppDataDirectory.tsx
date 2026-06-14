import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { commands } from "@/bindings";
import { SettingContainer } from "../ui/SettingContainer";
import { PathDisplay } from "../ui/PathDisplay";

interface AppDataDirectoryProps {
  descriptionMode?: "tooltip" | "inline";
  grouped?: boolean;
}

export const AppDataDirectory: React.FC<AppDataDirectoryProps> = ({
  descriptionMode = "inline",
  grouped = false,
}) => {
  const { t } = useTranslation();
  const [appDirPath, setAppDirPath] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAppDirectory = async () => {
      try {
        const result = await commands.getAppDirPath();
        if (result.status === "ok") {
          setAppDirPath(result.data);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load app directory",
        );
      } finally {
        setLoading(false);
      }
    };

    loadAppDirectory();
  }, []);

  const handleOpen = async () => {
    if (!appDirPath) return;
    try {
      await commands.openAppDataDir();
    } catch (openError) {
      console.error("Failed to open app data directory:", openError);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
        <div className="mb-3 h-4 w-1/3 rounded bg-white/8"></div>
        <div className="h-10 rounded-xl bg-white/6"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[20px] border border-red-400/16 bg-red-500/8 p-4">
        <p className="text-sm text-red-200/88">
          {t("errors.loadDirectory", { error })}
        </p>
      </div>
    );
  }

  return (
    <SettingContainer
      title={t("settings.about.appDataDirectory.title")}
      description={t("settings.about.appDataDirectory.description")}
      descriptionMode={descriptionMode}
      grouped={grouped}
      layout="stacked"
    >
      <PathDisplay
        path={appDirPath}
        onOpen={handleOpen}
        disabled={!appDirPath}
      />
    </SettingContainer>
  );
};
