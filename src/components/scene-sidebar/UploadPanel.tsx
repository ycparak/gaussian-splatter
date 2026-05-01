import { Sparkles, Upload } from "lucide-react";
import type { ChangeEventHandler, DragEventHandler, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UploadPanelProps {
	fileInputRef: RefObject<HTMLInputElement | null>;
	isDragging: boolean;
	previewUrl: string;
	selectedFile: File | null;
	isBusy: boolean;
	onInputChange: ChangeEventHandler<HTMLInputElement>;
	onPickClick: () => void;
	onDragEnter: DragEventHandler<HTMLButtonElement>;
	onDragOver: DragEventHandler<HTMLButtonElement>;
	onDragLeave: DragEventHandler<HTMLButtonElement>;
	onDrop: DragEventHandler<HTMLButtonElement>;
	onGenerate: () => void;
}

export function UploadPanel({
	fileInputRef,
	isDragging,
	previewUrl,
	selectedFile,
	isBusy,
	onInputChange,
	onPickClick,
	onDragEnter,
	onDragOver,
	onDragLeave,
	onDrop,
	onGenerate,
}: UploadPanelProps) {
	return (
		<>
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={onInputChange}
			/>

			<button
				type="button"
				className={cn(
					"flex h-23 shrink-0 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border/55 bg-muted/20 text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground",
					isDragging && "border-cyan-400/70 bg-cyan-400/10 text-foreground",
				)}
				aria-label="Upload scene image"
				onClick={onPickClick}
				onDragEnter={onDragEnter}
				onDragOver={onDragOver}
				onDragLeave={onDragLeave}
				onDrop={onDrop}
			>
				<Upload className="size-5 opacity-65" aria-hidden="true" />
				<span className="text-[11px]">Drop image or click to browse</span>
			</button>

			{previewUrl && selectedFile ? (
				<section className="overflow-hidden rounded-md border border-border/45 bg-muted/20">
					<img
						src={previewUrl}
						alt="Selected upload preview"
						className="h-28 w-full object-cover"
					/>
					<div className="flex items-center justify-between gap-2 p-2">
						<div className="min-w-0">
							<p className="truncate font-medium text-[12px]">
								{selectedFile.name}
							</p>
							<p className="text-[11px] text-muted-foreground">
								{formatBytes(selectedFile.size)}
							</p>
						</div>
						<Button
							type="button"
							size="xs"
							className="bg-emerald-500/85 text-black hover:bg-emerald-400"
							disabled={isBusy}
							onClick={onGenerate}
						>
							<Sparkles data-icon="inline-start" />
							Generate
						</Button>
					</div>
				</section>
			) : null}
		</>
	);
}

function formatBytes(bytes: number): string {
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
