'use client'

import { animate, m, useMotionValue, useTransform } from 'motion/react'
import type { CSSProperties, ChangeEvent, KeyboardEvent, MouseEvent, PointerEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@/src/lib/utils'

const DEFAULT_MIN = 0
const DEFAULT_MAX = 10
const DEFAULT_STEP = 0.1
const DEFAULT_VALUE = 6
const CLICK_THRESHOLD = 3
const DEAD_ZONE = 32
const MAX_CURSOR_RANGE = 200
const MAX_STRETCH = 8

interface SliderProps {
	label?: string
	value?: number
	onValueChange?: (value: number) => void
	min?: number
	max?: number
	step?: number
	digits?: number
	unit?: string
	className?: string
	style?: CSSProperties
}

export default function Slider({
	label = 'Label',
	value = DEFAULT_VALUE,
	onValueChange,
	min = DEFAULT_MIN,
	max = DEFAULT_MAX,
	step = DEFAULT_STEP,
	digits,
	unit,
	className,
	style,
}: SliderProps) {
	const resolvedStep = step > 0 ? step : DEFAULT_STEP
	const resolvedDigits = digits ?? decimalsForStep(resolvedStep)
	const range = Math.max(max - min, Number.EPSILON)
	const percentage = ((value - min) / range) * 100

	const wrapperRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const labelRef = useRef<HTMLSpanElement>(null)
	const valueRef = useRef<HTMLButtonElement>(null)
	const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const pointerDownPositionRef = useRef<{ x: number; y: number } | null>(null)
	const isClickRef = useRef(true)
	const animationRef = useRef<ReturnType<typeof animate> | null>(null)
	const wrapperRectRef = useRef<DOMRect | null>(null)
	const scaleRef = useRef(1)

	const [isInteracting, setIsInteracting] = useState(false)
	const [isDragging, setIsDragging] = useState(false)
	const [isHovered, setIsHovered] = useState(false)
	const [isValueHovered, setIsValueHovered] = useState(false)
	const [isValueEditable, setIsValueEditable] = useState(false)
	const [showInput, setShowInput] = useState(false)
	const [inputValue, setInputValue] = useState('')

	const isActive = isInteracting || isHovered

	const fillPercent = useMotionValue(percentage)
	const fillWidth = useTransform(fillPercent, percent => `${percent}%`)
	const handleLeft = useTransform(fillPercent, percent => `max(5px, calc(${percent}% - 9px))`)

	const rubberStretchPx = useMotionValue(0)
	const rubberBandWidth = useTransform(
		rubberStretchPx,
		stretch => `calc(100% + ${Math.abs(stretch)}px)`
	)
	const rubberBandX = useTransform(rubberStretchPx, stretch => (stretch < 0 ? stretch : 0))

	useEffect(() => {
		if (!isInteracting && !animationRef.current) {
			fillPercent.jump(percentage)
		}
	}, [fillPercent, isInteracting, percentage])

	const positionToValue = useCallback(
		(clientX: number) => {
			const rect = wrapperRectRef.current
			if (!rect) return value

			const screenX = clientX - rect.left
			const sceneX = screenX / scaleRef.current
			const nativeWidth = wrapperRef.current?.offsetWidth ?? rect.width
			const percent = clamp(sceneX / nativeWidth, 0, 1)
			const rawValue = min + percent * range

			return clamp(rawValue, min, max)
		},
		[max, min, range, value]
	)

	const percentFromValue = useCallback(
		(nextValue: number) => ((nextValue - min) / range) * 100,
		[min, range]
	)

	const computeRubberStretch = useCallback((clientX: number, sign: number) => {
		const rect = wrapperRectRef.current
		if (!rect) return 0

		const distancePast = sign < 0 ? rect.left - clientX : clientX - rect.right
		const overflow = Math.max(0, distancePast - DEAD_ZONE)

		return sign * MAX_STRETCH * Math.sqrt(Math.min(overflow / MAX_CURSOR_RANGE, 1))
	}, [])

	const handlePointerDown = useCallback(
		(event: PointerEvent<HTMLDivElement>) => {
			if (showInput) return

			event.preventDefault()
			event.currentTarget.setPointerCapture(event.pointerId)
			pointerDownPositionRef.current = { x: event.clientX, y: event.clientY }
			isClickRef.current = true
			setIsInteracting(true)

			if (wrapperRef.current) {
				wrapperRectRef.current = wrapperRef.current.getBoundingClientRect()
				const nativeWidth = wrapperRef.current.offsetWidth
				scaleRef.current = wrapperRectRef.current.width / nativeWidth
			}
		},
		[showInput]
	)

	const handlePointerMove = useCallback(
		(event: PointerEvent<HTMLDivElement>) => {
			if (!isInteracting || !pointerDownPositionRef.current) return

			const dx = event.clientX - pointerDownPositionRef.current.x
			const dy = event.clientY - pointerDownPositionRef.current.y
			const distance = Math.sqrt(dx * dx + dy * dy)

			if (isClickRef.current && distance > CLICK_THRESHOLD) {
				isClickRef.current = false
				setIsDragging(true)
			}

			if (!isClickRef.current) {
				const rect = wrapperRectRef.current
				if (rect) {
					if (event.clientX < rect.left) {
						rubberStretchPx.jump(computeRubberStretch(event.clientX, -1))
					} else if (event.clientX > rect.right) {
						rubberStretchPx.jump(computeRubberStretch(event.clientX, 1))
					} else {
						rubberStretchPx.jump(0)
					}
				}

				const nextValue = positionToValue(event.clientX)
				const nextPercent = percentFromValue(nextValue)

				if (animationRef.current) {
					animationRef.current.stop()
					animationRef.current = null
				}

				fillPercent.jump(nextPercent)
				onValueChange?.(roundValue(nextValue, resolvedStep))
			}
		},
		[
			computeRubberStretch,
			fillPercent,
			isInteracting,
			onValueChange,
			percentFromValue,
			positionToValue,
			resolvedStep,
			rubberStretchPx,
		]
	)

	const handlePointerUp = useCallback(
		(event: PointerEvent<HTMLDivElement>) => {
			if (!isInteracting) return

			const totalSteps = Math.max(1, Math.round(range / resolvedStep))

			if (isClickRef.current) {
				const rawValue = positionToValue(event.clientX)
				const snappedValue =
					totalSteps <= 10
						? clamp(min + Math.round((rawValue - min) / resolvedStep) * resolvedStep, min, max)
						: snapToDecile(rawValue, min, max)
				const nextPercent = percentFromValue(snappedValue)

				if (animationRef.current) {
					animationRef.current.stop()
				}

				animationRef.current = animate(fillPercent, nextPercent, {
					type: 'spring',
					stiffness: 300,
					damping: 25,
					mass: 0.8,
					onComplete: () => {
						animationRef.current = null
					},
				})

				onValueChange?.(roundValue(snappedValue, resolvedStep))
			}

			if (rubberStretchPx.get() !== 0) {
				void animate(rubberStretchPx, 0, {
					type: 'spring',
					visualDuration: 0.35,
					bounce: 0.15,
				})
			}

			setIsInteracting(false)
			setIsDragging(false)
			pointerDownPositionRef.current = null
		},
		[
			fillPercent,
			isInteracting,
			max,
			min,
			onValueChange,
			percentFromValue,
			positionToValue,
			range,
			resolvedStep,
			rubberStretchPx,
		]
	)

	useEffect(() => {
		if (isValueHovered && !showInput && !isValueEditable) {
			hoverTimeoutRef.current = setTimeout(() => {
				setIsValueEditable(true)
			}, 800)
			return
		}

		if (!isValueHovered && !showInput) {
			if (hoverTimeoutRef.current) {
				clearTimeout(hoverTimeoutRef.current)
				hoverTimeoutRef.current = null
			}
			setIsValueEditable(false)
		}

		return () => {
			if (hoverTimeoutRef.current) {
				clearTimeout(hoverTimeoutRef.current)
			}
		}
	}, [isValueEditable, isValueHovered, showInput])

	useEffect(() => {
		if (showInput && inputRef.current) {
			inputRef.current.focus()
			inputRef.current.select()
		}
	}, [showInput])

	const handleInputSubmit = useCallback(() => {
		const parsed = Number.parseFloat(inputValue)
		if (!Number.isNaN(parsed)) {
			const clamped = clamp(parsed, min, max)
			onValueChange?.(roundValue(clamped, resolvedStep))
		}

		setShowInput(false)
		setIsValueHovered(false)
		setIsValueEditable(false)
	}, [inputValue, max, min, onValueChange, resolvedStep])

	const handleInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		setInputValue(event.target.value)
	}, [])

	const handleInputKeyDown = useCallback(
		(event: KeyboardEvent<HTMLInputElement>) => {
			if (event.key === 'Enter') {
				handleInputSubmit()
				return
			}

			if (event.key === 'Escape') {
				setShowInput(false)
				setIsValueHovered(false)
			}
		},
		[handleInputSubmit]
	)

	const handleValueClick = useCallback(
		(event: MouseEvent<HTMLButtonElement>) => {
			if (!isValueEditable) return

			event.stopPropagation()
			event.preventDefault()
			setShowInput(true)
			setInputValue(value.toFixed(resolvedDigits))
		},
		[isValueEditable, resolvedDigits, value]
	)

	const displayValue = `${value.toFixed(resolvedDigits)}${unit ?? ''}`

	return (
		<div ref={wrapperRef} className={cn('relative h-9', className)} style={style}>
			<m.div
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				className={cn(
					'absolute inset-0 overflow-hidden bg-neutral-800/50 touch-none select-none',
					isActive && 'bg-neutral-700/35'
				)}
				style={{
					width: rubberBandWidth,
					x: rubberBandX,
					borderRadius: '10px',
					WebkitTapHighlightColor: 'transparent',
				}}>
				{/* Fill */}
				<m.div
					className={cn(
						'pointer-events-none absolute inset-y-0 left-0 bg-white/10 transition-colors',
						isActive && 'bg-white/15'
					)}
					style={{ width: fillWidth }}
				/>

				{/* Handle */}
				<m.div
					className={cn(
						'pointer-events-none absolute top-1/2 h-4.5 w-0.5 rounded-full bg-neutral-400 opacity-0 transition-opacity',
						isActive && 'opacity-100'
					)}
					style={{
						left: handleLeft,
						y: '-50%',
					}}
				/>

				{/* Label Left */}
				<span
					ref={labelRef}
					className={cn(
						'pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-xs leading-none transition-colors',
						isActive ? 'text-neutral-300' : 'text-neutral-400'
					)}>
					{label}
				</span>

				{showInput ? (
					<input
						ref={inputRef}
						type='text'
						value={inputValue}
						onChange={handleInputChange}
						onKeyDown={handleInputKeyDown}
						onBlur={handleInputSubmit}
						onClick={event => event.stopPropagation()}
						onMouseDown={event => event.stopPropagation()}
						className='absolute top-1/2 right-2.5 w-[6ch] max-w-[6ch] min-w-[3ch] -translate-y-1/2 border-0 border-b border-neutral-400 bg-transparent p-0 pb-px text-right text-[13px] leading-none font-medium text-neutral-300 outline-none focus:text-white'
					/>
				) : (
					<button
						type='button'
						ref={valueRef}
						onMouseEnter={() => setIsValueHovered(true)}
						onMouseLeave={() => setIsValueHovered(false)}
						onClick={handleValueClick}
						onMouseDown={event => {
							if (isValueEditable) {
								event.stopPropagation()
							}
						}}
						style={{ cursor: isValueEditable ? 'text' : 'default' }}
						className={cn(
							'absolute top-1/2 right-4 -translate-y-1/2 border-b border-transparent pb-px text-xs leading-none text-neutral-300 tabular-nums transition-colors outline-none',
							isActive && 'text-white',
							isValueEditable && 'border-neutral-400'
						)}>
						{displayValue}
					</button>
				)}
			</m.div>
		</div>
	)
}

function snapToDecile(rawValue: number, min: number, max: number) {
	const normalized = (rawValue - min) / (max - min)
	const nearest = Math.round(normalized * 10) / 10

	if (Math.abs(normalized - nearest) <= 0.03125) {
		return min + nearest * (max - min)
	}

	return rawValue
}

function roundValue(value: number, step: number) {
	const raw = Math.round(value / step) * step
	return Number.parseFloat(raw.toFixed(decimalsForStep(step)))
}

function decimalsForStep(step: number) {
	const text = step.toString()
	const dot = text.indexOf('.')
	return dot === -1 ? 0 : text.length - dot - 1
}

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max)
}
