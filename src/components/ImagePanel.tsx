'use client'

import { AnimatePresence, m } from 'motion/react'
import {
	type ChangeEvent,
	type DragEvent,
	type RefObject,
	startTransition,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'

import { abortableWait } from '@/shared/abortableWait'
import { mergeGeneratedScene } from '@/shared/generatedScenes'
import type { GeneratedScene, GenerationJob, GenerationJobStatus, SceneAsset } from '@/shared/types'
import { ChevronRightIcon } from '@/src/components/icons/chevron-right'
import { UploadIcon } from '@/src/components/icons/upload'
import Button from '@/src/components/ui/button'
import {
	createGenerationJob,
	fetchGeneratedScenes,
	fetchGenerationJob,
	FINAL_JOB_STATUSES,
	resolveCompletedScene,
	statusMessage,
} from '@/src/lib/generatedSceneApi'
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
	enableUploads: boolean
	onSceneSelect: (scene: SceneAsset) => void
}

function shouldStartOpen() {
	if (typeof window === 'undefined') {
		return false
	}

	return window.matchMedia('(min-width: 768px)').matches
}

export default function ImagePanel({
	activeSceneId,
	enableUploads,
	onSceneSelect,
}: ImagePanelProps) {
	const [isOpen, setIsOpen] = useState(shouldStartOpen)
	const [isDragging, setIsDragging] = useState(false)
	const [message, setMessage] = useState('')
	const [job, setJob] = useState<GenerationJob | null>(null)
	const [generatedScenes, setGeneratedScenes] = useState<GeneratedScene[]>([])
	const fileInputRef = useRef<HTMLInputElement | null>(null)
	const buttonRef = useRef<HTMLDivElement | null>(null)
	const panelRef = useRef<HTMLDivElement | null>(null)
	const dragDepthRef = useRef(0)
	const jobPollControllerRef = useRef<AbortController | null>(null)
	const isBusy =
		job?.status === 'queued' || job?.status === 'running' || job?.status === 'optimizing'

	const orderedScenes = useMemo(() => {
		const sourceScenes = enableUploads ? [...bundledScenes, ...generatedScenes] : [...bundledScenes]
		const preferredOrderIndex = new Map<string, number>(
			preferredSceneOrder.map((id, index) => [id, index])
		)

		return sourceScenes.sort((left, right) => {
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
	}, [enableUploads, generatedScenes])

	const closePanel = useCallback(() => {
		setIsOpen(false)
	}, [])

	const refreshGeneratedScenes = useCallback(
		async (options: { silent?: boolean } = {}) => {
			if (!enableUploads) {
				return
			}

			try {
				const scenes = await fetchGeneratedScenes()
				startTransition(() => {
					setGeneratedScenes(scenes)
				})
				if (!options.silent) {
					setMessage('Image list refreshed.')
				}
			} catch (error) {
				if (!options.silent) {
					setMessage(error instanceof Error ? error.message : String(error))
				}
			}
		},
		[enableUploads]
	)

	const followGenerationJob = useCallback(
		async (initialJob: GenerationJob, signal: AbortSignal) => {
			let nextJob = initialJob

			while (nextJob.id && !FINAL_JOB_STATUSES.has(nextJob.status)) {
				await abortableWait(1500, signal)
				nextJob = await fetchGenerationJob(nextJob.id, signal)
				setJob(nextJob)
				setMessage(statusMessage(nextJob))
			}

			if (nextJob.status !== 'done') {
				return
			}

			const scene = await resolveCompletedScene(nextJob, signal)
			if (!scene) {
				throw new Error('Generation completed but no image scene was returned.')
			}

			startTransition(() => {
				setGeneratedScenes(currentScenes => mergeGeneratedScene(currentScenes, scene))
			})
			onSceneSelect(scene)
			setMessage(`Generated ${scene.name}.`)
		},
		[onSceneSelect]
	)

	const generateFromFile = useCallback(
		async (file: File) => {
			if (!enableUploads) {
				return
			}

			const formData = new FormData()
			formData.append('image', file)
			let controller: AbortController | null = null

			try {
				setMessage(`Uploading ${file.name}...`)
				setJob(null)
				jobPollControllerRef.current?.abort()
				controller = new AbortController()
				jobPollControllerRef.current = controller

				const nextJob = await createGenerationJob(formData, controller.signal)
				setJob(nextJob)
				setMessage(statusMessage(nextJob))
				await followGenerationJob(nextJob, controller.signal)
			} catch (error) {
				if (!(error instanceof Error) || error.name !== 'AbortError') {
					setMessage(error instanceof Error ? error.message : String(error))
				}
			} finally {
				if (jobPollControllerRef.current === controller) {
					jobPollControllerRef.current = null
				}
			}
		},
		[enableUploads, followGenerationJob]
	)

	const handlePickFile = useCallback(
		(file: File | null) => {
			if (!enableUploads || !file) {
				return
			}

			if (!file.type.startsWith('image/')) {
				setMessage('Choose an image file.')
				return
			}

			void generateFromFile(file)
		},
		[enableUploads, generateFromFile]
	)

	const handleInputChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			handlePickFile(event.target.files?.[0] ?? null)
			event.target.value = ''
		},
		[handlePickFile]
	)

	useEffect(() => {
		if (!enableUploads) {
			jobPollControllerRef.current?.abort()
			jobPollControllerRef.current = null
			setIsDragging(false)
			setMessage('')
			setJob(null)
			setGeneratedScenes([])
			return undefined
		}

		void refreshGeneratedScenes({ silent: true })

		return () => {
			jobPollControllerRef.current?.abort()
		}
	}, [enableUploads, refreshGeneratedScenes])

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

	const handleDragEnter = useCallback((event: DragEvent<HTMLButtonElement>) => {
		event.preventDefault()
		dragDepthRef.current += 1
		setIsDragging(true)
	}, [])

	const handleDragOver = useCallback((event: DragEvent<HTMLButtonElement>) => {
		event.preventDefault()
	}, [])

	const handleDragLeave = useCallback((event: DragEvent<HTMLButtonElement>) => {
		event.preventDefault()
		dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
		if (dragDepthRef.current === 0) {
			setIsDragging(false)
		}
	}, [])

	const handleDrop = useCallback(
		(event: DragEvent<HTMLButtonElement>) => {
			event.preventDefault()
			dragDepthRef.current = 0
			setIsDragging(false)
			handlePickFile(event.dataTransfer.files?.[0] ?? null)
		},
		[handlePickFile]
	)

	return (
		<div className='pointer-events-none fixed inset-0 z-9 text-[12px] tracking-normal'>
			<AnimatePresence>
				{isOpen ? (
					<m.div
						ref={panelRef}
						key='images-popup'
						role='dialog'
						aria-label='Image scenes'
						initial={false}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.24, ease: 'easeOut' }}
						className='pointer-events-auto fixed right-5 bottom-16 z-10 flex w-75.5 flex-col gap-1.5'>
						{enableUploads ? (
							<UploadPanel
								fileInputRef={fileInputRef}
								isDragging={isDragging}
								isBusy={isBusy}
								message={message}
								status={job?.status ?? null}
								onInputChange={handleInputChange}
								onPickClick={() => fileInputRef.current?.click()}
								onDragEnter={handleDragEnter}
								onDragOver={handleDragOver}
								onDragLeave={handleDragLeave}
								onDrop={handleDrop}
							/>
						) : null}

						<ul className='overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/65 p-0 backdrop-blur-[10px]'>
							{orderedScenes.map(scene => (
								<ImageListItem
									key={scene.id}
									scene={scene}
									isActive={scene.id === activeSceneId}
									onSceneSelect={onSceneSelect}
								/>
							))}
						</ul>
					</m.div>
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

function UploadPanel({
	fileInputRef,
	isDragging,
	isBusy,
	message,
	status,
	onInputChange,
	onPickClick,
	onDragEnter,
	onDragOver,
	onDragLeave,
	onDrop,
}: {
	fileInputRef: RefObject<HTMLInputElement | null>
	isDragging: boolean
	isBusy: boolean
	message: string
	status: GenerationJobStatus | null
	onInputChange: (event: ChangeEvent<HTMLInputElement>) => void
	onPickClick: () => void
	onDragEnter: (event: DragEvent<HTMLButtonElement>) => void
	onDragOver: (event: DragEvent<HTMLButtonElement>) => void
	onDragLeave: (event: DragEvent<HTMLButtonElement>) => void
	onDrop: (event: DragEvent<HTMLButtonElement>) => void
}) {
	const showStatus = message.length > 0
	const isError = status === 'error'

	return (
		<>
			<input
				ref={fileInputRef}
				type='file'
				accept='image/*'
				className='hidden'
				onChange={onInputChange}
			/>

			<button
				type='button'
				aria-label='Upload image to generate a scene'
				onClick={onPickClick}
				onDragEnter={onDragEnter}
				onDragOver={onDragOver}
				onDragLeave={onDragLeave}
				onDrop={onDrop}
				className={cn(
					'group relative flex h-36 w-full flex-col items-center justify-center gap-2.5 overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/65 px-4 text-center text-neutral-400 backdrop-blur-[10px] transition-colors duration-200',
					isDragging ? 'bg-cyan-400/10 ring-1 ring-cyan-300/70' : 'hover:bg-neutral-900/75'
				)}>
				{isBusy ? (
					<span
						className='size-4 rounded-full border-2 border-current border-t-transparent animate-spin'
						aria-hidden='true'
					/>
				) : (
					<UploadIcon className='size-5 text-current' aria-hidden='true' />
				)}
				<span className='text-xs leading-4 font-semibold text-current'>
					Drop image or drag to upload
				</span>
				{showStatus ? (
					<span
						className={cn(
							'max-w-full truncate text-[11px] leading-4',
							isError ? 'text-red-300' : 'text-neutral-500 group-hover:text-neutral-400'
						)}>
						{message}
					</span>
				) : null}
			</button>
		</>
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
						isActive ? 'text-neutral-300' : 'group-hover:text-neutral-300'
					)}>
					{scene.name}
				</span>
				{compressionPercent !== null ? (
					<span className='shrink-0 text-[11px] leading-3 text-neutral-400'>
						{compressionPercent}%
					</span>
				) : null}
			</button>
		</li>
	)
}
