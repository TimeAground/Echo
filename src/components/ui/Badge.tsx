import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "success" | "secondary";
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "primary",
  className = "",
}) => {
  const variantClasses = {
    primary: "border border-[#8a7dff]/24 bg-[#8a7dff]/18 text-[#ddd9ff]",
    success: "border border-green-400/20 bg-green-500/16 text-green-300",
    secondary: "border border-white/8 bg-white/[0.04] text-white/66",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium tracking-[0.02em] ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
