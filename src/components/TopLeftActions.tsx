"use client";

import { m } from "motion/react";

import { GithubIcon } from "@/src/components/icons/github";
import { InfoIcon } from "@/src/components/icons/info";
import { CloseIcon } from "@/src/components/icons/close";
import { Button } from "@/src/components/ui/button";

interface TopLeftActionsProps {
  isInfoOpen: boolean;
  onToggleInfo: () => void;
}

const tapAnimation = { scale: 0.925 } as const;
const MotionButton = m.create(Button);

export default function TopLeftActions({
  isInfoOpen,
  onToggleInfo,
}: TopLeftActionsProps) {
  const openGithubRepository = () => {
    window.open(
      "https://github.com/ycparak/gaussian-splatter",
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="fixed top-5 left-5 z-20 flex items-center gap-1">
      <MotionButton
        aria-label={isInfoOpen ? "Hide info" : "Show info"}
        aria-pressed={isInfoOpen}
        whileTap={tapAnimation}
        onClick={onToggleInfo}
        size="icon"
      >
        {isInfoOpen ? (
          <CloseIcon className="size-4" aria-hidden="true" />
        ) : (
          <InfoIcon className="size-4" aria-hidden="true" />
        )}
      </MotionButton>

      <MotionButton
        aria-label="Open GitHub repository"
        whileTap={tapAnimation}
        onClick={openGithubRepository}
        size="icon"
      >
        <GithubIcon className="size-4" aria-hidden="true" />
      </MotionButton>
    </div>
  );
}
