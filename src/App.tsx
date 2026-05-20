import { AnimatePresence, domMax, LazyMotion, MotionConfig, m } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { SceneAsset, SceneLoadCallbacks, SceneSettings } from '@/shared/types'
import ActionPanel from '@/src/components/ActionPanel'
import ControlPanel from '@/src/components/ControlPanel'
import ImagePanel from '@/src/components/ImagePanel'
import InfoPanel from '@/src/components/InfoPanel'
import InfoButtons from '@/src/components/InfoButtons'
import { defaultScene } from '@/src/engine/availableScenes'
import { isUploadUiEnabled } from '@/src/engine/runtime'
import { resolveSceneSettingsPreset } from '@/src/engine/scenePresets'
import { cloneSceneSettings } from '@/src/engine/sceneSettings'
import Three from '@/src/engine/Three'
import { useRecordingSession } from '@/src/hooks/useRecordingSession'

interface LoaderState {
	visible: boolean
	progress: number
	phase: 'idle' | 'loading' | 'loaded' | 'error'
	message: string | null
}

const lerp = (start: number, end: number, progress: number) => start + (end - start) * progress

function parseHexColor(value: string): [number, number, number] | null {
	const normalized = value.trim()
	if (!normalized.startsWith('#')) return null

	const hex = normalized.slice(1)
	if (hex.length === 3) {
		const [r, g, b] = hex.split('')
		if (!r || !g || !b) return null
		const rr = Number.parseInt(r + r, 16)
		const gg = Number.parseInt(g + g, 16)
		const bb = Number.parseInt(b + b, 16)
		return Number.isNaN(rr) || Number.isNaN(gg) || Number.isNaN(bb) ? null : [rr, gg, bb]
	}

	if (hex.length === 6) {
		const rr = Number.parseInt(hex.slice(0, 2), 16)
		const gg = Number.parseInt(hex.slice(2, 4), 16)
		const bb = Number.parseInt(hex.slice(4, 6), 16)
		return Number.isNaN(rr) || Number.isNaN(gg) || Number.isNaN(bb) ? null : [rr, gg, bb]
	}

	return null
}

