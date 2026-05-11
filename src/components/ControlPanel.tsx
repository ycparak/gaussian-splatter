'use client'

import '../styles/panel.css'
import { AnimatePresence, m } from 'motion/react'
import { cloneElement, isValidElement, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'

import { BloomIcon } from '@/src/components/icons/bloom'
import { CameraIcon } from '@/src/components/icons/camera'
import { ColorIcon } from '@/src/components/icons/color'
import { LightingIcon } from '@/src/components/icons/lighting'
import { ParticlesIcon } from '@/src/components/icons/particles'
import { RendererIcon } from '@/src/components/icons/renderer'
import { SceneIcon } from '@/src/components/icons/scene'
import ColorControl from '@/src/components/ui/color-control'
import SelectControl from '@/src/components/ui/select-control'
import Slider from '@/src/components/ui/slider'
import Toggle from '@/src/components/ui/toggle'

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

const contentTransition = {
	duration: 0.24,
	ease: 'easeOut',
} as const

const dummyBlendModeOptions = ['normal', 'screen', 'additive', 'multiply']

const availableSectionIds = new Set(CONTROL_SECTIONS.map(section => section.id))
const visibleTabs = tabs.filter(tab => availableSectionIds.has(tab.id))
const tabsById = new Map(tabs.map(tab => [tab.id, tab] as const))
const tabIndexById = new Map(visibleTabs.map((tab, index) => [tab.id, index] as const))
const popupId = 'scene-controls-panel-popup'

function getContentMotionClass(activationDirection: 'left' | 'right' | null) {
	if (activationDirection === 'left') {
		return 'controls-panel-content-horizontal-left'
	}

	if (activationDirection === 'right') {
		return 'controls-panel-content-horizontal-right'
	}

	return 'controls-panel-content-default'
}

function getActivationDirection(previousTab: TabId | null, activeTab: TabId | null) {
	if (!previousTab || !activeTab) {
		return null
	}

	const previousIndex = tabIndexById.get(previousTab)
	const activeIndex = tabIndexById.get(activeTab)

	if (previousIndex == null || activeIndex == null || previousIndex === activeIndex) {
		return null
	}

	return activeIndex > previousIndex ? 'right' : 'left'
}

function getContentInitialX(activationDirection: 'left' | 'right' | null) {
	if (activationDirection === 'left') {
		return -28
	}

	if (activationDirection === 'right') {
		return 28
	}

	return 0
}

function getContentExitX(activationDirection: 'left' | 'right' | null) {
	if (activationDirection === 'left') {
		return 28
	}

	if (activationDirection === 'right') {
		return -28
	}

	return 0
}

export default function ControlsPanel() {
	const [activeTab, setActiveTab] = useState<TabId | null>(null)
	const [previousActiveTab, setPreviousActiveTab] = useState<TabId | null>(null)
	const [dummySliderValue, setDummySliderValue] = useState(6)
	const [dummyColorValue, setDummyColorValue] = useState('#ff7a00')
	const [dummyGlowEnabled, setDummyGlowEnabled] = useState(true)
	const [dummyBlendMode, setDummyBlendMode] = useState('normal')
	const rootRef = useRef<HTMLElement | null>(null)
	const popupRef = useRef<HTMLDivElement | null>(null)
	const isColorPickerActiveRef = useRef(false)
	const activeTabConfig = (activeTab && tabsById.get(activeTab)) ?? fallbackTab
	const activationDirection = getActivationDirection(previousActiveTab, activeTab)
	const activeContentClassName = cn(
		'controls-panel-content absolute inset-0 flex h-full w-full items-center justify-center',
		getContentMotionClass(activationDirection)
	)
	const activeContentInitialX = getContentInitialX(activationDirection)
	const activeContentExitX = getContentExitX(activationDirection)

	const openTab = useCallback(
		(tabId: TabId) => {
			if (activeTab === tabId) {
				return
			}

			setPreviousActiveTab(activeTab)
			setActiveTab(tabId)
		},
		[activeTab]
	)

	const closePanel = useCallback(() => {
		setPreviousActiveTab(null)
		setActiveTab(null)
	}, [])

	const handleColorPickerActiveChange = useCallback(
		(active: boolean) => {
			isColorPickerActiveRef.current = active

			if (active) {
				openTab('particles')
			}
		},
		[openTab]
	)

	useEffect(() => {
		if (!activeTab) {
			return undefined
		}

		function handleDocumentPointerDown(event: PointerEvent) {
			const target = event.target

			if (!(target instanceof Node)) {
				return
			}

			if (rootRef.current?.contains(target) || popupRef.current?.contains(target)) {
				return
			}

			if (target instanceof Element && target.closest('[data-controls-select-dropdown]')) {
				return
			}

			if (isColorPickerActiveRef.current) {
				return
			}

			closePanel()
		}

		function handleDocumentKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				closePanel()
			}
		}

		document.addEventListener('pointerdown', handleDocumentPointerDown, true)
		document.addEventListener('keydown', handleDocumentKeyDown)

		return () => {
			document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
			document.removeEventListener('keydown', handleDocumentKeyDown)
		}
	}, [activeTab, closePanel])

	return (
		<>
			<nav
				ref={rootRef}
				aria-label='Scene controls'
				className='pointer-events-auto fixed bottom-5 left-5 z-9 flex h-9 w-75.5 items-center overflow-visible border border-white/10 bg-neutral-900/65 px-0.5 backdrop-blur-[10px]'
				style={rootStyle}>
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

				<ul className='ml-auto flex shrink-0 list-none items-center p-0'>
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
							<li key={tab.id}>
								<button
									type='button'
									aria-label={tab.label}
									aria-expanded={isActive}
									aria-controls={activeTab ? popupId : undefined}
									data-active={isActive ? '' : undefined}
									onClick={() => openTab(tab.id)}
									onMouseEnter={() => openTab(tab.id)}
									onFocus={() => openTab(tab.id)}
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
								</button>
							</li>
						)
					})}
				</ul>
			</nav>

			<AnimatePresence>
				{activeTab ? (
					<m.div
						ref={popupRef}
						id={popupId}
						tabIndex={-1}
						key='controls-popup'
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 8 }}
						transition={contentTransition}
						className='pointer-events-auto fixed bottom-16 left-5 z-10 h-120 w-75.5 overflow-hidden rounded-[10px] border border-white/10 bg-neutral-900/65 backdrop-blur-[10px]'>
						<AnimatePresence initial={false} mode='popLayout'>
							<m.div
								data-motion-content
								key={activeTab}
								tabIndex={-1}
								initial={{ opacity: 0, x: activeContentInitialX }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: activeContentExitX }}
								transition={contentTransition}
								className={activeContentClassName}>
								{activeTab === 'particles' ? (
									<div tabIndex={-1} className='w-full space-y-2 px-4'>
										<Slider
											label='Spread'
											value={dummySliderValue}
											min={0}
											max={10}
											step={0.1}
											digits={1}
											onValueChange={setDummySliderValue}
										/>
										<ColorControl
											label='Tint'
											value={dummyColorValue}
											onValueChange={setDummyColorValue}
											onPickerActiveChange={handleColorPickerActiveChange}
										/>
										<Toggle
											label='Glow'
											checked={dummyGlowEnabled}
											onCheckedChange={setDummyGlowEnabled}
										/>
										<SelectControl
											label='Blend'
											value={dummyBlendMode}
											options={dummyBlendModeOptions}
											onValueChange={setDummyBlendMode}
										/>
									</div>
								) : (
									<p className='text-xs leading-none font-semibold text-neutral-400'>
										{activeTabConfig.label} Panel
									</p>
								)}
							</m.div>
						</AnimatePresence>
					</m.div>
				) : null}
			</AnimatePresence>
		</>
	)
}
