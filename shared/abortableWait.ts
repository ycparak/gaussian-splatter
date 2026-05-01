export interface AbortableSignalLike {
	aborted: boolean;
	addEventListener(
		type: "abort",
		listener: EventListenerOrEventListenerObject,
		options?: AddEventListenerOptions,
	): void;
	removeEventListener(
		type: "abort",
		listener: EventListenerOrEventListenerObject,
		options?: EventListenerOptions,
	): void;
}

export interface TimeoutApi {
	setTimeout(handler: () => void, delay: number): number;
	clearTimeout(timeoutId: number): void;
}

export const defaultTimeoutApi: TimeoutApi = {
	setTimeout: (handler, delay) => window.setTimeout(handler, delay),
	clearTimeout: (timeoutId) => window.clearTimeout(timeoutId),
};

export function abortableWait(
	ms: number,
	signal: AbortableSignalLike,
	timers: TimeoutApi = defaultTimeoutApi,
): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException("Aborted", "AbortError"));
			return;
		}

		const handleAbort = () => {
			timers.clearTimeout(timeoutId);
			signal.removeEventListener("abort", handleAbort);
			reject(new DOMException("Aborted", "AbortError"));
		};

		signal.addEventListener("abort", handleAbort, { once: true });
		const timeoutId = timers.setTimeout(() => {
			signal.removeEventListener("abort", handleAbort);
			resolve();
		}, ms);
	});
}
