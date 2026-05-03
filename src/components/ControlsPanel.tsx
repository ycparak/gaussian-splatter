"use client";

import { NavigationMenu } from "@base-ui/react/navigation-menu";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Dispatch, KeyboardEvent, ReactNode, SetStateAction } from "react";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";

import type { SceneSettings } from "@/shared/types";
import {
  CONTROL_SECTIONS,
  type ControlDefinition,
  type ControlSectionDefinition,
  type SettingsGroup,
} from "@/src/components/sceneControlsConfig";
import {
  BloomIcon,
  CameraIcon,
  ColorIcon,
  LightingIcon,
  ParticlesIcon,
  RandomIcon,
  RendererIcon,
  ResetIcon,
  SceneIcon,
} from "@/src/components/icons";
import Button from "@/src/components/ui/button";
import RangeSlider from "@/src/components/ui/range-slider";
import Toggle from "@/src/components/ui/toggle";
import {
  cloneSceneSettings,
  DEFAULT_SCENE_SETTINGS,
} from "@/src/config/sceneControls";
import { cn } from "@/src/lib/utils";

type TabId = SettingsGroup;

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
const fallbackTab = {
  id: "controls",
  label: "Controls",
  icon: null,
} satisfies {
  id: string;
  label: string;
  icon: ReactNode;
};

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

interface ControlsPanelProps {
  settings: SceneSettings;
  onSettingsChange: Dispatch<SetStateAction<SceneSettings>>;
}

