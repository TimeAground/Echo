import { useCallback, useEffect, useMemo, useState } from "react";
import { useSettings } from "../../../hooks/useSettings";
import { commands, type PostProcessProvider } from "@/bindings";
import type { ModelOption } from "./types";
import type { DropdownOption } from "../../ui/Dropdown";

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

type PostProcessProviderState = {
  providerOptions: DropdownOption[];
  selectedProviderId: string;
  selectedProvider: PostProcessProvider | undefined;
  isCustomProvider: boolean;
  isAppleProvider: boolean;
  appleIntelligenceUnavailable: boolean;
  baseUrl: string;
  handleBaseUrlChange: (value: string) => void;
  isBaseUrlUpdating: boolean;
  apiKey: string;
  hasSavedApiKey: boolean;
  isApiKeyMasked: boolean;
  handleApiKeyFocus: () => void;
  handleApiKeyInput: (value: string) => void;
  handleApiKeyChange: (value: string) => void;
  isApiKeyUpdating: boolean;
  model: string;
  handleModelChange: (value: string) => void;
  modelOptions: ModelOption[];
  isModelUpdating: boolean;
  isFetchingModels: boolean;
  handleProviderSelect: (providerId: string) => void;
  handleModelSelect: (value: string) => void;
  handleModelCreate: (value: string) => void;
  handleRefreshModels: () => void;
};

const APPLE_PROVIDER_ID = "apple_intelligence";
const MASKED_API_KEY_VALUE = "••••••••••••••••";

