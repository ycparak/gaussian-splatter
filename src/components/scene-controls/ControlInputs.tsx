import { ChevronDown, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ControlSection({
	title,
	isOpen,
	onToggle,
	onReset,
	children,
}: {
	title: string;
	isOpen: boolean;
	onToggle: () => void;
	onReset: () => void;
	children: ReactNode;
}) {
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

export function ControlRow({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="grid min-h-7 grid-cols-[minmax(5.5rem,1fr)_minmax(7rem,1.2fr)] items-center gap-2 rounded-md bg-muted/20 px-2 py-1">
			<span className="truncate text-muted-foreground">{label}</span>
			{children}
		</div>
	);
}

export function NumberSlider({
	label,
	value,
	min,
	max,
	step,
	digits,
	onChange,
}: {
	label: string;
	value: number;
	min: number;
	max: number;
	step: number;
	digits: number;
	onChange: (value: number) => void;
}) {
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

export function ColorControl({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
}) {
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

export function ToggleControl({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (value: boolean) => void;
}) {
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

export function SelectControl({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: string;
	options: Array<{ label: string; value: string }>;
	onChange: (value: string) => void;
}) {
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
				<ChevronDown className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-2 size-3 text-muted-foreground" />
			</div>
		</ControlRow>
	);
}
