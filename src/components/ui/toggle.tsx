'use client'

import { m } from 'motion/react'
import type { CSSProperties, HTMLAttributes } from 'react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'

import { cn } from '@/src/lib/utils'

type SegmentValue = 'off' | 'on'

export interface ToggleProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
	label: string
	checked?: boolean
	defaultChecked?: boolean
	onCheckedChange?: (checked: boolean) => void
	className?: string
	style?: CSSProperties
	offLabel?: string
	onLabel?: string
}

export function Toggle({
	label,
	checked,
	defaultChecked = false,
	onCheckedChange,
	className,
	style,
	offLabel = 'Off',
	onLabel = 'On',
	...props
}: ToggleProps) {
	const isControlled = checked !== undefined
	const [uncontrolledChecked, setUncontrolledChecked] = useState(defaultChecked)
	const [pillStyle, setPillStyle] = useState<{ left: number; width: number } | null>(null)
	const segmentedRef = useRef<HTMLDivElement>(null)
	const hasAnimatedRef = useRef(false)

	const isChecked = isControlled ? checked : uncontrolledChecked
	const activeSegment: SegmentValue = isChecked ? 'on' : 'off'

	const setChecked = useCallback(
		(nextChecked: boolean) => {
			if (!isControlled) {
				setUncontrolledChecked(nextChecked)
			}

			onCheckedChange?.(nextChecked)
		},
		[isControlled, onCheckedChange]
	)

	useLayoutEffect(() => {
		const segmented = segmentedRef.current
		if (!segmented) return

		const activeButton = segmented.querySelector(
			`[data-segment='${activeSegment}']`
		) as HTMLButtonElement | null
		if (!activeButton) return

		setPillStyle({
			left: activeButton.offsetLeft,
			width: activeButton.offsetWidth,
		})
	}, [activeSegment])

	const shouldAnimate = hasAnimatedRef.current
	hasAnimatedRef.current = true

	return (
		<div className={cn('relative h-9', className)} style={style} {...props}>
			<div
				className='group absolute inset-0 overflow-hidden rounded-[10px] bg-black/65'
				style={{ WebkitTapHighlightColor: 'transparent' }}>
				<span
					className={cn(
						'pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-xs leading-none transition-colors group-hover:text-neutral-300',
						'text-neutral-400'
					)}>
					{label}
				</span>

				<div
					ref={segmentedRef}
					className='absolute top-1/2 right-1.5 grid h-6.5 -translate-y-1/2 grid-cols-2 rounded-[7px] p-0.5'>
					{pillStyle ? (
						<m.span
							className='pointer-events-none absolute top-0.5 bottom-0.5 rounded-[5px] bg-white/16'
							style={{ left: pillStyle.left, width: pillStyle.width }}
							animate={{ left: pillStyle.left, width: pillStyle.width }}
							transition={
								shouldAnimate ? { type: 'spring', bounce: 0.18, duration: 0.24 } : { duration: 0 }
							}
						/>
					) : null}

					<button
						type='button'
						data-active={activeSegment === 'off'}
						data-segment='off'
						onClick={() => setChecked(false)}
						className={cn(
							'relative z-10 h-5.5 min-w-[2.1rem] rounded-[5px] px-2 text-[11px] leading-none transition-colors',
							activeSegment === 'off' ? 'text-white' : 'text-neutral-300 hover:text-neutral-200'
						)}>
						{offLabel}
					</button>

					<button
						type='button'
						data-active={activeSegment === 'on'}
						data-segment='on'
						onClick={() => setChecked(true)}
						className={cn(
							'relative z-10 h-5.5 min-w-[2.1rem] rounded-[5px] px-2 text-[11px] leading-none transition-colors',
							activeSegment === 'on' ? 'text-white' : 'text-neutral-300 hover:text-neutral-200'
						)}>
						{onLabel}
					</button>
				</div>
			</div>
		</div>
	)
}

export default Toggle
