'use client'

import '../styles/panel.css'
import { AnimatePresence, m } from 'motion/react'
import { cloneElement, isValidElement, useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, ReactElement, ReactNode, SetStateAction } from 'react'

import type { SceneSettings } from '@/shared/types'
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

import {
	CONTROL_SECTIONS,
	type ControlDefinition,
	type SettingsGroup,
} from '@/src/lib/sceneControlsConfig'
import { cn } from '@/src/lib/utils'

type TabId = SettingsGroup

interface Tab {
	id: TabId
	label: string
	icon: ReactNode
}

interface ControlsPanelProps {
	settings: SceneSettings
	onSettingsChange: Dispatch<SetStateAction<SceneSettings>>
}

const tabs: Tab[] = [
	{
		id: 'camera',
		label: 'Camera',
		icon: <CameraIcon className='size-4' />,
	},
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
		id: 'color',
		label: 'Color',
		icon: <ColorIcon className='size-4' />,
	},
	{
		id: 'bloom',
		label: 'Bloom',
		icon: <BloomIcon className='size-4' />,
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

const contentFadeTransition = {
	duration: 0.24,
	ease: 'easeInOut',
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

const popupHeightsByTab = {
	camera: 398,
	particles: 356,
	scene: 314,
	lighting: 314,
	bloom: 188,
	color: 230,
	renderer: 146,
} as const satisfies Record<TabId, number>

const availableSectionIds = new Set(CONTROL_SECTIONS.map(section => section.id))
const visibleTabs = tabs.filter(tab => availableSectionIds.has(tab.id))
const tabsById = new Map(tabs.map(tab => [tab.id, tab] as const))
const popupId = 'scene-controls-panel-popup'

export default function ControlsPanel({ settings, onSettingsChange }: ControlsPanelProps) {
	const [activeTab, setActiveTab] = useState<TabId | null>(null)
	const rootRef = useRef<HTMLElement | null>(null)
	const popupRef = useRef<HTMLDivElement | null>(null)
	const isColorPickerActiveRef = useRef(false)
	const activeTabConfig = (activeTab && tabsById.get(activeTab)) ?? fallbackTab
	const activeSection = activeTab
		? CONTROL_SECTIONS.find(section => section.id === activeTab)
		: undefined
	const activePopupHeight = activeTab ? popupHeightsByTab[activeTab] : popupHeightsByTab.renderer
	const activeContentClassName = 'controls-panel-content absolute inset-0 h-full w-full'

	const openTab = useCallback(
		(tabId: TabId) => {
			if (activeTab === tabId) {
				return
			}

			setActiveTab(tabId)
		},
		[activeTab]
	)

	const closePanel = useCallback(() => {
		setActiveTab(null)
	}, [])

	const handleColorPickerActiveChange = useCallback((active: boolean) => {
		isColorPickerActiveRef.current = active
	}, [])

	const updateSetting = useCallback(
		<TGroup extends keyof SceneSettings, TKey extends keyof SceneSettings[TGroup]>(
			group: TGroup,
			key: TKey,
			value: SceneSettings[TGroup][TKey]
		) => {
			onSettingsChange(currentSettings => ({
				...currentSettings,
				[group]: {
					...currentSettings[group],
					[key]: value,
				},
			}))
		},
		[onSettingsChange]
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
						layoutRoot
						ref={popupRef}
						id={popupId}
						tabIndex={-1}
						key='controls-popup'
						initial={false}
						animate={{ height: activePopupHeight, opacity: 1, filter: 'blur(0px)' }}
						exit={{ opacity: 0, filter: 'blur(16px)' }}
						transition={{
							...contentTransition,
							height: islandTransition,
						}}
						style={{ transformOrigin: 'left bottom' }}
						className='pointer-events-auto fixed bottom-16 left-5 z-10 w-75.5 overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/65 backdrop-blur-[10px]'>
						<AnimatePresence initial={false} mode='popLayout'>
							<m.div
								data-motion-content
								key={activeTab}
								tabIndex={-1}
								initial={{ opacity: 0, filter: 'blur(12px)' }}
								animate={{ opacity: 1, filter: 'blur(0px)' }}
								exit={{ opacity: 0, filter: 'blur(12px)' }}
								transition={contentFadeTransition}
								className={activeContentClassName}>
								{activeSection ? (
									<div tabIndex={-1} className='h-full w-full overflow-y-auto px-3 py-3'>
										<div className='space-y-1.5 pb-1.5'>
											{activeSection.controls.map(control => (
												<ControlRenderer
													key={`${activeSection.id}-${control.label}`}
													control={control}
													settings={settings}
													onChange={updateSetting}
													onColorPickerActiveChange={handleColorPickerActiveChange}
												/>
											))}
										</div>
									</div>
								) : (
									<div className='flex h-full w-full items-center justify-center px-4'>
										<p className='text-xs leading-none font-semibold text-neutral-400'>
											{activeTabConfig.label} Panel
										</p>
									</div>
								)}
							</m.div>
						</AnimatePresence>
					</m.div>
				) : null}
			</AnimatePresence>
		</>
	)
}

function ControlRenderer({
	control,
	settings,
	onChange,
	onColorPickerActiveChange,
}: {
	control: ControlDefinition
	settings: SceneSettings
	onChange: <TGroup extends keyof SceneSettings, TKey extends keyof SceneSettings[TGroup]>(
		group: TGroup,
		key: TKey,
		value: SceneSettings[TGroup][TKey]
	) => void
	onColorPickerActiveChange?: (active: boolean) => void
}) {
	const currentValue =
		settings[control.group][control.settingKey as keyof SceneSettings[typeof control.group]]

	if (control.kind === 'slider') {
		return (
			<Slider
				label={control.label}
				value={Number(currentValue)}
				min={control.min}
				max={control.max}
				step={control.step}
				digits={control.digits}
				onValueChange={value =>
					onChange(control.group, control.settingKey as never, value as never)
				}
			/>
		)
	}

	if (control.kind === 'toggle') {
		return (
			<Toggle
				label={control.label}
				checked={Boolean(currentValue)}
				onCheckedChange={value =>
					onChange(control.group, control.settingKey as never, value as never)
				}
			/>
		)
	}

	if (control.kind === 'color') {
		return (
			<ColorControl
				label={control.label}
				value={String(currentValue)}
				onPickerActiveChange={onColorPickerActiveChange}
				onValueChange={value =>
					onChange(control.group, control.settingKey as never, value as never)
				}
			/>
		)
	}

	return (
		<SelectControl
			label={control.label}
			value={String(currentValue)}
			options={control.options}
			onValueChange={value => onChange(control.group, control.settingKey as never, value as never)}
		/>
	)
}
