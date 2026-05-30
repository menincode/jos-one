import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type TypingTextProps = {
  text: string;
  className?: string;
  cursorClassName?: string;
  speedMs?: number;
  as?: "h1" | "h2" | "p" | "span";
};

export function TypingText({
  text,
  className,
  cursorClassName,
  speedMs = 60,
  as: Tag = "span",
}: TypingTextProps) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setDisplayed(text);
      return;
    }

    setDisplayed("");
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setDisplayed(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(timer);
      }
    }, speedMs);

    return () => window.clearInterval(timer);
  }, [text, speedMs]);

  return (
    <Tag className={cn("inline-flex min-h-[1.2em] items-baseline", className)} aria-label={text}>
      <span>{displayed}</span>
      <span
        className={cn(
          "ml-1.5 inline font-normal leading-none animate-cursor-blink",
          cursorClassName,
        )}
        aria-hidden
      >
        _
      </span>
    </Tag>
  );
}