export default function ControlsPanel({
  settings,
  onSettingsChange,
}: ControlsPanelProps) {
  const anchorRef = useRef<HTMLElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<TabId | null>(null);
  const activeTabConfig =
    tabs.find((tab) => tab.id === activeTab) ?? fallbackTab;

  function updateSetting<
    TGroup extends keyof SceneSettings,
    TKey extends keyof SceneSettings[TGroup],
  >(group: TGroup, key: TKey, value: SceneSettings[TGroup][TKey]) {
    onSettingsChange((currentSettings) => ({
      ...currentSettings,
      [group]: {
        ...currentSettings[group],
        [key]: value,
      },
    }));
  }

  function resetSection(group: SettingsGroup) {
    onSettingsChange((currentSettings) => ({
      ...currentSettings,
      [group]: cloneSceneSettings(DEFAULT_SCENE_SETTINGS)[group],
    }));
  }

  function randomizeSection(section: ControlSectionDefinition) {
    onSettingsChange((currentSettings) => {
      const nextGroup = { ...currentSettings[section.id] };

      for (const control of section.controls) {
        const key = control.settingKey as keyof typeof nextGroup;
        nextGroup[key] = randomizeControl(control) as never;
      }

      return {
        ...currentSettings,
        [section.id]: nextGroup,
      };
    });
  }

  function isFocusWithinControlsMenu(
    currentTarget: EventTarget | null,
    target: EventTarget | null,
  ) {
    if (!(currentTarget instanceof HTMLElement)) {
      return false;
    }

    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return Boolean(
      currentTarget.contains(target) ||
      target.closest("[data-controls-panel-content]"),
    );
  }

  function handleMenuKeyDownCapture(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab") {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const currentItem = target.closest(
      '[data-controls-trigger], [tabindex="0"]',
    ) as HTMLElement | null;
    if (!currentItem) {
      return;
    }

    const triggerElements = Array.from(
      anchorRef.current?.querySelectorAll<HTMLElement>(
        "[data-controls-trigger]",
      ) ?? [],
    );
    const contentElements = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-controls-panel-content] [tabindex="0"]',
      ),
    );
    const focusableElements = [...triggerElements, ...contentElements].filter(
      (element, index, elements) => elements.indexOf(element) === index,
    );

    if (focusableElements.length === 0) {
      return;
    }

    const currentIndex = focusableElements.findIndex(
      (element) => element === currentItem || element.contains(currentItem),
    );
    if (currentIndex === -1) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const direction = event.shiftKey ? -1 : 1;
    const nextIndex =
      (currentIndex + direction + focusableElements.length) %
      focusableElements.length;
    focusableElements[nextIndex]?.focus();
  }

  return (
    <NavigationMenu.Root<TabId>
      ref={anchorRef}
      onKeyDownCapture={handleMenuKeyDownCapture}
      onBlur={(event) => {
        if (
          !isFocusWithinControlsMenu(event.currentTarget, event.relatedTarget)
        ) {
          setActiveTab(null);
        }
      }}
      aria-label="Scene controls"
      value={activeTab}
      onValueChange={(value) => setActiveTab(value)}
      delay={0}
      closeDelay={0}
      className="fixed bottom-5 left-5 z-9 flex h-9 w-82 items-center overflow-hidden border border-white/10 bg-neutral-900/65 px-0.5 backdrop-blur-[20px]"
      style={{
        borderRadius: "10px",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div
        ref={rootRef}
        className="pointer-events-none flex min-w-0 flex-1 items-center"
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={activeTabConfig.label}
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
            className="block truncate pl-4 text-xs leading-3 font-semibold text-neutral-400"
          >
            {activeTabConfig.label}
          </motion.span>
        </AnimatePresence>
      </div>

      <NavigationMenu.List className="ml-auto flex shrink-0 items-center gap-1">
        {tabs.map((tab) => {
          const section = CONTROL_SECTIONS.find(
            (controlSection) => controlSection.id === tab.id,
          );

          if (!section) return null;

          return (
            <NavigationMenu.Item key={tab.id} value={tab.id}>
              <NavigationMenu.Trigger
                aria-label={tab.label}
                tabIndex={0}
                render={
                  <motion.button
                    type="button"
                    data-controls-trigger={tab.id}
                    whileTap={{ scale: 0.925 }}
                    onFocus={() => flushSync(() => setActiveTab(tab.id))}
                    onMouseEnter={() => flushSync(() => setActiveTab(tab.id))}
                    style={{
                      borderRadius: "7px",
                      WebkitTapHighlightColor: "transparent",
                    }}
                    className={cn(
                      "relative flex size-7.5 items-center justify-center text-neutral-400 outline-none transition-colors focus-visible:ring-0",
                      activeTab === tab.id && "text-neutral-200",
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

              <NavigationMenu.Content
                data-controls-panel-content
                className="flex w-82 flex-col gap-1 transition-[opacity,transform] duration-250 ease-out data-[activation-direction=left]:data-[starting-style]:-translate-x-6 data-[activation-direction=left]:data-[ending-style]:translate-x-6 data-[activation-direction=right]:data-[starting-style]:translate-x-6 data-[activation-direction=right]:data-[ending-style]:-translate-x-6 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
              >
                <div className="grid grid-cols-2 gap-1">
                  <Button
                    className="w-full"
                    icon={<RandomIcon className="size-4" />}
                    tabIndex={-1}
                    onClick={() => randomizeSection(section)}
                  >
                    Randomise
                  </Button>
                  <Button
                    className="w-full"
                    icon={<ResetIcon className="size-4" />}
                    tabIndex={-1}
                    onClick={() => resetSection(section.id)}
                  >
                    Reset
                  </Button>
                </div>

                <div className="flex max-h-[calc(100dvh-128px)] flex-col gap-1 overflow-y-auto">
                  {section.controls.map((control) => (
                    <ControlRenderer
                      key={`${section.id}-${control.label}`}
                      control={control}
                      settings={settings}
                      onChange={updateSetting}
                    />
                  ))}
                </div>
              </NavigationMenu.Content>
            </NavigationMenu.Item>
          );
        })}
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
          <NavigationMenu.Popup className="w-82 overflow-hidden rounded-[10px] transition-[opacity,transform,width,height] duration-[250ms] ease-out data-[ending-style]:translate-y-2 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0">
            <NavigationMenu.Viewport className="relative w-82 overflow-visible" />
          </NavigationMenu.Popup>
        </NavigationMenu.Positioner>
      </NavigationMenu.Portal>
    </NavigationMenu.Root>
  );
}

function ControlRenderer({
  control,
  settings,
  onChange,
}: {
  control: ControlDefinition;
  settings: SceneSettings;
  onChange: <
    TGroup extends keyof SceneSettings,
    TKey extends keyof SceneSettings[TGroup],
  >(
    group: TGroup,
    key: TKey,
    value: SceneSettings[TGroup][TKey],
  ) => void;
}) {
  const currentValue =
    settings[control.group][
      control.settingKey as keyof SceneSettings[typeof control.group]
    ];

  if (control.kind === "slider") {
    return (
      <RangeSlider
        label={control.label}
        value={Number(currentValue)}
        min={control.min}
        max={control.max}
        step={control.step}
        digits={control.digits}
        tabIndex={0}
        onValueChange={(value) =>
          onChange(control.group, control.settingKey as never, value as never)
        }
      />
    );
  }

  if (control.kind === "toggle") {
    return (
      <Toggle
        label={control.label}
        checked={Boolean(currentValue)}
        tabIndex={0}
        onCheckedChange={(value) =>
          onChange(control.group, control.settingKey as never, value as never)
        }
      />
    );
  }

  if (control.kind === "color") {
    return (
      <ColorControl
        label={control.label}
        value={String(currentValue)}
        tabIndex={0}
        onChange={(value) =>
          onChange(control.group, control.settingKey as never, value as never)
        }
      />
    );
  }

  return (
    <SelectControl
      label={control.label}
      value={String(currentValue)}
      options={control.options}
      tabIndex={0}
      onChange={(value) =>
        onChange(control.group, control.settingKey as never, value as never)
      }
    />
  );
}

function ColorControl({
  label,
  value,
  tabIndex,
  onChange,
}: {
  label: string;
  value: string;
  tabIndex?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative block h-9 w-full overflow-hidden rounded-[10px] bg-neutral-800/50 backdrop-blur-[20px]">
      <span className="pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 text-xs leading-3 font-semibold text-neutral-400">
        {label}
      </span>
      <span className="pointer-events-none absolute top-1/2 right-4 z-10 flex items-center gap-1.5 -translate-y-1/2 text-xs leading-3 font-semibold text-neutral-300 tabular-nums">
        <span
          className="size-3 rounded-full border border-white/30"
          style={{ backgroundColor: value }}
        />
        {value}
      </span>
      <input
        type="color"
        value={value}
        tabIndex={tabIndex}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectControl({
  label,
  value,
  options,
  tabIndex,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  tabIndex?: number;
  onChange: (value: string) => void;
}) {
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? value;

  return (
    <div className="relative h-9 w-full overflow-hidden rounded-[10px] bg-neutral-800/50 backdrop-blur-[20px]">
      <span className="pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 text-xs leading-3 font-semibold text-neutral-400">
        {label}
      </span>
      <span className="pointer-events-none absolute top-1/2 right-4 z-10 flex items-center gap-1.5 -translate-y-1/2 text-xs leading-3 font-semibold text-neutral-300">
        {selectedLabel}
        <ChevronDown className="size-3" />
      </span>
      <select
        value={value}
        tabIndex={tabIndex}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function randomizeControl(control: ControlDefinition) {
  if (control.kind === "slider") {
    const steps = Math.max(
      0,
      Math.round((control.max - control.min) / control.step),
    );
    const nextStep = Math.floor(Math.random() * (steps + 1));

    return Number(
      (control.min + nextStep * control.step).toFixed(control.digits),
    );
  }

  if (control.kind === "toggle") {
    return Math.random() >= 0.5;
  }

  if (control.kind === "color") {
    const channel = () =>
      Math.floor(Math.random() * 256)
        .toString(16)
        .padStart(2, "0");

    return `#${channel()}${channel()}${channel()}`;
  }

  const optionIndex = Math.floor(Math.random() * control.options.length);

  return (
    control.options[optionIndex]?.value ?? control.options[0]?.value ?? "none"
  );
}
