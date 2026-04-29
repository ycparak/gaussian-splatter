import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	RefreshCw,
	RotateCcw,
	SlidersHorizontal,
	X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
	cloneSceneSettings,
	DEFAULT_SCENE_SETTINGS,
} from "@/config/sceneControls";
import { cn } from "@/lib/utils";

const DEFAULT_OPEN_SECTIONS = {
	particles: true,
	scene: false,
	lighting: false,
	bloom: false,
	color: true,
	camera: false,
	renderer: false,
};

const TONE_MAPPING_OPTIONS = [
	{ label: "ACES Filmic", value: "aces" },
	{ label: "Linear", value: "linear" },
	{ label: "Reinhard", value: "reinhard" },
	{ label: "None", value: "none" },
];

export default function SceneControlsSidebar({
	settings,
	stats,
	onSettingsChange,
	onResetAll,
}) {
	const [isOpen, setIsOpen] = useState(true);
	const [openSections, setOpenSections] = useState(DEFAULT_OPEN_SECTIONS);

	function updateSetting(group, key, value) {
		onSettingsChange((currentSettings) => ({
			...currentSettings,
			[group]: {
				...currentSettings[group],
				[key]: value,
			},
		}));
	}

	function resetSection(group) {
		onSettingsChange((currentSettings) => ({
			...currentSettings,
			[group]: cloneSceneSettings(DEFAULT_SCENE_SETTINGS)[group],
		}));
	}

	function toggleSection(section) {
		setOpenSections((currentSections) => ({
			...currentSections,
			[section]: !currentSections[section],
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
						<ControlSection
							title="Particles"
							isOpen={openSections.particles}
							onToggle={() => toggleSection("particles")}
							onReset={() => resetSection("particles")}
						>
							<ReadOnlyRow
								label="Count"
								value={(stats?.particleCount ?? 0).toLocaleString()}
							/>
							<NumberSlider
								label="Size"
								value={settings.particles.size}
								min={0.005}
								max={0.12}
								step={0.001}
								digits={3}
								onChange={(value) => updateSetting("particles", "size", value)}
							/>
							<NumberSlider
								label="Flow Influence"
								value={settings.particles.flowFieldInfluence}
								min={0}
								max={1}
								step={0.01}
								digits={2}
								onChange={(value) =>
									updateSetting("particles", "flowFieldInfluence", value)
								}
							/>
							<NumberSlider
								label="Flow Strength"
								value={settings.particles.flowFieldStrength}
								min={0}
								max={4}
								step={0.05}
								digits={2}
								onChange={(value) =>
									updateSetting("particles", "flowFieldStrength", value)
								}
							/>
							<NumberSlider
								label="Flow Frequency"
								value={settings.particles.flowFieldFrequency}
								min={0.05}
								max={3}
								step={0.05}
								digits={2}
								onChange={(value) =>
									updateSetting("particles", "flowFieldFrequency", value)
								}
							/>
							<NumberSlider
								label="Time Scale"
								value={settings.particles.timeScale}
								min={0}
								max={1}
								step={0.01}
								digits={2}
								onChange={(value) =>
									updateSetting("particles", "timeScale", value)
								}
							/>
							<NumberSlider
								label="Decay Rate"
								value={settings.particles.decayRate}
								min={0.1}
								max={3}
								step={0.05}
								digits={2}
								onChange={(value) =>
									updateSetting("particles", "decayRate", value)
								}
							/>
							<NumberSlider
								label="Return Force"
								value={settings.particles.returnForce}
								min={0}
								max={14}
								step={0.1}
								digits={1}
								onChange={(value) =>
									updateSetting("particles", "returnForce", value)
								}
							/>
							<NumberSlider
								label="Morph Duration"
								value={settings.particles.morphDuration}
								min={0.15}
								max={4}
								step={0.05}
								digits={2}
								onChange={(value) =>
									updateSetting("particles", "morphDuration", value)
								}
							/>
						</ControlSection>

						<ControlSection
							title="Scene"
							isOpen={openSections.scene}
							onToggle={() => toggleSection("scene")}
							onReset={() => resetSection("scene")}
						>
							<ColorControl
								label="Background"
								value={settings.scene.background}
								onChange={(value) =>
									updateSetting("scene", "background", value)
								}
							/>
							<ToggleControl
								label="Fog"
								checked={settings.scene.fogEnabled}
								onChange={(value) =>
									updateSetting("scene", "fogEnabled", value)
								}
							/>
							<ColorControl
								label="Fog Color"
								value={settings.scene.fogColor}
								onChange={(value) => updateSetting("scene", "fogColor", value)}
							/>
							<NumberSlider
								label="Fog Near"
								value={settings.scene.fogNear}
								min={0}
								max={100}
								step={0.5}
								digits={1}
								onChange={(value) => updateSetting("scene", "fogNear", value)}
							/>
							<NumberSlider
								label="Fog Far"
								value={settings.scene.fogFar}
								min={1}
								max={120}
								step={0.5}
								digits={1}
								onChange={(value) => updateSetting("scene", "fogFar", value)}
							/>
							<NumberSlider
								label="Rotation X"
								value={settings.scene.pointRotationX}
								min={0}
								max={Math.PI * 2}
								step={0.01}
								digits={2}
								onChange={(value) =>
									updateSetting("scene", "pointRotationX", value)
								}
							/>
							<NumberSlider
								label="Scale"
								value={settings.scene.scale}
								min={0.2}
								max={3}
								step={0.01}
								digits={2}
								onChange={(value) => updateSetting("scene", "scale", value)}
							/>
						</ControlSection>

						<ControlSection
							title="Lighting"
							isOpen={openSections.lighting}
							onToggle={() => toggleSection("lighting")}
							onReset={() => resetSection("lighting")}
						>
							<NumberSlider
								label="Direction X"
								value={settings.lighting.directionX}
								min={-2}
								max={2}
								step={0.05}
								digits={2}
								onChange={(value) =>
									updateSetting("lighting", "directionX", value)
								}
							/>
							<NumberSlider
								label="Direction Y"
								value={settings.lighting.directionY}
								min={-2}
								max={2}
								step={0.05}
								digits={2}
								onChange={(value) =>
									updateSetting("lighting", "directionY", value)
								}
							/>
							<NumberSlider
								label="Direction Z"
								value={settings.lighting.directionZ}
								min={-2}
								max={2}
								step={0.05}
								digits={2}
								onChange={(value) =>
									updateSetting("lighting", "directionZ", value)
								}
							/>
							<NumberSlider
								label="Ambient"
								value={settings.lighting.ambient}
								min={0}
								max={2}
								step={0.05}
								digits={2}
								onChange={(value) =>
									updateSetting("lighting", "ambient", value)
								}
							/>
							<NumberSlider
								label="Diffuse"
								value={settings.lighting.diffuse}
								min={0}
								max={2}
								step={0.05}
								digits={2}
								onChange={(value) =>
									updateSetting("lighting", "diffuse", value)
								}
							/>
							<NumberSlider
								label="Specular"
								value={settings.lighting.specular}
								min={0}
								max={1}
								step={0.01}
								digits={2}
								onChange={(value) =>
									updateSetting("lighting", "specular", value)
								}
							/>
							<NumberSlider
								label="Shininess"
								value={settings.lighting.shininess}
								min={1}
								max={128}
								step={1}
								digits={0}
								onChange={(value) =>
									updateSetting("lighting", "shininess", value)
								}
							/>
						</ControlSection>

						<ControlSection
							title="Bloom"
							isOpen={openSections.bloom}
							onToggle={() => toggleSection("bloom")}
							onReset={() => resetSection("bloom")}
						>
							<ToggleControl
								label="Enabled"
								checked={settings.bloom.enabled}
								onChange={(value) => updateSetting("bloom", "enabled", value)}
							/>
							<NumberSlider
								label="Strength"
								value={settings.bloom.strength}
								min={0}
								max={2.5}
								step={0.05}
								digits={2}
								onChange={(value) => updateSetting("bloom", "strength", value)}
							/>
							<NumberSlider
								label="Radius"
								value={settings.bloom.radius}
								min={0}
								max={1}
								step={0.01}
								digits={2}
								onChange={(value) => updateSetting("bloom", "radius", value)}
							/>
							<NumberSlider
								label="Threshold"
								value={settings.bloom.threshold}
								min={0}
								max={1}
								step={0.01}
								digits={2}
								onChange={(value) => updateSetting("bloom", "threshold", value)}
							/>
						</ControlSection>

						<ControlSection
							title="Color Adjust"
							isOpen={openSections.color}
							onToggle={() => toggleSection("color")}
							onReset={() => resetSection("color")}
						>
							<NumberSlider
								label="Brightness"
								value={settings.color.brightness}
								min={-0.75}
								max={0.75}
								step={0.01}
								digits={2}
								onChange={(value) =>
									updateSetting("color", "brightness", value)
								}
							/>
							<NumberSlider
								label="Contrast"
								value={settings.color.contrast}
								min={0.1}
								max={2}
								step={0.01}
								digits={2}
								onChange={(value) => updateSetting("color", "contrast", value)}
							/>
							<NumberSlider
								label="Saturation"
								value={settings.color.saturation}
								min={0}
								max={2.5}
								step={0.01}
								digits={2}
								onChange={(value) =>
									updateSetting("color", "saturation", value)
								}
							/>
							<ColorControl
								label="Tint"
								value={settings.color.tintColor}
								onChange={(value) => updateSetting("color", "tintColor", value)}
							/>
							<NumberSlider
								label="Tint Strength"
								value={settings.color.tintStrength}
								min={0}
								max={1}
								step={0.01}
								digits={2}
								onChange={(value) =>
									updateSetting("color", "tintStrength", value)
								}
							/>
						</ControlSection>

						<ControlSection
							title="Camera"
							isOpen={openSections.camera}
							onToggle={() => toggleSection("camera")}
							onReset={() => resetSection("camera")}
						>
							<NumberSlider
								label="FOV"
								value={settings.camera.fov}
								min={15}
								max={90}
								step={1}
								digits={0}
								onChange={(value) => updateSetting("camera", "fov", value)}
							/>
							<NumberSlider
								label="Z Position"
								value={settings.camera.z}
								min={0.5}
								max={10}
								step={0.05}
								digits={2}
								onChange={(value) => updateSetting("camera", "z", value)}
							/>
							<NumberSlider
								label="Target X"
								value={settings.camera.targetX}
								min={-10}
								max={10}
								step={0.05}
								digits={2}
								onChange={(value) => updateSetting("camera", "targetX", value)}
							/>
							<NumberSlider
								label="Target Y"
								value={settings.camera.targetY}
								min={-10}
								max={10}
								step={0.05}
								digits={2}
								onChange={(value) => updateSetting("camera", "targetY", value)}
							/>
							<NumberSlider
								label="Target Z"
								value={settings.camera.targetZ}
								min={-15}
								max={5}
								step={0.05}
								digits={2}
								onChange={(value) => updateSetting("camera", "targetZ", value)}
							/>
							<NumberSlider
								label="Damping"
								value={settings.camera.damping}
								min={0.25}
								max={8}
								step={0.05}
								digits={2}
								onChange={(value) => updateSetting("camera", "damping", value)}
							/>
							<NumberSlider
								label="Bob Amount"
								value={settings.camera.bobAmplitude}
								min={0}
								max={3}
								step={0.05}
								digits={2}
								onChange={(value) =>
									updateSetting("camera", "bobAmplitude", value)
								}
							/>
							<NumberSlider
								label="Bob Speed"
								value={settings.camera.bobSpeed}
								min={0}
								max={3}
								step={0.05}
								digits={2}
								onChange={(value) => updateSetting("camera", "bobSpeed", value)}
							/>
							<NumberSlider
								label="Roll Amount"
								value={settings.camera.rollAmplitude}
								min={0}
								max={0.5}
								step={0.01}
								digits={2}
								onChange={(value) =>
									updateSetting("camera", "rollAmplitude", value)
								}
							/>
						</ControlSection>

						<ControlSection
							title="Renderer"
							isOpen={openSections.renderer}
							onToggle={() => toggleSection("renderer")}
							onReset={() => resetSection("renderer")}
						>
							<NumberSlider
								label="Pixel Ratio Cap"
								value={settings.renderer.pixelRatioCap}
								min={0.5}
								max={3}
								step={0.25}
								digits={2}
								onChange={(value) =>
									updateSetting("renderer", "pixelRatioCap", value)
								}
							/>
							<SelectControl
								label="Tone Mapping"
								value={settings.renderer.toneMapping}
								options={TONE_MAPPING_OPTIONS}
								onChange={(value) =>
									updateSetting("renderer", "toneMapping", value)
								}
							/>
							<NumberSlider
								label="Exposure"
								value={settings.renderer.exposure}
								min={0.1}
								max={3}
								step={0.05}
								digits={2}
								onChange={(value) =>
									updateSetting("renderer", "exposure", value)
								}
							/>
							<ReadOnlyRow
								label="Antialias"
								value={settings.renderer.antialias ? "On" : "Off"}
							/>
						</ControlSection>
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

function ControlSection({ title, isOpen, onToggle, onReset, children }) {
	return (
		<section className="overflow-hidden rounded-md border border-border/35 bg-muted/10">
			<button
				type="button"
				className="flex h-8 w-full items-center justify-between px-2 text-left font-semibold text-[12px] text-foreground transition-colors hover:bg-muted/20"
				aria-expanded={isOpen}
				onClick={onToggle}
			>
				<span className="truncate">{title}</span>
				<ChevronDown
					className={cn(
						"size-3.5 text-muted-foreground transition-transform duration-200 ease-out",
						!isOpen && "-rotate-90",
					)}
				/>
			</button>
			{isOpen ? (
				<div className="flex flex-col gap-1 border-border/35 border-t p-2">
					{children}
					<Button
						type="button"
						variant="ghost"
						size="xs"
						className="mt-1 w-full justify-center bg-muted/20 text-muted-foreground hover:text-foreground"
						onClick={onReset}
					>
						<RotateCcw data-icon="inline-start" />
						Reset to Defaults
					</Button>
				</div>
			) : null}
		</section>
	);
}

function ControlRow({ label, children }) {
	return (
		<div className="grid min-h-7 grid-cols-[minmax(5.5rem,1fr)_minmax(7rem,1.2fr)] items-center gap-2 rounded-md bg-muted/20 px-2 py-1">
			<span className="truncate text-muted-foreground">{label}</span>
			{children}
		</div>
	);
}

function ReadOnlyRow({ label, value }) {
	return (
		<ControlRow label={label}>
			<span className="justify-self-end font-mono text-[11px] text-foreground">
				{value}
			</span>
		</ControlRow>
	);
}

function NumberSlider({ label, value, min, max, step, digits = 2, onChange }) {
	const displayValue = Number(value).toFixed(digits);

	return (
		<ControlRow label={label}>
			<div className="grid grid-cols-[1fr_3.7rem] items-center gap-2">
				<input
					type="range"
					min={min}
					max={max}
					step={step}
					value={value}
					className="h-4 min-w-0 accent-primary"
					onChange={(event) => onChange(Number(event.target.value))}
				/>
				<input
					type="text"
					inputMode="decimal"
					value={displayValue}
					className="h-6 rounded-sm border border-border/50 bg-background/40 px-1 text-right font-mono text-[11px] text-foreground tabular-nums outline-none transition-colors focus:border-ring"
					onChange={(event) => {
						const nextValue = Number(event.target.value.replace(",", "."));
						if (Number.isFinite(nextValue)) onChange(nextValue);
					}}
				/>
			</div>
		</ControlRow>
	);
}

function ColorControl({ label, value, onChange }) {
	return (
		<ControlRow label={label}>
			<div className="grid grid-cols-[1.75rem_1fr] items-center gap-2">
				<input
					type="color"
					value={value}
					className="size-6 overflow-hidden rounded-sm border border-border/50 bg-transparent p-0"
					onChange={(event) => onChange(event.target.value)}
				/>
				<input
					type="text"
					value={value}
					readOnly
					className="h-6 min-w-0 rounded-sm border border-border/50 bg-background/40 px-1 font-mono text-[11px] text-foreground outline-none transition-colors focus:border-ring"
				/>
			</div>
		</ControlRow>
	);
}

function ToggleControl({ label, checked, onChange }) {
	return (
		<ControlRow label={label}>
			<button
				type="button"
				className={cn(
					"relative h-5 w-9 justify-self-end rounded-full border border-border/50 transition-colors",
					checked ? "bg-primary" : "bg-muted/40",
				)}
				aria-pressed={checked}
				onClick={() => onChange(!checked)}
			>
				<span
					className={cn(
						"absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-background transition-transform duration-200 ease-out",
						checked ? "translate-x-4" : "translate-x-0.5",
					)}
				/>
			</button>
		</ControlRow>
	);
}

function SelectControl({ label, value, options, onChange }) {
	return (
		<ControlRow label={label}>
			<div className="relative">
				<select
					value={value}
					className="h-6 w-full appearance-none rounded-sm border border-border/50 bg-background/40 px-2 pr-7 text-[11px] text-foreground outline-none transition-colors focus:border-ring"
					onChange={(event) => onChange(event.target.value)}
				>
					{options.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
				<ChevronLeft className="pointer-events-none absolute top-1/2 right-1.5 size-3 -translate-y-1/2 -rotate-90 text-muted-foreground" />
			</div>
		</ControlRow>
	);
}
