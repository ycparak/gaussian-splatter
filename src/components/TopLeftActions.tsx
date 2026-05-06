"use client";

import { m } from "motion/react";

import { GithubIcon } from "@/src/components/icons/github";
import { InfoIcon } from "@/src/components/icons/info";
import { cn } from "@/src/lib/utils";

interface TopLeftActionsProps {
  isInfoOpen: boolean;
  onToggleInfo: () => void;
}

const tapAnimation = { scale: 0.925 } as const;

export default function TopLeftActions({
  isInfoOpen,
  onToggleInfo,
}: TopLeftActionsProps) {
  return (
    <div className="fixed top-5 left-5 z-20 flex items-center gap-1">
      <m.button
        type="button"
        aria-label={isInfoOpen ? "Hide info" : "Show info"}
        aria-pressed={isInfoOpen}
        whileTap={tapAnimation}
        onClick={onToggleInfo}
        className={cn(
          iconButtonClassName,
          isInfoOpen && "bg-neutral-800/65 text-neutral-300",
        )}
      >
        <InfoIcon className="size-4" aria-hidden="true" />
      </m.button>

      <m.a
        href="https://github.com/ycparak/gaussian-splatter"
        target="_blank"
        rel="noreferrer"
        aria-label="Open GitHub repository"
        whileTap={tapAnimation}
        className={iconButtonClassName}
      >
        <GithubIcon className="size-4" aria-hidden="true" />
      </m.a>
    </div>
  );
}

const iconButtonClassName =
  "flex size-9 items-center justify-center rounded-[10px] border border-white/5 bg-neutral-800/50 text-neutral-400 backdrop-blur-[10px] transition-colors hover:bg-neutral-800/60 hover:text-neutral-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 cursor-default";
