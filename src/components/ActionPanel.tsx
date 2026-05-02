"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { useState } from "react";

import {
  DownloadIcon,
  PauseIcon,
  RecordIcon,
  ReloadIcon,
} from "@/src/components/icons";
import { cn } from "@/src/lib/utils";

type TabId = "record" | "download" | "pause" | "reload";

interface Tab {
  id: TabId;
  label: string;
  width: number;
  icon: ReactNode;
}

const IDLE_WIDTH = 126;

const islandTransition = {
  type: "spring",
  bounce: 0.18,
  duration: 0.44,
} as const;

const labelTransition = {
  type: "spring",
  bounce: 0.22,
  duration: 0.34,
} as const;

const tabs = [
  {
    id: "record",
    label: "Record",
    width: 197,
    icon: <RecordIcon className="size-4" />,
  },
  {
    id: "download",
    label: "Download PNG",
    width: 241,
    icon: <DownloadIcon className="size-4" />,
  },
  {
    id: "pause",
    label: "Pause",
    width: 191,
    icon: <PauseIcon className="size-4" />,
  },
  {
    id: "reload",
    label: "Reload",
    width: 198,
    icon: <ReloadIcon className="size-4" />,
  },
] satisfies Tab[];

export default function ActionPanel() {
  const [activeTab, setActiveTab] = useState<TabId | null>(null);
  const activeTabConfig = tabs.find((tab) => tab.id === activeTab);

  return (
    <motion.div
      role="toolbar"
      aria-label="Dynamic island quick actions"
      initial={false}
      animate={{ width: activeTabConfig?.width ?? IDLE_WIDTH }}
      transition={islandTransition}
      style={{
        borderRadius: "10px",
        WebkitTapHighlightColor: "transparent",
        transformOrigin: "right center",
      }}
      onMouseLeave={() => setActiveTab(null)}
      onBlur={(event) => {
        if (
          !event.relatedTarget ||
          !event.currentTarget.contains(event.relatedTarget)
        ) {
          setActiveTab(null);
        }
      }}
      className="fixed top-5 right-5 z-9 flex h-9 items-center overflow-hidden border border-white/5 bg-neutral-800/50 px-0.5 backdrop-blur-[20px]"
    >
      <div className="pointer-events-none flex min-w-0 flex-1 items-center">
        <AnimatePresence initial={false} mode="popLayout">
          {activeTabConfig ? (
            <motion.span
              key={activeTabConfig.id}
              initial={{
                opacity: 0,
                x: 8,
                scale: 0.96,
                filter: "blur(4px)",
              }}
              animate={{
                opacity: 1,
                x: 0,
                scale: 1,
                filter: "blur(0px)",
                transition: { ...labelTransition, delay: 0.03 },
              }}
              exit={{
                opacity: 0,
                x: 6,
                scale: 0.97,
                filter: "blur(4px)",
                transition: { duration: 0.14 },
              }}
              style={{ originX: 1, originY: 0.5 }}
              className="block truncate text-xs leading-3 text-neutral-300 pl-4"
            >
              {activeTabConfig.label}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="ml-auto flex shrink-0 items-center">
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            type="button"
            aria-label={tab.label}
            onMouseEnter={() => setActiveTab(tab.id)}
            onFocus={() => setActiveTab(tab.id)}
            whileTap={{ scale: 0.925 }}
            style={{
              borderRadius: "7px",
              WebkitTapHighlightColor: "transparent",
            }}
            className={cn(
              "relative flex size-7.5 items-center justify-center text-neutral-400 outline-none transition-colors focus-visible:ring-0",
              activeTab === tab.id && "text-neutral-300",
            )}
          >
            {activeTab === tab.id ? (
              <motion.span
                layoutId="bubble"
                className="absolute inset-0 bg-white/10"
                style={{ borderRadius: "7px" }}
                transition={islandTransition}
              />
            ) : null}
            <span className="relative z-10">{tab.icon}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
