import React from "react";
import { Input } from "../../ui/Input";

interface ApiKeyFieldProps {
  value: string;
  isMasked?: boolean;
  onFocus?: () => void;
  onChange: (value: string) => void;
  onBlur: (value: string) => void;
  disabled: boolean;
  placeholder?: string;
  helperText?: string;
  className?: string;
}

export const ApiKeyField: React.FC<ApiKeyFieldProps> = React.memo(
  ({
    value,
    isMasked = false,
    onFocus,
    onChange,
    onBlur,
    disabled,
    placeholder,
    helperText,
    className = "",
  }) => {
    return (
      <div className="space-y-2">
        <Input
          type="password"
          value={value}
          onFocus={(event) => {
            if (isMasked) {
              event.currentTarget.select();
            }
            onFocus?.();
          }}
          onChange={(event) => onChange(event.target.value)}
          onBlur={(event) => onBlur(event.target.value)}
          placeholder={placeholder}
          variant="compact"
          disabled={disabled}
          className={`w-full min-w-0 sm:max-w-[420px] ${className}`}
        />
        {helperText ? (
          <p className="text-xs text-white/44">{helperText}</p>
        ) : null}
      </div>
    );
  },
);

ApiKeyField.displayName = "ApiKeyField";
