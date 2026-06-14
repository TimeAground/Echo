import React from "react";

interface SettingsGroupProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export const SettingsGroup: React.FC<SettingsGroupProps> = ({
  title,
  description,
  children,
}) => {
  return (
    <div className="space-y-3">
      {title && (
        <div className="px-1">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.24em] text-[#a4b1ff]/70">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-xs text-white/52">{description}</p>
          )}
        </div>
      )}
      <div className="app-panel overflow-visible rounded-[22px]">
        <div className="divide-y divide-white/6">{children}</div>
      </div>
    </div>
  );
};
