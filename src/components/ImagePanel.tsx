'use client'

import { AnimatePresence, m } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { SceneAsset } from '@/shared/types'
import { ChevronRightIcon } from '@/src/components/icons/chevron-right'
import Button from '@/src/components/ui/button'
import { bundledScenes } from '@/src/engine/availableScenes'
import { cn } from '@/src/lib/utils'

const preferredSceneOrder = ['chapel', 'colosseum', 'modern', 'nousresearch', 'tokyo'] as const

const compressionPercentBySceneId: Record<string, number> = {
	chapel: 12,
	colosseum: 11,
	modern: 13,
	nousresearch: 12,
	tokyo: 11,
	columns: 13,
	window: 11,
	'temple-neptune': 13,
}

interface ImagePanelProps {
	activeSceneId: string | null
	onSceneSelect: (scene: SceneAsset) => void
}

function shouldStartOpen() {
	if (typeof window === 'undefined') {
		return false
	}

	return window.matchMedia('(min-width: 768px)').matches
}

export default function ImagePanel({ activeSceneId, onSceneSelect }: ImagePanelProps) {
	const [isOpen, setIsOpen] = useState(shouldStartOpen)
	const buttonRef = useRef<HTMLDivElement | null>(null)
	const panelRef = useRef<HTMLDivElement | null>(null)
	const orderedScenes = useMemo(() => {
		const preferredOrderIndex = new Map<string, number>(
			preferredSceneOrder.map((id, index) => [id, index])
		)

		return [...bundledScenes].sort((left, right) => {
			const leftOrder = preferredOrderIndex.get(left.id)
			const rightOrder = preferredOrderIndex.get(right.id)

			if (leftOrder !== undefined && rightOrder !== undefined) {
				return leftOrder - rightOrder
			}

			if (leftOrder !== undefined) {
				return -1
			}

			if (rightOrder !== undefined) {
				return 1
			}

			return left.name.localeCompare(right.name)
		})
	}, [])

	const closePanel = useCallback(() => {
		setIsOpen(false)
	}, [])

	useEffect(() => {
		if (!isOpen) {
			return undefined
		}

		function handlePointerDown(event: PointerEvent) {
			const target = event.target
			if (!(target instanceof Node)) {
				return
			}

			if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) {
				return
			}

			closePanel()
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				closePanel()
			}
		}

		document.addEventListener('pointerdown', handlePointerDown, true)
		document.addEventListener('keydown', handleKeyDown)

		return () => {
			document.removeEventListener('pointerdown', handlePointerDown, true)
			document.removeEventListener('keydown', handleKeyDown)
		}
	}, [isOpen, closePanel])

	return (
		<div className='pointer-events-none fixed inset-0 z-9 text-[12px] tracking-normal'>
			<AnimatePresence>
				{isOpen ? (
					<m.aside
						ref={panelRef}
						key='images-popup'
						role='dialog'
						aria-label='Image scenes'
						initial={{ opacity: 0, y: 8, filter: 'blur(12px)' }}
						animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
						exit={{ opacity: 0, y: 8, filter: 'blur(12px)' }}
						transition={{
							duration: 0.24,
							ease: [0.23, 1, 0.32, 1],
						}}
						style={{ transformOrigin: 'right bottom' }}
						className='pointer-events-auto fixed right-5 bottom-16 z-10 w-75.5 overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/65 backdrop-blur-[10px]'>
						<ul className='flex list-none flex-col p-0'>
							{orderedScenes.map(scene => (
								<ImageListItem
									key={scene.id}
									scene={scene}
									isActive={scene.id === activeSceneId}
									onSceneSelect={onSceneSelect}
								/>
							))}
						</ul>
					</m.aside>
				) : null}
			</AnimatePresence>

			<div ref={buttonRef} className='pointer-events-auto fixed right-5 bottom-5'>
				<Button
					type='button'
					aria-label={isOpen ? 'Hide images panel' : 'Show images panel'}
					aria-expanded={isOpen}
					icon={
						<ChevronRightIcon
							className={cn('size-4 transition-transform duration-150', isOpen && '-rotate-90')}
						/>
					}
					onClick={() => setIsOpen(currentOpen => !currentOpen)}
					className={cn(
						'h-9 gap-1.5 pr-4 pl-2 text-neutral-400 shadow-xl shadow-black/25 hover:text-neutral-300',
						isOpen && 'bg-neutral-800/65 text-neutral-300'
					)}>
					Images
				</Button>
			</div>
		</div>
	)
}

function ImageListItem({
	scene,
	isActive,
	onSceneSelect,
}: {
	scene: SceneAsset
	isActive: boolean
	onSceneSelect: (scene: SceneAsset) => void
}) {
	const compressionPercent =
		compressionPercentBySceneId[scene.id] ??
		(typeof scene.ratio === 'number' ? Math.max(1, Math.round(scene.ratio * 100)) : null)

	return (
		<li className='flex items-center border-white/5 border-t first:border-t-0'>
			<button
				tabIndex={-1}
				type='button'
				aria-current={isActive ? 'true' : undefined}
				onClick={() => onSceneSelect(scene)}
				className={cn(
					'group flex h-10 w-full items-center gap-3 px-4 text-left transition-colors duration-200 outline-none focus-visible:outline-none',
					isActive ? 'bg-white/5' : 'hover:bg-white/5'
				)}>
				<span
					className={cn(
						'size-1.5 shrink-0 rounded-full transition-colors duration-200',
						isActive ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.75)]' : 'bg-neutral-600'
					)}
				/>
				<span
					className={cn(
						'min-w-0 flex-1 truncate text-xs text-neutral-400 transition-colors duration-200',
						isActive ? 'text-neutral-300!' : 'group-hover:text-neutral-300'
					)}>
					{scene.name}
				</span>
				{compressionPercent !== null ? (
					<span className='shrink-0 text-[11px] leading-0 text-neutral-400'>
						{compressionPercent}% / PLY
					</span>
				) : null}
			</button>
		</li>
	)
}
