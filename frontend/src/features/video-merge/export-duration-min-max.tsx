import { ExportMinMax, type ExportMinMaxProps } from "@/features/video-merge/export-form-controls";
import {
  DEFAULT_DURATION_MAX_MINUTES,
  DEFAULT_DURATION_MIN_MINUTES,
  minutesInputValueToSeconds,
  secondsToMinutesInputValue,
} from "@/features/video-merge/export-duration-units";

type ExportDurationMinMaxProps = Omit<
  ExportMinMaxProps,
  "minValue" | "maxValue" | "onMinChange" | "onMaxChange" | "minPlaceholder" | "maxPlaceholder"
> & {
  minValueSec: string;
  maxValueSec: string;
  onMinChange: (durationMinSec: string) => void;
  onMaxChange: (durationMaxSec: string) => void;
};

export function ExportDurationMinMax({
  minValueSec,
  maxValueSec,
  onMinChange,
  onMaxChange,
  ...rest
}: ExportDurationMinMaxProps) {
  return (
    <ExportMinMax
      minValue={secondsToMinutesInputValue(minValueSec)}
      maxValue={secondsToMinutesInputValue(maxValueSec)}
      onMinChange={(min) => onMinChange(minutesInputValueToSeconds(min))}
      onMaxChange={(max) => onMaxChange(minutesInputValueToSeconds(max))}
      minPlaceholder={DEFAULT_DURATION_MIN_MINUTES}
      maxPlaceholder={DEFAULT_DURATION_MAX_MINUTES}
      step="any"
      inputMode="decimal"
      {...rest}
    />
  );
}
