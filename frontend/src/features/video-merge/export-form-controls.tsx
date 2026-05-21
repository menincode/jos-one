import { Fragment, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { APP_DARK_THEME } from "@/theme/app-dark-theme";

const fieldClass =
  "h-9 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]";

type ExportFieldProps = {
  label: string;
  children: ReactNode;
  className?: string;
  title?: string;
};

export function ExportField({ label, children, className, title }: ExportFieldProps) {
  const { colors, typography } = APP_DARK_THEME;

  return (
    <div className={cn("flex flex-col gap-1.5", className)} title={title}>
      <span
        className="whitespace-nowrap font-semibold uppercase tracking-wider"
        style={{ color: colors.muted, fontSize: typography.sectionLabel }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

type ExportSelectOption = { value: string; label: string };

type ExportSelectGroup = {
  label: string;
  options: readonly ExportSelectOption[];
};

type ExportSelectProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options?: readonly ExportSelectOption[];
  optionGroups?: readonly ExportSelectGroup[];
  disabled?: boolean;
  compact?: boolean;
  className?: string;
};

type ExportNumberInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
  min?: number;
  max?: number;
  step?: string;
  placeholder?: string;
};

export function ExportNumberInput({
  id,
  value,
  onChange,
  disabled,
  compact = false,
  min = 1,
  max = 32,
  step = "1",
  placeholder,
}: ExportNumberInputProps) {
  return (
    <Input
      id={id}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(fieldClass, compact ? "h-8 px-2 text-xs" : "h-9", "min-w-0")}
    />
  );
}

export function ExportSelect({
  id,
  value,
  onChange,
  options,
  optionGroups,
  disabled,
  compact = false,
  className,
}: ExportSelectProps) {
  const optionClass = "bg-[#1a1f35] text-white";

  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        fieldClass,
        "max-w-none whitespace-nowrap",
        compact && "h-8 px-2 text-xs",
        className,
      )}
    >
      {optionGroups
        ? optionGroups.map((group, groupIndex) => (
            <Fragment key={group.label}>
              {groupIndex > 0 ? (
                <option
                  disabled
                  value={`__separator_${groupIndex}`}
                  className="export-select-separator"
                >
                  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
                </option>
              ) : null}
              {group.options.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className={optionClass}
                >
                  {opt.label}
                </option>
              ))}
            </Fragment>
          ))
        : (options ?? []).map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className={optionClass}
            >
              {opt.label}
            </option>
          ))}
    </select>
  );
}

type ExportMinMaxProps = {
  minId: string;
  maxId: string;
  minLabel?: string;
  maxLabel?: string;
  minValue: string;
  maxValue: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  step?: string;
  inputMode?: "decimal" | "numeric";
  compact?: boolean;
  disabled?: boolean;
};

export function ExportMinMax({
  minId,
  maxId,
  minLabel = "Min",
  maxLabel = "Max",
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  minPlaceholder,
  maxPlaceholder,
  step = "any",
  inputMode = "decimal",
  compact = false,
  disabled = false,
}: ExportMinMaxProps) {
  const { colors, typography } = APP_DARK_THEME;
  const inputSize = compact ? "h-8 px-2 text-xs" : "h-9";

  return (
    <div className={cn("grid grid-cols-2", compact ? "gap-1.5" : "gap-2")}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span
          className="text-xs leading-none"
          style={{ color: colors.muted, fontSize: typography.rowMeta }}
        >
          {minLabel}
        </span>
        <Input
          id={minId}
          type="number"
          inputMode={inputMode}
          step={step}
          value={minValue}
          onChange={(e) => onMinChange(e.target.value)}
          placeholder={minPlaceholder}
          disabled={disabled}
          className={cn(fieldClass, inputSize, "min-w-0")}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span
          className="text-xs leading-none"
          style={{ color: colors.muted, fontSize: typography.rowMeta }}
        >
          {maxLabel}
        </span>
        <Input
          id={maxId}
          type="number"
          inputMode={inputMode}
          step={step}
          value={maxValue}
          onChange={(e) => onMaxChange(e.target.value)}
          placeholder={maxPlaceholder}
          disabled={disabled}
          className={cn(fieldClass, inputSize, "min-w-0")}
        />
      </div>
    </div>
  );
}
