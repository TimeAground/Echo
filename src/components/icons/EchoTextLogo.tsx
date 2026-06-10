import React from "react";

const EchoTextLogo = ({
  width,
  height,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) => {
  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox="0 0 400 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* E */}
      <path
        d="M30 20 L80 20 M30 20 L30 120 M30 70 L70 70 M30 120 L80 120"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className="logo-primary"
      />
      {/* C */}
      <path
        d="M160 20 C120 20 100 50 100 70 C100 90 120 120 160 120"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className="logo-primary"
      />
      {/* H */}
      <path
        d="M190 20 L190 120 M190 70 L240 70 M240 20 L240 120"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className="logo-primary"
      />
      {/* O */}
        <path
        d="M340 70 C340 40 320 20 290 20 C260 20 240 40 240 70 C240 100 260 120 290 120 C320 120 340 100 340 70Z"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className="logo-primary"
      />
      {/* Sound wave accent - right of O */}
      <path
        d="M360 50 Q375 70 360 90"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
        className="logo-primary"
        opacity="0.6"
      />
      <path
        d="M370 40 Q390 70 370 100"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
        className="logo-primary"
        opacity="0.4"
      />
    </svg>
  );
};

export default EchoTextLogo;
