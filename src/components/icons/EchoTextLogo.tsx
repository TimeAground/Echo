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
      viewBox="0 0 500 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="echo-logo-gradient" x1="18" y1="16" x2="116" y2="118">
          <stop offset="0%" stopColor="#5EA2FF" />
          <stop offset="48%" stopColor="#9284FF" />
          <stop offset="100%" stopColor="#5F6EFF" />
        </linearGradient>
        <linearGradient id="echo-logo-arc" x1="44" y1="40" x2="97" y2="85">
          <stop offset="0%" stopColor="#EEF5FF" />
          <stop offset="100%" stopColor="#B2A8FF" />
        </linearGradient>
      </defs>
      <circle cx="68" cy="72" r="42" stroke="url(#echo-logo-gradient)" strokeWidth="12" />
      <circle cx="68" cy="72" r="31" stroke="rgba(255,255,255,0.10)" strokeWidth="1.2" />
      <g transform="translate(68 72)">
        <g>
          <path
            d="M-10.1 -24.26A26 26 0 0 1 10.1 -24.26"
            stroke="url(#echo-logo-arc)"
            strokeWidth="3.1"
            strokeLinecap="round"
            opacity="0.92"
          />
          <path
            d="M-5.14 -14.89A16 16 0 0 1 5.14 -14.89"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1.55"
            strokeLinecap="round"
          />
        </g>
        <g transform="rotate(120)">
          <path
            d="M-10.1 -24.26A26 26 0 0 1 10.1 -24.26"
            stroke="url(#echo-logo-arc)"
            strokeWidth="3.1"
            strokeLinecap="round"
            opacity="0.92"
          />
          <path
            d="M-5.14 -14.89A16 16 0 0 1 5.14 -14.89"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1.55"
            strokeLinecap="round"
          />
        </g>
        <g transform="rotate(240)">
          <path
            d="M-10.1 -24.26A26 26 0 0 1 10.1 -24.26"
            stroke="url(#echo-logo-arc)"
            strokeWidth="3.1"
            strokeLinecap="round"
            opacity="0.92"
          />
          <path
            d="M-5.14 -14.89A16 16 0 0 1 5.14 -14.89"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1.55"
            strokeLinecap="round"
          />
        </g>
      </g>
      <circle cx="68" cy="72" r="12" fill="#F3F6FF" />
      <circle cx="68" cy="72" r="5.2" fill="url(#echo-logo-gradient)" />

      <path d="M136 47H222" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
      <path d="M136 72H202" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
      <path d="M136 97H222" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
      <path
        d="M294 37C278.536 37 266 49.536 266 65V79C266 94.464 278.536 107 294 107H332"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path d="M356 37V107" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
      <path d="M418 37V107" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
      <path d="M356 72H418" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
      <circle cx="461" cy="72" r="29" stroke="url(#echo-logo-gradient)" strokeWidth="12" />
    </svg>
  );
};

export default EchoTextLogo;
