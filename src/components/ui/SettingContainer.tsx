import React, { useEffect, useRef, useState } from "react";
import { Tooltip } from "./Tooltip";

interface SettingContainerProps {
  title: string;
  description: string;
  children: React.ReactNode;
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
  layout?: "horizontal" | "stacked";
  disabled?: boolean;
  tooltipPosition?: "top" | "bottom";
}

export const SettingContainer: React.FC<SettingContainerProps> = ({
  title,
  description,
  children,
  descriptionMode = "tooltip",
  grouped = false,
  layout = "horizontal",
  disabled = false,
  tooltipPosition = "top",
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close tooltip
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setShowTooltip(false);
      }
    };

    if (showTooltip) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showTooltip]);

  const toggleTooltip = () => {
    setShowTooltip(!showTooltip);
  };

  const containerClasses = grouped
    ? "px-5 py-4"
    : "rounded-[20px] border border-white/8 bg-white/[0.03] px-5 py-4";

  if (layout === "stacked") {
    if (descriptionMode === "tooltip") {
      return (
        <div className={containerClasses}>
          <div className="mb-3 flex items-center gap-2">
            <h3
              className={`text-sm font-medium text-white ${disabled ? "opacity-50" : ""}`}
            >
              {title}
            </h3>
            <div
              ref={tooltipRef}
              className="relative"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={toggleTooltip}
            >
              <svg
                className="h-4 w-4 cursor-help select-none text-white/36 transition-colors duration-200 hover:text-[#8a7dff]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-label="More information"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleTooltip();
                  }
                }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {showTooltip && (
                <Tooltip targetRef={tooltipRef} position="top">
                  <p className="text-sm leading-relaxed text-white/82">
                    {description}
                  </p>
                </Tooltip>
              )}
            </div>
          </div>
          <div className="w-full min-w-0">{children}</div>
        </div>
      );
    }

    return (
      <div className={containerClasses}>
        <div className="mb-2">
          <h3
            className={`text-sm font-medium text-white ${disabled ? "opacity-50" : ""}`}
          >
            {title}
          </h3>
          <p className={`mt-1 text-sm text-white/56 ${disabled ? "opacity-50" : ""}`}>
            {description}
          </p>
        </div>
        <div className="w-full min-w-0">{children}</div>
      </div>
    );
  }

  // Horizontal layout (default)
  const horizontalContainerClasses = grouped
    ? "grid grid-cols-1 items-center gap-4 px-5 py-4 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]"
    : "grid grid-cols-1 items-center gap-4 rounded-[20px] border border-white/8 bg-white/[0.03] px-5 py-4 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]";

  if (descriptionMode === "tooltip") {
    return (
      <div className={horizontalContainerClasses}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className={`text-sm font-medium text-white ${disabled ? "opacity-50" : ""}`}
            >
              {title}
            </h3>
            <div
              ref={tooltipRef}
              className="relative"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={toggleTooltip}
            >
              <svg
                className="h-4 w-4 cursor-help select-none text-white/36 transition-colors duration-200 hover:text-[#8a7dff]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-label="More information"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleTooltip();
                  }
                }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {showTooltip && (
                <Tooltip targetRef={tooltipRef} position={tooltipPosition}>
                  <p className="text-sm leading-relaxed text-white/82">
                    {description}
                  </p>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
        <div className="relative flex w-full min-w-0 justify-end">{children}</div>
      </div>
    );
  }

  return (
    <div className={horizontalContainerClasses}>
      <div className="min-w-0">
        <h3
          className={`text-sm font-medium text-white ${disabled ? "opacity-50" : ""}`}
        >
          {title}
        </h3>
        <p className={`mt-1 text-sm text-white/56 ${disabled ? "opacity-50" : ""}`}>
          {description}
        </p>
      </div>
      <div className="relative flex w-full min-w-0 justify-end">{children}</div>
    </div>
  );
};
