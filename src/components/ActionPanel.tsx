'use client'

import { AnimatePresence, m } from 'motion/react'
import { cloneElement, isValidElement } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { useState } from 'react'

import { DownloadIcon } from '@/src/components/icons/download'
import { PauseIcon } from '@/src/components/icons/pause'
import { PlayIcon } from '@/src/components/icons/play'
import { RecordIcon } from '@/src/components/icons/record'
import { ReloadIcon } from '@/src/components/icons/reload'
import { cn } from '@/src/lib/utils'

type TabId = 'record' | 'download' | 'pause' | 'reload'

interface Tab {
	id: TabId
	label: string
	width: number
	icon: ReactNode
	onClick?: () => void
	disabled?: boolean
}

const IDLE_WIDTH = 126
const RECORDING_WIDTH = 199

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

interface ActionPanelProps {
	isPaused: boolean
	isRecording: boolean
	recordingSecondsRemaining: number
	onDownloadSnapshot: () => void
	onReload: () => void
	onToggleRecording: () => void
	onTogglePause: () => void
}

export default function ActionPanel({
	isPaused,
	isRecording,
	recordingSecondsRemaining,
	onDownloadSnapshot,
	onReload,
	onToggleRecording,
	onTogglePause,
}: ActionPanelProps) {
	const [activeTab, setActiveTab] = useState<TabId | null>(null)
	const tabs: Tab[] = [
		{
			id: 'record',
			label: isRecording ? 'Stop recording' : 'Record',
			width: 201,
			icon: <RecordIcon className='size-4' />,
			onClick: onToggleRecording,
		},
		{
			id: 'download',
			label: 'Download PNG',
			width: 239,
			icon: <DownloadIcon className='size-4' />,
			onClick: onDownloadSnapshot,
		},
		{
			id: 'pause',
			label: isPaused ? 'Play' : 'Pause',
			width: isPaused ? 179 : 189,
			icon: isPaused ? <PlayIcon className='size-3.5' /> : <PauseIcon className='size-4' />,
			onClick: onTogglePause,
		},
		{
			id: 'reload',
			label: 'Reload scene',
			width: 231,
			icon: <ReloadIcon className='size-4' />,
			onClick: onReload,
		},
	]
	const displayTab = isRecording ? 'record' : activeTab
	const activeTabConfig = tabs.find(tab => tab.id === displayTab)

	return (
		<m.div
			role='toolbar'
			aria-label='Dynamic island quick actions'
			layoutRoot
			initial={false}
			animate={{
				width: isRecording ? RECORDING_WIDTH : (activeTabConfig?.width ?? IDLE_WIDTH),
			}}
			transition={islandTransition}
			style={{
				borderRadius: '10px',
				WebkitTapHighlightColor: 'transparent',
				transformOrigin: 'right center',
			}}
			onMouseLeave={() => setActiveTab(null)}
			onBlur={event => {
				if (!event.relatedTarget || !event.currentTarget.contains(event.relatedTarget)) {
					setActiveTab(null)
				}
			}}
			className='pointer-events-auto fixed top-5 right-5 z-9 flex h-9 items-center overflow-hidden border border-white/5 bg-neutral-800/50 px-0.5 backdrop-blur-[10px]'>
			<div className='pointer-events-none flex min-w-0 flex-1 items-center'>
				<AnimatePresence initial={false} mode='popLayout'>
					{isRecording ? (
						<m.div
							key='recording-counter'
							initial={{
								opacity: 0,
								x: 8,
								scale: 0.96,
								filter: 'blur(4px)',
							}}
							animate={{
								opacity: 1,
								x: 0,
								scale: 1,
								filter: 'blur(0px)',
								transition: { ...labelTransition, delay: 0.03 },
							}}
							exit={{
								opacity: 0,
								x: 6,
								scale: 0.97,
								filter: 'blur(4px)',
								transition: { duration: 0.14 },
							}}
							style={{ originX: 1, originY: 0.5 }}
							className='pl-3 sm:pl-5'>
							<RecordingCounter secondsRemaining={recordingSecondsRemaining} />
						</m.div>
					) : activeTabConfig ? (
						<m.span
							key={activeTabConfig.id}
							initial={{
								opacity: 0,
								x: 8,
								scale: 0.96,
								filter: 'blur(4px)',
							}}
							animate={{
								opacity: 1,
								x: 0,
								scale: 1,
								filter: 'blur(0px)',
								transition: { ...labelTransition, delay: 0.03 },
							}}
							exit={{
								opacity: 0,
								x: 6,
								scale: 0.97,
								filter: 'blur(4px)',
								transition: { duration: 0.14 },
							}}
							style={{ originX: 1, originY: 0.5 }}
							className='block truncate text-xs leading-3 text-neutral-300 pl-4'>
							{activeTabConfig.label}
						</m.span>
					) : null}
				</AnimatePresence>
			</div>

			<div className='ml-auto flex shrink-0 items-center'>
				{tabs.map(tab => {
					const isActive = displayTab === tab.id
					const iconClassName = cn(
						'transition-colors duration-300',
						isActive ? 'text-neutral-300' : 'text-neutral-400',
						isRecording && tab.id === 'record' && 'text-red-500'
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
							data-action-panel-tab={tab.id}
							aria-label={tab.label}
							aria-pressed={
								tab.id === 'pause' ? isPaused : tab.id === 'record' ? isRecording : undefined
							}
							disabled={tab.disabled}
							onMouseEnter={() => setActiveTab(tab.id)}
							onFocus={() => setActiveTab(tab.id)}
							onClick={tab.onClick}
							whileTap={{ scale: 0.925 }}
							style={{
								borderRadius: '7px',
								WebkitTapHighlightColor: 'transparent',
							}}
							className='relative flex size-7.5 items-center justify-center outline-none focus-visible:ring-0'>
							{isActive ? (
								<m.span
									layoutId='bubble'
									className='absolute inset-0 bg-white/10'
									style={{ borderRadius: '7px' }}
									transition={islandTransition}
								/>
							) : null}
							<span className='relative z-10'>{icon}</span>
						</m.button>
					)
				})}
			</div>
		</m.div>
	)
}

function RecordingCounter({ secondsRemaining }: { secondsRemaining: number }) {
	const [tens, ones] = Math.max(0, Math.min(secondsRemaining, 30))
		.toString()
		.padStart(2, '0')
		.split('')
	const seconds = [
		{ id: 'tens', number: tens },
		{ id: 'ones', number: ones },
	]

	return (
		<div className='relative w-8.5 text-xs overflow-hidden whitespace-nowrap text-neutral-300 tabular-nums'>
			00:
			<AnimatePresence initial={false} mode='popLayout'>
				{seconds.map(({ id, number }) => (
					<m.div
						className='inline-block tabular-nums'
						key={`${id}-${number}`}
						initial={{ y: '12px', filter: 'blur(2px)', opacity: 0 }}
						animate={{ y: '0', filter: 'blur(0px)', opacity: 1 }}
						exit={{ y: '-12px', filter: 'blur(2px)', opacity: 0 }}
						transition={{ type: 'spring', bounce: 0.28 }}>
						{number}
					</m.div>
				))}
			</AnimatePresence>
		</div>
	)
}
