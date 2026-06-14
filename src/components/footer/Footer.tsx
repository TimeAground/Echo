import React, { useState, useEffect } from "react";
import { getVersion } from "@tauri-apps/api/app";

import ModelSelector from "../model-selector";
import UpdateChecker from "../update-checker";

const Footer: React.FC = () => {
  const [version, setVersion] = useState("");

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const appVersion = await getVersion();
        setVersion(appVersion);
      } catch (error) {
        console.error("Failed to get app version:", error);
        setVersion("0.1.2");
      }
    };

    fetchVersion();
  }, []);

  return (
    <div className="relative z-1 w-full border-t border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent)] px-4 pb-4 pt-3">
      <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-xs text-white/64 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex min-w-0 items-center gap-4">
          <ModelSelector />
        </div>

        {/* Update Status */}
        <div className="flex shrink-0 items-center gap-1.5">
          <UpdateChecker />
          <span className="text-white/28">•</span>
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <span className="text-white/54">v{version}</span>
        </div>
      </div>
    </div>
  );
};

export default Footer;
