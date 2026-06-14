import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { useFloatingMenuPosition } from "./useFloatingMenuPosition";

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface DropdownProps {
  options: DropdownOption[];
  className?: string;
  selectedValue: string | null;
  onSelect: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onRefresh?: () => void;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  selectedValue,
  onSelect,
  className = "",
  placeholder = "Select an option...",
  disabled = false,
  onRefresh,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { menuRef, menuStyle } = useFloatingMenuPosition(dropdownRef, isOpen);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        (!menuRef.current || !menuRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  const selectedOption = options.find(
    (option) => option.value === selectedValue,
  );

  const handleSelect = (value: string) => {
    onSelect(value);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen && onRefresh) onRefresh();
    setIsOpen(!isOpen);
  };

  return (
    <div className={`relative min-w-0 ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className={`flex w-full min-w-0 items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-start text-sm font-medium text-white transition-all duration-150 ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer hover:border-white/16 hover:bg-white/[0.06]"
        }`}
        onClick={handleToggle}
        disabled={disabled}
      >
        <span className="min-w-0 flex-1 truncate whitespace-nowrap">
          {selectedOption?.label || placeholder}
        </span>
        <svg
          className={`ms-2 h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? "transform rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen &&
        !disabled &&
        menuStyle &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className="overflow-y-auto rounded-[18px] border border-white/10 bg-[#0d111a]/96 shadow-2xl backdrop-blur-xl"
          >
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-white/42">
                {t("common.noOptionsFound")}
              </div>
            ) : (
              options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`w-full px-3 py-2 text-start text-sm transition-colors duration-150 ${
                    selectedValue === option.value
                      ? "bg-[#7b6ef6]/18 font-semibold text-[#d8d6ff]"
                      : ""
                  } ${option.disabled ? "cursor-not-allowed opacity-50" : "text-white/78 hover:bg-white/[0.05]"}`}
                  onClick={() => handleSelect(option.value)}
                  disabled={option.disabled}
                >
                  <span className="block min-w-0 truncate">{option.label}</span>
                </button>
              ))
            )}
          </div>,
          document.body,
        )}
    </div>
  );
};
