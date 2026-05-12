'use client'

import type { CSSProperties, ChangeEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@/src/lib/utils'

const DEFAULT_COLOR = '#FF7A00'
const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/

interface ColorControlProps {
	label?: string
	value?: string
	onValueChange?: (value: string) => void
	onPickerActiveChange?: (active: boolean) => void
	className?: string
	style?: CSSProperties
}

export default function ColorControl({
	label = 'Color',
	value = DEFAULT_COLOR,
	onValueChange,
	onPickerActiveChange,
	className,
	style,
}: ColorControlProps) {
	const [isPickerActive, setIsPickerActive] = useState(false)
	const colorInputRef = useRef<HTMLInputElement>(null)
	const pickerOpenedAtRef = useRef<number | null>(null)

	useEffect(() => {
		return () => {
			onPickerActiveChange?.(false)
		}
	}, [onPickerActiveChange])

	const handlePickerOpen = useCallback(() => {
		pickerOpenedAtRef.current = Date.now()
		setIsPickerActive(true)
		onPickerActiveChange?.(true)
		colorInputRef.current?.focus()
		colorInputRef.current?.click()
	}, [onPickerActiveChange])

	const handlePickerBlur = useCallback(() => {
		if (pickerOpenedAtRef.current != null && Date.now() - pickerOpenedAtRef.current < 250) {
			return
		}

		setIsPickerActive(false)
		onPickerActiveChange?.(false)
	}, [onPickerActiveChange])

	const handlePickerChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			onValueChange?.(event.target.value)
			setIsPickerActive(true)
		},
		[onValueChange]
	)

	return (
		<div tabIndex={-1} className={cn('group relative h-9', className)} style={style}>
			<div
				className='absolute inset-0 overflow-hidden rounded-[10px] bg-black/65 flex items-center'
				style={{ WebkitTapHighlightColor: 'transparent' }}>
				<span
					className={cn(
						'pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-xs leading-none transition-colors group-hover:text-neutral-300',
						isPickerActive ? 'text-neutral-300' : 'text-neutral-400'
					)}>
					{label}
				</span>

				<div className='absolute right-4 flex justify-center items-center gap-2'>
					<span
						className={cn(
							'text-xs leading-none text-neutral-300 uppercase transition-colors group-hover:text-white cursor-default',
							isPickerActive && 'text-white'
						)}>
						{value.toUpperCase()}
					</span>

					<button
						tabIndex={-1}
						type='button'
						aria-label='Pick color'
						onPointerDown={() => {
							onPickerActiveChange?.(true)
						}}
						onClick={handlePickerOpen}
						className='size-3 rounded-full cursor-pointer'
						style={{ backgroundColor: value }}
					/>

					<input
						tabIndex={-1}
						ref={colorInputRef}
						type='color'
						value={toColorInputValue(value)}
						onFocus={() => {
							setIsPickerActive(true)
							onPickerActiveChange?.(true)
						}}
						onBlur={handlePickerBlur}
						onChange={handlePickerChange}
						className='sr-only'
					/>
				</div>
			</div>
		</div>
	)
}

function normalizeHex(input: string) {
	const trimmed = input.trim()
	if (!trimmed) return null

	return trimmed.startsWith('#') ? trimmed : `#${trimmed}`
}

function toColorInputValue(input: string) {
	const normalized = normalizeHex(input)
	if (!normalized || !HEX_COLOR_REGEX.test(normalized)) {
		return '#ffffff'
	}

	if (normalized.length === 4) {
		return expandShorthandHex(normalized)
	}

	if (normalized.length === 9) {
		return normalized.slice(0, 7)
	}

	return normalized.slice(0, 7)
}

function expandShorthandHex(hex: string) {
	if (hex.length !== 4) return hex
	return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
}
