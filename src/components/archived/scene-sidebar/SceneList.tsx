import { ChevronDown, ImageIcon } from "lucide-react";
import type { SceneAsset } from "@/shared/types";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import { cn } from "@/src/lib/utils";

interface SceneListProps {
	scenes: SceneAsset[];
	activeSceneId: string | null;
	onSceneSelect: (scene: SceneAsset) => void;
}

export function SceneList({
	scenes,
	activeSceneId,
	onSceneSelect,
}: SceneListProps) {
	return (
		<section className="flex min-h-0 flex-1 flex-col gap-2">
			<div className="flex h-6 shrink-0 items-center justify-between">
				<h3 className="font-medium text-[11px] text-muted-foreground">
					Available Scenes
				</h3>
				<ChevronDown
					className="size-4 text-muted-foreground/70"
					aria-hidden="true"
				/>
			</div>

			<ScrollArea className="min-h-0 flex-1">
				{scenes.length === 0 ? (
					<div className="rounded-md border border-dashed border-border/40 bg-muted/15 p-3 text-[11px] text-muted-foreground">
						No bundled or generated scenes are available yet.
					</div>
				) : (
					<div className="flex flex-col gap-1 pr-1">
						{scenes.map((scene) => (
							<button
								key={scene.id}
								type="button"
								className={cn(
									"flex min-h-8 items-center gap-2 rounded-md px-2 py-1.5 text-left font-medium text-[12px] transition-colors",
									scene.id === activeSceneId
										? "bg-muted/60 text-foreground shadow-inner shadow-white/5"
										: "bg-muted/25 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
								)}
								aria-current={scene.id === activeSceneId ? "true" : undefined}
								onClick={() => onSceneSelect(scene)}
							>
								<span
									className={cn(
										"size-1.5 shrink-0 rounded-full",
										scene.id === activeSceneId
											? "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
											: "bg-muted-foreground/35",
									)}
								/>
								<span className="min-w-0 flex-1">
									<span className="block truncate">{scene.name}</span>
									{scene.optimizedBytes ? (
										<span className="block truncate font-normal text-[10px] text-muted-foreground">
											{formatBytes(scene.optimizedBytes)} ·{" "}
											{formatPercent(scene.ratio)} of PLY
										</span>
									) : null}
								</span>
								{scene.previewUrl ? (
									<ImageIcon className="size-3.5 text-muted-foreground/60" />
								) : null}
							</button>
						))}
					</div>
				)}
			</ScrollArea>
		</section>
	);
}

function formatBytes(bytes: number): string {
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatPercent(value?: number): string {
	if (!Number.isFinite(value)) return "";
	return `${Math.round((value ?? 0) * 100)}%`;
}
