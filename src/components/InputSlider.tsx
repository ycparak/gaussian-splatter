"use client";

import { Slider } from "@base-ui/react/slider";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useRef, useState } from "react";

import { cn } from "@/src/lib/utils";

const SLIDER_MIN = 0;
const SLIDER_MAX = 10;
const SLIDER_WIDTH = 298;
const DEFAULT_VALUE = 6;
const THUMB_INSET = 7;

const valueTransition = {
	type: "spring",
	bounce: 0.32,
	duration: 0.34,
} as const;

export default function InputSlider() {
	const controlRef = useRef<HTMLDivElement | null>(null);
	const [value, setValue] = useState(DEFAULT_VALUE);
	const [isHovered, setIsHovered] = useState(false);
	const [isActive, setIsActive] = useState(false);

	const animatedValue = useMotionValue(DEFAULT_VALUE);
	const isEngaged = isHovered || isActive;

	const fillWidth = useTransform(() => {
		const controlWidth =
			controlRef.current?.getBoundingClientRect().width ?? SLIDER_WIDTH;
		const percent =
			(animatedValue.get() - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN);
		const baseWidth = controlWidth * Math.max(0, Math.min(1, percent));

		return `${Math.max(0, baseWidth)}px`;
	});

	const thumbX = useTransform(() => {
		const controlWidth =
			controlRef.current?.getBoundingClientRect().width ?? SLIDER_WIDTH;
		const percent =
			(animatedValue.get() - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN);
		const baseX = controlWidth * Math.max(0, Math.min(1, percent));

		return `${clamp(baseX - THUMB_INSET, THUMB_INSET, controlWidth - THUMB_INSET)}px`;
	});

	return (
		<Slider.Root
			tabIndex={-1}
			value={value}
			min={SLIDER_MIN}
			max={SLIDER_MAX}
			step={0.1}
			format={{
				minimumFractionDigits: 1,
				maximumFractionDigits: 1,
			}}
			onValueChange={(nextValue) => {
				const roundedValue = Number(nextValue.toFixed(1));

				setValue(roundedValue);
				void animate(animatedValue, roundedValue, valueTransition);
			}}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			className="fixed z-9 h-9 w-[298px] touch-none select-none overflow-hidden bg-neutral-800/50 backdrop-blur-[20px]"
			style={{
				bottom: "20px",
				left: "calc(50% - 149px)",
				borderRadius: "10px",
				backdropFilter: "blur(20px)",
				WebkitBackdropFilter: "blur(20px)",
				WebkitTapHighlightColor: "transparent",
			}}
		>
			<Slider.Control
				ref={controlRef}
				onPointerDown={() => {
					setIsActive(true);
				}}
				onPointerUp={() => setIsActive(false)}
				onPointerCancel={() => setIsActive(false)}
				onLostPointerCapture={() => setIsActive(false)}
				className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing"
			>
				<Slider.Track className="relative h-full w-full overflow-hidden">
					<motion.div
						aria-hidden="true"
						style={{ width: fillWidth }}
						className={cn(
							"absolute top-0 left-0 h-full bg-white/10 transition-colors",
							isEngaged && "bg-white/20",
						)}
					/>

					<motion.div
						aria-hidden="true"
						animate={{ opacity: isEngaged ? 1 : 0 }}
						transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
						style={{ x: thumbX }}
						className={cn(
							"pointer-events-none absolute top-1/2 left-0 z-10 h-4.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-400",
							isActive && "bg-neutral-300",
						)}
					/>

					<Slider.Thumb className="size-9 cursor-grab outline-none active:cursor-grabbing" />
				</Slider.Track>
			</Slider.Control>

			<Slider.Label
				className={cn(
					"pointer-events-none absolute top-1/2 left-4 z-20 -translate-y-1/2 text-xs leading-3 transition-colors",
					isEngaged ? "text-neutral-300" : "text-neutral-300",
				)}
			>
				Label
			</Slider.Label>

			<Slider.Value
				className={cn(
					"pointer-events-none absolute top-1/2 right-4 z-20 -translate-y-1/2 text-xs leading-3 tabular-nums transition-colors",
					isEngaged ? "text-white" : "text-neutral-300",
				)}
			/>
		</Slider.Root>
	);
}

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}
