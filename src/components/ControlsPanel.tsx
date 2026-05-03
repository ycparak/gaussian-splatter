"use client";

import { NavigationMenu } from "@base-ui/react/navigation-menu";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { useRef, useState } from "react";

import {
  BloomIcon,
  CameraIcon,
  ColorIcon,
  LightingIcon,
  ParticlesIcon,
  RendererIcon,
  SceneIcon,
} from "@/src/components/icons";
import { cn } from "@/src/lib/utils";

type TabId =
  | "particles"
  | "scene"
  | "lighting"
  | "bloom"
  | "color"
  | "camera"
  | "renderer";

interface Tab {
  id: TabId;
  label: string;
  icon: ReactNode;
}

const tabs: Tab[] = [
  {
    id: "particles",
    label: "Particles",
    icon: <ParticlesIcon className="size-4" />,
  },
  {
    id: "scene",
    label: "Scene",
    icon: <SceneIcon className="size-4" />,
  },
  {
    id: "lighting",
    label: "Lighting",
    icon: <LightingIcon className="size-4" />,
  },
  {
    id: "bloom",
    label: "Bloom",
    icon: <BloomIcon className="size-4" />,
  },
  {
    id: "color",
    label: "Color",
    icon: <ColorIcon className="size-4" />,
  },
  {
    id: "camera",
    label: "Camera",
    icon: <CameraIcon className="size-4" />,
  },
  {
    id: "renderer",
    label: "Renderer",
    icon: <RendererIcon className="size-4" />,
  },
];

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

export default function ControlsPanel() {
  const anchorRef = useRef<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<TabId | null>(null);
  const activeTabConfig = tabs.find((tab) => tab.id === activeTab);
  const displayLabel = activeTabConfig?.label ?? "Controls";

  return (
    <NavigationMenu.Root<TabId>
      ref={anchorRef}
      aria-label="Scene controls"
      value={activeTab}
      onValueChange={(value) => setActiveTab(value)}
      delay={0}
      closeDelay={80}
      className="fixed bottom-5 left-5 z-9 flex h-9 w-[298px] items-center overflow-hidden border border-white/5 bg-neutral-800/50 px-0.5 backdrop-blur-[20px]"
      style={{
        borderRadius: "10px",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div className="pointer-events-none flex min-w-0 flex-1 items-center">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={displayLabel}
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
            className={cn(
              "block truncate pl-4 text-xs leading-3 text-neutral-300",
              !activeTab && "text-neutral-400",
            )}
          >
            {displayLabel}
          </motion.span>
        </AnimatePresence>
      </div>

      <NavigationMenu.List className="ml-auto flex shrink-0 items-center">
        {tabs.map((tab) => (
          <NavigationMenu.Item key={tab.id} value={tab.id}>
            <NavigationMenu.Trigger
              aria-label={tab.label}
              render={
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.925 }}
                  style={{
                    borderRadius: "7px",
                    WebkitTapHighlightColor: "transparent",
                  }}
                  className={cn(
                    "relative flex size-7.5 items-center justify-center text-neutral-400 outline-none transition-colors focus-visible:ring-0",
                    activeTab === tab.id && "text-neutral-300",
                  )}
                />
              }
            >
              {activeTab === tab.id ? (
                <motion.span
                  layoutId="controls-bubble"
                  className="absolute inset-0 bg-white/10"
                  style={{ borderRadius: "7px" }}
                  transition={islandTransition}
                />
              ) : null}
              <span className="relative z-10">{tab.icon}</span>
            </NavigationMenu.Trigger>

            <NavigationMenu.Content className="flex h-[262px] w-[298px] items-center justify-center text-xs font-medium text-neutral-400 transition-[opacity,transform] duration-200 ease-out data-[activation-direction=left]:data-[starting-style]:-translate-x-3 data-[activation-direction=left]:data-[ending-style]:translate-x-3 data-[activation-direction=right]:data-[starting-style]:translate-x-3 data-[activation-direction=right]:data-[ending-style]:-translate-x-3 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
              {tab.label} Panel
            </NavigationMenu.Content>
          </NavigationMenu.Item>
        ))}
      </NavigationMenu.List>

      <NavigationMenu.Portal>
        <NavigationMenu.Positioner
          anchor={anchorRef}
          side="top"
          align="start"
          sideOffset={12}
          positionMethod="fixed"
          collisionPadding={{ top: 20, bottom: 20, left: 20, right: 20 }}
          collisionAvoidance={{ side: "none", align: "none" }}
          className="z-9"
        >
          <NavigationMenu.Popup className="h-[262px] w-[298px] overflow-hidden rounded-[10px] border border-white/5 bg-neutral-800/50 backdrop-blur-[20px] transition-[opacity,transform,width,height] duration-[250ms] ease-out data-[ending-style]:translate-y-2 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0">
            <NavigationMenu.Viewport className="relative h-[262px] w-[298px] overflow-hidden" />
          </NavigationMenu.Popup>
        </NavigationMenu.Positioner>
      </NavigationMenu.Portal>
    </NavigationMenu.Root>
  );
}
