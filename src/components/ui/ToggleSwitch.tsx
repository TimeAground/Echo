import React from "react";
import { SettingContainer } from "./SettingContainer";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  isUpdating?: boolean;
  label: string;
  description: string;
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
  tooltipPosition?: "top" | "bottom";
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  isUpdating = false,
  label,
  description,
  descriptionMode = "tooltip",
  grouped = false,
  tooltipPosition = "top",
}) => {
  return (
    <SettingContainer
      title={label}
      description={description}
      descriptionMode={descriptionMode}
      grouped={grouped}
      disabled={disabled}
      tooltipPosition={tooltipPosition}
    >
      <label
        className={`inline-flex items-center ${disabled || isUpdating ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <input
          type="checkbox"
          value=""
          className="sr-only peer"
          checked={checked}
          disabled={disabled || isUpdating}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="peer relative h-7 w-12 rounded-full border border-white/10 bg-white/[0.08] transition-all after:absolute after:start-[3px] after:top-[3px] after:h-5 after:w-5 after:rounded-full after:border after:border-white/30 after:bg-white after:content-[''] after:transition-all peer-checked:border-[#8a7dff]/26 peer-checked:bg-[linear-gradient(135deg,rgba(123,110,246,0.9),rgba(94,162,255,0.75))] peer-checked:after:translate-x-full peer-disabled:opacity-50 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#8a7dff]/24"></div>
      </label>
      {isUpdating && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#8a7dff] border-t-transparent"></div>
        </div>
      )}
    </SettingContainer>
  );
};
