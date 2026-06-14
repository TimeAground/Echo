import React from "react";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: "default" | "compact";
}

export const Textarea: React.FC<TextareaProps> = ({
  className = "",
  variant = "default",
  ...props
}) => {
  const baseClasses =
    "resize-y rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-white placeholder:text-white/34 transition-[background-color,border-color] duration-150 hover:border-white/16 hover:bg-white/[0.06] focus:border-[#8a7dff]/36 focus:bg-white/[0.08] focus:outline-none";

  const variantClasses = {
    default: "px-3 py-2 min-h-[100px]",
    compact: "px-2 py-1 min-h-[80px]",
  };

  return (
    <textarea
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
};
