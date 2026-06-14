import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "primary-soft"
    | "secondary"
    | "danger"
    | "danger-ghost"
    | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className = "",
  variant = "primary",
  size = "md",
  ...props
}) => {
  const baseClasses =
    "cursor-pointer rounded-xl border font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50";

  const variantClasses = {
    primary:
      "border-[#7b6ef6]/30 bg-[linear-gradient(135deg,rgba(123,110,246,0.92),rgba(94,162,255,0.72))] text-white shadow-[0_12px_28px_rgba(123,110,246,0.2)] hover:brightness-110 focus:ring-[#7b6ef6]/30",
    "primary-soft":
      "border-[#7b6ef6]/16 bg-[#7b6ef6]/14 text-[#d7d9ff] hover:border-[#7b6ef6]/24 hover:bg-[#7b6ef6]/20 focus:ring-[#7b6ef6]/24",
    secondary:
      "border-white/10 bg-white/[0.04] text-white/88 hover:border-white/16 hover:bg-white/[0.08] focus:ring-white/12",
    danger:
      "border-red-400/20 bg-red-500/85 text-white hover:bg-red-500 focus:ring-red-400/28",
    "danger-ghost":
      "border-transparent text-red-300 hover:bg-red-500/10 hover:text-red-200 focus:bg-red-500/20 focus:ring-red-400/16",
    ghost:
      "border-transparent text-current hover:border-white/10 hover:bg-white/[0.06] focus:bg-white/[0.08] focus:ring-white/10",
  };

  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
