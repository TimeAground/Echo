import React from "react";
import ResetIcon from "../icons/ResetIcon";

interface ResetButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  children?: React.ReactNode;
}

export const ResetButton: React.FC<ResetButtonProps> = React.memo(
  ({ onClick, disabled = false, className = "", ariaLabel, children }) => (
    <button
      type="button"
      aria-label={ariaLabel}
      className={`rounded-xl border px-2.5 py-2 transition-all duration-150 ${
        disabled
          ? "cursor-not-allowed border-white/6 bg-white/[0.03] text-white/26 opacity-50"
          : "cursor-pointer border-white/10 bg-white/[0.04] text-white/62 hover:border-white/16 hover:bg-white/[0.08] hover:text-white active:translate-y-[1px]"
      } ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children ?? <ResetIcon />}
    </button>
  ),
);
