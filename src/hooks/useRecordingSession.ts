import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type Three from "@/src/engine/Three";

const RECORDING_DURATION_SECONDS = 30;

export function useRecordingSession(threeRef: RefObject<Three | null>) {
	const countdownIntervalRef = useRef<number | null>(null);
	const stopTimeoutRef = useRef<number | null>(null);
	const [isRecording, setIsRecording] = useState(false);
	const [secondsRemaining, setSecondsRemaining] = useState(
		RECORDING_DURATION_SECONDS,
	);

	const clearTimers = useCallback(() => {
		if (countdownIntervalRef.current !== null) {
			window.clearInterval(countdownIntervalRef.current);
			countdownIntervalRef.current = null;
		}

		if (stopTimeoutRef.current !== null) {
			window.clearTimeout(stopTimeoutRef.current);
			stopTimeoutRef.current = null;
		}
	}, []);

	const stop = useCallback(() => {
		clearTimers();
		threeRef.current?.stopRecording();
		setIsRecording(false);
		setSecondsRemaining(RECORDING_DURATION_SECONDS);
	}, [clearTimers, threeRef]);

	const start = useCallback(() => {
		if (!threeRef.current) return;

		try {
			threeRef.current.startRecording({ frameRate: 60 });
		} catch (error) {
			console.error("Scene recording failed:", error);
			return;
		}

		clearTimers();
		setIsRecording(true);
		setSecondsRemaining(RECORDING_DURATION_SECONDS);
		countdownIntervalRef.current = window.setInterval(() => {
			setSecondsRemaining((currentSeconds) => Math.max(currentSeconds - 1, 0));
		}, 1000);
		stopTimeoutRef.current = window.setTimeout(
			stop,
			RECORDING_DURATION_SECONDS * 1000,
		);
	}, [clearTimers, stop, threeRef]);

	const toggle = useCallback(() => {
		if (isRecording) {
			stop();
			return;
		}

		start();
	}, [isRecording, start, stop]);

	useEffect(() => clearTimers, [clearTimers]);

	return {
		isRecording,
		secondsRemaining,
		toggle,
		clearTimers,
	};
}
