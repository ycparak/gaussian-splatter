'use client'

import { Slider } from '@base-ui/react/slider'
import { animate, m, useMotionValue, useTransform } from 'motion/react'
import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/src/lib/utils'

const SLIDER_MIN = 0
const SLIDER_MAX = 10
const SLIDER_WIDTH = 298
const DEFAULT_VALUE = 6
const THUMB_INSET = 7
const MAX_OVERFLOW = 20

const valueTransition = {
	type: 'spring',
	bounce: 0.32,
	duration: 0.34,
} as const

const overflowTransition = {
	type: 'spring',
	bounce: 0.25,
} as const

type DragRegion = 'left' | 'middle' | 'right'

interface RangeSliderProps {
	label?: string
	value?: number
	min?: number
	max?: number
	step?: number
	digits?: number
	tabIndex?: number
	onValueChange?: (value: number) => void
	className?: string
	style?: CSSProperties
}

export default function RangeSlider({
	label = 'Label',
	value = DEFAULT_VALUE,
	min = SLIDER_MIN,
	max = SLIDER_MAX,
	step = 0.1,
	digits = 1,
	tabIndex = 0,
	onValueChange,
	className,
	style,
}: RangeSliderProps) {
	const controlRef = useRef<HTMLDivElement | null>(null)
	const dragBoundsRef = useRef<{ left: number; right: number } | null>(null)
	const [isHovered, setIsHovered] = useState(false)
	const [isActive, setIsActive] = useState(false)
	const [region, setRegion] = useState<DragRegion>('middle')

	const animatedValue = useMotionValue(value)
	const overflow = useMotionValue(0)
	const isEngaged = isHovered || isActive

	const shellWidth = useTransform(() => `calc(100% + ${overflow.get()}px)`)
	const shellX = useTransform(() => (region === 'left' ? `${-overflow.get()}px` : '0px'))

	const fillWidth = useTransform(() => {
		const controlWidth = controlRef.current?.getBoundingClientRect().width ?? SLIDER_WIDTH
		const percent = (animatedValue.get() - min) / (max - min)
		const baseWidth = controlWidth * Math.max(0, Math.min(1, percent))

		return `${Math.max(0, baseWidth)}px`
	})

	const thumbX = useTransform(() => {
		const controlWidth = controlRef.current?.getBoundingClientRect().width ?? SLIDER_WIDTH
		const percent = (animatedValue.get() - min) / (max - min)
		const baseX = controlWidth * Math.max(0, Math.min(1, percent))

		return `${clamp(baseX - THUMB_INSET, THUMB_INSET, controlWidth - THUMB_INSET)}px`
	})

	useEffect(() => {
		void animate(animatedValue, value, valueTransition)
	}, [animatedValue, value])

	useEffect(() => {
		if (!isActive) return

		const handlePointerMove = (event: PointerEvent) => {
			if (!dragBoundsRef.current) return

			const { left, right } = dragBoundsRef.current

			if (event.clientX < left) {
				setRegion('left')
				overflow.jump(decay(left - event.clientX, MAX_OVERFLOW))
				return
			}

			if (event.clientX > right) {
				setRegion('right')
				overflow.jump(decay(event.clientX - right, MAX_OVERFLOW))
				return
			}

			setRegion('middle')
			overflow.jump(0)
		}

		const handlePointerEnd = () => {
			setIsActive(false)
			dragBoundsRef.current = null
			void animate(overflow, 0, overflowTransition).then(() => {
				setRegion('middle')
			})
		}

		window.addEventListener('pointermove', handlePointerMove)
		window.addEventListener('pointerup', handlePointerEnd, { once: true })
		window.addEventListener('pointercancel', handlePointerEnd, { once: true })
		window.addEventListener('blur', handlePointerEnd, { once: true })

		return () => {
			window.removeEventListener('pointermove', handlePointerMove)
			window.removeEventListener('pointerup', handlePointerEnd)
			window.removeEventListener('pointercancel', handlePointerEnd)
			window.removeEventListener('blur', handlePointerEnd)
		}
	}, [isActive, overflow])

	return (
		<m.div
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			className={cn(
				'relative h-9 w-full touch-none select-none overflow-hidden bg-neutral-800/50 backdrop-blur-[10px]',
				className
			)}
			style={{
				width: shellWidth,
				x: shellX,
				borderRadius: '10px',
				backdropFilter: 'blur(10px)',
				WebkitBackdropFilter: 'blur(10px)',
				WebkitTapHighlightColor: 'transparent',
				...style,
			}}>
			<Slider.Root
				tabIndex={-1}
				value={value}
				min={min}
				max={max}
				step={step}
				format={{
					minimumFractionDigits: digits,
					maximumFractionDigits: digits,
				}}
				onValueChange={nextValue => {
					onValueChange?.(roundToStep(nextValue, step, digits))
				}}
				className='relative h-full w-full'>
				<Slider.Control
					ref={controlRef}
					onPointerDown={() => {
						const bounds = controlRef.current?.getBoundingClientRect()

						if (bounds) {
							dragBoundsRef.current = {
								left: bounds.left,
								right: bounds.right,
							}
						}

						setIsActive(true)
					}}
					className='absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing'>
					<Slider.Track className='relative h-full w-full overflow-hidden'>
						<m.div
							aria-hidden='true'
							style={{ width: fillWidth }}
							className={cn(
								'absolute top-0 left-0 h-full bg-white/10 transition-colors',
								isEngaged && 'bg-white/20'
							)}
						/>

						<m.div
							aria-hidden='true'
							animate={{ opacity: isEngaged ? 1 : 0 }}
							transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
							style={{ x: thumbX }}
							className={cn(
								'pointer-events-none absolute top-1/2 left-0 z-10 h-4.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-400',
								isActive && 'bg-neutral-300'
							)}
						/>

						<Slider.Thumb
							tabIndex={tabIndex}
							className='size-9 cursor-grab outline-none active:cursor-grabbing'
						/>
					</Slider.Track>
				</Slider.Control>

				<Slider.Label
					className={cn(
						'pointer-events-none absolute top-1/2 left-4 z-20 -translate-y-1/2 text-xs leading-3 font-semibold transition-colors',
						isEngaged ? 'text-neutral-200' : 'text-neutral-400'
					)}>
					{label}
				</Slider.Label>

				<span
					className={cn(
						'pointer-events-none absolute top-1/2 right-4 z-20 -translate-y-1/2 text-xs leading-3 font-semibold tabular-nums transition-colors',
						isEngaged ? 'text-white' : 'text-neutral-300'
					)}>
					{Number(value).toFixed(digits)}
				</span>
			</Slider.Root>
		</m.div>
	)
}

function roundToStep(value: number, step: number, digits: number) {
	const multiplier = 1 / step
	const roundedValue = Math.round(value * multiplier) / multiplier

	return Number(roundedValue.toFixed(digits))
}

function decay(value: number, max: number) {
	if (max === 0) return 0

	const entry = value / max
	const sigmoid = 2 * (1 / (1 + Math.exp(-entry)) - 0.5)

	return sigmoid * max
}

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max)
}