function toHexColor([r, g, b]: [number, number, number]): string {
	const toHex = (value: number) => Math.round(value).toString(16).padStart(2, '0')
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function lerpColor(start: string, end: string, progress: number): string {
	const from = parseHexColor(start)
	const to = parseHexColor(end)
	if (!from || !to) {
		return progress < 1 ? start : end
	}

	return toHexColor([
		lerp(from[0], to[0], progress),
		lerp(from[1], to[1], progress),
		lerp(from[2], to[2], progress),
	])
}

function interpolateSceneSettings(
	start: SceneSettings,
	end: SceneSettings,
	progress: number
): SceneSettings {
	const clamped = Math.max(0, Math.min(1, progress))
	const isComplete = clamped >= 1

	return {
		particles: {
			size: lerp(start.particles.size, end.particles.size, clamped),
			flowFieldInfluence: lerp(
				start.particles.flowFieldInfluence,
				end.particles.flowFieldInfluence,
				clamped
			),
			flowFieldStrength: lerp(
				start.particles.flowFieldStrength,
				end.particles.flowFieldStrength,
				clamped
			),
			flowFieldFrequency: lerp(
				start.particles.flowFieldFrequency,
				end.particles.flowFieldFrequency,
				clamped
			),
			timeScale: lerp(start.particles.timeScale, end.particles.timeScale, clamped),
			decayRate: lerp(start.particles.decayRate, end.particles.decayRate, clamped),
			returnForce: lerp(start.particles.returnForce, end.particles.returnForce, clamped),
			morphDuration: lerp(start.particles.morphDuration, end.particles.morphDuration, clamped),
		},
		scene: {
			background: lerpColor(start.scene.background, end.scene.background, clamped),
			fogEnabled: isComplete ? end.scene.fogEnabled : start.scene.fogEnabled,
			fogColor: lerpColor(start.scene.fogColor, end.scene.fogColor, clamped),
			fogNear: lerp(start.scene.fogNear, end.scene.fogNear, clamped),
			fogFar: lerp(start.scene.fogFar, end.scene.fogFar, clamped),
			pointRotationX: lerp(start.scene.pointRotationX, end.scene.pointRotationX, clamped),
			scale: lerp(start.scene.scale, end.scene.scale, clamped),
		},
		lighting: {
			directionX: lerp(start.lighting.directionX, end.lighting.directionX, clamped),
			directionY: lerp(start.lighting.directionY, end.lighting.directionY, clamped),
			directionZ: lerp(start.lighting.directionZ, end.lighting.directionZ, clamped),
			ambient: lerp(start.lighting.ambient, end.lighting.ambient, clamped),
			diffuse: lerp(start.lighting.diffuse, end.lighting.diffuse, clamped),
			specular: lerp(start.lighting.specular, end.lighting.specular, clamped),
			shininess: lerp(start.lighting.shininess, end.lighting.shininess, clamped),
		},
		bloom: {
			enabled: isComplete ? end.bloom.enabled : start.bloom.enabled,
			strength: lerp(start.bloom.strength, end.bloom.strength, clamped),
			radius: lerp(start.bloom.radius, end.bloom.radius, clamped),
			threshold: lerp(start.bloom.threshold, end.bloom.threshold, clamped),
		},
		color: {
			brightness: lerp(start.color.brightness, end.color.brightness, clamped),
			contrast: lerp(start.color.contrast, end.color.contrast, clamped),
			saturation: lerp(start.color.saturation, end.color.saturation, clamped),
			tintColor: lerpColor(start.color.tintColor, end.color.tintColor, clamped),
			tintStrength: lerp(start.color.tintStrength, end.color.tintStrength, clamped),
		},
		camera: {
			fov: lerp(start.camera.fov, end.camera.fov, clamped),
			z: lerp(start.camera.z, end.camera.z, clamped),
			targetX: lerp(start.camera.targetX, end.camera.targetX, clamped),
			targetY: lerp(start.camera.targetY, end.camera.targetY, clamped),
			targetZ: lerp(start.camera.targetZ, end.camera.targetZ, clamped),
			damping: lerp(start.camera.damping, end.camera.damping, clamped),
			xMin: lerp(start.camera.xMin, end.camera.xMin, clamped),
			xMax: lerp(start.camera.xMax, end.camera.xMax, clamped),
			yMin: lerp(start.camera.yMin, end.camera.yMin, clamped),
			yMax: lerp(start.camera.yMax, end.camera.yMax, clamped),
			bobAmplitude: lerp(start.camera.bobAmplitude, end.camera.bobAmplitude, clamped),
			bobSpeed: lerp(start.camera.bobSpeed, end.camera.bobSpeed, clamped),
			rollAmplitude: lerp(start.camera.rollAmplitude, end.camera.rollAmplitude, clamped),
		},
		renderer: {
			pixelRatioCap: lerp(start.renderer.pixelRatioCap, end.renderer.pixelRatioCap, clamped),
			antialias: isComplete ? end.renderer.antialias : start.renderer.antialias,
			toneMapping: isComplete ? end.renderer.toneMapping : start.renderer.toneMapping,
			exposure: lerp(start.renderer.exposure, end.renderer.exposure, clamped),
		},
	}
}

const INITIAL_LOADER_STATE: LoaderState = defaultScene
	? {
			visible: true,
			progress: 0,
			phase: 'loading',
			message: `Loading ${defaultScene.name}...`,
		}
	: {
			visible: false,
			progress: 0,
			phase: 'idle',
			message: null,
		}

const interfaceTransition = {
	duration: 0.75,
	ease: [0.23, 1, 0.32, 1],
} as const
const INITIAL_SCENE_SETTINGS = resolveSceneSettingsPreset(defaultScene)

export default function App() {
	const containerRef = useRef<HTMLDivElement | null>(null)
	const threeRef = useRef<Three | null>(null)
	const hasCompletedInitialLoadRef = useRef(!defaultScene)
	const pendingScenePresetRef = useRef<{ sceneId: string; settings: SceneSettings } | null>(null)
	const sceneSettingsRef = useRef<SceneSettings>(cloneSceneSettings(INITIAL_SCENE_SETTINGS))
	const settingsAnimationFrameRef = useRef<number | null>(null)
	const [loaderState, setLoaderState] = useState<LoaderState>(INITIAL_LOADER_STATE)
	const [isScenePaused, setIsScenePaused] = useState(false)
	const [isInfoOpen, setIsInfoOpen] = useState(false)
	const [activeSceneId, setActiveSceneId] = useState<string | null>(defaultScene?.id ?? null)
	const [sceneDefaultSettings, setSceneDefaultSettings] = useState<SceneSettings>(() =>
		cloneSceneSettings(INITIAL_SCENE_SETTINGS)
	)
	const [sceneSettings, setSceneSettings] = useState<SceneSettings>(() =>
		cloneSceneSettings(INITIAL_SCENE_SETTINGS)
	)
	const recordingSession = useRecordingSession(threeRef)
	const {
		clearTimers: clearRecordingTimers,
		isRecording,
		secondsRemaining: recordingSecondsRemaining,
		toggle: toggleRecording,
	} = recordingSession

	const handleDownloadSnapshot = useCallback(() => {
		void threeRef.current?.downloadSnapshot().catch((error: unknown) => {
			console.error('Scene snapshot failed:', error)
		})
	}, [])

	const handleReloadScene = useCallback(() => {
		threeRef.current?.reloadScene()
	}, [])

	const handleToggleInfo = useCallback(() => {
		setIsInfoOpen(currentIsInfoOpen => {
			const nextIsInfoOpen = !currentIsInfoOpen
			threeRef.current?.setInfoVisible(nextIsInfoOpen)
			return nextIsInfoOpen
		})
	}, [])
	const handleCloseInfo = useCallback(() => {
		setIsInfoOpen(false)
		threeRef.current?.setInfoVisible(false)
	}, [])

	const cancelSceneSettingsAnimation = useCallback(() => {
		if (settingsAnimationFrameRef.current === null) return
		cancelAnimationFrame(settingsAnimationFrameRef.current)
		settingsAnimationFrameRef.current = null
	}, [])

	const animateSceneSettings = useCallback(
		(targetSettings: SceneSettings, durationSeconds: number) => {
			cancelSceneSettingsAnimation()

			const startSettings = cloneSceneSettings(sceneSettingsRef.current)
			const durationMs = Math.max(0, durationSeconds * 1000)
			if (durationMs === 0) {
				setSceneSettings(targetSettings)
				return
			}

			const startTime = performance.now()
			const tick = (time: number) => {
				const progress = (time - startTime) / durationMs
				const nextSettings = interpolateSceneSettings(startSettings, targetSettings, progress)
				setSceneSettings(nextSettings)

				if (progress < 1) {
					settingsAnimationFrameRef.current = requestAnimationFrame(tick)
					return
				}

				settingsAnimationFrameRef.current = null
			}

			settingsAnimationFrameRef.current = requestAnimationFrame(tick)
		},
		[cancelSceneSettingsAnimation]
	)

	const handleSceneSelect = useCallback(
		(scene: SceneAsset) => {
			const nextSettings = resolveSceneSettingsPreset(scene)
			setActiveSceneId(scene.id)
			const activeAssetId = threeRef.current?.getSceneStats().activeAssetId ?? null
			if (scene.id === activeAssetId) {
				setSceneDefaultSettings(nextSettings)
				setSceneSettings(nextSettings)
				return
			}

			pendingScenePresetRef.current = {
				sceneId: scene.id,
				settings: nextSettings,
			}
			animateSceneSettings(nextSettings, sceneSettingsRef.current.particles.morphDuration)
			threeRef.current?.loadScene(scene)
		},
		[animateSceneSettings]
	)

	const handleTogglePause = useCallback(() => {
		const nextIsPaused = threeRef.current?.togglePaused() ?? false
		setIsScenePaused(nextIsPaused)
	}, [])

	useEffect(() => {
		if (!containerRef.current || threeRef.current) return

		const sceneLoadCallbacks: SceneLoadCallbacks = {
			onLoadStart: asset => {
				setActiveSceneId(asset.id)
				if (!hasCompletedInitialLoadRef.current) {
					setLoaderState({
						visible: true,
						progress: 0,
						phase: 'loading',
						message: `Loading ${asset.name}...`,
					})
				}
			},
			onLoadProgress: (asset, progress) => {
				if (!hasCompletedInitialLoadRef.current) {
					setLoaderState({
						visible: true,
						progress,
						phase: 'loading',
						message: `Loading ${asset.name}...`,
					})
				}
			},
			onLoadSuccess: asset => {
				setActiveSceneId(asset.id)
				if (pendingScenePresetRef.current?.sceneId === asset.id) {
					cancelSceneSettingsAnimation()
					setSceneDefaultSettings(pendingScenePresetRef.current.settings)
					setSceneSettings(pendingScenePresetRef.current.settings)
					pendingScenePresetRef.current = null
				}
				hasCompletedInitialLoadRef.current = true
				setLoaderState({
					visible: false,
					progress: 1,
					phase: 'loaded',
					message: null,
				})
			},
			onLoadError: (asset, error) => {
				if (pendingScenePresetRef.current?.sceneId === asset.id) {
					cancelSceneSettingsAnimation()
					pendingScenePresetRef.current = null
				}
				if (!hasCompletedInitialLoadRef.current) {
					setLoaderState({
						visible: true,
						progress: 0,
						phase: 'error',
						message: error.message,
					})
				}
			},
		}

		const three = new Three(containerRef.current, {
			settings: cloneSceneSettings(INITIAL_SCENE_SETTINGS),
			sceneLoadCallbacks,
		})
		threeRef.current = three
		three.run()
		setIsScenePaused(three.isPaused)

		return () => {
			cancelSceneSettingsAnimation()
			clearRecordingTimers()
			three.dispose()
			threeRef.current = null
		}
	}, [cancelSceneSettingsAnimation, clearRecordingTimers])

	useEffect(() => {
		sceneSettingsRef.current = sceneSettings
	}, [sceneSettings])

	useEffect(() => {
		const three = threeRef.current
		if (!three) return

		three.applySettings(sceneSettings)
		if (three.isPaused) {
			three.renderStillFrame()
		}
	}, [sceneSettings])

	return (
		<LazyMotion features={domMax}>
			<MotionConfig reducedMotion='user'>
				<div ref={containerRef} className='fixed inset-0 overflow-hidden' />

				<InfoButtons isInfoOpen={isInfoOpen} onToggleInfo={handleToggleInfo} />

				<m.div
					className='pointer-events-none fixed inset-0 z-9'
					initial={false}
					animate={{
						opacity: isInfoOpen ? 0 : 1,
					}}
					transition={{
						...interfaceTransition,
						delay: isInfoOpen ? 0 : 0.35,
					}}
					aria-hidden={isInfoOpen}
					inert={isInfoOpen ? true : undefined}>
					<ActionPanel
						isPaused={isScenePaused}
						isRecording={isRecording}
						recordingSecondsRemaining={recordingSecondsRemaining}
						onDownloadSnapshot={handleDownloadSnapshot}
						onReload={handleReloadScene}
						onToggleRecording={toggleRecording}
						onTogglePause={handleTogglePause}
					/>

					<ControlPanel
						settings={sceneSettings}
						defaultSettings={sceneDefaultSettings}
						onSettingsChange={setSceneSettings}
					/>

					<ImagePanel
						activeSceneId={activeSceneId}
						enableUploads={isUploadUiEnabled}
						onSceneSelect={handleSceneSelect}
					/>
				</m.div>

				<AnimatePresence>
					{isInfoOpen ? <InfoPanel onRequestClose={handleCloseInfo} /> : null}
				</AnimatePresence>

				<div
					id='loader'
					className={`fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-700 ${
						loaderState.visible ? 'opacity-100' : 'pointer-events-none opacity-0'
					}`}>
					<div className='flex flex-col items-center gap-3'>
						<div className='h-1 w-48 overflow-hidden rounded-full bg-white/10'>
							<div
								id='loader-bar'
								className='h-full rounded-full bg-white transition-[width] duration-150'
								style={{ width: `${Math.round(loaderState.progress * 100)}%` }}
							/>
						</div>
					</div>
				</div>
			</MotionConfig>
		</LazyMotion>
	)
}
