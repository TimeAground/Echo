import React, { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { RefreshCcw } from "lucide-react";
import { commands } from "@/bindings";

import { Alert } from "../../ui/Alert";
import {
  Dropdown,
  SettingContainer,
  SettingsGroup,
  Textarea,
} from "@/components/ui";
import { ToggleSwitch } from "../../ui/ToggleSwitch";
import { Button } from "../../ui/Button";
import { ResetButton } from "../../ui/ResetButton";
import { Input } from "../../ui/Input";

import { ProviderSelect } from "../PostProcessingSettingsApi/ProviderSelect";
import { BaseUrlField } from "../PostProcessingSettingsApi/BaseUrlField";
import { ApiKeyField } from "../PostProcessingSettingsApi/ApiKeyField";
import { ModelSelect } from "../PostProcessingSettingsApi/ModelSelect";
import { usePostProcessProviderState } from "../PostProcessingSettingsApi/usePostProcessProviderState";
import { ShortcutInput } from "../ShortcutInput";
import { useSettings } from "../../../hooks/useSettings";

// #region debug-point A:postprocess-key-status
const __DBG_URL = "http://127.0.0.1:7777/event";
const __DBG_SESSION = "postprocess-key-status";
const __dbg = (hypothesisId: string, location: string, msg: string, data?: unknown) => {
  fetch(__DBG_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: __DBG_SESSION,
      runId: "pre-fix",
      hypothesisId,
      location,
      msg: `[DEBUG] ${msg}`,
      data,
      ts: Date.now(),
    }),
  }).catch(() => {});
};
// #endregion

