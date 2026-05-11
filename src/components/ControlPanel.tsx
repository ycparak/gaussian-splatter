'use client'

import '../styles/panel.css'
import { NavigationMenu } from '@base-ui/react/navigation-menu'
import { AnimatePresence, m } from 'motion/react'
import { cloneElement, isValidElement, useCallback, useRef, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'

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

function getContentMotionClass(activationDirection: 'left' | 'right' | 'up' | 'down' | null) {
	if (activationDirection === 'left') {
		return 'controls-panel-content-horizontal-left'
	}

	if (activationDirection === 'right') {
		return 'controls-panel-content-horizontal-right'
	}

	return 'controls-panel-content-default'
}

export default function ControlsPanel() {
	const [activeTab, setActiveTab] = useState<TabId | null>(null)
	const menuAnchorRef = useRef<HTMLElement | null>(null)
	const activeTabConfig = (activeTab && tabsById.get(activeTab)) ?? fallbackTab

	const handleValueChange = useCallback((value: TabId | null) => {
		if (value == null) {
			setActiveTab(null)
			return
		}

		if (!tabsById.has(value)) {
			return
		}

		setActiveTab(currentActiveTab => (currentActiveTab === value ? currentActiveTab : value))
	}, [])

	return (
		<NavigationMenu.Root<TabId>
			aria-label='Scene controls'
			value={activeTab}
			onValueChange={handleValueChange}
			delay={0}
			closeDelay={70}
			onMouseLeave={() => setActiveTab(null)}
			onBlur={event => {
				if (!event.relatedTarget || !event.currentTarget.contains(event.relatedTarget)) {
					setActiveTab(null)
				}
			}}
			className='pointer-events-auto fixed bottom-5 left-5 z-9 flex h-9 w-75.5 items-center overflow-visible border border-white/10 bg-neutral-900/65 px-0.5 backdrop-blur-[10px]'
			style={rootStyle}
			ref={menuAnchorRef}>
			<div tabIndex={-1} className='pointer-events-none flex min-w-0 flex-1 items-center'>
				<AnimatePresence initial={false} mode='popLayout'>
					<m.span
						tabIndex={-1}
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

			<NavigationMenu.List className='ml-auto flex shrink-0 list-none items-center p-0'>
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
						<NavigationMenu.Item key={tab.id} value={tab.id}>
							<NavigationMenu.Trigger
								tabIndex={0}
								aria-label={tab.label}
								onMouseEnter={() => setActiveTab(tab.id)}
								onFocus={() => setActiveTab(tab.id)}
								className='relative flex size-7.5 items-center justify-center outline-none'
								style={triggerStyle}>
								{isActive ? (
									<m.span
										layoutId='controls-bubble'
										className='absolute inset-0 bg-white/10'
										style={triggerStyle}
										transition={islandTransition}
									/>
								) : null}
								<span className='relative z-10'>{icon}</span>
							</NavigationMenu.Trigger>

							<NavigationMenu.Content
								tabIndex={-1}
								className={({ activationDirection }) =>
									cn(
										'controls-panel-content flex h-full w-full items-center justify-center',
										getContentMotionClass(activationDirection)
									)
								}>
								<p className='text-xs leading-none font-semibold text-neutral-400'>
									{tab.label} Panel
								</p>
							</NavigationMenu.Content>
						</NavigationMenu.Item>
					)
				})}
			</NavigationMenu.List>

			<NavigationMenu.Portal tabIndex={-1}>
				<NavigationMenu.Positioner
					tabIndex={-1}
					anchor={menuAnchorRef}
					side='top'
					align='start'
					sideOffset={8}
					collisionAvoidance={{ side: 'none', align: 'none', fallbackAxisSide: 'none' }}
					className='z-10'>
					<NavigationMenu.Popup tabIndex={-1} className='relative w-(--anchor-width)'>
						<div
							tabIndex={-1}
							className='absolute -top-20 -right-20 -bottom-2 -left-20'
							aria-hidden='true'
						/>
						<NavigationMenu.Viewport
							tabIndex={-1}
							className='relative h-120 w-(--anchor-width) overflow-hidden rounded-[10px] border border-white/10 bg-neutral-900/65 backdrop-blur-[10px]'
						/>
					</NavigationMenu.Popup>
				</NavigationMenu.Positioner>
			</NavigationMenu.Portal>
		</NavigationMenu.Root>
	)
}