export const usePostProcessProviderState = (): PostProcessProviderState => {
  const {
    settings,
    isUpdating,
    setPostProcessProvider,
    updatePostProcessBaseUrl,
    updatePostProcessApiKey,
    updatePostProcessModel,
    fetchPostProcessModels,
    postProcessModelOptions,
    postProcessApiKeyStatuses,
  } = useSettings();

  // Settings are guaranteed to have providers after migration
  const providers = settings?.post_process_providers || [];

  const selectedProviderId = useMemo(() => {
    return settings?.post_process_provider_id || providers[0]?.id || "deepseek";
  }, [providers, settings?.post_process_provider_id]);

  const selectedProvider = useMemo(() => {
    return (
      providers.find((provider) => provider.id === selectedProviderId) ||
      providers[0]
    );
  }, [providers, selectedProviderId]);

  const isAppleProvider = selectedProvider?.id === APPLE_PROVIDER_ID;
  const [appleIntelligenceUnavailable, setAppleIntelligenceUnavailable] =
    useState(false);

  const [apiKeyDrafts, setApiKeyDrafts] = useState<Record<string, string>>({});
  const [dirtyApiKeyProviders, setDirtyApiKeyProviders] = useState<
    Record<string, boolean>
  >({});

  // Use settings directly as single source of truth for persisted configuration,
  // but keep API keys as local drafts because the backend no longer returns them.
  const baseUrl = selectedProvider?.base_url ?? "";
  const hasSavedApiKey = postProcessApiKeyStatuses[selectedProviderId] ?? false;
  const hasApiKeyDraft = Object.prototype.hasOwnProperty.call(
    apiKeyDrafts,
    selectedProviderId,
  );
  const apiKey =
    apiKeyDrafts[selectedProviderId] ??
    (hasSavedApiKey ? MASKED_API_KEY_VALUE : "");
  const isApiKeyMasked = !hasApiKeyDraft && hasSavedApiKey;
  const model = settings?.post_process_models?.[selectedProviderId] ?? "";

  const providerOptions = useMemo<DropdownOption[]>(() => {
    return providers.map((provider) => ({
      value: provider.id,
      label: provider.label,
    }));
  }, [providers]);

  const handleProviderSelect = useCallback(
    async (providerId: string) => {
      // Clear error state on any selection attempt (allows dismissing the error)
      setAppleIntelligenceUnavailable(false);

      if (providerId === selectedProviderId) return;

      // Check Apple Intelligence availability before selecting
      if (providerId === APPLE_PROVIDER_ID) {
        const available = await commands.checkAppleIntelligenceAvailable();
        if (!available) {
          setAppleIntelligenceUnavailable(true);
          // Don't return - still set the provider so dropdown shows the selection
          // The backend gracefully handles unavailable Apple Intelligence
        }
      }

      await setPostProcessProvider(providerId);

      // Auto-fetch available models for the new provider so the model dropdown
      // reflects what's actually valid. Without this, a stale model value from
      // a previous provider/base_url can persist and silently 404 at runtime.
      // Skip when the provider isn't configured yet (no API key / empty base URL)
      // to avoid unnecessary backend errors.
      if (providerId !== APPLE_PROVIDER_ID) {
        const provider = providers.find((p) => p.id === providerId);
        const hasBaseUrl = (provider?.base_url ?? "").trim() !== "";
        const hasApiKey = postProcessApiKeyStatuses[providerId] ?? false;

        if (provider?.id === "custom" ? hasBaseUrl : hasApiKey) {
          void fetchPostProcessModels(providerId);
        }
      }
    },
    [
      selectedProviderId,
      setPostProcessProvider,
      fetchPostProcessModels,
      providers,
      postProcessApiKeyStatuses,
    ],
  );

  const handleBaseUrlChange = useCallback(
    (value: string) => {
      if (!selectedProvider || selectedProvider.id !== "custom") {
        return;
      }
      const trimmed = value.trim();
      if (trimmed && trimmed !== baseUrl) {
        void updatePostProcessBaseUrl(selectedProvider.id, trimmed);
      }
    },
    [selectedProvider, baseUrl, updatePostProcessBaseUrl],
  );

  const handleApiKeyFocus = useCallback(() => {
    // Keep the masked value visible on focus. The input component selects it
    // so typing/pasting still replaces the saved key in one step.
  }, []);

  const handleApiKeyInput = useCallback(
    (value: string) => {
      setApiKeyDrafts((current) => ({
        ...current,
        [selectedProviderId]: value,
      }));
      setDirtyApiKeyProviders((current) => ({
        ...current,
        [selectedProviderId]: true,
      }));
    },
    [selectedProviderId],
  );

  const handleApiKeyChange = useCallback(
    (value: string) => {
      if (value === MASKED_API_KEY_VALUE && isApiKeyMasked) {
        return;
      }

      if (!dirtyApiKeyProviders[selectedProviderId]) {
        return;
      }

      const trimmed = value.trim();
      setApiKeyDrafts((current) => ({
        ...current,
        [selectedProviderId]: trimmed,
      }));
      setDirtyApiKeyProviders((current) => ({
        ...current,
        [selectedProviderId]: false,
      }));
      void updatePostProcessApiKey(selectedProviderId, trimmed);
    },
    [
      dirtyApiKeyProviders,
      isApiKeyMasked,
      selectedProviderId,
      updatePostProcessApiKey,
    ],
  );

  const handleModelChange = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed !== model) {
        void updatePostProcessModel(selectedProviderId, trimmed);
      }
    },
    [model, selectedProviderId, updatePostProcessModel],
  );

  const handleModelSelect = useCallback(
    (value: string) => {
      void updatePostProcessModel(selectedProviderId, value.trim());
    },
    [selectedProviderId, updatePostProcessModel],
  );

  const handleModelCreate = useCallback(
    (value: string) => {
      void updatePostProcessModel(selectedProviderId, value);
    },
    [selectedProviderId, updatePostProcessModel],
  );

  const handleRefreshModels = useCallback(() => {
    if (isAppleProvider) return;
    void fetchPostProcessModels(selectedProviderId);
  }, [fetchPostProcessModels, isAppleProvider, selectedProviderId]);

  const availableModelsRaw = postProcessModelOptions[selectedProviderId] || [];

  const modelOptions = useMemo<ModelOption[]>(() => {
    const seen = new Set<string>();
    const options: ModelOption[] = [];

    const upsert = (value: string | null | undefined) => {
      const trimmed = value?.trim();
      if (!trimmed || seen.has(trimmed)) return;
      seen.add(trimmed);
      options.push({ value: trimmed, label: trimmed });
    };

    // Add available models from API
    for (const candidate of availableModelsRaw) {
      upsert(candidate);
    }

    // Ensure current model is in the list
    upsert(model);

    return options;
  }, [availableModelsRaw, model]);

  const isBaseUrlUpdating = isUpdating(
    `post_process_base_url:${selectedProviderId}`,
  );
  const isApiKeyUpdating = isUpdating(
    `post_process_api_key:${selectedProviderId}`,
  );
  const isModelUpdating = isUpdating(
    `post_process_model:${selectedProviderId}`,
  );
  const isFetchingModels = isUpdating(
    `post_process_models_fetch:${selectedProviderId}`,
  );

  const isCustomProvider = selectedProvider?.id === "custom";

  // No automatic fetching - user must click refresh button

  useEffect(() => {
    // #region debug-point A:providerState
    __dbg("A", "usePostProcessProviderState.ts:state", "provider state", {
      selectedProviderId,
      selectedProviderLabel: selectedProvider?.label,
      hasSavedApiKey,
      hasApiKeyDraft,
      isApiKeyMasked,
      apiKeyValueLength: apiKey.length,
      model,
      availableModelsRawCount: availableModelsRaw.length,
    });
    // #endregion
  }, [
    apiKey.length,
    availableModelsRaw.length,
    hasApiKeyDraft,
    hasSavedApiKey,
    isApiKeyMasked,
    model,
    selectedProvider?.label,
    selectedProviderId,
  ]);

  return {
    providerOptions,
    selectedProviderId,
    selectedProvider,
    isCustomProvider,
    isAppleProvider,
    appleIntelligenceUnavailable,
    baseUrl,
    handleBaseUrlChange,
    isBaseUrlUpdating,
    apiKey,
    hasSavedApiKey,
    isApiKeyMasked,
    handleApiKeyFocus,
    handleApiKeyInput,
    handleApiKeyChange,
    isApiKeyUpdating,
    model,
    handleModelChange,
    modelOptions,
    isModelUpdating,
    isFetchingModels,
    handleProviderSelect,
    handleModelSelect,
    handleModelCreate,
    handleRefreshModels,
  };
};
