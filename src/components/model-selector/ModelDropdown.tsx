import React from "react";
import { useTranslation } from "react-i18next";
import type { ModelInfo } from "@/bindings";
import {
  getTranslatedModelName,
  getTranslatedModelDescription,
} from "../../lib/utils/modelTranslation";

interface ModelDropdownProps {
  models: ModelInfo[];
  currentModelId: string;
  onModelSelect: (modelId: string) => void;
}

const ModelDropdown: React.FC<ModelDropdownProps> = ({
  models,
  currentModelId,
  onModelSelect,
}) => {
  const { t } = useTranslation();
  const downloadedModels = models.filter((m) => m.is_downloaded);

  const handleModelClick = (modelId: string) => {
    onModelSelect(modelId);
  };

  return (
    <div className="absolute bottom-full start-0 z-50 mb-2 max-h-[60vh] w-72 overflow-y-auto rounded-[20px] border border-white/10 bg-[#0d111a]/96 py-2 shadow-2xl backdrop-blur-xl">
      {downloadedModels.length > 0 ? (
        <div>
          {downloadedModels.map((model) => (
            <div
              key={model.id}
              onClick={() => handleModelClick(model.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleModelClick(model.id);
                }
              }}
              tabIndex={0}
              role="button"
              className={`w-full px-3 py-2 text-start transition-colors cursor-pointer focus:outline-none ${
                currentModelId === model.id
                  ? "bg-[#7b6ef6]/14 text-[#ddd9ff]"
                  : ""
              } ${currentModelId === model.id ? "" : "hover:bg-white/[0.05]"}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white/82">
                    {getTranslatedModelName(model, t)}
                    {model.is_custom && (
                      <span className="ms-1.5 text-[10px] font-medium uppercase text-white/34">
                        {t("modelSelector.custom")}
                      </span>
                    )}
                  </div>
                  <div className="pe-4 text-xs italic text-white/38">
                    {getTranslatedModelDescription(model, t)}
                  </div>
                </div>
                {currentModelId === model.id && (
                  <div className="text-xs text-[#ddd9ff]">
                    {t("modelSelector.active")}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-3 py-2 text-sm text-white/42">
          {t("modelSelector.noModelsAvailable")}
        </div>
      )}
    </div>
  );
};

export default ModelDropdown;
