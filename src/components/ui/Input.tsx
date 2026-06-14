import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "compact";
}

export const Input: React.FC<InputProps> = ({
  className = "",
  variant = "default",
  disabled,
  ...props
}) => {
  const baseClasses =
    "w-full min-w-0 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-medium text-white placeholder:text-white/34 transition-all duration-150";

  const interactiveClasses = disabled
    ? "cursor-not-allowed border-white/6 bg-white/[0.03] opacity-60"
    : "hover:border-white/16 hover:bg-white/[0.06] focus:border-[#8a7dff]/36 focus:bg-white/[0.08] focus:outline-none";

  const variantClasses = {
    default: "h-11 px-3.5 py-2.5",
    compact: "h-10 px-3 py-2",
  } as const;

  return (
    <input
      className={`${baseClasses} ${variantClasses[variant]} ${interactiveClasses} ${className}`}
      disabled={disabled}
      {...props}
    />
  );
};
