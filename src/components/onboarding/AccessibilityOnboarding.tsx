import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { platform } from "@tauri-apps/plugin-os";
import {
  checkAccessibilityPermission,
  requestAccessibilityPermission,
  checkMicrophonePermission,
  requestMicrophonePermission,
} from "tauri-plugin-macos-permissions-api";
import { toast } from "sonner";
import { commands } from "@/bindings";
import { useSettingsStore } from "@/stores/settingsStore";
import EchoTextLogo from "../icons/EchoTextLogo";
import { Keyboard, Mic, Check, Loader2 } from "lucide-react";

interface AccessibilityOnboardingProps {
  onComplete: () => void;
}

type PermissionStatus = "checking" | "needed" | "waiting" | "granted";
type PermissionPlatform = "macos" | "windows" | "other";

interface PermissionsState {
  accessibility: PermissionStatus;
  microphone: PermissionStatus;
}

const AccessibilityOnboarding: React.FC<AccessibilityOnboardingProps> = ({
  onComplete,
}) => {
  const { t } = useTranslation();
  const refreshAudioDevices = useSettingsStore(
    (state) => state.refreshAudioDevices,
  );
  const refreshOutputDevices = useSettingsStore(
    (state) => state.refreshOutputDevices,
  );
  const [permissionPlatform, setPermissionPlatform] =
    useState<PermissionPlatform | null>(null);
  const [permissions, setPermissions] = useState<PermissionsState>({
    accessibility: "checking",
    microphone: "checking",
  });
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorCountRef = useRef<number>(0);
  const MAX_POLLING_ERRORS = 3;

  const isMacOS = permissionPlatform === "macos";
  const isWindows = permissionPlatform === "windows";
  const showMicrophonePermission = isMacOS || isWindows;
  const showAccessibilityPermission = isMacOS;

  const allGranted = isMacOS
    ? permissions.accessibility === "granted" &&
      permissions.microphone === "granted"
    : isWindows
      ? permissions.microphone === "granted"
      : true;

  const completeOnboarding = useCallback(async () => {
    await Promise.all([refreshAudioDevices(), refreshOutputDevices()]);
    timeoutRef.current = setTimeout(() => onComplete(), 300);
  }, [onComplete, refreshAudioDevices, refreshOutputDevices]);

  const hasWindowsMicrophoneAccess = useCallback(async (): Promise<boolean> => {
    const microphoneStatus =
      await commands.getWindowsMicrophonePermissionStatus();

    if (!microphoneStatus.supported) {
      return true;
    }

    return microphoneStatus.overall_access !== "denied";
  }, []);

  // Check platform and permission status on mount
  useEffect(() => {
    const currentPlatform = platform();
    const nextPlatform: PermissionPlatform =
      currentPlatform === "macos"
        ? "macos"
        : currentPlatform === "windows"
          ? "windows"
          : "other";

    setPermissionPlatform(nextPlatform);

    // Skip immediately on unsupported platforms
    if (nextPlatform === "other") {
      onComplete();
      return;
    }

    const checkInitial = async () => {
      if (nextPlatform === "macos") {
        try {
          const [accessibilityGranted, microphoneGranted] = await Promise.all([
            checkAccessibilityPermission(),
            checkMicrophonePermission(),
          ]);

          // If accessibility is granted, initialize Enigo and shortcuts
          if (accessibilityGranted) {
            try {
              await Promise.all([
                commands.initializeEnigo(),
                commands.initializeShortcuts(),
              ]);
            } catch (e) {
              console.warn("Failed to initialize after permission grant:", e);
            }
          }

          const newState: PermissionsState = {
            accessibility: accessibilityGranted ? "granted" : "needed",
            microphone: microphoneGranted ? "granted" : "needed",
          };

          setPermissions(newState);

          if (accessibilityGranted && microphoneGranted) {
            await completeOnboarding();
          }
        } catch (error) {
          console.error("Failed to check macOS permissions:", error);
          toast.error(t("onboarding.permissions.errors.checkFailed"));
          setPermissions({
            accessibility: "needed",
            microphone: "needed",
          });
        }

        return;
      }

      try {
        const microphoneGranted = await hasWindowsMicrophoneAccess();

        setPermissions({
          accessibility: "granted",
          microphone: microphoneGranted ? "granted" : "needed",
        });

        if (microphoneGranted) {
          await completeOnboarding();
        }
      } catch (error) {
        console.warn("Failed to check Windows microphone permissions:", error);
        setPermissions({
          accessibility: "granted",
          microphone: "granted",
        });
        await completeOnboarding();
      }
    };

    checkInitial();
  }, [completeOnboarding, hasWindowsMicrophoneAccess, onComplete, t]);

  // Polling for permissions after user clicks a button
  const startPolling = useCallback(() => {
    if (pollingRef.current || permissionPlatform === null) return;

    pollingRef.current = setInterval(async () => {
      try {
        if (permissionPlatform === "windows") {
          const microphoneGranted = await hasWindowsMicrophoneAccess();

          if (microphoneGranted) {
            setPermissions((prev) => ({ ...prev, microphone: "granted" }));

            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }

            await completeOnboarding();
          }

          errorCountRef.current = 0;
          return;
        }

        const [accessibilityGranted, microphoneGranted] = await Promise.all([
          checkAccessibilityPermission(),
          checkMicrophonePermission(),
        ]);

        setPermissions((prev) => {
          const newState = { ...prev };

          if (accessibilityGranted && prev.accessibility !== "granted") {
            newState.accessibility = "granted";
            // Initialize Enigo and shortcuts when accessibility is granted
            Promise.all([
              commands.initializeEnigo(),
              commands.initializeShortcuts(),
            ]).catch((e) => {
              console.warn("Failed to initialize after permission grant:", e);
            });
          }

          if (microphoneGranted && prev.microphone !== "granted") {
            newState.microphone = "granted";
          }

          return newState;
        });

        // If both granted, stop polling, refresh audio devices, and proceed
        if (accessibilityGranted && microphoneGranted) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          await completeOnboarding();
        }

        // Reset error count on success
        errorCountRef.current = 0;
      } catch (error) {
        console.error("Error checking permissions:", error);
        errorCountRef.current += 1;

        if (errorCountRef.current >= MAX_POLLING_ERRORS) {
          // Stop polling after too many consecutive errors
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          toast.error(t("onboarding.permissions.errors.checkFailed"));
        }
      }
    }, 1000);
  }, [completeOnboarding, hasWindowsMicrophoneAccess, permissionPlatform, t]);

  // Cleanup polling and timeouts on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleGrantAccessibility = async () => {
    try {
      await requestAccessibilityPermission();
      setPermissions((prev) => ({ ...prev, accessibility: "waiting" }));
      startPolling();
    } catch (error) {
      console.error("Failed to request accessibility permission:", error);
      toast.error(t("onboarding.permissions.errors.requestFailed"));
    }
  };

  const handleGrantMicrophone = async () => {
    try {
      if (isWindows) {
        await commands.openMicrophonePrivacySettings();
      } else {
        await requestMicrophonePermission();
      }

      setPermissions((prev) => ({ ...prev, microphone: "waiting" }));
      startPolling();
    } catch (error) {
      console.error("Failed to request microphone permission:", error);
      toast.error(t("onboarding.permissions.errors.requestFailed"));
    }
  };

  const isChecking =
    permissionPlatform === null ||
    (isMacOS &&
      permissions.accessibility === "checking" &&
      permissions.microphone === "checking") ||
    (isWindows && permissions.microphone === "checking");

  // Still checking platform/initial permissions
  if (isChecking) {
    return (
      <div className="app-shell">
        <div className="app-window flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <EchoTextLogo width={120} />
            <Loader2 className="h-8 w-8 animate-spin text-white/50" />
          </div>
        </div>
      </div>
    );
  }

  // All permissions granted - show success briefly
  if (allGranted) {
    return (
      <div className="app-shell">
        <div className="app-window flex flex-col items-center justify-center gap-4">
          <EchoTextLogo width={120} />
          <div className="rounded-full bg-emerald-500/20 p-4">
            <Check className="h-12 w-12 text-emerald-400" />
          </div>
          <p className="text-lg font-medium text-white">
            {t("onboarding.permissions.allGranted")}
          </p>
        </div>
      </div>
    );
  }

  // Show permissions request screen
  return (
    <div className="app-shell">
      <div className="app-window">
        <div className="app-scroll-area">
          <div className="mx-auto flex max-w-5xl flex-col gap-5 px-6 py-8">
            <div className="flex items-center gap-4 px-1">
              <EchoTextLogo width={124} />
              <div className="min-w-0">
                <h2 className="app-panel-title text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                  {t("onboarding.permissions.title")}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-white/66 sm:text-[15px]">
                  {t("onboarding.permissions.description")}
                </p>
              </div>
            </div>

            <div className="grid w-full max-w-3xl gap-4">
              {showMicrophonePermission && (
                <div className="app-panel p-5">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 rounded-2xl border border-white/8 bg-white/[0.04] p-3">
                      <Mic className="h-6 w-6 text-[#8a7dff]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white">
                        {t("onboarding.permissions.microphone.title")}
                      </h3>
                      <p className="mb-4 mt-2 text-sm text-white/60">
                        {t("onboarding.permissions.microphone.description")}
                      </p>
                      {permissions.microphone === "granted" ? (
                        <div className="flex items-center gap-2 text-sm text-emerald-400">
                          <Check className="h-4 w-4" />
                          {t("onboarding.permissions.granted")}
                        </div>
                      ) : permissions.microphone === "waiting" ? (
                        <div className="flex items-center gap-2 text-sm text-white/50">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t("onboarding.permissions.waiting")}
                        </div>
                      ) : (
                        <button
                          onClick={handleGrantMicrophone}
                          className="rounded-xl border border-[#7b6ef6]/30 bg-[linear-gradient(135deg,rgba(123,110,246,0.92),rgba(94,162,255,0.72))] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_28px_rgba(123,110,246,0.2)] transition hover:brightness-110"
                        >
                          {isWindows
                            ? t("accessibility.openSettings")
                            : t("onboarding.permissions.grant")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {showAccessibilityPermission && (
                <div className="app-panel p-5">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 rounded-2xl border border-white/8 bg-white/[0.04] p-3">
                      <Keyboard className="h-6 w-6 text-[#8a7dff]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white">
                        {t("onboarding.permissions.accessibility.title")}
                      </h3>
                      <p className="mb-4 mt-2 text-sm text-white/60">
                        {t("onboarding.permissions.accessibility.description")}
                      </p>
                      {permissions.accessibility === "granted" ? (
                        <div className="flex items-center gap-2 text-sm text-emerald-400">
                          <Check className="h-4 w-4" />
                          {t("onboarding.permissions.granted")}
                        </div>
                      ) : permissions.accessibility === "waiting" ? (
                        <div className="flex items-center gap-2 text-sm text-white/50">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t("onboarding.permissions.waiting")}
                        </div>
                      ) : (
                        <button
                          onClick={handleGrantAccessibility}
                          className="rounded-xl border border-[#7b6ef6]/30 bg-[linear-gradient(135deg,rgba(123,110,246,0.92),rgba(94,162,255,0.72))] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_28px_rgba(123,110,246,0.2)] transition hover:brightness-110"
                        >
                          {t("onboarding.permissions.grant")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessibilityOnboarding;
