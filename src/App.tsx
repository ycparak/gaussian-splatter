import { useCallback, useEffect, useRef, useState } from "react";
import type { SceneLoadCallbacks } from "@/shared/types";
import ActionPanel from "@/src/components/ActionPanel";
import ControlsPanel from "@/src/components/ControlsPanel";
import RangeSlider from "@/src/components/ui/range-slider";
import { DEFAULT_SCENE_SETTINGS } from "@/src/config/sceneControls";
import Three from "@/src/core/Three";
import { defaultScene } from "@/src/scenes/availableScenes";

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

const RECORDING_DURATION_SECONDS = 30;

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const threeRef = useRef<Three | null>(null);
  const hasCompletedInitialLoadRef = useRef(!defaultScene);
  const recordingCountdownIntervalRef = useRef<number | null>(null);
  const recordingStopTimeoutRef = useRef<number | null>(null);
  const [loaderState, setLoaderState] =
    useState<LoaderState>(INITIAL_LOADER_STATE);
  const [isScenePaused, setIsScenePaused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecondsRemaining, setRecordingSecondsRemaining] = useState(
    RECORDING_DURATION_SECONDS,
  );

  const clearRecordingTimers = useCallback(() => {
    if (recordingCountdownIntervalRef.current !== null) {
      window.clearInterval(recordingCountdownIntervalRef.current);
      recordingCountdownIntervalRef.current = null;
    }

    if (recordingStopTimeoutRef.current !== null) {
      window.clearTimeout(recordingStopTimeoutRef.current);
      recordingStopTimeoutRef.current = null;
    }
  }, []);

  const stopRecordingSession = useCallback(() => {
    clearRecordingTimers();
    threeRef.current?.stopRecording();
    setIsRecording(false);
    setRecordingSecondsRemaining(RECORDING_DURATION_SECONDS);
  }, [clearRecordingTimers]);

  const startRecordingSession = useCallback(() => {
    if (!threeRef.current) return;

    try {
      threeRef.current.startRecording({
        frameRate: 60,
      });
    } catch (error) {
      console.error("Scene recording failed:", error);
      return;
    }

    clearRecordingTimers();
    setIsRecording(true);
    setRecordingSecondsRemaining(RECORDING_DURATION_SECONDS);
    recordingCountdownIntervalRef.current = window.setInterval(() => {
      setRecordingSecondsRemaining((secondsRemaining) =>
        Math.max(secondsRemaining - 1, 0),
      );
    }, 1000);
    recordingStopTimeoutRef.current = window.setTimeout(() => {
      stopRecordingSession();
    }, RECORDING_DURATION_SECONDS * 1000);
  }, [clearRecordingTimers, stopRecordingSession]);

  const handleDownloadSnapshot = useCallback(() => {
    void threeRef.current?.downloadSnapshot().catch((error: unknown) => {
      console.error("Scene snapshot failed:", error);
    });
  }, []);

  const handleReloadScene = useCallback(() => {
    threeRef.current?.reloadScene();
  }, []);

  const handleTogglePause = useCallback(() => {
    const nextIsPaused = threeRef.current?.togglePaused() ?? false;
    setIsScenePaused(nextIsPaused);
  }, []);

  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecordingSession();
      return;
    }

    startRecordingSession();
  }, [isRecording, startRecordingSession, stopRecordingSession]);

  useEffect(() => {
    if (!containerRef.current || threeRef.current) return;

    const sceneLoadCallbacks: SceneLoadCallbacks = {
      onLoadStart: (asset) => {
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
        hasCompletedInitialLoadRef.current = true;
        setLoaderState({
          visible: false,
          progress: 1,
          phase: "loaded",
          message: null,
        });
      },
      onLoadError: (_asset, error) => {
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
      settings: DEFAULT_SCENE_SETTINGS,
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

  return (
    <>
      <div ref={containerRef} className="fixed inset-0 overflow-hidden" />

      <ActionPanel
        isPaused={isScenePaused}
        isRecording={isRecording}
        recordingSecondsRemaining={recordingSecondsRemaining}
        onDownloadSnapshot={handleDownloadSnapshot}
        onReload={handleReloadScene}
        onToggleRecording={handleToggleRecording}
        onTogglePause={handleTogglePause}
      />

      <ControlsPanel />

      <RangeSlider />

      <div
        id="loader"
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-700 ${
          loaderState.visible ? "opacity-100" : "pointer-events-none opacity-0"
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
    </>
  );
}
