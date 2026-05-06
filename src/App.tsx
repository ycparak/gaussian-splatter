import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  MotionConfig,
  m,
} from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  SceneAsset,
  SceneLoadCallbacks,
  SceneSettings,
} from "@/shared/types";
import ActionPanel from "@/src/components/ActionPanel";
import ControlsPanel from "@/src/components/ControlsPanel";
import ImagePanel from "@/src/components/ImagePanel";
import InfoPanel from "@/src/components/InfoPanel";
import TopLeftActions from "@/src/components/TopLeftActions";
import { defaultScene } from "@/src/engine/availableScenes";
import { isUploadUiEnabled } from "@/src/engine/runtime";
import {
  cloneSceneSettings,
  DEFAULT_SCENE_SETTINGS,
} from "@/src/engine/sceneSettings";
import Three from "@/src/engine/Three";
import { useRecordingSession } from "@/src/hooks/useRecordingSession";

interface LoaderState {
  visible: boolean;
  progress: number;
  phase: "idle" | "loading" | "loaded" | "error";
  message: string | null;
}

const INITIAL_LOADER_STATE: LoaderState = defaultScene
  ? {
      visible: true,
      progress: 0,
      phase: "loading",
      message: `Loading ${defaultScene.name}...`,
    }
  : {
      visible: false,
      progress: 0,
      phase: "idle",
      message: null,
    };

const interfaceTransition = {
  duration: 0.7,
  ease: [0.23, 1, 0.32, 1],
} as const;

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const threeRef = useRef<Three | null>(null);
  const hasCompletedInitialLoadRef = useRef(!defaultScene);
  const [loaderState, setLoaderState] =
    useState<LoaderState>(INITIAL_LOADER_STATE);
  const [isScenePaused, setIsScenePaused] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(
    defaultScene?.id ?? null,
  );
  const [sceneErrorMessage, setSceneErrorMessage] = useState<string | null>(
    null,
  );
  const [sceneSettings, setSceneSettings] = useState<SceneSettings>(() =>
    cloneSceneSettings(DEFAULT_SCENE_SETTINGS),
  );
  const recordingSession = useRecordingSession(threeRef);
  const {
    clearTimers: clearRecordingTimers,
    isRecording,
    secondsRemaining: recordingSecondsRemaining,
    toggle: toggleRecording,
  } = recordingSession;

  const handleDownloadSnapshot = useCallback(() => {
    void threeRef.current?.downloadSnapshot().catch((error: unknown) => {
      console.error("Scene snapshot failed:", error);
    });
  }, []);

  const handleReloadScene = useCallback(() => {
    threeRef.current?.reloadScene();
  }, []);

  const handleToggleInfo = useCallback(() => {
    setIsInfoOpen((currentIsInfoOpen) => {
      const nextIsInfoOpen = !currentIsInfoOpen;
      threeRef.current?.setInfoVisible(nextIsInfoOpen);
      return nextIsInfoOpen;
    });
  }, []);

  const handleSceneSelect = useCallback((scene: SceneAsset) => {
    setSceneErrorMessage(null);
    setActiveSceneId(scene.id);
    threeRef.current?.loadScene(scene);
  }, []);

  const handleTogglePause = useCallback(() => {
    const nextIsPaused = threeRef.current?.togglePaused() ?? false;
    setIsScenePaused(nextIsPaused);
  }, []);

  useEffect(() => {
    if (!containerRef.current || threeRef.current) return;

    const sceneLoadCallbacks: SceneLoadCallbacks = {
      onLoadStart: (asset) => {
        setSceneErrorMessage(null);
        setActiveSceneId(asset.id);
        if (!hasCompletedInitialLoadRef.current) {
          setLoaderState({
            visible: true,
            progress: 0,
            phase: "loading",
            message: `Loading ${asset.name}...`,
          });
        }
      },
      onLoadProgress: (asset, progress) => {
        if (!hasCompletedInitialLoadRef.current) {
          setLoaderState({
            visible: true,
            progress,
            phase: "loading",
            message: `Loading ${asset.name}...`,
          });
        }
      },
      onLoadSuccess: (_asset) => {
        setSceneErrorMessage(null);
        setActiveSceneId(_asset.id);
        hasCompletedInitialLoadRef.current = true;
        setLoaderState({
          visible: false,
          progress: 1,
          phase: "loaded",
          message: null,
        });
      },
      onLoadError: (_asset, error) => {
        setSceneErrorMessage(error.message);
        if (!hasCompletedInitialLoadRef.current) {
          setLoaderState({
            visible: true,
            progress: 0,
            phase: "error",
            message: error.message,
          });
        }
      },
    };

    const three = new Three(containerRef.current, {
      settings: cloneSceneSettings(DEFAULT_SCENE_SETTINGS),
      sceneLoadCallbacks,
    });
    threeRef.current = three;
    three.run();
    setIsScenePaused(three.isPaused);

    return () => {
      clearRecordingTimers();
      three.dispose();
      threeRef.current = null;
    };
  }, [clearRecordingTimers]);

  useEffect(() => {
    const three = threeRef.current;
    if (!three) return;

    three.applySettings(sceneSettings);
    if (three.isPaused) {
      three.renderStillFrame();
    }
  }, [sceneSettings]);

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <div ref={containerRef} className="fixed inset-0 overflow-hidden" />

        <TopLeftActions
          isInfoOpen={isInfoOpen}
          onToggleInfo={handleToggleInfo}
        />

        <m.div
          className="pointer-events-none fixed inset-0 z-9"
          initial={false}
          animate={{
            opacity: isInfoOpen ? 0 : 1,
          }}
          transition={interfaceTransition}
          aria-hidden={isInfoOpen}
          inert={isInfoOpen ? true : undefined}
        >
          <ActionPanel
            isPaused={isScenePaused}
            isRecording={isRecording}
            recordingSecondsRemaining={recordingSecondsRemaining}
            onDownloadSnapshot={handleDownloadSnapshot}
            onReload={handleReloadScene}
            onToggleRecording={toggleRecording}
            onTogglePause={handleTogglePause}
          />

          <ControlsPanel
            settings={sceneSettings}
            onSettingsChange={setSceneSettings}
          />

          <ImagePanel
            activeSceneId={activeSceneId}
            enableUploads={isUploadUiEnabled}
            sceneErrorMessage={sceneErrorMessage}
            onSceneSelect={handleSceneSelect}
          />
        </m.div>

        <AnimatePresence>{isInfoOpen ? <InfoPanel /> : null}</AnimatePresence>

        <div
          id="loader"
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-700 ${
            loaderState.visible
              ? "opacity-100"
              : "pointer-events-none opacity-0"
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
              <div
                id="loader-bar"
                className="h-full rounded-full bg-white transition-[width] duration-150"
                style={{ width: `${Math.round(loaderState.progress * 100)}%` }}
              />
            </div>
            {loaderState.message ? (
              <p className="max-w-56 text-center text-[11px] text-white/70">
                {loaderState.phase === "error"
                  ? `Load failed: ${loaderState.message}`
                  : loaderState.message}
              </p>
            ) : null}
          </div>
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}