const PostProcessingSettingsApiComponent: React.FC = () => {
  const { t } = useTranslation();
  const state = usePostProcessProviderState();

  const canFetchModels =
    !state.isAppleProvider &&
    (state.isCustomProvider
      ? state.baseUrl.trim().length > 0
      : state.hasSavedApiKey);

  const modelNoOptionsMessage = state.isFetchingModels
    ? t("settings.postProcessing.api.model.loading")
    : !canFetchModels
      ? state.isCustomProvider
        ? t("settings.postProcessing.api.model.noOptionsNeedsBaseUrl")
        : t("settings.postProcessing.api.model.noOptionsNeedsApiKey")
      : t("settings.postProcessing.api.model.noOptionsAfterRefresh");

  const handleModelMenuOpen = () => {
    if (
      canFetchModels &&
      state.modelOptions.length === 0 &&
      !state.isFetchingModels
    ) {
      state.handleRefreshModels();
    }
  };

  useEffect(() => {
    // #region debug-point E:apiTab-render
    __dbg("E", "PostProcessingSettings.tsx:api", "api tab render", {
      providerId: state.selectedProviderId,
      hasSavedApiKey: state.hasSavedApiKey,
      apiKeyValueLength: state.apiKey.length,
      canFetchModels,
      modelOptionsCount: state.modelOptions.length,
      isFetchingModels: state.isFetchingModels,
      modelNoOptionsMessage,
    });
    // #endregion
  }, [
    canFetchModels,
    modelNoOptionsMessage,
    state.apiKey.length,
    state.hasSavedApiKey,
    state.isFetchingModels,
    state.modelOptions.length,
    state.selectedProviderId,
  ]);

  return (
    <>
      <SettingContainer
        title={t("settings.postProcessing.api.provider.title")}
        description={t("settings.postProcessing.api.provider.description")}
        descriptionMode="tooltip"
        layout="horizontal"
        grouped={true}
      >
        <div className="w-full min-w-0">
          <ProviderSelect
            options={state.providerOptions}
            value={state.selectedProviderId}
            onChange={state.handleProviderSelect}
          />
        </div>
      </SettingContainer>

      {state.isAppleProvider ? (
        state.appleIntelligenceUnavailable ? (
          <Alert variant="error" contained>
            {t("settings.postProcessing.api.appleIntelligence.unavailable")}
          </Alert>
        ) : null
      ) : (
        <>
          {state.selectedProvider?.id === "custom" && (
            <SettingContainer
              title={t("settings.postProcessing.api.baseUrl.title")}
              description={t("settings.postProcessing.api.baseUrl.description")}
              descriptionMode="tooltip"
              layout="horizontal"
              grouped={true}
            >
              <div className="w-full min-w-0">
                <BaseUrlField
                  value={state.baseUrl}
                  onBlur={state.handleBaseUrlChange}
                  placeholder={t(
                    "settings.postProcessing.api.baseUrl.placeholder",
                  )}
                  disabled={state.isBaseUrlUpdating}
                  className="w-full"
                />
              </div>
            </SettingContainer>
          )}

          <SettingContainer
            title={t("settings.postProcessing.api.apiKey.title")}
            description={t("settings.postProcessing.api.apiKey.description")}
            descriptionMode="tooltip"
            layout="horizontal"
            grouped={true}
          >
            <div className="w-full min-w-0">
              <ApiKeyField
                value={state.apiKey}
                isMasked={state.isApiKeyMasked}
                onFocus={state.handleApiKeyFocus}
                onChange={state.handleApiKeyInput}
                onBlur={state.handleApiKeyChange}
                placeholder={t(
                  "settings.postProcessing.api.apiKey.placeholder",
                )}
                helperText={t(
                  state.hasSavedApiKey
                    ? "settings.postProcessing.api.apiKey.savedHelper"
                    : "settings.postProcessing.api.apiKey.emptyHelper",
                )}
                disabled={state.isApiKeyUpdating}
                className="w-full"
              />
            </div>
          </SettingContainer>
        </>
      )}

      {!state.isAppleProvider && (
        <SettingContainer
          title={t("settings.postProcessing.api.model.title")}
          description={
            state.isCustomProvider
              ? t("settings.postProcessing.api.model.descriptionCustom")
              : t("settings.postProcessing.api.model.descriptionDefault")
          }
          descriptionMode="tooltip"
          layout="stacked"
          grouped={true}
        >
          <div className="flex w-full min-w-0 items-center gap-2">
            <ModelSelect
              value={state.model}
              options={state.modelOptions}
              disabled={state.isModelUpdating}
              isLoading={state.isFetchingModels}
              placeholder={
                state.modelOptions.length > 0
                  ? t(
                      "settings.postProcessing.api.model.placeholderWithOptions",
                    )
                  : t("settings.postProcessing.api.model.placeholderNoOptions")
              }
              onSelect={state.handleModelSelect}
              onCreate={state.handleModelCreate}
              onBlur={() => {}}
              onMenuOpen={handleModelMenuOpen}
              className="flex-1 min-w-0"
              noOptionsMessage={modelNoOptionsMessage}
            />
            <ResetButton
              onClick={state.handleRefreshModels}
              disabled={state.isFetchingModels}
              ariaLabel={t("settings.postProcessing.api.model.refreshModels")}
              className="flex h-10 w-10 items-center justify-center"
            >
              <RefreshCcw
                className={`h-4 w-4 ${state.isFetchingModels ? "animate-spin" : ""}`}
              />
            </ResetButton>
          </div>
        </SettingContainer>
      )}
    </>
  );
};

export const PostProcessingSettingsApi = React.memo(
  PostProcessingSettingsApiComponent,
);
PostProcessingSettingsApi.displayName = "PostProcessingSettingsApi";

export const PostProcessingSettings: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting, updateSetting, isUpdating } = useSettings();
  const includeSelectedText =
    getSetting("post_process_include_selected_text") ?? true;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Alert variant="info" className="rounded-2xl border border-blue-400/10">
        {t("settings.postProcessing.pageNote")}
      </Alert>

      <SettingsGroup title={t("settings.postProcessing.hotkey.title")}>
        <ShortcutInput
          shortcutId="transcribe_with_post_process"
          descriptionMode="tooltip"
          grouped={true}
        />
      </SettingsGroup>

      <SettingsGroup title={t("settings.postProcessing.api.title")}>
        <PostProcessingSettingsApi />
        <ToggleSwitch
          checked={includeSelectedText}
          onChange={(enabled) =>
            updateSetting("post_process_include_selected_text", enabled)
          }
          isUpdating={isUpdating("post_process_include_selected_text")}
          label={t("settings.postProcessing.selectionContext.label")}
          description={t(
            "settings.postProcessing.selectionContext.description",
          )}
          descriptionMode="tooltip"
          grouped={true}
        />
      </SettingsGroup>
    </div>
  );
};
