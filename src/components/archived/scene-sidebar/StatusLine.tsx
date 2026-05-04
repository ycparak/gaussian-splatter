import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react";
import type { GenerationJobStatus } from "@/shared/types";

interface StatusLineProps {
	status: GenerationJobStatus | "idle";
	message: string;
}

export function StatusLine({ status, message }: StatusLineProps) {
	const isError = status === "error";
	const isDone = status === "done";
	const isRunning =
		status === "queued" || status === "running" || status === "optimizing";

	return (
		<div className="flex min-h-6 items-center gap-2 text-[11px] text-muted-foreground">
			{isError ? (
				<AlertCircle className="size-3.5 text-red-400" aria-hidden="true" />
			) : null}
			{isDone ? (
				<CheckCircle2
					className="size-3.5 text-emerald-400"
					aria-hidden="true"
				/>
			) : null}
			{isRunning ? (
				<LoaderCircle
					className="size-3.5 animate-spin text-amber-300"
					aria-hidden="true"
				/>
			) : null}
			<span>{message}</span>
		</div>
	);
}
