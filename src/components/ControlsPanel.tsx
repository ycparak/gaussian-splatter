"use client";

import { NavigationMenu } from "@base-ui/react/navigation-menu";
import { AnimatePresence, motion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";
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

const panelDuration = "0.35s";
const panelEasing = "cubic-bezier(0.22, 1, 0.36, 1)";
const panelCollisionPadding = {
	top: 40,
	right: 40,
	left: 20,
	bottom: 12,
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
							"block truncate pl-4 text-xs leading-3",
							activeTab ? "text-neutral-300" : "text-neutral-400",
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

						<NavigationMenu.Content className="flex h-[262px] w-[298px] items-center justify-center text-xs font-medium text-neutral-400 transition-[opacity,transform,translate] duration-[var(--duration)] ease-[var(--easing)] data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[starting-style]:data-[activation-direction=left]:translate-x-[-50%] data-[starting-style]:data-[activation-direction=right]:translate-x-[50%] data-[ending-style]:data-[activation-direction=left]:translate-x-[50%] data-[ending-style]:data-[activation-direction=right]:translate-x-[-50%]">
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
					collisionPadding={panelCollisionPadding}
					collisionAvoidance={{ side: "none", align: "none" }}
					className="relative z-9 box-border h-[var(--positioner-height)] w-[var(--positioner-width)] max-w-[var(--available-width)] transition-[top,left,right,bottom] duration-[var(--duration)] ease-[var(--easing)] before:absolute before:content-[''] data-[instant]:transition-none before:top-[-40px] before:right-[-40px] before:bottom-[-12px] before:left-[-20px]"
					style={
						{
							["--duration" as string]: panelDuration,
							["--easing" as string]: panelEasing,
						} as CSSProperties
					}
				>
					<NavigationMenu.Popup className="relative h-[var(--popup-height)] w-[var(--popup-width)] origin-[var(--transform-origin)] overflow-hidden rounded-[10px] border border-white/5 bg-neutral-800/50 backdrop-blur-[20px] transition-[opacity,transform,width,height,scale,translate] duration-[var(--duration)] ease-[var(--easing)] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0">
						<NavigationMenu.Viewport className="relative h-[262px] w-[298px] overflow-hidden" />
					</NavigationMenu.Popup>
				</NavigationMenu.Positioner>
			</NavigationMenu.Portal>
		</NavigationMenu.Root>
	);
}
