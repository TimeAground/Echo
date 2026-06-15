import { listen } from "@tauri-apps/api/event";
import React, { useEffect, useRef, useState } from "react";
import "./RecordingOverlay.css";

type OverlayState = "recording";

const RecordingOverlay: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [_state, setState] = useState<OverlayState>("recording");
  const [levels, setLevels] = useState<number[]>(Array(12).fill(0.18));
  const smoothedLevelsRef = useRef<number[]>(Array(12).fill(0.18));

  useEffect(() => {
    const setupEventListeners = async () => {
      const unlistenShow = await listen("show-overlay", async (event) => {
        const overlayState = event.payload as OverlayState;
        setState(overlayState);
        setIsVisible(true);
      });

      const unlistenHide = await listen("hide-overlay", () => {
        setIsVisible(false);
      });

      const unlistenLevel = await listen<number[]>("mic-level", (event) => {
        const newLevels = event.payload as number[];
        const centered = Array.from({ length: 12 }, (_, index) => {
          const sourceIndex = Math.min(newLevels.length - 1, Math.floor(index / 1.35));
          const mirroredIndex =
            index < 6 ? sourceIndex : Math.max(0, newLevels.length - 1 - sourceIndex);
          return newLevels[mirroredIndex] || 0;
        });

        const smoothed = smoothedLevelsRef.current.map((prev, i) => {
          const target = centered[i] || 0;
          const weightedTarget = i >= 4 && i <= 7 ? target * 1.15 : target * 0.92;
          return prev * 0.72 + weightedTarget * 0.28;
        });

        smoothedLevelsRef.current = smoothed;
        setLevels(smoothed);
      });

      return () => {
        unlistenShow();
        unlistenHide();
        unlistenLevel();
      };
    };

    setupEventListeners();
  }, []);

  return (
    <div className={`recording-overlay ${isVisible ? "fade-in" : ""}`}>
      <div className="overlay-shell">
        <div className="overlay-pulse pulse-primary" />
        <div className="overlay-pulse pulse-secondary" />
        <div className="overlay-core-glow" />
        <div className="overlay-track" />
        <div className="overlay-waveform" aria-hidden="true">
          {levels.map((v, i) => (
            <div
              key={i}
              className="bar"
              style={{
                height: `${Math.min(30, 6 + Math.pow(v, 0.76) * 24)}px`,
                transition: "height 60ms ease-out, opacity 120ms ease-out",
                opacity: Math.max(0.28, v * 1.9),
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecordingOverlay;
