'use client'

import { AnimatePresence, m } from 'motion/react'
import { cloneElement, isValidElement } from 'react'
import type { FocusEvent, MouseEvent, ReactElement, ReactNode } from 'react'
import { useCallback, useState } from 'react'

import { BloomIcon } from '@/src/components/icons/bloom'
import { CameraIcon } from '@/src/components/icons/camera'
import { ColorIcon } from '@/src/components/icons/color'
import { LightingIcon } from '@/src/components/icons/lighting'
import { ParticlesIcon } from '@/src/components/icons/particles'
import { RendererIcon } from '@/src/components/icons/renderer'
import { SceneIcon } from '@/src/components/icons/scene'

import { CONTROL_SECTIONS, type SettingsGroup } from '@/src/lib/sceneControlsConfig'
import { cn } from '@/src/lib/utils'

type TabId = SettingsGroup

interface Tab {
	id: TabId
	label: string
	icon: ReactNode
}

const tabs: Tab[] = [
	{
		id: 'particles',
		label: 'Particles',
		icon: <ParticlesIcon className='size-4' />,
	},
	{
		id: 'scene',
		label: 'Scene',
		icon: <SceneIcon className='size-4' />,
	},
	{
		id: 'lighting',
		label: 'Lighting',
		icon: <LightingIcon className='size-4' />,
	},
	{
		id: 'bloom',
		label: 'Bloom',
		icon: <BloomIcon className='size-4' />,
	},
	{
		id: 'color',
		label: 'Color',
		icon: <ColorIcon className='size-4' />,
	},
	{
		id: 'camera',
		label: 'Camera',
		icon: <CameraIcon className='size-4' />,
	},
	{
		id: 'renderer',
		label: 'Renderer',
		icon: <RendererIcon className='size-4' />,
	},
]
const fallbackTab = {
	id: 'controls',
	label: 'Controls',
	icon: null,
} satisfies {
	id: string
	label: string
	icon: ReactNode
}

const islandTransition = {
	type: 'spring',
	bounce: 0.18,
	duration: 0.44,
} as const

const labelTransition = {
	type: 'spring',
	bounce: 0.22,
	duration: 0.34,
} as const

const activeTabLabelMotion = {
	initial: {
		opacity: 0,
		x: 8,
		scale: 0.96,
		filter: 'blur(4px)',
	},
	animate: {
		opacity: 1,
		x: 0,
		scale: 1,
		filter: 'blur(0px)',
		transition: { ...labelTransition, delay: 0.03 },
	},
	exit: {
		opacity: 0,
		x: 6,
		scale: 0.97,
		filter: 'blur(4px)',
		transition: { duration: 0.14 },
	},
	style: { originX: 1, originY: 0.5 },
} as const

const rootStyle = {
	borderRadius: '10px',
	WebkitTapHighlightColor: 'transparent',
} as const

const triggerStyle = {
	borderRadius: '7px',
	WebkitTapHighlightColor: 'transparent',
} as const

const availableSectionIds = new Set(CONTROL_SECTIONS.map(section => section.id))
const visibleTabs = tabs.filter(tab => availableSectionIds.has(tab.id))
const tabsById = new Map(tabs.map(tab => [tab.id, tab] as const))

export default function ControlsPanel() {
	const [activeTab, setActiveTab] = useState<TabId | null>(null)
	const activeTabConfig = (activeTab && tabsById.get(activeTab)) ?? fallbackTab

	const activateTabFromTrigger = useCallback((trigger: HTMLButtonElement) => {
		const triggerId = trigger.dataset.controlsTrigger
		if (!triggerId) {
			return
		}

		if (!tabsById.has(triggerId as TabId)) {
			return
		}

		const tabId = triggerId as TabId
		setActiveTab(currentActiveTab => (currentActiveTab === tabId ? currentActiveTab : tabId))
	}, [])

	const handleTriggerFocus = useCallback(
		(event: FocusEvent<HTMLButtonElement>) => {
			activateTabFromTrigger(event.currentTarget)
		},
		[activateTabFromTrigger]
	)

	const handleTriggerMouseEnter = useCallback(
		(event: MouseEvent<HTMLButtonElement>) => {
			activateTabFromTrigger(event.currentTarget)
		},
		[activateTabFromTrigger]
	)

	const handleRootBlur = useCallback((event: FocusEvent<HTMLElement>) => {
		const nextFocusedElement = event.relatedTarget
		if (!(nextFocusedElement instanceof HTMLElement)) {
			setActiveTab(null)
			return
		}

		if (!event.currentTarget.contains(nextFocusedElement)) {
			setActiveTab(null)
		}
	}, [])

	const handleRootMouseLeave = useCallback(() => {
		setActiveTab(null)
	}, [])

	return (
		<nav
			aria-label='Scene controls'
			onBlur={handleRootBlur}
			onMouseLeave={handleRootMouseLeave}
			className='pointer-events-auto fixed bottom-5 left-5 z-9 flex h-9 w-75.5 items-center overflow-visible border border-white/10 bg-neutral-900/65 px-0.5 backdrop-blur-[10px]'
			style={rootStyle}>
			<div className='pointer-events-none flex min-w-0 flex-1 items-center'>
				<AnimatePresence initial={false} mode='popLayout'>
					<m.span
						key={activeTabConfig.label}
						initial={activeTabLabelMotion.initial}
						animate={activeTabLabelMotion.animate}
						exit={activeTabLabelMotion.exit}
						style={activeTabLabelMotion.style}
						className={cn(
							'block truncate pl-4 text-xs leading-3 font-semibold',
							activeTab ? 'text-neutral-300' : 'text-neutral-400'
						)}>
						{activeTabConfig.label}
					</m.span>
				</AnimatePresence>
			</div>

			<div className='ml-auto flex shrink-0 items-center'>
				{visibleTabs.map(tab => {
					const isActive = activeTab === tab.id
					const iconClassName = cn(
						'transition-colors duration-100',
						isActive ? 'text-neutral-300' : 'text-neutral-400'
					)
					const icon = isValidElement(tab.icon)
						? cloneElement(tab.icon as ReactElement<{ className?: string }>, {
								className: cn(
									(tab.icon as ReactElement<{ className?: string }>).props.className,
									iconClassName
								),
							})
						: tab.icon

					return (
						<m.button
							key={tab.id}
							type='button'
							aria-label={tab.label}
							data-controls-trigger={tab.id}
							onFocus={handleTriggerFocus}
							onMouseEnter={handleTriggerMouseEnter}
							style={triggerStyle}
							className='relative flex size-7.5 items-center justify-center outline-none focus-visible:ring-0'>
							{isActive ? (
								<m.span
									layoutId='controls-bubble'
									className='absolute inset-0 bg-white/10'
									style={triggerStyle}
									transition={islandTransition}
								/>
							) : null}
							<span className='relative z-10'>{icon}</span>
						</m.button>
					)
				})}
			</div>
		</nav>
	)
}
