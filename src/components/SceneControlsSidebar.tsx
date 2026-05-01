import { ChevronRight, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
	cloneSceneSettings,
	DEFAULT_SCENE_SETTINGS,
} from "@/config/sceneControls";
import { cn } from "@/lib/utils";
import type { SceneSettings, SceneStats } from "../../shared/types";
import {
	ColorControl,
	ControlSection,
	NumberSlider,
	ReadOnlyRow,
	SelectControl,
	ToggleControl,
} from "./scene-controls/ControlInputs";
import {
	CONTROL_SECTIONS,
	type ControlDefinition,
	DEFAULT_OPEN_SECTIONS,
	type SettingsGroup,
} from "./scene-controls/config";

interface SceneControlsSidebarProps {
	settings: SceneSettings;
	stats: SceneStats;
	onSettingsChange: Dispatch<SetStateAction<SceneSettings>>;
	onResetAll: () => void;
}

export default function SceneControlsSidebar({
	settings,
	stats,
	onSettingsChange,
	onResetAll,
}: SceneControlsSidebarProps) {
	const [isOpen, setIsOpen] = useState(true);
	const [openSections, setOpenSections] = useState<
		Record<SettingsGroup, boolean>
	>(DEFAULT_OPEN_SECTIONS);

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

	return (
		<div className="dark pointer-events-none fixed inset-0 z-40 text-[12px] tracking-normal text-foreground">
			<aside
				className={cn(
					"pointer-events-auto fixed top-14 bottom-2 left-2 flex w-72 flex-col overflow-hidden rounded-lg border border-border/60 bg-card/85 shadow-2xl shadow-black/40 backdrop-blur-md transition-[transform,opacity] duration-300 ease-out max-sm:right-2 max-sm:w-auto",
					"max-sm:bottom-[calc(50lvh+0.25rem)]",
					isOpen
						? "translate-x-0 opacity-100"
						: "-translate-x-[calc(100%+0.75rem)] opacity-0",
				)}
				aria-hidden={!isOpen}
				inert={!isOpen}
			>
				<header className="flex h-9 shrink-0 items-center justify-between px-3">
					<div className="flex min-w-0 items-center gap-2">
						<SlidersHorizontal className="size-3.5 text-muted-foreground" />
						<h2 className="truncate font-semibold text-[13px] text-foreground">
							Scene Controls
						</h2>
					</div>
					<div className="flex items-center gap-1">
						<Button
							type="button"
							variant="ghost"
							size="icon-xs"
							className="text-muted-foreground hover:text-foreground"
							aria-label="Reset all controls"
							onClick={onResetAll}
						>
							<RefreshCw />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon-xs"
							className="text-muted-foreground hover:text-foreground"
							aria-label="Hide scene controls"
							onClick={() => setIsOpen(false)}
						>
							<X />
						</Button>
					</div>
				</header>

				<Separator className="bg-border/40" />

				<ScrollArea className="min-h-0 flex-1">
					<div className="flex flex-col gap-1 p-2">
						{CONTROL_SECTIONS.map((section) => (
							<ControlSection
								key={section.id}
								title={section.title}
								isOpen={openSections[section.id]}
								onToggle={() =>
									setOpenSections((currentSections) => ({
										...currentSections,
										[section.id]: !currentSections[section.id],
									}))
								}
								onReset={() => resetSection(section.id)}
							>
								{section.controls.map((control) => (
									<ControlRenderer
										key={`${section.id}-${control.label}`}
										control={control}
										settings={settings}
										stats={stats}
										onChange={updateSetting}
									/>
								))}
							</ControlSection>
						))}
					</div>
				</ScrollArea>
			</aside>

			<Button
				type="button"
				variant="outline"
				size="icon-sm"
				className={cn(
					"pointer-events-auto fixed bottom-6 left-2 rounded-md border-border/60 bg-card/85 text-muted-foreground shadow-lg shadow-black/30 backdrop-blur-md transition-[transform,opacity] duration-300 ease-out hover:text-foreground",
					"max-sm:bottom-[calc(50lvh+1rem)]",
					isOpen
						? "-translate-x-[calc(100%+0.75rem)] opacity-0"
						: "translate-x-0 opacity-100",
				)}
				aria-label="Show scene controls"
				aria-hidden={isOpen}
				inert={isOpen}
				onClick={() => setIsOpen(true)}
			>
				<ChevronRight />
			</Button>
		</div>
	);
}

function ControlRenderer({
	control,
	settings,
	stats,
	onChange,
}: {
	control: ControlDefinition;
	settings: SceneSettings;
	stats: SceneStats;
	onChange: <
		TGroup extends keyof SceneSettings,
		TKey extends keyof SceneSettings[TGroup],
	>(
		group: TGroup,
		key: TKey,
		value: SceneSettings[TGroup][TKey],
	) => void;
}) {
	if (control.kind === "readonly") {
		return (
			<ReadOnlyRow
				label={control.label}
				value={control.getValue(settings, stats)}
			/>
		);
	}

	const currentValue =
		settings[control.group][
			control.settingKey as keyof SceneSettings[typeof control.group]
		];

	if (control.kind === "slider") {
		return (
			<NumberSlider
				label={control.label}
				value={Number(currentValue)}
				min={control.min}
				max={control.max}
				step={control.step}
				digits={control.digits}
				onChange={(value) =>
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
				onChange={(value) =>
					onChange(control.group, control.settingKey as never, value as never)
				}
			/>
		);
	}

	if (control.kind === "toggle") {
		return (
			<ToggleControl
				label={control.label}
				checked={Boolean(currentValue)}
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
			onChange={(value) =>
				onChange(control.group, control.settingKey as never, value as never)
			}
		/>
	);
}
