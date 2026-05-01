import { describe, expect, test } from "bun:test";
import {
	type AbortableSignalLike,
	abortableWait,
	type TimeoutApi,
} from "../shared/abortableWait";

class FakeSignal implements AbortableSignalLike {
	aborted = false;
	listeners = new Set<EventListenerOrEventListenerObject>();

	addEventListener(
		_type: "abort",
		listener: EventListenerOrEventListenerObject,
	): void {
		this.listeners.add(listener);
	}

	removeEventListener(
		_type: "abort",
		listener: EventListenerOrEventListenerObject,
	): void {
		this.listeners.delete(listener);
	}
}

describe("abortableWait", () => {
	test("removes the abort listener after the timer resolves", async () => {
		const signal = new FakeSignal();
		const timers: TimeoutApi = {
			setTimeout: (handler) => {
				handler();
				return 1;
			},
			clearTimeout: () => undefined,
		};

		await abortableWait(10, signal, timers);
		expect(signal.listeners.size).toBe(0);
	});
});
