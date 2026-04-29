import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const scenes = [
  {
    id: "tokyo",
    name: "tokyo",
    active: true,
  },
];

export default function SceneSidebar() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="dark pointer-events-none fixed inset-0 z-40 text-[12px] tracking-normal text-foreground">
      <aside
        className={cn(
          "pointer-events-auto fixed top-14 right-2 bottom-2 flex w-80 flex-col overflow-hidden rounded-lg border border-border/60 bg-card/85 shadow-2xl shadow-black/40 backdrop-blur-md transition-[transform,opacity] duration-300 ease-out",
          isOpen
            ? "translate-x-0 opacity-100"
            : "translate-x-[calc(100%+0.75rem)] opacity-0",
        )}
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <header className="flex h-9 shrink-0 items-center justify-between px-3">
          <h2 className="font-semibold text-[13px] text-foreground">Scenes</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Hide scenes sidebar"
            onClick={() => setIsOpen(false)}
          >
            <X />
          </Button>
        </header>

        <Separator className="bg-border/40" />

        <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
          <button
            type="button"
            className="flex h-[88px] shrink-0 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border/55 bg-muted/20 text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
            aria-label="Upload scene image"
          >
            <Upload className="size-5 opacity-65" aria-hidden="true" />
            <span className="text-[11px]">Drop image or click to browse</span>
          </button>

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
              <div className="flex flex-col gap-1 pr-1">
                {scenes.map((scene) => (
                  <button
                    key={scene.id}
                    type="button"
                    className={cn(
                      "flex h-8 items-center gap-2 rounded-md px-2 text-left font-medium text-[12px] transition-colors",
                      scene.active
                        ? "bg-muted/60 text-foreground shadow-inner shadow-white/5"
                        : "bg-muted/25 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                    )}
                    aria-current={scene.active ? "true" : undefined}
                  >
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        scene.active
                          ? "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                          : "bg-muted-foreground/35",
                      )}
                    />
                    <span className="truncate">{scene.name}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </section>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 w-full bg-muted/45 text-muted-foreground hover:bg-muted/65 hover:text-foreground"
          >
            <RefreshCw data-icon="inline-start" />
            Refresh
          </Button>
        </div>
      </aside>

      <Button
        type="button"
        variant="secondary"
        size="icon-sm"
        className={cn(
          "pointer-events-auto fixed right-2 bottom-6 bg-card/85 text-muted-foreground shadow-xl shadow-black/35 backdrop-blur-md transition-[transform,color,background-color] duration-300 ease-out hover:bg-muted hover:text-foreground",
          isOpen ? "-translate-x-82" : "translate-x-0",
        )}
        aria-label={isOpen ? "Hide scenes sidebar" : "Show scenes sidebar"}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
      >
        {isOpen ? <ChevronRight /> : <ChevronLeft />}
      </Button>
    </div>
  );
}
