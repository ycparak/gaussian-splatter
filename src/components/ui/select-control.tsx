'use client'

import { AnimatePresence, m } from 'motion/react'
import type { CSSProperties } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/src/lib/utils'

export type SelectOption = string | { value: string; label: string }

interface SelectControlProps {
	label?: string
	showChangedIndicator?: boolean
	value: string
	options: SelectOption[]
	onValueChange?: (value: string) => void
	onOpenChange?: (open: boolean) => void
	className?: string
	style?: CSSProperties
}

interface DropdownPosition {
	top: number
	left: number
	width: number
	above: boolean
}

const DROPDOWN_GAP = 4
const OPTION_HEIGHT = 32
const DROPDOWN_PADDING = 8

export default function SelectControl({
	label = 'Select',
	showChangedIndicator = false,
	value,
	options,
	onValueChange,
	onOpenChange,
	className,
	style,
}: SelectControlProps) {
	const [isOpen, setIsOpen] = useState(false)
	const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
	const [position, setPosition] = useState<DropdownPosition | null>(null)

	const triggerRef = useRef<HTMLButtonElement>(null)
	const dropdownRef = useRef<HTMLDivElement>(null)

	const normalizedOptions = useMemo(() => normalizeOptions(options), [options])
	const selectedOption = normalizedOptions.find(option => option.value === value)

	const updatePosition = useCallback(() => {
		const trigger = triggerRef.current
		if (!trigger) return

		const rect = trigger.getBoundingClientRect()
		const dropdownHeight = DROPDOWN_PADDING + normalizedOptions.length * OPTION_HEIGHT
		const spaceBelow = window.innerHeight - rect.bottom - DROPDOWN_GAP
		const above = spaceBelow < dropdownHeight && rect.top > spaceBelow

		setPosition({
			top: above ? rect.top - DROPDOWN_GAP : rect.bottom + DROPDOWN_GAP,
			left: rect.left,
			width: rect.width,
			above,
		})
	}, [normalizedOptions.length])

	useEffect(() => {
		setPortalTarget(document.body)
	}, [])

	useEffect(() => {
		onOpenChange?.(isOpen)
	}, [isOpen, onOpenChange])

	useEffect(() => {
		return () => {
			onOpenChange?.(false)
		}
	}, [onOpenChange])

	useEffect(() => {
		if (!isOpen) return

		updatePosition()

		const handleViewportChange = () => {
			updatePosition()
		}

		window.addEventListener('resize', handleViewportChange)
		window.addEventListener('scroll', handleViewportChange, true)

		return () => {
			window.removeEventListener('resize', handleViewportChange)
			window.removeEventListener('scroll', handleViewportChange, true)
		}
	}, [isOpen, updatePosition])

	useEffect(() => {
		if (!isOpen) return

		const handleDocumentPointerDown = (event: PointerEvent) => {
			const target = event.target
			if (!(target instanceof Node)) return

			if (triggerRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
				return
			}

			setIsOpen(false)
		}

		const handleDocumentKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setIsOpen(false)
			}
		}

		document.addEventListener('pointerdown', handleDocumentPointerDown, true)
		document.addEventListener('keydown', handleDocumentKeyDown)

		return () => {
			document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
			document.removeEventListener('keydown', handleDocumentKeyDown)
		}
	}, [isOpen])

	const selectedLabel = selectedOption?.label ?? value

	return (
		<div className={cn('relative h-9', className)} style={style}>
			<button
				tabIndex={-1}
				type='button'
				ref={triggerRef}
				onClick={() => setIsOpen(open => !open)}
				className='group absolute inset-0 flex items-center overflow-hidden rounded-[10px] bg-black/50 outline-none'
				style={{ WebkitTapHighlightColor: 'transparent' }}>
				<span
					className={cn(
						'pointer-events-none absolute top-1/2 left-4 flex -translate-y-1/2 items-center gap-3 text-xs leading-none transition-colors group-hover:text-neutral-300',
						isOpen ? 'text-neutral-300' : 'text-neutral-400'
					)}>
					<span>{label}</span>
					{showChangedIndicator ? (
						<span
							aria-hidden='true'
							className='size-1.5 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.75)]'
						/>
					) : null}
				</span>

				<div className='pointer-events-none absolute right-4 flex items-center gap-2'>
					<span
						className={cn(
							'text-xs leading-none text-neutral-300 transition-colors group-hover:text-white',
							isOpen && 'text-white'
						)}>
						{selectedLabel}
					</span>
					<m.svg
						viewBox='0 0 24 24'
						fill='none'
						stroke='currentColor'
						strokeWidth='2'
						strokeLinecap='round'
						strokeLinejoin='round'
						animate={{ rotate: isOpen ? 180 : 0 }}
						transition={{ type: 'spring', bounce: 0.18, duration: 0.22 }}
						className={cn(
							'size-3 text-neutral-400 transition-colors group-hover:text-neutral-300',
							isOpen && 'text-neutral-300'
						)}>
						<path d='M6 9L12 15L18 9' />
					</m.svg>
				</div>
			</button>

			{portalTarget
				? createPortal(
						<AnimatePresence>
							{isOpen && position ? (
								<m.div
									ref={dropdownRef}
									data-controls-select-dropdown=''
									initial={{
										opacity: 0,
										y: position.above ? 8 : -8,
										scale: 0.96,
									}}
									animate={{ opacity: 1, y: 0, scale: 1 }}
									exit={{
										opacity: 0,
										y: position.above ? 8 : -8,
										scale: 0.96,
									}}
									transition={{ type: 'spring', bounce: 0, duration: 0.17 }}
									className='z-30 overflow-hidden rounded-[10px] border border-white/10 bg-black/50 p-1 backdrop-blur-[6px]'
									style={{
										position: 'fixed',
										left: position.left,
										width: position.width,
										transformOrigin: position.above ? 'bottom center' : 'top center',
										...(position.above
											? { bottom: window.innerHeight - position.top }
											: { top: position.top }),
									}}>
									{normalizedOptions.map(option => {
										const isSelected = option.value === value

										return (
											<button
												tabIndex={-1}
												key={option.value}
												type='button'
												onClick={() => {
													onValueChange?.(option.value)
													setIsOpen(false)
												}}
												className={cn(
													'flex h-8 w-full items-center rounded-[7px] px-3 text-left text-xs leading-none transition-colors',
													isSelected
														? 'bg-white/15 text-white'
														: 'text-neutral-400 hover:bg-white/15 hover:text-neutral-300'
												)}>
												{option.label}
											</button>
										)
									})}
								</m.div>
							) : null}
						</AnimatePresence>,
						portalTarget
					)
				: null}
		</div>
	)
}

function normalizeOptions(options: SelectOption[]) {
	return options.map(option => {
		if (typeof option === 'string') {
			return { value: option, label: toTitleCase(option) }
		}

		return option
	})
}

function toTitleCase(input: string) {
	return input.replace(/\b\w/g, character => character.toUpperCase())
}
